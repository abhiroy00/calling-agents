from django.urls import path
from .views import (
    AdminUserListCreateView,
    AdminUserDetailView,
    TenantListCreateView,
    TenantDetailView,
    AuditLogListView,
    SystemHealthView,
    RolesView,
)

urlpatterns = [
    path('users/', AdminUserListCreateView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('tenants/', TenantListCreateView.as_view(), name='admin-tenant-list'),
    path('tenants/<int:pk>/', TenantDetailView.as_view(), name='admin-tenant-detail'),
    path('audit/', AuditLogListView.as_view(), name='admin-audit-list'),
    path('system/', SystemHealthView.as_view(), name='admin-system'),
    path('roles/', RolesView.as_view(), name='admin-roles'),
]
