# eViral Backend

FastAPI service for eViral. See `../BACKEND_PLAN.md` for the feature roadmap
and `../TECHNICAL_IMPLEMENTATION.md` for the architecture.

## Layout

```
backend/
├── app/
│   ├── config.py     # settings from env (pydantic-settings)
│   ├── db.py         # SQLAlchemy engine, session, Base
│   ├── main.py       # FastAPI app factory
│   ├── routers/      # HTTP layer only
│   ├── schemas/      # Pydantic request/response models
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
