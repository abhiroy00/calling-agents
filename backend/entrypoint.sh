#!/bin/sh
set -e

# Wait for postgres to be ready (skipped if DATABASE_URL is unset)
if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for postgres..."
  until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.environ['DATABASE_URL'])
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    sleep 1
  done
  echo "Postgres is ready."
fi

# Always run migrations (idempotent — safe for all services)
python manage.py migrate --noinput

# Only the web (daphne) container collects static files
if [ "$1" = "daphne" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

exec "$@"
