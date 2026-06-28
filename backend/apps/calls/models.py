from django.db import models


class Call(models.Model):
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('ringing', 'Ringing'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('no_answer', 'No Answer'),
        ('busy', 'Busy'),
        ('failed', 'Failed'),
        ('voicemail', 'Voicemail'),
    ]

    DISPOSITION_CHOICES = [
        ('interested', 'Interested'),
        ('not_interested', 'Not Interested'),
        ('callback', 'Callback'),
        ('no_answer', 'No Answer'),
        ('voicemail', 'Voicemail'),
        ('pending', 'Pending'),
    ]

    campaign = models.ForeignKey('campaigns.Campaign', on_delete=models.SET_NULL, null=True, related_name='calls')
    lead = models.ForeignKey('leads.Lead', on_delete=models.SET_NULL, null=True, related_name='calls')
    twilio_sid = models.CharField(max_length=64, blank=True, db_index=True)
    system_prompt = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    disposition = models.CharField(max_length=20, choices=DISPOSITION_CHOICES, default='pending')
    duration = models.PositiveIntegerField(default=0, help_text='seconds')
    recording_url = models.URLField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Call {self.id} ({self.status})'


class Transcript(models.Model):
    ROLE_CHOICES = [('ai', 'AI'), ('human', 'Human')]

    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name='transcripts')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
