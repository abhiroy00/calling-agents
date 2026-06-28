from django.contrib import admin
from .models import Campaign, CampaignLead

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'rate_limit_per_min', 'created_by', 'created_at')
    list_filter = ('status',)

@admin.register(CampaignLead)
class CampaignLeadAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'lead', 'status', 'call_order')
    list_filter = ('status',)
