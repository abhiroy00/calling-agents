from django.contrib import admin
from .models import AuditLog, Tenant


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor_email', 'action', 'resource', 'ip')
    list_filter = ('action',)
    search_fields = ('actor_email', 'action', 'resource')
    readonly_fields = ('actor', 'actor_email', 'action', 'resource', 'metadata', 'ip', 'created_at')


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan', 'status', 'seats', 'minutes_used', 'minutes_quota', 'created_at')
    list_filter = ('plan', 'status')
    search_fields = ('name',)
