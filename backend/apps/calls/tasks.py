import time
import datetime
from celery import shared_task
from django.utils import timezone


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def dial_campaign_leads(self, campaign_id: int):
    from apps.campaigns.models import Campaign, CampaignLead
    from apps.calls.models import Call
    from apps.calls import exotel_client as twilio_client

    try:
        campaign = Campaign.objects.get(pk=campaign_id)
    except Campaign.DoesNotExist:
        return

    if campaign.status != 'running':
        return

    pending = CampaignLead.objects.filter(
        campaign=campaign, status='pending'
    ).select_related('lead').order_by('call_order')

    interval = 60.0 / max(campaign.rate_limit_per_min, 1)

    for cl in pending:
        campaign.refresh_from_db()
        if campaign.status != 'running':
            break

        now_time = timezone.localtime().time()
        if not (campaign.calling_window_start <= now_time <= campaign.calling_window_end):
            break

        cl.status = 'dialing'
        cl.save(update_fields=['status'])

        call = Call.objects.create(campaign=campaign, lead=cl.lead)
        try:
            sid = twilio_client.dial(cl.lead, campaign, call.id)
            call.twilio_sid = sid
            call.status = 'ringing'
            call.save(update_fields=['twilio_sid', 'status'])
            cl.status = 'done'
        except Exception as exc:
            call.status = 'failed'
            call.save(update_fields=['status'])
            cl.status = 'failed'
            self.retry(exc=exc)

        cl.save(update_fields=['status'])
        time.sleep(interval)


@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def retry_failed_call(self, call_id: int):
    from apps.calls.models import Call
    from apps.calls import exotel_client as twilio_client

    try:
        call = Call.objects.select_related('lead', 'campaign').get(pk=call_id)
    except Call.DoesNotExist:
        return

    try:
        sid = twilio_client.dial(call.lead, call.campaign, call.id)
        call.twilio_sid = sid
        call.status = 'ringing'
        call.save(update_fields=['twilio_sid', 'status'])
    except Exception as exc:
        self.retry(exc=exc)
