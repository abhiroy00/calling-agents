import asyncio
import json
from typing import AsyncGenerator, List, Dict
from openai import AsyncOpenAI, OpenAI
from django.conf import settings


def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def get_sync_client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_response_sync(messages: List[Dict], system_prompt: str) -> str:
    client = get_sync_client()
    full_messages = [{'role': 'system', 'content': system_prompt}] + messages
    response = client.chat.completions.create(
        model='gpt-4o',
        messages=full_messages,
        temperature=0.7,
        max_tokens=200,
    )
    return response.choices[0].message.content.strip()


def detect_disposition_sync(transcript_text: str) -> str:
    client = get_sync_client()
    prompt = (
        'Based on this call transcript, classify the outcome as exactly one of: '
        'interested, not_interested, callback, no_answer, voicemail. '
        'Reply with only the classification word.\n\n'
        f'Transcript:\n{transcript_text}'
    )
    response = client.chat.completions.create(
        model='gpt-4o',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=10,
        temperature=0,
    )
    result = response.choices[0].message.content.strip().lower()
    valid = {'interested', 'not_interested', 'callback', 'no_answer', 'voicemail'}
    return result if result in valid else 'not_interested'


async def stream_response(
    messages: List[Dict],
    system_prompt: str,
) -> AsyncGenerator[str, None]:
    client = get_client()
    full_messages = [{'role': 'system', 'content': system_prompt}] + messages
    stream = await client.chat.completions.create(
        model='gpt-4o',
        messages=full_messages,
        stream=True,
        temperature=0.7,
        max_tokens=300,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


def extract_call_data_sync(transcript_text: str, fields: List[Dict]) -> Dict:
    """Extract campaign-configured fields from a call transcript.

    `fields` is a list of {"key", "description"} objects. Returns a dict:
      {"data": {<key>: <value|null>, ...}, "summary": str, "follow_up_needed": bool}
    Values the caller never provided come back as null. Never raises — on any
    error it returns empty data so the caller can still send a basic summary.
    """
    field_lines = '\n'.join(
        f'- {f.get("key")}: {f.get("description", "")}' for f in fields if f.get('key')
    )
    keys = [f['key'] for f in fields if f.get('key')]

    prompt = (
        'You are analyzing a phone call transcript between an AI agent and a lead. '
        'The call may be in English, Hindi, or Hinglish. '
        'Extract the following fields. If a field was not discussed, use null.\n\n'
        f'Fields to extract:\n{field_lines or "(none)"}\n\n'
        'Respond with a JSON object with exactly these keys:\n'
        '  "data": an object mapping each field key '
        f'({", ".join(keys) or "no keys"}) to its extracted value or null,\n'
        '  "summary": a 1-2 sentence English summary of the call,\n'
        '  "follow_up_needed": true if the lead expects a follow-up email or callback, else false.\n\n'
        f'Transcript:\n{transcript_text}'
    )

    try:
        client = get_sync_client()
        response = client.chat.completions.create(
            model='gpt-4o',
            messages=[{'role': 'user', 'content': prompt}],
            response_format={'type': 'json_object'},
            temperature=0,
            max_tokens=600,
        )
        parsed = json.loads(response.choices[0].message.content)
    except Exception:
        return {'data': {k: None for k in keys}, 'summary': '', 'follow_up_needed': False}

    data = parsed.get('data') or {}
    # Guarantee every configured key is present.
    data = {k: data.get(k) for k in keys}
    return {
        'data': data,
        'summary': (parsed.get('summary') or '').strip(),
        'follow_up_needed': bool(parsed.get('follow_up_needed')),
    }


def generate_followup_email_sync(
    transcript_text: str,
    lead_name: str,
    instructions: str,
    collected: Dict,
) -> Dict:
    """Compose a follow-up email to send to the lead.

    Returns {"subject": str, "body": str}. Returns empty strings on failure so
    the caller can skip sending.
    """
    prompt = (
        'Write a short, warm, professional follow-up email to a lead after a phone call. '
        f"The lead's name is {lead_name or 'there'}. "
        'Write in the same language the lead used on the call (English or Hindi; '
        'if unsure, use English). Do not invent facts not supported by the transcript.\n\n'
        f'Instructions for this email:\n{instructions or "Thank them and offer next steps."}\n\n'
        f'Data collected on the call: {json.dumps(collected, ensure_ascii=False)}\n\n'
        'Respond with a JSON object: {"subject": "...", "body": "..."}. '
        'The body should be plain text with line breaks, signed generically.\n\n'
        f'Transcript:\n{transcript_text}'
    )
    try:
        client = get_sync_client()
        response = client.chat.completions.create(
            model='gpt-4o',
            messages=[{'role': 'user', 'content': prompt}],
            response_format={'type': 'json_object'},
            temperature=0.5,
            max_tokens=600,
        )
        parsed = json.loads(response.choices[0].message.content)
        return {
            'subject': (parsed.get('subject') or '').strip(),
            'body': (parsed.get('body') or '').strip(),
        }
    except Exception:
        return {'subject': '', 'body': ''}


async def detect_disposition(transcript_text: str) -> str:
    client = get_client()
    prompt = (
        'Based on this call transcript, classify the outcome as exactly one of: '
        'interested, not_interested, callback, no_answer, voicemail. '
        'Reply with only the classification word.\n\n'
        f'Transcript:\n{transcript_text}'
    )
    response = await client.chat.completions.create(
        model='gpt-4o',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=10,
        temperature=0,
    )
    result = response.choices[0].message.content.strip().lower()
    valid = {'interested', 'not_interested', 'callback', 'no_answer', 'voicemail'}
    return result if result in valid else 'not_interested'
