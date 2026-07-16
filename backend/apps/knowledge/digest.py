"""Generate a compact knowledge digest for the calling agent's system prompt.

The digest holds the facts a counselor needs constantly (course list, fees,
batches, branches, contact, placement stats) so the agent answers common
questions instantly, using the RAG tool only for long-tail detail.
"""
import json
import logging

from django.conf import settings

from .crawler import data_dir
from .ingest import load_pages

logger = logging.getLogger(__name__)

# Pages most likely to hold counselor-critical facts. 'cources' is the site's
# own spelling of its courses directory.
PRIORITY_URL_PARTS = ('cources', 'course', 'fee', 'enroll', 'admission',
                      'contact', 'about', 'placement', 'batch')
INPUT_CHAR_BUDGET = 120_000  # ~30k tokens of source text for the summarizer

DIGEST_PROMPT = """You are preparing a fact sheet for a phone counselor at \
CodingNowAI (codingnowai.in), a coding/AI training institute in Delhi NCR.
From the website text below, produce a compact digest (max ~700 words) with:
- Complete list of courses offered (grouped: AI/Data, Full Stack, Cloud, \
Cybersecurity, other), each with duration and fees IF stated
- Batch options / schedules / online-offline modes if stated
- Placement facts (stats, hiring partners, highest package) if stated
- Branch locations and full contact details (phone, email, address)
- Enrollment process steps if stated
Rules: include ONLY facts present in the text; never guess numbers; if fees \
are not stated for a course, omit fees for it. Plain text, short lines."""


def digest_path():
    return data_dir() / 'digest.txt'


def load_digest() -> str:
    path = digest_path()
    return path.read_text(encoding='utf-8') if path.exists() else ''


def generate_digest(progress=print) -> str:
    from openai import OpenAI

    pages = load_pages()
    pages.sort(key=lambda p: (not any(part in p['url'].lower()
                                      for part in PRIORITY_URL_PARTS)))
    corpus, used = [], 0
    for page in pages:
        block = f"### {page['title']} ({page['url']})\n{page['text']}\n"
        if used + len(block) > INPUT_CHAR_BUDGET:
            continue
        corpus.append(block)
        used += len(block)
    progress(f'summarizing {len(corpus)} pages ({used} chars)')

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        temperature=0,
        messages=[
            {'role': 'system', 'content': DIGEST_PROMPT},
            {'role': 'user', 'content': '\n'.join(corpus)},
        ],
    )
    text = resp.choices[0].message.content.strip()
    digest_path().write_text(text, encoding='utf-8')
    progress(f'digest written: {len(text)} chars -> {digest_path()}')
    return text
