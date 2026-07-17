from django.urls import path
from .views import (
    CallListView, CallDetailView, EndCallView,
    StatusCallbackView, ManualDialView,
)

urlpatterns = [
    path('', CallListView.as_view(), name='call-list'),
    path('manual-dial/', ManualDialView.as_view(), name='manual-dial'),
    path('<int:pk>/', CallDetailView.as_view(), name='call-detail'),
    path('<int:pk>/end/', EndCallView.as_view(), name='call-end'),
    path('<int:pk>/status/', StatusCallbackView.as_view(), name='call-status'),
]
