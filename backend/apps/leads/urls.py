from django.urls import path
from .views import LeadListView, BulkUploadView

urlpatterns = [
    path('', LeadListView.as_view(), name='lead-list'),
    path('bulk/', BulkUploadView.as_view(), name='lead-bulk'),
]
