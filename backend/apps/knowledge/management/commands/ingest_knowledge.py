from django.core.management.base import BaseCommand

from apps.knowledge.digest import generate_digest
from apps.knowledge.ingest import ingest


class Command(BaseCommand):
    help = ('Embed crawled pages into ChromaDB and regenerate the counselor '
            'digest (run crawl_site first)')

    def add_arguments(self, parser):
        parser.add_argument('--skip-digest', action='store_true',
                            help='Only embed; do not regenerate digest.txt')

    def handle(self, *args, **options):
        ingest(progress=self.stdout.write)
        if not options['skip_digest']:
            generate_digest(progress=self.stdout.write)
