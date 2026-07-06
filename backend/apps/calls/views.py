from rest_framework import generics, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Call, Transcript
from .serializers import CallSerializer, CallDetailSerializer

_FAREWELL = {'bye', 'goodbye', 'thank you', 'no thank you', 'not interested', 'hang up', 'end call'}


def _broadcast(event_data):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)('live_calls', {
            'type': 'live_update',
            'data': event_data,
        })
    except Exception:
        pass


class CallListView(generics.ListAPIView):
    queryset = Call.objects.select_related('lead', 'campaign').all()
    serializer_class = CallSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'status', 'duration']
    filterset_fields = ['status', 'campaign', 'disposition']


class CallDetailView(generics.RetrieveAPIView):
    queryset = Call.objects.prefetch_related('transcripts').all()
    serializer_class = CallDetailSerializer


class ExoMLWebhookView(APIView):
    """Exotel calls this when the call is answered — returns the opening ExoML."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        return self._exoml(pk)

    def post(self, request, pk):
        # Capture Exotel's call SID if we don't have it yet
        call_sid = request.POST.get('CallSid', '')
        if call_sid:
            Call.objects.filter(pk=pk, twilio_sid='').update(twilio_sid=call_sid)
        Call.objects.filter(pk=pk).update(status='in_progress', started_at=timezone.now())
        _broadcast({'type': 'call.status', 'call_id': pk, 'status': 'in_progress'})
        return self._exoml(pk)

    def _exoml(self, pk):
        from .exotel_client import build_exoml_gather
        try:
            call = Call.objects.select_related('lead').get(pk=pk)
            name = call.lead.name if call.lead else 'there'
            greeting = f'Hi {name}, this is an AI assistant. How can I help you today?'
        except Call.DoesNotExist:
            greeting = 'Hello, this is an AI assistant. How can I help you today?'
        return HttpResponse(build_exoml_gather(pk, greeting), content_type='application/xml')


class GatherView(APIView):
    """Exotel POSTs here after each <Gather> with the transcribed SpeechResult."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        from .exotel_client import build_exoml_gather, build_exoml_say_hangup
        from .llm import get_response_sync

        try:
            call = Call.objects.select_related('campaign').get(pk=pk)
        except Call.DoesNotExist:
            return HttpResponse(
                '<?xml version="1.0"?><Response><Hangup/></Response>',
                content_type='application/xml',
            )

        speech = request.POST.get('SpeechResult', '').strip()
        if not speech:
            return HttpResponse(
                build_exoml_gather(pk, 'Sorry, I did not catch that. Could you please repeat?'),
                content_type='application/xml',
            )

        Transcript.objects.create(call_id=pk, role='human', text=speech)
        _broadcast({'type': 'call.transcript', 'call_id': pk, 'role': 'human', 'text': speech})

        transcripts = list(Transcript.objects.filter(call_id=pk).order_by('timestamp'))
        messages = [
            {'role': 'user' if t.role == 'human' else 'assistant', 'content': t.text}
            for t in transcripts
        ]

        system_prompt = (
            call.system_prompt
            or (call.campaign.system_prompt if call.campaign else None)
            or 'You are a helpful AI assistant on a phone call. Be concise and friendly. Keep responses under 2 sentences.'
        )

        try:
            ai_text = get_response_sync(messages, system_prompt)
        except Exception:
            ai_text = 'I apologize, I had a technical difficulty. Could you please repeat that?'

        Transcript.objects.create(call_id=pk, role='ai', text=ai_text)
        _broadcast({'type': 'call.transcript', 'call_id': pk, 'role': 'ai', 'text': ai_text})

        if any(word in speech.lower() for word in _FAREWELL):
            return HttpResponse(build_exoml_say_hangup(ai_text), content_type='application/xml')

        return HttpResponse(build_exoml_gather(pk, ai_text), content_type='application/xml')


class StatusCallbackView(APIView):
    """Exotel POSTs call lifecycle events here."""
    permission_classes = [AllowAny]

    _STATUS_MAP = {
        'completed': 'completed',
        'failed': 'failed',
        'busy': 'busy',
        'no-answer': 'no_answer',
        'in-progress': 'in_progress',
        'ringing': 'ringing',
        'queued': 'initiated',
    }

    def post(self, request, pk):
        from .llm import detect_disposition_sync

        exotel_status = request.POST.get('Status', '').lower()
        db_status = self._STATUS_MAP.get(exotel_status, exotel_status)

        try:
            call = Call.objects.get(pk=pk)
        except Call.DoesNotExist:
            return HttpResponse('OK')

        call_sid = request.POST.get('CallSid', '')
        if call_sid and not call.twilio_sid:
            call.twilio_sid = call_sid

        terminal = {'completed', 'failed', 'busy', 'no_answer'}
        if db_status in terminal:
            transcripts = Transcript.objects.filter(call_id=pk).order_by('timestamp')
            transcript_text = '\n'.join(f'{t.role.upper()}: {t.text}' for t in transcripts)
            disposition = detect_disposition_sync(transcript_text) if transcript_text.strip() else 'no_answer'
            now = timezone.now()
            duration = int((now - call.started_at).total_seconds()) if call.started_at else 0
            Call.objects.filter(pk=pk).update(
                status=db_status,
                disposition=disposition,
                ended_at=now,
                duration=duration,
                twilio_sid=call.twilio_sid,
            )
            _broadcast({
                'type': 'call.status',
                'call_id': pk,
                'status': db_status,
                'disposition': disposition,
            })
        else:
            Call.objects.filter(pk=pk).update(status=db_status, twilio_sid=call.twilio_sid)
            _broadcast({'type': 'call.status', 'call_id': pk, 'status': db_status})

        return HttpResponse('OK')


class ManualDialView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.leads.models import Lead
        from .exotel_client import dial

        phone = request.data.get('phone', '').strip()
        name = request.data.get('name', '').strip() or 'Unknown'
        system_prompt = request.data.get('system_prompt', '').strip()

        if not phone:
            return Response({'error': 'phone is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not phone.startswith('+'):
            phone = '+' + phone

        lead, _ = Lead.objects.get_or_create(
            phone=phone,
            defaults={'name': name, 'status': 'new'},
        )

        call = Call.objects.create(
            lead=lead,
            campaign=None,
            system_prompt=system_prompt or 'You are a helpful AI assistant on a phone call. Be concise and friendly.',
            status='initiated',
        )

        try:
            sid = dial(lead, None, call.id)
            call.twilio_sid = sid
            call.save(update_fields=['twilio_sid'])
            return Response({'call_id': call.id, 'status': 'initiated', 'sid': sid})
        except Exception as e:
            call.status = 'failed'
            call.save(update_fields=['status'])
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
