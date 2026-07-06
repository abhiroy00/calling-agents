import asyncio
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
