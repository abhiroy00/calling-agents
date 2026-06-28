from django.urls import path
from .views import CallListView, CallDetailView, TwiMLWebhookView, ManualDialView

urlpatterns = [
    path('', CallListView.as_view(), name='call-list'),
    path('manual-dial/', ManualDialView.as_view(), name='manual-dial'),
    path('<int:pk>/', CallDetailView.as_view(), name='call-detail'),
    path('<int:pk>/twiml/', TwiMLWebhookView.as_view(), name='call-twiml'),
]
