from rest_framework import generics, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers as drf_serializers
from .models import Call, Transcript
from .serializers import CallSerializer, CallDetailSerializer

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
    queryset = Call.objects.select_related('data').prefetch_related('transcripts', 'emails').all()
    serializer_class = CallDetailSerializer


@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses=OpenApiResponse(OpenApiTypes.STR, description="Plain 'OK'."),
    summary='Exotel call-status webhook',
    description='Exotel POSTs form-encoded call lifecycle events (Status, CallSid). '
                'On terminal statuses, disposition is detected and post-call '
                'data collection is triggered.',
)
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
            # Extract configured data from the transcript and fire off emails.
            if transcript_text.strip():
                from .tasks import process_call_outcome
                process_call_outcome.delay(pk)
        else:
            Call.objects.filter(pk=pk).update(status=db_status, twilio_sid=call.twilio_sid)
            _broadcast({'type': 'call.status', 'call_id': pk, 'status': db_status})

        return HttpResponse('OK')


class EndCallView(APIView):
    """Hang up a live call from the dashboard.

    Works by closing the Voicebot media stream, which is what makes Exotel end
    the call — the same mechanism the agent's own end_call tool uses. The
    consumer holding that stream may be in another process, so it is signalled
    over the channel layer.

    The call is NOT marked completed here: Exotel's status webhook fires on the
    real hangup and owns disposition, duration and ended_at.
    """
    permission_classes = [IsAuthenticated]

    TERMINAL = {'completed', 'failed', 'busy', 'no_answer'}

    @extend_schema(
        request=None,
        responses=OpenApiResponse(OpenApiTypes.OBJECT,
                                  description='Call id and the action taken.'),
        summary='End a live call',
    )
    def post(self, request, pk):
        from .media_consumer import call_group

        try:
            call = Call.objects.get(pk=pk)
        except Call.DoesNotExist:
            return Response({'error': 'call not found'},
                            status=status.HTTP_404_NOT_FOUND)

        if call.status in self.TERMINAL:
            return Response({'call_id': pk, 'status': call.status,
                             'detail': 'call already ended'})

        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                call_group(pk), {'type': 'call.hangup'})
        except Exception as exc:
            return Response({'error': f'could not signal the call: {exc}'},
                            status=status.HTTP_502_BAD_GATEWAY)

        # group_send to a group with no members is a no-op, so this is also the
        # response when the call is still ringing and has no media stream yet.
        _broadcast({'type': 'call.status', 'call_id': pk, 'status': 'ending'})
        return Response({'call_id': pk, 'status': 'ending'},
                        status=status.HTTP_202_ACCEPTED)


class ManualDialView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            'ManualDialRequest',
            {
                'phone': drf_serializers.CharField(),
                'name': drf_serializers.CharField(required=False),
                'system_prompt': drf_serializers.CharField(required=False),
            },
        ),
        responses=OpenApiResponse(OpenApiTypes.OBJECT, description='Created call id, status and provider sid.'),
        summary='Dial a single number now',
    )
    def post(self, request):
        from apps.leads.models import Lead
        from .exotel_client import dial

        phone = request.data.get('phone', '').strip()
        # Left blank when not supplied — never the literal 'Unknown', which the
        # agent would greet as a person's name ("Hello Unknown, ...").
        name = request.data.get('name', '').strip()
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
            # Left blank on purpose when not supplied: the media consumer then
            # falls back to NEVO_SYSTEM_PROMPT. A generic default here would
            # silently win over it and strip the agent of its persona.
            system_prompt=system_prompt,
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
