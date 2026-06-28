import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .llm import stream_response, detect_disposition


class RelayConsumer(AsyncWebsocketConsumer):
    """Handles Twilio ConversationRelay WebSocket for a single call."""

    async def connect(self):
        self.call_id = self.scope['url_route']['kwargs']['call_id']
        self.messages = []
        self.stream_task = None

        await self.accept()

        try:
            self.call, self.system_prompt = await self.load_call()
        except Exception:
            self.call = None
            self.system_prompt = 'You are a helpful AI assistant on a phone call. Be concise and friendly.'
        await self.update_call_status('in_progress')
        await self.broadcast_status('in_progress')

    async def disconnect(self, code):
        if self.stream_task and not self.stream_task.done():
            self.stream_task.cancel()
        await self.finalize_call()

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type') or data.get('event')

        if event_type == 'prompt':
            speech = data.get('voicePrompt') or data.get('prompt', '')
            if speech:
                await self.save_transcript('human', speech)
                await self.broadcast_transcript('human', speech)
                if self.stream_task and not self.stream_task.done():
                    self.stream_task.cancel()
                self.messages.append({'role': 'user', 'content': speech})
                self.stream_task = asyncio.create_task(self.respond())

        elif event_type == 'interrupt':
            if self.stream_task and not self.stream_task.done():
                self.stream_task.cancel()

        elif event_type in ('end', 'disconnect', 'close'):
            await self.close()

    async def respond(self):
        collected = []
        try:
            async for token in stream_response(self.messages, self.system_prompt):
                collected.append(token)
                await self.send(text_data=json.dumps({'type': 'text', 'token': token}))
        except asyncio.CancelledError:
            return
        ai_text = ''.join(collected)
        if ai_text:
            self.messages.append({'role': 'assistant', 'content': ai_text})
            await self.save_transcript('ai', ai_text)
            await self.broadcast_transcript('ai', ai_text)

    async def finalize_call(self):
        transcript_text = '\n'.join(
            f"{m['role'].upper()}: {m['content']}" for m in self.messages
        )
        disposition = 'no_answer'
        if transcript_text.strip():
            try:
                disposition = await detect_disposition(transcript_text)
            except Exception:
                pass
        await self.update_call_ended(disposition)
        await self.broadcast_status('completed', disposition)

    async def live_update(self, event):
        await self.send(text_data=json.dumps(event['data']))

    # ── DB helpers ──────────────────────────────────────────────────────────────

    @database_sync_to_async
    def load_call(self):
        from .models import Call
        call = Call.objects.select_related('campaign').get(pk=self.call_id)
        if call.system_prompt:
            system_prompt = call.system_prompt
        elif call.campaign:
            system_prompt = call.campaign.system_prompt
        else:
            system_prompt = 'You are a helpful AI assistant making a call.'
        return call, system_prompt

    @database_sync_to_async
    def update_call_status(self, status):
        from .models import Call
        Call.objects.filter(pk=self.call_id).update(
            status=status,
            started_at=timezone.now(),
        )

    @database_sync_to_async
    def update_call_ended(self, disposition):
        from .models import Call
        now = timezone.now()
        call = Call.objects.get(pk=self.call_id)
        duration = int((now - call.started_at).total_seconds()) if call.started_at else 0
        Call.objects.filter(pk=self.call_id).update(
            status='completed',
            disposition=disposition,
            ended_at=now,
            duration=duration,
        )

    @database_sync_to_async
    def save_transcript(self, role, text):
        from .models import Transcript
        Transcript.objects.create(call_id=self.call_id, role=role, text=text)

    async def broadcast_status(self, status, disposition=None):
        payload = {'type': 'call.status', 'call_id': self.call_id, 'status': status}
        if disposition:
            payload['disposition'] = disposition
        try:
            await self.channel_layer.group_send('live_calls', {
                'type': 'live_update',
                'data': payload,
            })
        except Exception:
            pass

    async def broadcast_transcript(self, role, text):
        try:
            await self.channel_layer.group_send('live_calls', {
                'type': 'live_update',
                'data': {'type': 'call.transcript', 'call_id': self.call_id, 'role': role, 'text': text},
            })
        except Exception:
            pass


class LiveConsumer(AsyncWebsocketConsumer):
    """Frontend WebSocket — broadcasts live call events to all connected clients."""

    async def connect(self):
        await self.channel_layer.group_add('live_calls', self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard('live_calls', self.channel_name)

    async def live_update(self, event):
        await self.send(text_data=json.dumps(event['data']))
