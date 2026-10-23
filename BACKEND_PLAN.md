# eViral — Backend Implementation Plan

> Derived from `BUSINESS_OVERVIEW.md`, `TECHNICAL_IMPLEMENTATION.md`, `DESIGN_REFERENCES.md`, and the current `frontend/` code.
> No code written yet — this is the build plan: features, steps, dependencies, and how the workload splits.

---

## 0. Where we are (state of the repo)

- **Frontend is done as a static mock.** Every screen exists (`/` dashboard, `/products/new` wizard, `/review/[campaignId]`, `/calendar`, `/audit`, plus social feed demo pages). All data comes from `frontend/lib/data.ts` (`demoCampaign`, `kpis`, `auditEvents`, `calendarExtras`). There are **no API calls anywhere** — `BuildProgress` even runs on a local timer and hardcodes `router.push("/review/cmp_kek-lapis")`.
- **Backend does not exist yet.** The suggested stack (TECHNICAL_IMPLEMENTATION.md §2–4): FastAPI + SQLModel + Neon Postgres, OpenRouter via the OpenAI SDK (LLM + vision), YouCam API (image/video), APScheduler, mock publisher. Adapters everywhere with cached/passthrough fallbacks.
- **Scope decisions already locked** (DESIGN_REFERENCES.md): single user (Owner "Aisha"), no login screen, no role switcher. The API keeps a **stubbed `current_user`** so audit rows have an actor and RBAC can be re-enabled later without rework.

**So the backend job is:**
1. Build the FastAPI service exactly per the doc's API surface (§12).
2. Wire the frontend off `lib/data.ts` onto real endpoints (via `/backend/*` rewrites).

---

## 1. Product flow the backend must serve

```
Trigger (product submitted) → Understand (vision) → Confirm (owner)
  → Plan (rules: schedule template → dated slots)
  → Write (LLM captions) + Media (YouCam, async)
  → Assemble drafts → Validate (rules: pass/warn/block)
  → Campaign status = review → Owner approves (fidelity tick required)
  → Scheduler tick publishes due approved posts (mock publisher)
  → Audit log + calendar + analytics counters
```

Everything below is organized as **features (F1–F10)**. Each feature lists: what it does, implementation steps, endpoints, and done-when. Dependencies are stated so work can be split across people.

---

## 2. Features

### F1 — Skeleton, DB, seed (foundation; everything depends on this)

**What:** FastAPI app, Neon connection, SQLModel models, `create_all` at startup, seed data matching the frontend mock.

**Steps:**
1. Scaffold `apps/api/` per the doc's layout: `main.py` (lifespan: `create_all` + start scheduler), `config.py` (pydantic-settings reading `.env`), `db.py` (engine, pooled Neon string), `models.py`, `schemas.py`.
2. Define all 10 tables from §5: `business`, `app_user`, `media_asset`, `product`, `campaign`, `schedule_rule`, `post_draft`, `media_task`, `approval`, `audit_log`, `post_metric`. Notes: `price_myr numeric(10,2) nullable`; money never float; `audit_log` append-only.
3. Seed script (`seed.py` + `reset_db.py`): 2 fictional businesses (Kek Kak Nora bakery halal-certified, Butik Seri Mawar boutique), 4–6 products each, one user (Owner Aisha), a pre-built launch campaign for "Kek Lapis Sarawak Premium" whose shape **mirrors `demoCampaign` in `lib/data.ts`** (7 drafts, 3 platforms, statuses incl. one `blocked` with PRICE_MISMATCH, timestamps Oct 26–Nov 2), 30 days of simulated `post_metric`.
4. `GET /health`; CORS or (preferred) rely on the Next.js rewrite `/backend/* → :8000/*`.
5. `.env.example` with every var from §15.

**Endpoints:** `GET /health`
**Done when:** `reset_db.py` runs clean, seeded `GET /campaigns/{id}` returns JSON that maps 1:1 onto the frontend's `Campaign`/`PostDraft` types.

---

### F2 — Product intake + media storage

**What:** Create a product with photo upload; store the original as a `media_asset`; this is wizard Step 1.

**Steps:**
1. `POST /products` (multipart): name, photo file, optional price, note → persist product + original `media_asset` (`source=upload`). Validate file type/size; store to local `./media` (or Replit object storage) and keep a served URL.
2. `GET /products/{id}` → product with original asset URL.
3. Audit: `product.created`.
4. Decide storage early (revisit in F8): local dir works for dev; for deployment prefer object storage or DB-stored small assets — you must not lose YouCam outputs (they're deleted server-side within ~24h).

**Endpoints:** `POST /products`, `GET /products/{id}`
**Depends on:** F1.
**Done when:** uploading a photo via curl/Swagger creates product + asset and returns URLs the frontend can render.

---

### F3 — LLM adapter + Understand (vision) + Confirm

**What:** The `LLMProvider` adapter (OpenRouter live + CachedProvider fallback), the vision step that describes the photo, and attribute confirmation — wizard Step 2 ("What we see").

**Steps:**
1. `adapters/llm.py`: `LLMProvider` interface; `OpenRouterProvider` (OpenAI SDK, `base_url=https://openrouter.ai/api/v1`, models from env `LLM_MODEL_TEXT` / `LLM_MODEL_VISION`); `CachedProvider` (returns seed-cached outputs). Selection via `LLM_MODE=live|cached`.
2. `services/understand.py`: send photo (data URL) + name to the vision model → `{product_type, visible_attributes[], suggested_category, uncertain[]}`. Low temperature. `json_object` mode + Pydantic validation + one retry (don't assume strict `json_schema` support).
3. Store result in `product.understood` (json); `understood_confirmed` starts false. Audit: `product.understood`.
4. `PATCH /products/{id}/understood`: owner edits chips / confirms → `understood_confirmed = true`. Audit: `product.confirmed`.
5. **Hard rule for later steps:** the writer may use only confirmed attributes + owner-entered fields. Bake this into the facts assembly helper now.
6. Generate cached understand outputs for seeded products (`seed/cached_outputs/`).

**Endpoints:** `PATCH /products/{id}/understood` (understand itself is triggered inside product creation/pipeline)
**Depends on:** F1, F2.
**Done when:** a real photo returns sensible attributes, cache mode works offline, and the frontend Step 2 can be wired to this.

---

### F4 — Planner (rules) + campaign creation

**What:** Campaign entity + schedule templates expanded into dated slots per platform. Pure rules, no AI.

**Steps:**
1. `POST /campaigns` (product_id, kind, goal, language, schedule{mode, platforms, days?, time?, start_date?}) → create `campaign` (status `building`) + `schedule_rule`. Audit: `campaign.built` (later, after drafts).
2. `services/planner.py`: expand templates —
   - `launch_sequence`: teaser d0, launch d2–3, detail d4, reminder d5, last_chance d7 × each selected platform;
   - `weekly`: chosen weekdays + time, N weeks ahead;
   - `custom`: explicit datetimes.
   Rules: respect business hours, max one post per platform per day, timezone `Asia/Kuala_Lumpur` (store UTC, display MYT), assign **stage** per slot, produce a `why_this_time` string per slot.
3. `GET /campaigns/{id}` → status, pipeline progress, drafts, validator flags. The frontend build screen polls this.
4. `GET /calendar?from=&to=` → drafts in range joined with product/platform/status (serves the calendar page; can land here or with F7).

**Endpoints:** `POST /campaigns`, `GET /campaigns/{id}`, `GET /calendar`
**Depends on:** F1, F2.
**Done when:** a launch campaign expands into the same 7-draft shape the mock shows (3 platforms × teaser/launch/reminder/last_chance), each slot with stage, time, and why-this-time.

---

### F5 — Writer (LLM captions) + campaign pipeline orchestration

**What:** The background pipeline that runs Understand → Plan → Write → (Media hook) → Assemble → Validate, with live progress. This is the heart.

**Steps:**
1. `services/writer.py`: one LLM call per platform covering all its slots (cheaper + consistent tone). Structured output per post: `caption, hashtags[], video_idea?, rationale, figures_used[], claims_used[]`. System prompt from §7 verbatim: facts-only, no price if price is null, tone/language `ms|en|mixed`, stage variation, platform rules (FB friendly / IG punchy+hashtags / TikTok hook+short), no virality promises, no customer names.
2. **Facts assembly helper:** input = confirmed attributes + name/price/note + business profile + campaign goal/dates. This is the only thing the writer sees.
3. `services/pipeline.py`: orchestrate as a FastAPI `BackgroundTasks` job; expose per-stage progress on the campaign (`progress: understand|media|write|validate`, per-stage state) so `GET /campaigns/{id}` can drive the build screen. Media runs as its own async jobs (F8) — pipeline must not block on it.
4. Assemble `post_draft` rows: caption + hashtags + scheduled slot + stage + rationale → status `pending_approval` (or `blocked` if validation fails). Audit: `draft.generated`.
5. Seed cached caption outputs for demo products.
6. Cap: `MEDIA_REGEN_CAP`-style logic for regenerations (see F8 for media; writer regen is cheap but still cap).

**Endpoints:** covered by `POST /campaigns` (kicks pipeline) + `GET /campaigns/{id}` (progress)
**Depends on:** F3 (understand/confirm), F4 (planner).
**Done when:** clicking Build in the wizard creates a real campaign whose drafts appear at `/review/{id}` — captions are facts-clean, mixed BM/EN works, and progress polls live.

---

### F6 — Validator (accuracy layer) + draft editing

**What:** Rules engine run after generation, after every edit, at approval, and just before publishing. This is the headline demo moment ("errors blocked").

**Steps:**
1. `services/validator.py` implementing the §9 table: PRICE_NOT_PROVIDED (block), PRICE_MISMATCH (block), DISCOUNT mismatch (block), DATE window (block), UNCONFIRMED_ATTRIBUTE (warn; block for ingredients/allergens/certifications), BANNED_CLAIM (business list + defaults — block), HALAL_UNVERIFIED (block unless certified), personal data (phone/email/IC — block), media fidelity (gates approval — F7), length/hashtag limits (warn/trim), figures_used consistency (warn). Regex: `RM\s?(\d+(?:\.\d{1,2})?)`, pct, etc. Store flags in `post_draft.validator_flags` json; set draft status `blocked` when any block.
2. One function decides status from flags — never set status ad hoc.
3. `PATCH /drafts/{id}`: edit caption/hashtags/time/image choice → **re-run validator**, bump `version`, transition per state machine. Audit: `draft.edited` (+ `draft.blocked` when it fails).
4. Add a `draft.blocked` audit write path + counter query so the dashboard "Errors blocked" is live, not mock.
5. Write a tiny self-check script (or pytest) with the exact demo cases: RM79 vs RM65 blocked; "guaranteed best seller" blocked; halal blocked for the boutique; clean mixed-language caption passes.

**Endpoints:** `PATCH /drafts/{id}`
**Depends on:** F1, F5 (drafts exist to validate).
**Done when:** editing a caption to a wrong RM amount flips it to `blocked` with the right flag, and fixing it returns to `pending_approval`.

---

### F7 — Governance: state machine, approval, audit, pause/resume

**What:** Draft/campaign lifecycle enforcement, owner approval with the fidelity tick, append-only audit, pause/resume/cancel.

**Steps:**
1. `services/state.py` (or inside a service): **one** transition function enforcing the draft state machine (building → pending_approval ⇄ blocked; pending_approval → approved/rejected; approved → scheduled ⇄ paused; scheduled → published/failed). Illegal transition = 409.
2. Stub `deps.current_user` → the seeded Owner (per DESIGN_REFERENCES scope decision). Keep `require_role()` implemented but unused, so RBAC re-enabling is trivial.
3. `POST /campaigns/{id}/submit` (owner/staff) → status `review`.
4. `POST /campaigns/{id}/approve` (**owner only**): requires every media-bearing draft to have the fidelity tick ("still looks like my product") and a final validator pass with no blocks → campaign `active`, drafts `scheduled`. Audit: `campaign.approved`. Persist the tick on the campaign (add a column, e.g. `fidelity_confirmed`).
5. `POST /campaigns/{id}/reject|pause|resume|cancel` with comments where relevant; pause flips scheduled posts to `paused` (not deleted); resume restores. Audit each.
6. `services/audit.py`: single `log(actor, action, entity, before, after)` helper used by every mutation; `GET /audit` with filters (action type, entity). **No update/delete endpoints on audit_log, ever.**
7. `approval` rows written on approve/reject decisions.
8. Dashboard aggregate endpoint: `GET /analytics/summary` — drafts awaiting approval, posts this week, minutes-to-approve (timestamps: campaign created → approved), errors blocked (count of `draft.blocked` audit rows). All four KPIs on the homepage come from here.

**Endpoints:** submit / approve / reject / pause / resume / cancel, `GET /audit`, `GET /analytics/summary`
**Depends on:** F1, F5, F6.
**Done when:** the full approve path works end-to-end and audit shows built → blocked → edited → approved rows; all 4 dashboard KPIs are real.

---

### F8 — Media: YouCam adapter, media worker, overlay, fidelity

**What:** Image improvement via YouCam (background change + enhance first), async job tracking, cached/passthrough fallbacks, Satori overlay composition.

**Steps:**
1. **Verify YouCam docs first** (the doc explicitly flags unverified endpoint paths/fields): open docs.perfectcorp.com reference for File API, Background Change, Enhance, and (stretch) Video Generator; confirm auth, task flow, polling fields, result download, rate limits, unit costs.
2. `adapters/media.py`: `MediaProvider` interface; `YouCamProvider` (upload → task → poll → **download immediately** to our storage); `PassthroughProvider` (returns the original with an "original image" label); selection via `MEDIA_MODE=live|cached|passthrough`.
3. `services/media.py` + `media_task` rows: background worker (small concurrency limit, sequential is fine), `status/attempts/error`, retry once then fall back down the chain: **YouCam result → cached asset → original + overlay**. A pipeline must never fail because media failed — mark draft `uses_original_image` (the frontend type already has this field!).
4. Recipes (demo order): Background Removal → Background Change (prompted scene) → Enhance. Keep the original always; every output links via `parent_asset_id`.
5. Regeneration: `POST /campaigns/{id}/media/regenerate` counting against `MEDIA_REGEN_CAP` (3); return remaining count.
6. Overlay: implement the deterministic price/headline composition. If staying in Next.js, `app/api/overlay/route.tsx` with `next/og` (Satori) reading price from the product record; else do it server-side in FastAPI with Pillow. Price text always from the DB, never the LLM.
7. Pre-generate cached assets for all seeded products (`seed/cached_outputs/`).
8. Fidelity gating lives in F7 (approve requires the tick); the media side just needs original + improved URLs on the campaign/drafts.

**Endpoints:** `POST /campaigns/{id}/media/regenerate`, `POST /media/tasks` (internal), overlay route
**Depends on:** F1, F2 (uploads/storage); integrates into F5's pipeline (loosely coupled — the pipeline should tolerate media still running).
**Done when:** a real photo produces an improved image stored locally; killing the YouCam key gracefully falls back to cached then original+overlay.

---

### F9 — Scheduler + mock publisher

**What:** Time-driven publishing of due approved posts, recurring batch preparation, publish-now for the demo.

**Steps:**
1. `services/scheduler.py`: APScheduler `BackgroundScheduler` (tz Asia/Kuala_Lumpur), `tick()` every ~30s: find drafts `status=scheduled AND scheduled_at <= now` → re-validate → publish via `PublisherAdapter` → mark `published`/`failed` (retry once) → audit `draft.published`.
2. `adapters/publisher.py`: `MockPublisher` (always ok, returns a fake post URL) + a documented `MetaStub` that raises "not implemented". `PUBLISHER=mock` from env.
3. Recurring (`weekly`): `prepare_next_batches()` creates the next week's drafts as `pending_approval` — nothing publishes unapproved.
4. `POST /internal/tick` protected by `INTERNAL_TICK_SECRET` header (external pinger fallback if the host sleeps).
5. `POST /drafts/{id}/publish-now` (demo helper): owner-only shortcut through the same publish path.
6. Pause/cancel semantics interplay: paused campaigns' due drafts are skipped, not published.

**Endpoints:** `POST /internal/tick`, `POST /drafts/{id}/publish-now`
**Depends on:** F7 (state machine, approval), F6 (validator re-run).
**Done when:** an approved campaign's first post flips to `published` at its time (or instantly via publish-now), calendar + audit + analytics reflect it, and pausing stops the next post.

---

### F10 — Frontend integration (pairs with everything; lands last per screen)

**What:** Replace `lib/data.ts` mocks with real API calls.

**Steps:**
1. `next.config.ts`: rewrite `/backend/:path*` → `http://localhost:8000/:path*` (avoids CORS, one public URL).
2. `lib/api.ts` client + shared response types mirroring the backend schemas (keep field names identical to `lib/data.ts` where possible — `PostDraft`, `Campaign`, `ValidatorFlag` already match the data model well).
3. Per screen:
   - **Wizard:** Step 1 → `POST /products` (real upload; keep the "demo: sample photo" affordance by pre-selecting a seed asset); Step 2 → read `understood` from product, confirm via `PATCH`; Step 3 → collect `ScheduleData`; Build → `POST /campaigns`, then **rewrite `BuildProgress` to poll `GET /campaigns/{id}`** (stage states from the campaign progress field) instead of the local timer, and route to `/review/{realId}`.
   - **Review:** fetch campaign; wire caption editing → `PATCH /drafts/{id}` with re-validation flags; approve/reject/pause buttons → real endpoints; fidelity checkbox gates the approve call; "Publish now" → `POST /drafts/{id}/publish-now`.
   - **Dashboard:** KPIs from `GET /analytics/summary`; needs-approval + recent activity from campaigns/audit endpoints.
   - **Calendar:** `GET /calendar?from=&to=`; side-panel actions wired.
   - **Audit:** `GET /audit` with the "errors blocked" filter mapped to an action filter.
4. Loading/empty/error states per screen (the mock already has good empty states — keep them).
5. The three social demo pages (`/facebook`, `/instagram`, `/tiktok`) stay mock-driven; they're presentation props.

**Depends on:** each screen's feature being done. Sequence: wizard+review first (F2–F7), dashboard/calendar/audit after.
**Done when:** a fresh DB + seed reproduces the exact current demo journey without touching `lib/data.ts`.

---

## 3. Work splits

### Option A — by feature track (suggested for 3 builders)

| Track | Owner | Features | Why together |
|---|---|---|---|
| **Core API & governance** | B1 | F1 → F2 → F7 (+F9) | One person owns the data model, state machine, audit, scheduler — the parts where consistency matters most |
| **AI pipeline** | B2 | F3 → F5 → F6 | One person owns all LLM prompting, facts assembly, and validation — accuracy is a single coherent story |
| **Media & integration** | B3 | F8 → F10 | YouCam client + fallbacks, then wiring every screen; media and frontend both touch asset URLs |

### Option B — if two people

- **B1:** F1, F2, F4, F6, F7, F9 (rules, state, governance, scheduling)
- **B2:** F3, F5, F8, F10 (AI, media, frontend wiring)

### Shared contracts (agree on day one, unblocks parallel work)

1. **API shapes** — freeze the §12 endpoint list and the JSON responses for `GET /campaigns/{id}`, `GET /analytics/summary`, `GET /audit` before anyone builds against them. The frontend types in `lib/data.ts` are the starting vocabulary.
2. **Validator flag format** — `{code, severity: warn|block, detail}` (already in the frontend type).
3. **State enums** — campaign: `building|review|approved|active|paused|cancelled|done`; draft: `building|blocked|pending_approval|approved|scheduled|published|failed|rejected|paused`.
4. **Media URL contract** — every asset is a URL string the frontend can `<img>` directly; originals always available; `uses_original_image` boolean on drafts.

---

## 4. Build order & milestones

Dependencies: F1 → everything; F2 → F3/F5/F8; F3+F4 → F5; F5 → F6/F7; F6+F7 → F9; F8 parallel after F2; F10 last per screen.

| Milestone | Contents | Demo-able state |
|---|---|---|
| **M1 — Walking skeleton** | F1, F2, F4 | Upload a product, create a campaign, see planned slots as empty drafts; calendar shows them |
| **M2 — The story works (cached)** | F3, F5, F6, F7 (with CachedProvider + passthrough media) | Full journey offline: inputs → confirmed attributes → written captions → blocked wrong price → approved; audit + KPIs live. **This alone is a demo fallback.** |
| **M3 — Real AI & time** | F9, F8 (live OpenRouter + YouCam), overlay | Real vision/captions, real improved images, scheduler publishes on time |
| **M4 — Integration & polish** | F10, empty/error states, README, seed caching, rehearsal | Frontend fully off mocks; demo script from §18 runs end-to-end |

Rationale: build order deliberately front-loads the validator + governance (M2) so the accuracy story exists before any AI is live, and the Cached/Passthrough adapters mean M2 is demoable with zero API keys.

---

## 5. Standing risks to design against (from the docs, restated as build rules)

- **YouCam details unverified** — spend the first hour of F8 in the official docs + API Playground before writing the client; endpoint shapes in TECHNICAL_IMPLEMENTATION.md §8.3 are placeholders.
- **LLM output shape** — never assume strict `json_schema` support; validate with Pydantic, retry once, then cached fallback. The validator is the last line of defense regardless.
- **YouCam 24h deletion** — download every result immediately into our own storage.
- **Host sleeping** — `/internal/tick` + publish-now button + keep-alive deployment plan.
- **`create_all` won't alter tables** — any model change mid-build → `reset_db.py` (dev-only data).
- **Scope freeze** — stretch items (video, weekly cadence, BM/EN toggle, comment replies) only after M3.

---

## 6. Explicitly out of scope (do not build)

Real Meta/TikTok publishing, real login/RBAC UI, Orbyte Connect sync, trend monitoring, multi-outlet, payments. The publisher stays mock; auth stays a stub returning the Owner.
