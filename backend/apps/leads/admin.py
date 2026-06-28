from django.contrib import admin
from .models import Lead

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('phone', 'name', 'company', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('phone', 'name', 'company', 'email')
