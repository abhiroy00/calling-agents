"""Crawl codingnowai.in into clean text pages for the RAG knowledge base.

Sitemap-driven: reads sitemap.xml (falls back to BFS from the homepage),
fetches every same-domain HTML page, strips boilerplate, and writes one JSON
object per page to knowledge_data/pages.jsonl.

The site has hundreds of near-duplicate local-SEO pages
("best-X-course-in-<area>.php"); those dilute retrieval, so /locations/ URLs
are skipped and exact-duplicate page bodies are dropped.
"""
import hashlib
import json
import logging
import re
import time
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse
from xml.etree import ElementTree

import requests
from bs4 import BeautifulSoup
from django.conf import settings

logger = logging.getLogger(__name__)

HEADERS = {'User-Agent': 'CodingNowAI-KnowledgeBot/1.0 (+https://codingnowai.in)'}
FETCH_DELAY = 0.2  # be polite to the site
SKIP_PATH_PARTS = ('/locations/',)
SKIP_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf',
                   '.zip', '.mp4', '.css', '.js', '.ico', '.xml')
BOILERPLATE_TAGS = ('script', 'style', 'noscript', 'nav', 'header', 'footer',
                    'form', 'iframe', 'svg')
MIN_PAGE_CHARS = 200


def data_dir() -> Path:
    d = Path(settings.KNOWLEDGE_DATA_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d


def pages_path() -> Path:
    return data_dir() / 'pages.jsonl'


def _fetch(url: str) -> requests.Response | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        if resp.status_code == 200:
            return resp
        logger.warning('HTTP %s for %s', resp.status_code, url)
    except requests.RequestException as exc:
        logger.warning('fetch failed for %s: %s', url, exc)
    return None


def _wanted(url: str, host: str) -> bool:
    parsed = urlparse(url)
    if parsed.netloc and parsed.netloc != host:
        return False
    path = parsed.path.lower()
    if any(part in path for part in SKIP_PATH_PARTS):
        return False
    return not path.endswith(SKIP_EXTENSIONS)


def sitemap_urls(site_url: str) -> list[str]:
    """All page URLs from sitemap.xml (handles sitemap-index files too)."""
    host = urlparse(site_url).netloc
    queue = [urljoin(site_url, '/sitemap.xml')]
    urls: list[str] = []
    seen_maps = set()
    while queue:
        sm = queue.pop()
        if sm in seen_maps:
            continue
        seen_maps.add(sm)
        resp = _fetch(sm)
        if resp is None:
            continue
        try:
            root = ElementTree.fromstring(resp.content)
        except ElementTree.ParseError:
            logger.warning('sitemap %s is not valid XML', sm)
            continue
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        for loc in root.findall('.//s:sitemap/s:loc', ns):
            queue.append(loc.text.strip())
        for loc in root.findall('.//s:url/s:loc', ns):
            url = urldefrag(loc.text.strip())[0]
            if _wanted(url, host):
                urls.append(url)
    return list(dict.fromkeys(urls))  # dedupe, keep order


def _clean_page(html: str) -> tuple[str, str]:
    """Return (title, cleaned text) for one page's HTML."""
    soup = BeautifulSoup(html, 'lxml')
    title = (soup.title.string or '').strip() if soup.title else ''
    for tag in soup(BOILERPLATE_TAGS):
        tag.decompose()
    main = soup.find('main') or soup.find('article') or soup.body or soup
    text = main.get_text(separator='\n')
    lines = [re.sub(r'\s+', ' ', ln).strip() for ln in text.splitlines()]
    # Drop menu crumbs: ultra-short repeated lines add noise, not knowledge.
    lines = [ln for ln in lines if len(ln) > 2]
    return title, '\n'.join(lines)


def _bfs_urls(site_url: str, limit: int = 500) -> list[str]:
    """Fallback discovery when there is no sitemap: crawl same-domain links."""
    host = urlparse(site_url).netloc
    queue = [site_url]
    seen, urls = set(), []
    while queue and len(urls) < limit:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        resp = _fetch(url)
        if resp is None or 'text/html' not in resp.headers.get('content-type', ''):
            continue
        urls.append(url)
        soup = BeautifulSoup(resp.text, 'lxml')
        for a in soup.find_all('a', href=True):
            nxt = urldefrag(urljoin(url, a['href']))[0]
            if nxt not in seen and _wanted(nxt, host):
                queue.append(nxt)
        time.sleep(FETCH_DELAY)
    return urls


def crawl(site_url: str | None = None, progress=print) -> dict:
    """Crawl the site and write pages.jsonl. Returns summary counts."""
    site_url = site_url or settings.KNOWLEDGE_SITE_URL
    urls = sitemap_urls(site_url)
    source = 'sitemap'
    if not urls:
        source = 'bfs'
        urls = _bfs_urls(site_url)
    progress(f'{len(urls)} URLs to fetch (source: {source})')

    written, skipped_dupes, failed = 0, 0, 0
    seen_hashes = set()
    with open(pages_path(), 'w', encoding='utf-8') as out:
        for i, url in enumerate(urls, 1):
            resp = _fetch(url)
            if resp is None or 'text/html' not in resp.headers.get('content-type', ''):
                failed += 1
                continue
            title, text = _clean_page(resp.text)
            if len(text) < MIN_PAGE_CHARS:
                failed += 1
                continue
            body_hash = hashlib.sha256(text.encode()).hexdigest()
            if body_hash in seen_hashes:
                skipped_dupes += 1
                continue
            seen_hashes.add(body_hash)
            out.write(json.dumps({'url': url, 'title': title, 'text': text},
                                 ensure_ascii=False) + '\n')
            written += 1
            if i % 25 == 0:
                progress(f'  fetched {i}/{len(urls)} pages ({written} kept)')
            time.sleep(FETCH_DELAY)

    summary = {'urls': len(urls), 'written': written,
               'duplicates': skipped_dupes, 'failed_or_empty': failed}
    progress(f'done: {summary}')
    return summary
