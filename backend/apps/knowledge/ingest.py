"""Chunk crawled pages, embed them with OpenAI, and upsert into ChromaDB.

Idempotent: chunk IDs are content hashes, so re-running after a re-crawl only
embeds new/changed chunks and removes chunks whose content disappeared.
"""
import hashlib
import json
import logging

from langchain_text_splitters import RecursiveCharacterTextSplitter

from .crawler import pages_path
from .retrieval import get_vectorstore

logger = logging.getLogger(__name__)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def _chunk_id(text: str, url: str) -> str:
    return hashlib.sha256(f'{url}\n{text}'.encode()).hexdigest()[:32]


def load_pages() -> list[dict]:
    path = pages_path()
    if not path.exists():
        raise FileNotFoundError(
            f'{path} not found — run the crawler first (manage.py crawl_site)')
    with open(path, encoding='utf-8') as f:
        return [json.loads(line) for line in f if line.strip()]


def ingest(progress=print) -> dict:
    pages = load_pages()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)

    ids, texts, metadatas = [], [], []
    for page in pages:
        for chunk in splitter.split_text(page['text']):
            cid = _chunk_id(chunk, page['url'])
            if cid in set(ids):
                continue
            ids.append(cid)
            texts.append(chunk)
            metadatas.append({'url': page['url'], 'title': page['title']})
    progress(f'{len(pages)} pages -> {len(texts)} chunks')

    store = get_vectorstore()
    existing = set(store.get(include=[])['ids'])
    new_ids = [i for i in ids if i not in existing]
    stale = existing - set(ids)

    if new_ids:
        keep = set(new_ids)
        batch = [(i, t, m) for i, t, m in zip(ids, texts, metadatas) if i in keep]
        # Embed in batches so one network hiccup doesn't lose everything.
        for start in range(0, len(batch), 100):
            part = batch[start:start + 100]
            store.add_texts(
                texts=[t for _, t, _ in part],
                metadatas=[m for _, _, m in part],
                ids=[i for i, _, _ in part],
            )
            progress(f'  embedded {min(start + 100, len(batch))}/{len(batch)} new chunks')
    if stale:
        store.delete(ids=list(stale))

    summary = {'chunks': len(texts), 'added': len(new_ids),
               'removed_stale': len(stale),
               'unchanged': len(texts) - len(new_ids)}
    progress(f'done: {summary}')
    return summary
