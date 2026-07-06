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
            # Echoed back in the Voicebot stream's start event so the media
            # consumer can map the stream to our Call row.
            'CustomField': f'call_id={call_id}',
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
