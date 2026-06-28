import re
from rest_framework import serializers
from .models import Lead


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 10:
        return f'+91{digits}'
    if len(digits) == 12 and digits.startswith('91'):
        return f'+{digits}'
    if digits.startswith('+'):
        return phone.strip()
    return f'+{digits}'


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class BulkLeadRowSerializer(serializers.Serializer):
    phone = serializers.CharField()
    name = serializers.CharField(required=False, allow_blank=True, default='')
    company = serializers.CharField(required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    extra_data = serializers.DictField(required=False, default=dict)

    def validate_phone(self, value):
        digits = re.sub(r'\D', '', value)
        if len(digits) < 7:
            raise serializers.ValidationError('Too short to be a valid phone number')
        return normalize_phone(value)


class BulkUploadResultSerializer(serializers.Serializer):
    created = serializers.IntegerField()
    duplicates = serializers.IntegerField()
    invalid = serializers.ListField(child=serializers.DictField())
