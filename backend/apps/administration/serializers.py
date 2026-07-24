from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AuditLog, Tenant

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    # Write-only so an admin can set/reset a password on create; never returned.
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'role', 'is_active', 'is_staff', 'created_at', 'password')
        read_only_fields = ('id', 'created_at')

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'Password is required for a new user.'})
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ('id', 'actor', 'actor_email', 'action', 'resource', 'metadata', 'ip', 'created_at')


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = (
            'id', 'name', 'plan', 'seats', 'minutes_quota', 'minutes_used',
            'status', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
