# eViral

Tell us what you're selling. We'll market it.

eViral helps a small business launch a product on social media without a marketing team. The owner gives a product name and a photo (price and a short note are optional) and picks a schedule. eViral looks at the photo, makes better images, writes captions for Facebook, Instagram and TikTok, and puts the posts on a calendar. Posts then go out on their own at the planned times.

This is a hackathon prototype. All businesses, products and posts are made up, and posting is pretend (a mock publisher shows posts on our own demo Facebook / Instagram / TikTok pages).

## How it works

1. **Tell us** - product name, photo, optional price and note. ("Load mock data" fills in a sample cake.)
2. **Confirm** - an AI looks at the photo and lists what it sees. You remove anything wrong and add anything missing. Captions only use these facts plus what you typed.
3. **Schedule** - launch sequence (teaser, launch, reminder, last chance over a week), weekly, or custom dates. Pick platforms and language (BM, English or mixed).
4. **Build** - eViral improves the photo, makes one image per stage, writes all the captions in one go, and schedules the posts. The progress screen shows each step as it really happens.

After that you can edit any caption on the review page, or press "Publish now" to send a post straight away. The dashboard, calendar, activity log and the three social pages all show real data.

- `frontend/` - Next.js app (App Router, TypeScript, Tailwind)
- `backend/` - FastAPI service (uv, SQLAlchemy, Alembic). See `backend/README.md`.

## Setup

Copy `.env.example` to `.env` in the repo root and fill in:

- `OPENROUTER_API_KEY` - for the photo check and captions. Free models are used by default.
- `YOUCAM_API_KEY` - for image editing. Only used when `MEDIA_MODE=live`.
- `MEDIA_MODE` - `passthrough` (default) uses the original photo and costs nothing. `live` calls YouCam: 5 image tasks per campaign (1 enhance + 4 stage images).
- `DATABASE_URL` - optional. Leave blank for a local SQLite file.

Never commit `.env`.

## Run with Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 (calls to `/backend/*` are passed on to the API, so no CORS setup)
- Backend: http://localhost:8000 (`GET /health`)

The database and saved images live in the `backend-data` volume. `docker compose down -v` wipes them.

## Run locally

```bash
# Backend
cd backend && uv sync
uv run python -m app.seed            # create tables + sample business
uv run uvicorn app.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend && pnpm install && pnpm dev   # http://localhost:3000
```

Start over with an empty database: `uv run python -m app.seed --reset`.

## Tests

```bash
cd backend && uv run pytest -q
cd frontend && pnpm test
```

Tests never call OpenRouter or YouCam; they use fake responses.

## Keeping AI costs low

- One vision call per product, saved and reused.
- One caption call per campaign covers every platform and stage.
- Image editing only runs on Build and only when `MEDIA_MODE=live`. If YouCam fails, posts fall back to the original photo and the build still finishes.
