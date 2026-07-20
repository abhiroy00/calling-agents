import requests
from django.conf import settings


def _api_host() -> str:
    """Exotel API host for the account's cluster.

    Singapore is api.exotel.com; Mumbai/India is api.in.exotel.com. Set
    EXOTEL_API_HOST in .env to match where the account lives — an Indian
    account queried on the Singapore host returns auth/not-found errors.
    """
    return getattr(settings, 'EXOTEL_API_HOST', '') or 'api.exotel.com'


def _account_base() -> str:
    return f'https://{_api_host()}/v1/Accounts/{settings.EXOTEL_SID}'


def _raise_for_exotel(resp):
    if resp.status_code >= 400:
        try:
            message = resp.json()['RestException']['Message']
        except (ValueError, KeyError):
            message = resp.text[:300]
        raise RuntimeError(f'Exotel error {resp.status_code}: {message}')


def number_metadata(phone_number: str) -> dict:
    """Telecom info for an Indian number: circle, operator, type, DND.

    Returns the raw Exotel 'Numbers' object. India-only; Exotel 404s or errors
    for non-Indian numbers, which surfaces as RuntimeError.
    """
    number = (phone_number or '').strip()
    if not number:
        raise ValueError('phone_number is required')
    # The path segment must be the bare national number; Exotel does not accept
    # a leading '+' or country code here.
    number = number.lstrip('+')
    if number.startswith('91') and len(number) > 10:
        number = number[2:]
    resp = requests.get(
        f'{_account_base()}/Numbers/{number}.json',
        auth=(settings.EXOTEL_API_KEY, settings.EXOTEL_API_SECRET),
        timeout=20,
    )
    _raise_for_exotel(resp)
    return resp.json().get('Numbers', {})


def call_details(call_sid: str, recording_validity: int = 30) -> dict:
    """Fetch one call's details from Exotel, including a fresh recording URL.

    recording_validity (minutes, 5-60) asks Exotel to mint a presigned link
    valid for that long. Prefer PreSignedRecordingUrl (a temporary signed link,
    if enabled on the account) over the raw RecordingUrl, which may require auth
    or expire. Returns the raw 'Call' object.
    """
    sid = (call_sid or '').strip()
    if not sid:
        raise ValueError('call_sid is required')
    validity = max(5, min(60, int(recording_validity or 30)))
    resp = requests.get(
        f'{_account_base()}/Calls/{sid}.json',
        params={'RecordingUrlValidity': validity},
        auth=(settings.EXOTEL_API_KEY, settings.EXOTEL_API_SECRET),
        timeout=20,
    )
    _raise_for_exotel(resp)
    return resp.json().get('Call', {})


def recording_url_for(call_sid: str, recording_validity: int = 30) -> str:
    """Best available playable recording URL for a call, or '' if none."""
    call = call_details(call_sid, recording_validity)
    return (call.get('PreSignedRecordingUrl')
            or call.get('RecordingUrl') or '').strip()


def dial(lead, campaign, call_id: int) -> str:
    # Exotel connects outbound calls to a flow built in its dashboard (App Bazaar);
    # it does not fetch call-control XML from external URLs.
    if not settings.EXOTEL_APP_ID:
        raise RuntimeError(
            'EXOTEL_APP_ID is not set. Open your flow in the Exotel App Bazaar '
            'and copy the numeric id from the URL into backend/.env.'
        )
    url = f'{_account_base()}/Calls/connect.json'
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
            # Ask Exotel to record the call so the recording URL is delivered on
            # the terminal status callback (harmless if the flow already records).
            'Record': 'true',
            # Echoed back in the Voicebot stream's start event so the media
            # consumer can map the stream to our Call row.
            'CustomField': f'call_id={call_id}',
            'StatusCallback': f'https://{settings.PUBLIC_HOST}/api/calls/{call_id}/status/',
        },
        timeout=30,
    )
    _raise_for_exotel(resp)
    return resp.json()['Call']['Sid']
