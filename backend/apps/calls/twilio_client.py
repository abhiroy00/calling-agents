from django.conf import settings
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect, ConversationRelay


def get_client() -> Client:
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def build_twiml(call_id: int, welcome: str = '') -> str:
    response = VoiceResponse()
    connect = Connect()
    relay = ConversationRelay(
        url=f'wss://{settings.PUBLIC_HOST}/ws/relay/{call_id}/',
    )
    if welcome:
        relay.welcome_greeting = welcome
    connect.append(relay)
    response.append(connect)
    return str(response)


def dial(lead, campaign, call_id: int) -> str:
    client = get_client()
    twiml_url = f'https://{settings.PUBLIC_HOST}/api/calls/{call_id}/twiml/'
    call = client.calls.create(
        to=lead.phone,
        from_=settings.TWILIO_FROM_NUMBER,
        url=twiml_url,
        method='POST',
    )
    return call.sid
