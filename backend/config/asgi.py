import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from apps.calls.consumers import LiveConsumer
from apps.calls.media_consumer import ExotelMediaConsumer

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': URLRouter([
        # Exotel Voicebot applet connects here; no session auth involved.
        path('ws/exotel/media/', ExotelMediaConsumer.as_asgi()),
        path('ws/calls/', AuthMiddlewareStack(
            URLRouter([path('', LiveConsumer.as_asgi())])
        )),
    ]),
})
