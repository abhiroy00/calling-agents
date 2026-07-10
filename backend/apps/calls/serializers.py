from rest_framework import serializers
from .models import Call, Transcript, CallData, EmailLog


class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = ('id', 'role', 'text', 'timestamp')


class CallDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallData
        fields = ('data', 'summary', 'follow_up_needed', 'created_at')


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = ('id', 'recipient_type', 'to', 'subject', 'body', 'status', 'error', 'created_at')


class CallSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    lead_phone = serializers.CharField(source='lead.phone', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)

    class Meta:
        model = Call
        fields = '__all__'


class CallDetailSerializer(CallSerializer):
    transcripts = TranscriptSerializer(many=True, read_only=True)
    data = CallDataSerializer(read_only=True)
    emails = EmailLogSerializer(many=True, read_only=True)

    class Meta(CallSerializer.Meta):
        fields = '__all__'
