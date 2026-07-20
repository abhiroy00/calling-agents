import re
import time
import datetime
from celery import shared_task
from django.utils import timezone

_EMAIL_RE = re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+')


def _captured_email(data: dict):
    """Find an email address the caller gave on the call, from extracted data.

    Prefers a field whose key looks like an email field; otherwise scans all
    values for anything email-shaped. Returns None if nothing matches.
    """
    if not isinstance(data, dict):
        return None
    for key, value in data.items():
        if 'email' in str(key).lower() and isinstance(value, str):
            m = _EMAIL_RE.search(value)
            if m:
                return m.group(0)
    for value in data.values():
        if isinstance(value, str):
            m = _EMAIL_RE.search(value)
            if m:
                return m.group(0)
    return None


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


def _persist_contact(call, extracted: dict):
    """Save contact + meeting details the caller shared onto the Lead.

    Only fills BLANK Lead fields — a real name/email from an earlier upload is
    never overwritten with something misheard on a noisy call. The meeting
    request and interest level are stashed in Lead.extra_data (no migration
    needed) and the Lead status is nudged so callbacks surface in the pipeline.
    """
    lead = getattr(call, 'lead', None)
    if lead is None:
        return

    contact = extracted.get('contact') or {}
    meeting = extracted.get('meeting') or {}
    changed = []

    # Fill blanks only; never clobber existing data with a null/empty capture.
    if contact.get('name') and not (lead.name or '').strip():
        lead.name = contact['name'][:150]
        changed.append('name')
    if contact.get('company') and not (lead.company or '').strip():
        lead.company = contact['company'][:150]
        changed.append('company')
    if contact.get('email') and not (lead.email or '').strip():
        m = _EMAIL_RE.search(contact['email'])
        if m:
            lead.email = m.group(0)
            changed.append('email')

    extra = dict(lead.extra_data or {})
    if meeting.get('requested'):
        extra['meeting'] = {
            'requested': True,
            'preferred_day': meeting.get('preferred_day'),
            'preferred_time': meeting.get('preferred_time'),
            'notes': meeting.get('notes'),
            'from_call': call.id,
        }
        if not lead.meeting_requested:
            lead.meeting_requested = True
            changed.append('meeting_requested')
    if extracted.get('interest_level'):
        extra['interest_level'] = extracted['interest_level']
    if extra != (lead.extra_data or {}):
        lead.extra_data = extra
        changed.append('extra_data')

    # Nudge the pipeline status so a booked callback / hot lead is visible.
    if meeting.get('requested') and lead.status in ('new', 'called', 'queued'):
        lead.status = 'callback'
        changed.append('status')
    elif extracted.get('interest_level') == 'high' and lead.status in ('new', 'called', 'queued'):
        lead.status = 'interested'
        changed.append('status')

    if changed:
        lead.save(update_fields=list(set(changed)) + ['updated_at'])


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def process_call_outcome(self, call_id: int):
    """After a call ends: extract configured data from the transcript, store it,
    and send the operator summary and/or lead follow-up email."""
    from apps.calls.models import Call, Transcript, CallData
    from apps.calls import llm, emailer

    try:
        call = Call.objects.select_related('lead', 'campaign').get(pk=call_id)
    except Call.DoesNotExist:
        return

    transcripts = Transcript.objects.filter(call_id=call_id).order_by('timestamp')
    transcript_text = '\n'.join(f'{t.role.upper()}: {t.text}' for t in transcripts)
    if not transcript_text.strip():
        return  # nothing was said — no data to collect, no email worth sending

    campaign = call.campaign
    fields = (campaign.collect_fields or []) if campaign else []

    extracted = llm.extract_call_data_sync(transcript_text, fields)
    call_data, _ = CallData.objects.update_or_create(
        call=call,
        defaults={
            'data': extracted['data'],
            'summary': extracted['summary'],
            'follow_up_needed': extracted['follow_up_needed'],
        },
    )

    # Persist the contact + meeting info the caller shared onto the Lead, so it
    # survives the call and can drive booking/follow-up. Runs for EVERY call,
    # including manual dials that have no campaign.
    _persist_contact(call, extracted)

    if campaign is None:
        return  # manual dials have no email config

    if campaign.send_operator_summary:
        notify = campaign.notify_emails.strip()
        if not notify and campaign.created_by and campaign.created_by.email:
            notify = campaign.created_by.email
        if notify:
            emailer.send_operator_summary(call, campaign, call_data, notify)

    # Prefer the email the caller gave on the call; fall back to the uploaded one.
    lead_email = ((extracted.get('contact') or {}).get('email')
                  or _captured_email(extracted['data'])
                  or (call.lead.email if call.lead else ''))
    if campaign.send_lead_followup and call_data.follow_up_needed and lead_email:
        email = llm.generate_followup_email_sync(
            transcript_text,
            call.lead.name if call.lead else '',
            campaign.lead_followup_instructions,
            extracted['data'],
        )
        emailer.send_lead_followup(call, email['subject'], email['body'], lead_email)


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
