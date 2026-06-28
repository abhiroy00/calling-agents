from django.contrib import admin
from .models import Call, Transcript

@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ('id', 'lead', 'campaign', 'status', 'disposition', 'duration', 'created_at')
    list_filter = ('status', 'disposition')
    search_fields = ('twilio_sid', 'lead__phone', 'lead__name')

@admin.register(Transcript)
class TranscriptAdmin(admin.ModelAdmin):
    list_display = ('call', 'role', 'timestamp')
    list_filter = ('role',)
