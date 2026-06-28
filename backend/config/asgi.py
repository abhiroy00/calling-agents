import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from apps.calls.consumers import RelayConsumer, LiveConsumer

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter([
            path('ws/relay/<str:call_id>/', RelayConsumer.as_asgi()),
            path('ws/calls/', LiveConsumer.as_asgi()),
        ])
    ),
})
