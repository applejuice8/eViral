# eViral Backend

FastAPI service for eViral. See `../BACKEND_PLAN.md` for the feature roadmap
and `../TECHNICAL_IMPLEMENTATION.md` for the architecture.

## Layout

```
backend/
├── app/
│   ├── config.py     # settings from env (pydantic-settings)
│   ├── db.py         # SQLAlchemy engine, session, Base
│   ├── main.py       # FastAPI app factory + /media static mount
│   ├── routers/      # HTTP layer only
│   ├── schemas/      # Pydantic request/response models
│   ├── adapters/     # external providers (OpenRouter, YouCam) behind protocols
│   └── services/     # business logic (pipeline, validator, scheduler…)
├── alembic/          # migrations
├── tests/            # pytest
└── pyproject.toml    # uv-managed dependencies
```

## Run

```bash
uv sync                # create .venv and install dependencies
cp .env.example .env   # adjust DATABASE_URL if needed
uv run uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

## Migrations

```bash
uv run alembic revision --autogenerate -m "..."   # after adding models
uv run alembic upgrade head
```

## Tests

```bash
uv run pytest
```

## YouCam media API

Image operations run through the Perfect Corp YouCam task API
(`app/adapters/media.py`, verified against docs.perfectcorp.com): File API
upload → async task → poll → **immediate download** into `MEDIA_DIR`
(result URLs expire in ~2h; uploads/results are deleted within ~24h).
Requires `YOUCAM_API_KEY` (read from the repo root `.env`).

| Endpoint | Purpose | Cost |
|---|---|---|
| `POST /media/enhance` | AI Photo Enhance (fix blur, upscale 1/2/4×) | 2 units |
| `POST /media/poster` | Poster from a product photo (image-to-image, keeps the product) | 1 unit |
| `POST /media/poster/text` | Poster from a prompt only (text-to-image) | 1 unit |
| `POST /media/background` | Background change by prompt or `template_id` | 4 units |
| `GET /media/background/templates` | Predefined background templates | free |

Each task endpoint accepts **either** a multipart `image` upload
(jpg/png, <10MB) **or** a public `image_url` — exactly one. Responses
return the locally stored asset (`url` is served from `/media/...`),
never YouCam's short-lived URLs:

```json
{"kind": "poster", "url": "http://localhost:8000/media/poster_a1b2c3d4.jpg",
 "file_name": "poster_a1b2c3d4.jpg", "provider": "youcam",
 "task_id": "...", "model": "youcam-image-v2", "source": "upload"}
```

Example:

```bash
curl -F "image=@cake.jpg" -F "prompt=festive Raya table, warm light" \
  http://localhost:8000/media/poster
```

Without a key the endpoints return 503; provider failures map to 502.
Units are limited — generate media deliberately, cache results, and cap
regenerations (see TECHNICAL_IMPLEMENTATION §8.4).
