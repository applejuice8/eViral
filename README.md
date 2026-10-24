**All required submission templates are in the Google Drive folder below. Download them before you start.**

---

# eViral

> Tell us what you're selling. We'll market it. eViral helps small business owners launch a product on social media without a marketing team.

---

## Team Information

| Field | Details |
| --- | --- |
| **Team Name** | Your Team Name |
| **Team Domain** | Domain 1 / Domain 2 *(choose one)* |
| **SDG Track (1–17)** | e.g. SDG 8 — Decent Work and Economic Growth |
| **Team Leader** | Leader Name |
| **University** | University Name(s) |
| **Number of Members** | e.g. 4 |

## Links

| Resource | Link |
| --- | --- |
| GitHub Repository | https://github.com/applejuice8/eViral |
| Live Demo | https://your-demo-link |
| Slide Deck | https://example.com/slides |
| Demo Video | https://example.com/demo-video |

---

## Overview

### Problem

Small businesses rarely have a marketing team. Launching a product on Facebook, Instagram and TikTok means writing captions, editing product photos, and posting on a schedule — work the owner has no time for, so launches fizzle out.

### Solution

eViral turns a single product photo (plus an optional price and note) into a complete, scheduled social media launch campaign. AI inspects the photo, improves the images, writes platform-specific captions in the owner's language, and puts every post on a calendar that publishes on its own.

### Key Features

- **Guided product intake** — product name, photo, optional price and note ("Load mock data" fills in a sample cake).
- **AI photo check with human confirmation** — a vision model lists what it sees in the photo; the owner removes anything wrong and adds anything missing, so captions only use verified facts.
- **Launch schedule builder** — launch sequence (teaser, launch, reminder, last chance over a week), weekly, or custom dates, across Facebook / Instagram / TikTok in BM, English or mixed.
- **AI image enhancement** — product photo improved and one image generated per campaign stage (YouCam, with a zero-cost passthrough mode).
- **Batch caption generation** — one AI call writes every caption for every platform and stage.
- **Auto publishing & dashboard** — posts go out on schedule via a mock publisher (demo Facebook / Instagram / TikTok pages); dashboard, calendar and activity log show real data. Captions are editable on the review page, with "Publish now" for immediate posting.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router, TypeScript, Tailwind) |
| Backend | Python, FastAPI (uv, SQLAlchemy, Alembic) |
| Database | PostgreSQL (Docker volume) / SQLite (local) |
| AI / Compute | OpenRouter (vision + captions), YouCam (image editing) |
| Hosting / Dev | Docker Compose |

---

## Project Structure

```
.
├── backend/                     # FastAPI service (uv, SQLAlchemy, Alembic)
│   ├── app/                     # Application code (entry point, seed script)
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Backend unit tests (pytest)
│   ├── pyproject.toml           # Python dependencies
│   └── README.md
├── frontend/                    # Next.js app (App Router, TypeScript, Tailwind)
│   ├── app/                     # Pages and layouts
│   ├── tests/                   # Frontend tests
│   └── package.json
├── submission/                  # Required submission documents
│   ├── SDC2026_TeamName_Preliminary.pdf      # Preliminary submission
│   ├── SDC2026_TeamName_TechDeclaration.pdf  # Technology declaration
│   ├── SDC2026_TeamName_Replit_POU.pdf       # Replit proof of use
│   └── SDC2026_TeamName_Runpod_POU.pdf       # RunPod proof of use
├── compose.yaml                 # Docker Compose (frontend + backend + db)
├── .env.example                 # Example environment variables
├── .gitignore
├── LICENSE
└── README.md
```

### Architecture

```
Owner ──► Next.js Frontend ──► FastAPI Backend ──► OpenRouter (photo check, captions)
                    │                  │
                    │                  └──► YouCam (image editing, MEDIA_MODE=live)
                    │                  └──► Mock publisher (demo FB / IG / TikTok pages)
                    └──► Scheduled posts run on their own at the planned times
```

---

## How to Run

### Option 1 — Run with Docker (Recommended)

```bash
# 1. Copy the example env file and fill in your keys
cp .env.example .env

# 2. Start frontend + backend + database
docker compose up --build
```

- Frontend: http://localhost:3000 (calls to `/backend/*` are passed on to the API, so no CORS setup)
- Backend: http://localhost:8000 (`GET /health`)

The database and saved images live in the `backend-data` volume. `docker compose down -v` wipes them.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/applejuice8/eViral.git
cd eViral

# 2. Configure environment variables
cp .env.example .env            # then fill in your values

# 3. Backend
cd backend && uv sync
uv run python -m app.seed            # create tables + sample business
uv run uvicorn app.main:app --reload --port 8000

# 4. Frontend (second terminal)
cd frontend && pnpm install && pnpm dev   # http://localhost:3000
```

Start over with an empty database: `uv run python -m app.seed --reset`.

### Environment Variables

- `OPENROUTER_API_KEY` — for the photo check and captions. Free models are used by default.
- `YOUCAM_API_KEY` — for image editing. Only used when `MEDIA_MODE=live`.
- `MEDIA_MODE` — `passthrough` (default) uses the original photo and costs nothing. `live` calls YouCam: 5 image tasks per campaign (1 enhance + 4 stage images).
- `DATABASE_URL` — optional. Leave blank for a local SQLite file.

Never commit `.env`.

### Run Tests

```bash
cd backend && uv run pytest -q
cd frontend && pnpm test
```

Tests never call OpenRouter or YouCam; they use fake responses.

---

## How We Use Replit *(Required)*

Describe how your team used Replit. For example:

- **Development:** Collaborative coding in a shared Repl using Multiplayer.
- **Hosting:** The app is deployed with Replit Deployments at the Live Demo link above.
- **Secrets:** API keys are stored in Replit Secrets, never in the code.

📄 Proof of use: [`submission/SDC2026_TeamName_Replit_POU.pdf`](submission/SDC2026_TeamName_Replit_POU.pdf)

## How We Use RunPod *(Required)*

Describe how your team used RunPod. For example:

- **Workload:** Model inference (e.g. image processing) runs on a RunPod GPU.
- **Setup:** The AI workload is deployed as a **RunPod Serverless Endpoint**.
- **Integration:** The app sends requests to the endpoint using `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID`.

📄 Proof of use: [`submission/SDC2026_TeamName_Runpod_POU.pdf`](submission/SDC2026_TeamName_Runpod_POU.pdf)

---

## Challenges & Learnings

- Keeping AI costs low: one vision call per product (saved and reused), one caption call per campaign covering every platform and stage, and image editing only on Build when `MEDIA_MODE=live`.
- Making the AI pipeline visible instead of magic: if YouCam fails, posts fall back to the original photo and the build still finishes — the build screen's images step and the review screen say why (`MEDIA_MODE=passthrough`, a missing `YOUCAM_API_KEY`, or the YouCam error itself) instead of finishing silently.
- Preventing wrong facts in captions: the owner confirms what the AI sees in the photo before any caption is written.

## Future Improvements

- Real platform publishing (Facebook / Instagram / TikTok APIs) instead of the mock publisher.
- Multi-language caption tone tuning per platform audience.
- Performance analytics per post to suggest better schedules.

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| Member Name | Team Lead / Backend | [@username](https://github.com/username) |
| Member Name | Frontend | [@username](https://github.com/username) |
| Member Name | AI / Integrations | [@username](https://github.com/username) |

---

## Submission Checklist

- [ ] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [ ] Slide deck link added
- [ ] Demo video link added
- [ ] Replit used, with proof of use in `submission/`
- [ ] RunPod used, with proof of use in `submission/`
- [ ] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [ ] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [ ] Submission files renamed with your team name (replace `TeamName`)
- [ ] "How to Run" steps verified
- [ ] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).
