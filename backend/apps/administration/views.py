from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from rest_framework import generics, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes

from apps.accounts.permissions import IsSuperAdmin, IsManager
from .audit import record_audit
from .models import AuditLog, Tenant
from .serializers import AdminUserSerializer, AuditLogSerializer, TenantSerializer

User = get_user_model()


# ----- Users & roles -------------------------------------------------------

class AdminUserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = AdminUserSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'name']
    ordering_fields = ['created_at', 'name', 'email', 'role']

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        active = self.request.query_params.get('is_active')
        if active in ('true', '1', 'false', '0'):
            qs = qs.filter(is_active=active in ('true', '1'))
        return qs

    def perform_create(self, serializer):
        user = serializer.save()
        record_audit(self.request, 'user.create', user.email, role=user.role)


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsSuperAdmin]

    def perform_update(self, serializer):
        user = serializer.save()
        record_audit(self.request, 'user.update', user.email,
                     role=user.role, is_active=user.is_active)

    def perform_destroy(self, instance):
        # Soft-delete: deactivate rather than drop the row so history/audit and
        # any foreign keys stay intact.
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        record_audit(self.request, 'user.deactivate', instance.email)


# ----- Tenants -------------------------------------------------------------

class TenantListCreateView(generics.ListCreateAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        tenant = serializer.save()
        record_audit(self.request, 'tenant.create', tenant.name, plan=tenant.plan)


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsSuperAdmin]

    def perform_update(self, serializer):
        tenant = serializer.save()
        record_audit(self.request, 'tenant.update', tenant.name, status=tenant.status)

    def perform_destroy(self, instance):
        record_audit(self.request, 'tenant.delete', instance.name)
        instance.delete()


# ----- Audit log -----------------------------------------------------------

class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['actor_email', 'action', 'resource']
    ordering_fields = ['created_at']


# ----- System health -------------------------------------------------------

def _configured(value):
    return 'operational' if value else 'down'


class SystemHealthView(APIView):
    # Managers may view read-only health; only super admins mutate elsewhere.
    permission_classes = [IsManager]

    @extend_schema(
        responses=OpenApiTypes.OBJECT,
        summary='Platform counts and service status',
    )
    def get(self, request):
        from apps.leads.models import Lead
        from apps.campaigns.models import Campaign
        from apps.calls.models import Call
        from django.conf import settings

        # Live DB check.
        try:
            with connection.cursor() as cur:
                cur.execute('SELECT 1')
            db_status = 'operational'
        except Exception:
            db_status = 'down'

        counts = {
            'users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'leads': Lead.objects.count(),
            'campaigns': Campaign.objects.count(),
            'calls': Call.objects.count(),
            'meetings': Lead.objects.filter(meeting_requested=True).count(),
        }

        services = [
            {'name': 'Database', 'status': db_status,
             'detail': connection.vendor},
            {'name': 'Web API', 'status': 'operational', 'detail': 'Django + DRF'},
            {'name': 'OpenAI Realtime', 'status': _configured(settings.OPENAI_API_KEY),
             'detail': settings.OPENAI_REALTIME_MODEL},
            {'name': 'Exotel Telephony', 'status': _configured(settings.EXOTEL_API_KEY),
             'detail': settings.EXOTEL_API_HOST},
            {'name': 'ElevenLabs Voice', 'status': _configured(settings.ELEVENLABS_API_KEY),
             'detail': settings.ELEVENLABS_MODEL},
            {'name': 'Email', 'status': 'operational' if settings.EMAIL_HOST else 'degraded',
             'detail': 'SMTP' if settings.EMAIL_HOST else 'console (dev)'},
        ]

        return Response({
            'counts': counts,
            'services': services,
            'generated_at': timezone.now().isoformat(),
        })


# ----- Roles & access ------------------------------------------------------

# Mirrors the real backend gates: `role == 'super_admin'` (IsSuperAdmin) and
# `role in {super_admin, manager}` (IsManager). Presented as a permission
# matrix so admins can see, at a glance, what each role can reach.
ROLE_DEFINITIONS = [
    {
        'key': 'super_admin',
        'label': 'Super Admin',
        'description': 'Full platform control: users, tenants, audit, and all data.',
    },
    {
        'key': 'manager',
        'label': 'Manager',
        'description': 'Operational access plus read-only system health.',
    },
    {
        'key': 'bd_executive',
        'label': 'BD Executive',
        'description': 'Day-to-day calling: leads, campaigns, dialer, conversations.',
    },
]

# permission -> set of roles that hold it.
PERMISSION_MATRIX = [
    ('admin.users.manage', ['super_admin']),
    ('admin.tenants.manage', ['super_admin']),
    ('admin.audit.view', ['super_admin']),
    ('admin.system.view', ['super_admin', 'manager']),
    ('leads.manage', ['super_admin', 'manager', 'bd_executive']),
    ('campaigns.manage', ['super_admin', 'manager', 'bd_executive']),
    ('calls.operate', ['super_admin', 'manager', 'bd_executive']),
    ('analytics.view', ['super_admin', 'manager']),
]


class RolesView(APIView):
    permission_classes = [IsManager]

    @extend_schema(responses=OpenApiTypes.OBJECT, summary='Roles and permission matrix')
    def get(self, request):
        counts = {
            r['key']: User.objects.filter(role=r['key']).count()
            for r in ROLE_DEFINITIONS
        }
        roles = [
            {**r, 'user_count': counts.get(r['key'], 0)}
            for r in ROLE_DEFINITIONS
        ]
        permissions = [
            {'key': perm, 'roles': roles_with}
            for perm, roles_with in PERMISSION_MATRIX
        ]
        return Response({'roles': roles, 'permissions': permissions})
