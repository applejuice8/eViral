FROM python:3.13-slim

# uv is the project's package manager; copy the pinned static binary.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so this layer caches between code changes.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Runtime code only (tests stay out of the image).
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

EXPOSE 8000

# Migrate and seed (safe to re-run), then start the API.
CMD ["sh", "-c", "/app/.venv/bin/python -m app.seed && exec /app/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000"]
