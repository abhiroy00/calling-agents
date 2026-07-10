from django.contrib import admin
from .models import Call, Transcript, CallData, EmailLog

@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ('id', 'lead', 'campaign', 'status', 'disposition', 'duration', 'created_at')
    list_filter = ('status', 'disposition')
    search_fields = ('twilio_sid', 'lead__phone', 'lead__name')

@admin.register(Transcript)
class TranscriptAdmin(admin.ModelAdmin):
    list_display = ('call', 'role', 'timestamp')
    list_filter = ('role',)

@admin.register(CallData)
class CallDataAdmin(admin.ModelAdmin):
    list_display = ('call', 'follow_up_needed', 'created_at')
    list_filter = ('follow_up_needed',)
    search_fields = ('call__id', 'summary')

@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'call', 'recipient_type', 'to', 'status', 'created_at')
    list_filter = ('recipient_type', 'status')
    search_fields = ('to', 'subject')
