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

    def get_queryset(self):
        qs = super().get_queryset()
        # ?has_recording=true powers the Recordings page.
        has_recording = self.request.query_params.get('has_recording')
        if has_recording in ('true', '1'):
            qs = qs.exclude(recording_url='')
        elif has_recording in ('false', '0'):
            qs = qs.filter(recording_url='')
        return qs


class CallDetailView(generics.RetrieveAPIView):
    queryset = Call.objects.select_related('data').prefetch_related('transcripts', 'emails').all()
    serializer_class = CallDetailSerializer


class CallRecordingView(APIView):
    """Return a fresh, playable recording URL for a call.

    The recording URL Exotel sends on the status callback can require auth or
    expire, and Exotel's API token must NEVER reach the browser — so the
    frontend asks us, and we call Exotel's Call Details API server-side to mint
    a short-lived presigned link (PreSignedRecordingUrl if the account has it,
    else RecordingUrl). Authenticated users only.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiTypes.INT],
        responses=OpenApiResponse(OpenApiTypes.OBJECT,
                                  description='A temporary recording URL.'),
        summary='Get a fresh recording URL for a call',
    )
    def get(self, request, pk):
        from .exotel_client import recording_url_for

        call = Call.objects.filter(pk=pk).first()
        if call is None:
            return Response({'error': 'call not found'},
                            status=status.HTTP_404_NOT_FOUND)
        if not call.twilio_sid:
            return Response({'error': 'this call has no Exotel call SID'},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            validity = int(request.query_params.get('validity', 30))
        except (TypeError, ValueError):
            validity = 30

        try:
            url = recording_url_for(call.twilio_sid, validity)
        except Exception as exc:
            # Fall back to the stored URL rather than failing outright — it may
            # still be playable, and a dead demo is worse than a stale link.
            if call.recording_url:
                return Response({'recording_url': call.recording_url,
                                 'fresh': False, 'detail': str(exc)})
            return Response({'error': f'could not fetch recording: {exc}'},
                            status=status.HTTP_502_BAD_GATEWAY)

        if not url:
            return Response({'error': 'no recording available for this call'},
                            status=status.HTTP_404_NOT_FOUND)

        # Cache the freshest URL we have; harmless if it later expires.
        if url != call.recording_url:
            Call.objects.filter(pk=pk).update(recording_url=url)
        return Response({'recording_url': url, 'fresh': True})


class NumberMetadataView(APIView):
    """Telecom metadata (circle, operator, type, DND) for an Indian number.

    Useful before dialing: DND numbers should generally not be cold-called.
    India-only, per Exotel.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=OpenApiResponse(OpenApiTypes.OBJECT,
                                  description='Exotel number metadata.'),
        summary='Look up Indian number telecom metadata',
    )
    def get(self, request):
        from .exotel_client import number_metadata

        phone = (request.query_params.get('phone', '') or '').strip()
        if not phone:
            return Response({'error': 'phone is required'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            data = number_metadata(phone)
        except Exception as exc:
            return Response({'error': str(exc)},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response(data)


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

    @staticmethod
    def _params(request) -> dict:
        """Callback fields, whether Exotel sends form-encoded or JSON.

        The standard status callback is form-encoded, but some Exotel flows and
        applets POST JSON — and request.POST is empty for those, which silently
        loses the recording AND reads Status as '' (blanking the call's status).
        DRF's request.data handles both. Keys are lowercased for matching;
        Exotel is not perfectly consistent about casing.
        """
        data = request.data
        if not hasattr(data, 'items'):  # a list/str body is not a callback
            return {}
        return {str(k).lower(): v for k, v in data.items()}

    @staticmethod
    def _first(params: dict, *names: str) -> str:
        """First non-empty value among `names` (case-insensitive keys)."""
        for name in names:
            value = params.get(name.lower())
            # QueryDict.dict() flattens, but a JSON body may hold lists.
            if isinstance(value, (list, tuple)):
                value = value[0] if value else ''
            value = str(value or '').strip()
            if value:
                return value
        return ''

    def post(self, request, pk):
        from .llm import detect_disposition_sync

        params = self._params(request)
        exotel_status = self._first(params, 'Status', 'CallStatus').lower()
        db_status = self._STATUS_MAP.get(exotel_status, exotel_status)

        try:
            call = Call.objects.get(pk=pk)
        except Call.DoesNotExist:
            return HttpResponse('OK')

        call_sid = self._first(params, 'CallSid', 'Sid')
        if call_sid and not call.twilio_sid:
            call.twilio_sid = call_sid

        # Exotel posts the recording link with the terminal status, but only if
        # recording is enabled on the flow — otherwise it is simply absent.
        # Never blank an existing URL with a later callback that omits it.
        recording_url = self._first(params, 'RecordingUrl', 'RecordingURL',
                                    'recording_url')
        if recording_url:
            call.recording_url = recording_url

        # An unrecognised or missing Status must never overwrite a real one.
        if not db_status:
            call.save(update_fields=['twilio_sid', 'recording_url'])
            return HttpResponse('OK')

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
                recording_url=call.recording_url,
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
            Call.objects.filter(pk=pk).update(
                status=db_status,
                twilio_sid=call.twilio_sid,
                recording_url=call.recording_url,
            )
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
