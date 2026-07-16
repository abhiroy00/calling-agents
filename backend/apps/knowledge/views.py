"""Website chatbot endpoint: answers questions from the RAG knowledge base.

Public (the widget on codingnowai.in calls it without login); CORS decides
which origins may reach it.
"""
import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings

from .retrieval import search

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """You are the assistant for codingnowai.in, a coding/AI \
training institute in Delhi NCR. Answer the user's question using ONLY the \
context passages below. If the answer is not in the context, say you don't \
have that information and suggest calling +91 7464099059 or emailing \
info@codingnowai.in. Be concise and friendly. Reply in the user's language \
(English or Hindi/Hinglish)."""

MAX_HISTORY = 6


class ChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        question = (request.data.get('question') or '').strip()
        if not question:
            return Response({'error': 'question is required'},
                            status=status.HTTP_400_BAD_REQUEST)
        history = request.data.get('history') or []
        if not isinstance(history, list):
            history = []

        hits = search(question)
        if not hits:
            return Response({
                'answer': "I don't have information about that. Please call "
                          '+91 7464099059 or email info@codingnowai.in.',
                'sources': [],
            })

        context = '\n\n'.join(
            f"[{h['title'] or h['url']}]\n{h['text']}" for h in hits)
        messages = [{'role': 'system',
                     'content': f'{CHAT_SYSTEM_PROMPT}\n\nContext:\n{context}'}]
        for turn in history[-MAX_HISTORY:]:
            role = turn.get('role')
            content = (turn.get('content') or '').strip()
            if role in ('user', 'assistant') and content:
                messages.append({'role': role, 'content': content})
        messages.append({'role': 'user', 'content': question})

        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        try:
            resp = client.chat.completions.create(
                model='gpt-4o-mini', temperature=0.3, messages=messages)
        except Exception:
            logger.exception('knowledge chat completion failed')
            return Response({'error': 'chat backend unavailable'},
                            status=status.HTTP_502_BAD_GATEWAY)

        seen, sources = set(), []
        for h in hits:
            if h['url'] and h['url'] not in seen:
                seen.add(h['url'])
                sources.append({'url': h['url'], 'title': h['title']})
        return Response({
            'answer': resp.choices[0].message.content,
            'sources': sources,
        })
