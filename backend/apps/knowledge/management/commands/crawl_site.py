from django.core.management.base import BaseCommand

from apps.knowledge.crawler import crawl


class Command(BaseCommand):
    help = 'Crawl the website into knowledge_data/pages.jsonl'

    def add_arguments(self, parser):
        parser.add_argument('--url', help='Override KNOWLEDGE_SITE_URL')

    def handle(self, *args, **options):
        crawl(site_url=options.get('url'), progress=self.stdout.write)
