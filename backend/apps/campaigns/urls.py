from django.urls import path
from .views import (
    CampaignListCreateView, CampaignDetailView,
    CampaignStartView, CampaignPauseView, CampaignStopView,
    CampaignAddLeadsView,
)

urlpatterns = [
    path('', CampaignListCreateView.as_view(), name='campaign-list'),
    path('<int:pk>/', CampaignDetailView.as_view(), name='campaign-detail'),
    path('<int:pk>/start/', CampaignStartView.as_view(), name='campaign-start'),
    path('<int:pk>/pause/', CampaignPauseView.as_view(), name='campaign-pause'),
    path('<int:pk>/stop/', CampaignStopView.as_view(), name='campaign-stop'),
    path('<int:pk>/add-leads/', CampaignAddLeadsView.as_view(), name='campaign-add-leads'),
]
