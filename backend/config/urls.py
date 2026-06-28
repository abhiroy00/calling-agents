from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/leads/', include('apps.leads.urls')),
    path('api/campaigns/', include('apps.campaigns.urls')),
    path('api/calls/', include('apps.calls.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]
