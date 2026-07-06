import xml.sax.saxutils as saxutils
import requests
from django.conf import settings


def dial(lead, campaign, call_id: int) -> str:
    # Exotel connects outbound calls to a flow built in its dashboard (App Bazaar);
    # it does not fetch call-control XML from external URLs.
    if not settings.EXOTEL_APP_ID:
        raise RuntimeError(
            'EXOTEL_APP_ID is not set. Open your flow in the Exotel App Bazaar '
            'and copy the numeric id from the URL into backend/.env.'
        )
    url = (
        f'https://api.exotel.com/v1/Accounts/{settings.EXOTEL_SID}'
        f'/Calls/connect.json'
    )
    flow_url = (
        f'http://my.exotel.com/{settings.EXOTEL_SID}'
        f'/exoml/start_voice/{settings.EXOTEL_APP_ID}'
    )
    resp = requests.post(
        url,
        auth=(settings.EXOTEL_API_KEY, settings.EXOTEL_API_SECRET),
        data={
            'From': lead.phone,
            'CallerId': settings.EXOTEL_FROM_NUMBER,
            'Url': flow_url,
            'CallType': 'trans',
            'StatusCallback': f'https://{settings.PUBLIC_HOST}/api/calls/{call_id}/status/',
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        try:
            message = resp.json()['RestException']['Message']
        except (ValueError, KeyError):
            message = resp.text[:300]
        raise RuntimeError(f'Exotel error {resp.status_code}: {message}')
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
