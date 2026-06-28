from rest_framework import generics, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from .models import Call
from .serializers import CallSerializer, CallDetailSerializer


class CallListView(generics.ListAPIView):
    queryset = Call.objects.select_related('lead', 'campaign').all()
    serializer_class = CallSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'status', 'duration']
    filterset_fields = ['status', 'campaign', 'disposition']


class CallDetailView(generics.RetrieveAPIView):
    queryset = Call.objects.prefetch_related('transcripts').all()
    serializer_class = CallDetailSerializer


class TwiMLWebhookView(APIView):
    """Twilio calls this to get TwiML — must be public (no auth)."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        return self._twiml(pk)

    def post(self, request, pk):
        return self._twiml(pk)

    def _twiml(self, pk):
        from .twilio_client import build_twiml
        from .models import Call
        try:
            call = Call.objects.select_related('lead').get(pk=pk)
            welcome = f'Hi {call.lead.name}, this is an AI assistant. How can I help you today?' if call.lead else ''
        except Call.DoesNotExist:
            welcome = ''
        twiml = build_twiml(pk, welcome)
        return HttpResponse(twiml, content_type='application/xml')


class ManualDialView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.leads.models import Lead
        from .twilio_client import dial

        phone = request.data.get('phone', '').strip()
        name = request.data.get('name', '').strip() or 'Unknown'
        system_prompt = request.data.get('system_prompt', '').strip()

        if not phone:
            return Response({'error': 'phone is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize to E.164: add + if missing
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
            return Response({'call_id': call.id, 'status': 'initiated', 'twilio_sid': sid})
        except Exception as e:
            call.status = 'failed'
            call.save(update_fields=['status'])
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
