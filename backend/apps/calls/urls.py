from django.urls import path
from .views import (
    CallListView, CallDetailView,
    ExoMLWebhookView, GatherView, StatusCallbackView,
    ManualDialView,
)

urlpatterns = [
    path('', CallListView.as_view(), name='call-list'),
    path('manual-dial/', ManualDialView.as_view(), name='manual-dial'),
    path('<int:pk>/', CallDetailView.as_view(), name='call-detail'),
    path('<int:pk>/exoml/', ExoMLWebhookView.as_view(), name='call-exoml'),
    path('<int:pk>/gather/', GatherView.as_view(), name='call-gather'),
    path('<int:pk>/status/', StatusCallbackView.as_view(), name='call-status'),
]
