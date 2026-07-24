from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """An attributable record of a privileged admin action.

    Written by `apps.administration.audit.record_audit` whenever a super admin
    creates/updates/deactivates a user or tenant, or an access check is denied.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
    )
    # Denormalised so the row survives the actor being deleted.
    actor_email = models.CharField(max_length=254, blank=True)
    action = models.CharField(max_length=64)          # e.g. "user.create"
    resource = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.actor_email or "system"} · {self.action}'


class Tenant(models.Model):
    """A workspace/organisation. The platform runs single-tenant today; this
    registry lets admins provision and track additional workspaces. It is not
    yet enforced across leads/calls — those remain global until wired through.
    """

    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('growth', 'Growth'),
        ('scale', 'Scale'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('trial', 'Trial'),
        ('suspended', 'Suspended'),
    ]

    name = models.CharField(max_length=150)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    seats = models.PositiveIntegerField(default=5)
    minutes_quota = models.PositiveIntegerField(default=500)
    minutes_used = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
