from rest_framework import serializers
from .models import Campaign, CampaignLead


class CampaignSerializer(serializers.ModelSerializer):
    lead_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = ('id', 'status', 'created_by', 'created_at', 'updated_at')

    def get_lead_count(self, obj) -> int:
        return obj.campaign_leads.count()

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CampaignLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignLead
        fields = '__all__'
