from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
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

        # Two modes: an explicit list of lead_ids, or "add every lead" (optionally
        # narrowed by the same search used on the Leads page).
        if request.data.get('all'):
            leads_qs = Lead.objects.all()
            search = (request.data.get('search') or '').strip()
            if search:
                leads_qs = leads_qs.filter(
                    Q(phone__icontains=search) | Q(name__icontains=search)
                    | Q(company__icontains=search) | Q(email__icontains=search)
                )
            lead_ids = list(leads_qs.values_list('id', flat=True))
        else:
            lead_ids = request.data.get('lead_ids', [])

        # Continue numbering after any leads already on the campaign, and skip
        # leads already attached so re-adding is idempotent.
        next_order = CampaignLead.objects.filter(campaign=campaign).count()
        existing = set(
            CampaignLead.objects.filter(campaign=campaign, lead_id__in=lead_ids)
            .values_list('lead_id', flat=True)
        )
        to_create = []
        for lead_id in lead_ids:
            if lead_id in existing:
                continue
            existing.add(lead_id)
            to_create.append(CampaignLead(
                campaign=campaign, lead_id=lead_id, call_order=next_order,
            ))
            next_order += 1

        if to_create:
            CampaignLead.objects.bulk_create(to_create)
        return Response({'added': len(to_create)})
