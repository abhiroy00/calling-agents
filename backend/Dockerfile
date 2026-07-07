FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# uv resolves and installs packages far faster than pip.
# Installed from PyPI rather than COPY --from=ghcr.io/astral-sh/uv
# because some hosts (e.g. certain EC2 ranges) get 403s from ghcr.io.
RUN pip install --no-cache-dir uv

WORKDIR /app

# All dependencies ship prebuilt wheels (incl. psycopg2-binary), so no
# gcc/libpq-dev needed; re-add via apt-get if a future dep must compile.
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.txt

COPY . .

EXPOSE 8000

# Invoked via sh so the exec bit doesn't matter (a bind-mounted ./app from a
# Windows/scp checkout may lack it, overriding any chmod done at build time)
ENTRYPOINT ["sh", "./entrypoint.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
