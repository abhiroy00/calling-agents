"""Sending post-call emails and logging every attempt.

Two kinds of email:
  - operator summary  — the call recap + extracted data, sent to the campaign's
    notify_emails (fallback: the creator's email).
  - lead follow-up    — a warm follow-up composed by the LLM, sent to the lead.

Every send is recorded as an EmailLog row (sent or failed) so the dashboard can
show what went out without depending on the mail server.
"""
import json
import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import EmailLog

logger = logging.getLogger(__name__)


def _record(call, recipient_type, to, subject, body):
    """Send one email and log the outcome. Never raises."""
    to_list = [addr.strip() for addr in to.split(',') if addr.strip()]
    if not to_list:
        return
    status, error = 'sent', ''
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=to_list,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001 — log & persist, don't crash the task
        status, error = 'failed', str(exc)[:2000]
        logger.exception('Email to %s failed', to_list)

    EmailLog.objects.create(
        call=call,
        recipient_type=recipient_type,
        to=', '.join(to_list),
        subject=subject[:300],
        body=body,
        status=status,
        error=error,
    )


def send_operator_summary(call, campaign, call_data, notify_emails):
    """Email the operator a recap + the data collected on the call."""
    lead = call.lead
    lines = [
        f'Call #{call.id} — {call.get_disposition_display()}',
        f'Lead: {(lead.name or "Unknown") if lead else "Unknown"} '
        f'({lead.phone if lead else "?"})',
        f'Campaign: {campaign.name if campaign else "—"}',
        '',
        'Summary:',
        call_data.summary or '(none)',
        '',
        'Collected data:',
    ]
    if call_data.data:
        for key, value in call_data.data.items():
            lines.append(f'  • {key}: {value if value not in (None, "") else "—"}')
    else:
        lines.append('  (none)')
    lines += [
        '',
        f'Follow-up needed: {"yes" if call_data.follow_up_needed else "no"}',
    ]
    body = '\n'.join(lines)
    subject = f'[Call #{call.id}] {(lead.name if lead and lead.name else lead.phone) if lead else "Call"} — {call.disposition}'
    _record(call, 'operator', notify_emails, subject, body)


def send_lead_followup(call, subject, body, to_email):
    """Email the lead the LLM-composed follow-up at the given address."""
    if not to_email or not subject or not body:
        return
    _record(call, 'lead', to_email, subject, body)
