from django.db import models


class Lead(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('queued', 'Queued'),
        ('called', 'Called'),
        ('interested', 'Interested'),
        ('not_interested', 'Not Interested'),
        ('callback', 'Callback'),
        ('do_not_call', 'Do Not Call'),
    ]

    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150, blank=True)
    company = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    extra_data = models.JSONField(default=dict, blank=True)
    # Set when a caller asks for a callback/demo/meeting on a call. Indexed so
    # the Meetings page can filter on it across any database (a JSON has_key
    # lookup is not portable between Postgres and SQLite).
    meeting_requested = models.BooleanField(default=False, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone})'
