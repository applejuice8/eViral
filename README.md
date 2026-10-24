# eViral

> eViral helps Malaysian small businesses turn a product photo into a scheduled social media campaign, without needing a marketing team.

---

## Team Information

| Field | Details |
| --- | --- |
| **Team Name** | Asia Pacific Square Mall II |
| **Team Domain** | Domain 2 |
| **SDG Track (1–17)** | SDG 8 — Decent Work and Economic Growth + SDG 9 — Industry, Innovation and Infrastructure |
| **Team Leader** | Chin Hui Yan |
| **University** | Sunway University + Asia Pacific University of Technology and Innovation |
| **Number of Members** | 5 |

## Links

| Resource | Link |
| --- | --- |
| GitHub Repository | https://github.com/applejuice8/eViral |
| Live Demo | https://e-viral.replit.app/ |
| RunPod Endpoint | Not used by this project |
| Slide Deck | https://canva.link/llwqlbmn0jyeccs |
| Demo Video | To be provided |

---

## Overview

### Problem

Small business owners often manage social media themselves alongside running their business. Producing polished images, writing captions for several platforms, and posting consistently takes time and marketing skills they may not have. This can leave product launches sporadic or make it easy to publish incorrect product details.

### Solution

eViral takes a product name and photo, optionally with price and notes, then uses AI to describe the product and draft platform-specific campaign content. The owner confirms the product attributes, chooses a schedule and platforms, and can review and edit the generated posts. A built-in scheduler and mock publisher demonstrate the planned posting flow. The prototype uses synthetic businesses and content; its social feeds are demonstrations, not real platform accounts.

### Key Features

- **Product understanding** — Vision AI proposes product attributes from an uploaded photo for the owner to confirm.
- **Campaign generation** — Builds launch-sequence, weekly, or custom posts with captions for Facebook, Instagram, and TikTok in English, Bahasa Malaysia, or mixed language.
- **Review and scheduling** — Review and edit captions, schedule posts, publish immediately to the mock publisher, and inspect campaign activity and social feed pages.
- **Image handling** — Uses the original image by default; optional live YouCam processing can enhance images and create campaign stage images.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python 3.13+, FastAPI, SQLAlchemy, Alembic |
| Database | SQLite by default; PostgreSQL supported through `DATABASE_URL` |
| AI / Compute | OpenRouter for vision and caption models; optional YouCam (Perfect Corp) image API. No RunPod workload is configured. |
| Hosting / Dev | Replit deployment; Docker Compose or local development. |

---

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── adapters/       # OpenRouter, media, and mock publishing integrations
│   │   ├── routers/        # FastAPI endpoints
│   │   ├── schemas/        # Request and response models
│   │   ├── services/       # Campaign, product, media, and posting logic
│   │   ├── main.py         # API application
│   │   ├── models.py       # SQLAlchemy models
│   │   └── seed.py         # Database setup and sample data
│   ├── alembic/            # Database migrations
│   ├── tests/              # Backend tests
│   ├── pyproject.toml      # Python dependencies and project config
│   └── Dockerfile
├── frontend/
│   ├── app/                # Next.js routes and pages
│   ├── components/         # Wizard, review, social, and UI components
│   ├── lib/                # API client and shared utilities
│   ├── tests/              # Frontend tests
│   ├── package.json
│   └── Dockerfile
├── submission_template.md  # Submission README template
├── compose.yaml            # Full-stack Docker Compose configuration
├── .env.example            # Root environment variable reference
├── BUSINESS_OVERVIEW.md    # Product and business context
├── TECHNICAL_IMPLEMENTATION.md
└── README.md
```

### Architecture

```text
Browser ──► Next.js frontend ──► FastAPI backend ──► SQLite / PostgreSQL
                    │                    ├──► OpenRouter (vision and captions)
                    │                    ├──► YouCam (optional image processing)
                    │                    └──► Mock publisher and scheduler
                    └── /backend/* rewrite to the API
```

---

## How to Run

### Option 1 — Demo Link

Currently live: [https://e-viral.replit.app/](https://e-viral.replit.app/)

### Option 2 — Docker Compose

1. Copy `.env.example` to `.env` and add an `OPENROUTER_API_KEY` for live product understanding and caption generation. Leave `MEDIA_MODE=passthrough` to avoid YouCam calls; set it to `live` and provide `YOUCAM_API_KEY` to enable image processing.
2. Start the stack:

   ```bash
   docker compose up --build
   ```

3. Open the frontend at [http://localhost:3000](http://localhost:3000). The API is at [http://localhost:8000](http://localhost:8000), with a health check at `/health`.

The backend database and media files persist in the `backend-data` Docker volume. `docker compose down -v` removes that volume and its data.

### Option 3 — Run Locally

Requirements: Python 3.13+, [uv](https://docs.astral.sh/uv/), Node.js, and pnpm.

1. Copy `.env.example` to `.env` and configure any provider keys you need.
2. In one terminal, start the backend:

   ```bash
   cd backend
   uv sync
   uv run python -m app.seed
   uv run uvicorn app.main:app --reload --port 8000
   ```

3. In another terminal, start the frontend:

   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). The frontend proxies `/backend/*` requests to the API; set `BACKEND_ORIGIN` if the backend is not at `http://localhost:8000`.

To clear and recreate the sample database, run `uv run python -m app.seed --reset` from `backend/` (this deletes existing local database data).

### Run Tests

```bash
cd backend && uv run pytest -q
cd frontend && pnpm test
```

The tests use provider stubs and do not call OpenRouter or YouCam.

---

## How We Use Replit

- **Development:** Collaborative coding in a shared Repl using Multiplayer, along with initial ideation and wireframe. 
- **Hosting:** The app is deployed with Replit Deployments at the [Live Demo link](https://e-viral.replit.app/) above.
- **Secrets:** API keys are stored in Replit Secrets, never in the code.

Proof of Use: [Replit Proof of Use](submission/SDC2026_Asia%20Pacific%20Square%20Mall_Replit_POU.pdf)

## How We Use RunPod

RunPod is not used for this project.

---

## Challenges & Learnings

- **Provider variability and cost:** Vision and caption model availability can vary. The backend supports model fallbacks, caches product understanding, and generates campaign captions in a single call. Image processing defaults to passthrough so a campaign can be built without consuming image API credits.
- **Reliable image results:** YouCam task results are temporary, so the backend downloads completed results into its own media directory. If live media generation fails, campaign generation can fall back to the original image.
- **End-to-end demo realism:** Social publishing is intentionally mocked. Posts, calendars, activity, and demo social feeds use backend data, but no live Facebook, Instagram, or TikTok publishing is configured.

## Future Improvements

- [ ] Integrate official social platform publishing and account authorization.
- [ ] Add campaign approval, pause/resume controls, and multi-user roles.
- [ ] Add analytics and connect product data to Orbyte systems.
- [ ] Provide the team, event, deployment, and submission proof details required by the competition.

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| Chin Hui Yan | Research and Pitch | https://github.com/clorisXchin |
| Tan Wen Zhe | Research and Pitch | https://github.com/wz-Tan |
| Colin Leong Hong Seng | Full-Stack Developer | https://github.com/applejuice8 |
| Ian Hon | Full-Stack Developer | https://github.com/ian-hon |
| Sho Jun Kai | Full-Stack Developer | https://github.com/junkaiiiii |

---

## Submission Checklist

- [x] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [x] Slide deck link added
- [ ] Demo video link added
- [x] Replit used, with proof of use in `submission/`
- [x] RunPod used, with proof of use in `submission/` (Not Used -> No AI Training Performed)
- [x] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [x] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [x] Submission files renamed with your team name (replace `TeamName`)
- [x] "How to Run" steps verified
- [x] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).
