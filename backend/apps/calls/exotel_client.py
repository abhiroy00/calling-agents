import xml.sax.saxutils as saxutils
import requests
from django.conf import settings


def dial(lead, campaign, call_id: int) -> str:
    url = (
        f'https://api.exotel.com/v1/Accounts/{settings.EXOTEL_SID}'
        f'/Calls/connect.json'
    )
    resp = requests.post(
        url,
        auth=(settings.EXOTEL_API_KEY, settings.EXOTEL_API_SECRET),
        data={
            'From': settings.EXOTEL_FROM_NUMBER,
            'To': lead.phone,
            'CallerId': settings.EXOTEL_FROM_NUMBER,
            'Url': f'https://{settings.PUBLIC_HOST}/api/calls/{call_id}/exoml/',
            'Method': 'POST',
            'StatusCallback': f'https://{settings.PUBLIC_HOST}/api/calls/{call_id}/status/',
            'StatusCallbackMethod': 'POST',
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()['Call']['Sid']


def build_exoml_gather(call_id: int, say_text: str) -> str:
    gather_url = f'https://{settings.PUBLIC_HOST}/api/calls/{call_id}/gather/'
    safe_text = saxutils.escape(say_text)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Gather input="speech" action="{gather_url}" method="POST"'
        ' timeout="5" speechTimeout="auto">\n'
        f'    <Say>{safe_text}</Say>\n'
        '  </Gather>\n'
        '  <Hangup/>\n'
        '</Response>'
    )


def build_exoml_say_hangup(say_text: str) -> str:
    safe_text = saxutils.escape(say_text)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Say>{safe_text}</Say>\n'
        '  <Hangup/>\n'
        '</Response>'
    )
