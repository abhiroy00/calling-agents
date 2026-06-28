from rest_framework import serializers
from .models import Call, Transcript


class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = ('id', 'role', 'text', 'timestamp')


class CallSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    lead_phone = serializers.CharField(source='lead.phone', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)

    class Meta:
        model = Call
        fields = '__all__'


class CallDetailSerializer(CallSerializer):
    transcripts = TranscriptSerializer(many=True, read_only=True)

    class Meta(CallSerializer.Meta):
        fields = '__all__'
