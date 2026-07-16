"""Semantic search over the CodingNowAI knowledge base.

`search()` is the single entry point shared by the website chatbot endpoint
and the calling agent's search_knowledge_base tool.
"""
import logging
from functools import lru_cache

from django.conf import settings

logger = logging.getLogger(__name__)

TOP_K = 4
# Cosine relevance below this is treated as "the site doesn't cover it";
# answering from weaker matches is how hallucinations sneak in.
MIN_RELEVANCE = 0.25


@lru_cache(maxsize=1)
def get_vectorstore():
    from langchain_chroma import Chroma
    from langchain_openai import OpenAIEmbeddings

    return Chroma(
        collection_name='codingnowai',
        persist_directory=str(settings.KNOWLEDGE_CHROMA_DIR),
        embedding_function=OpenAIEmbeddings(
            model=settings.KNOWLEDGE_EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        ),
    )


def search(query: str, k: int = TOP_K) -> list[dict]:
    """Top-k relevant chunks as [{text, url, title, score}], best first."""
    results = get_vectorstore().similarity_search_with_relevance_scores(query, k=k)
    hits = []
    for doc, score in results:
        if score < MIN_RELEVANCE:
            continue
        hits.append({
            'text': doc.page_content,
            'url': doc.metadata.get('url', ''),
            'title': doc.metadata.get('title', ''),
            'score': round(score, 3),
        })
    return hits


def search_as_context(query: str, k: int = TOP_K) -> str:
    """Search formatted as a context block for LLM prompts ('' if no match)."""
    hits = search(query, k=k)
    return '\n\n'.join(
        f"[Source: {h['title'] or h['url']}]\n{h['text']}" for h in hits
    )
