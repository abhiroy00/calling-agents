from django.db import models
from django.conf import settings


class Campaign(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('running', 'Running'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('stopped', 'Stopped'),
    ]

    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    system_prompt = models.TextField(help_text='AI voice agent system prompt / script')
    calling_window_start = models.TimeField(default='09:00')
    calling_window_end = models.TimeField(default='18:00')
    rate_limit_per_min = models.PositiveIntegerField(default=5)

    # --- Post-call data collection & email automation ---
    # Fields the AI should extract from each call transcript. A list of
    # {"key": "budget", "description": "monthly budget the caller mentioned"}.
    collect_fields = models.JSONField(
        default=list, blank=True,
        help_text='List of {"key","description"} objects to extract from each call transcript.',
    )
    # Where the operator summary goes. Comma-separated; falls back to created_by.email.
    notify_emails = models.CharField(max_length=500, blank=True)
    send_operator_summary = models.BooleanField(default=True)
    # Email the lead a follow-up (only if the lead has an email and follow-up is warranted).
    send_lead_followup = models.BooleanField(default=False)
    lead_followup_instructions = models.TextField(
        blank=True,
        help_text='Guidance for composing the follow-up email sent to the lead.',
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class CampaignLead(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('dialing', 'Dialing'),
        ('done', 'Done'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='campaign_leads')
    lead = models.ForeignKey('leads.Lead', on_delete=models.CASCADE, related_name='campaign_leads')
    call_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['call_order']
        unique_together = ('campaign', 'lead')
