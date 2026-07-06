import json
from channels.generic.websocket import AsyncWebsocketConsumer


class LiveConsumer(AsyncWebsocketConsumer):
    """Frontend WebSocket — broadcasts live call events to all connected clients."""

    async def connect(self):
        await self.channel_layer.group_add('live_calls', self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard('live_calls', self.channel_name)

    async def live_update(self, event):
        await self.send(text_data=json.dumps(event['data']))
