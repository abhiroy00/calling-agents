from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Campaign, CampaignLead
from .serializers import CampaignSerializer, CampaignLeadSerializer
from apps.leads.models import Lead


class CampaignListCreateView(generics.ListCreateAPIView):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CampaignStartView(APIView):
    def post(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        if campaign.status not in ('draft', 'paused'):
            return Response({'detail': 'Campaign is already running or completed'}, status=400)
        campaign.status = 'running'
        campaign.save()
        from apps.calls.tasks import dial_campaign_leads
        dial_campaign_leads.delay(campaign.id)
        return Response(CampaignSerializer(campaign).data)


class CampaignPauseView(APIView):
    def post(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        campaign.status = 'paused'
        campaign.save()
        return Response(CampaignSerializer(campaign).data)


class CampaignStopView(APIView):
    def post(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        campaign.status = 'stopped'
        campaign.save()
        return Response(CampaignSerializer(campaign).data)


class CampaignAddLeadsView(APIView):
    def post(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        lead_ids = request.data.get('lead_ids', [])
        created = 0
        for i, lead_id in enumerate(lead_ids):
            lead = get_object_or_404(Lead, pk=lead_id)
            _, was_created = CampaignLead.objects.get_or_create(
                campaign=campaign, lead=lead,
                defaults={'call_order': i}
            )
            if was_created:
                created += 1
        return Response({'added': created})
