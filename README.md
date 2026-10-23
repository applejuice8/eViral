# eViral

Use AI to automate social media content creation.

- `frontend/` — Next.js app (App Router, TypeScript, Tailwind)
- `backend/` — FastAPI service (uv, SQLAlchemy, Alembic) — see `backend/README.md` and `BACKEND_PLAN.md`

## Run the whole stack with Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 — API calls made from the app go to `/backend/*`, which Next proxies to the backend (single origin, no CORS).
- Backend: http://localhost:8000 — health check at `GET /health`.

Configuration comes from the repo-root `.env` (compose interpolates it automatically):
`DATABASE_URL` (e.g. Neon Postgres pooled string), `OPENROUTER_API_KEY`, `LLM_MODEL_TEXT`. Without a `DATABASE_URL`, the backend falls back to SQLite persisted in the `backend-data` volume.

Stop everything:

```bash
docker compose down        # add -v to also drop the SQLite data volume
```

## Local development (no Docker)

```bash
# Backend
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# Frontend (in a second terminal)
cd frontend && pnpm install && pnpm dev   # http://localhost:3000
```
