# eViral — Technical Implementation Guide

> ## ⚠️ This is a suggestion, not a fixed spec
> Everything below is a **recommended starting point**. The team can change the stack, structure, data model, endpoints, providers or scope at any time. Where a third-party API detail is uncertain, this document says so and points to the official docs. **Check those docs before coding against them.**

**Stack (suggested):** Next.js · FastAPI · Neon Postgres · OpenRouter (via the OpenAI SDK) · YouCam API (images and video) · hosted on Replit.
**Goal:** a rough but **live** version of the core journey (trigger → data → decision → approval → outcome) backed by a public GitHub repo, with a named risk and fallback.

---

## 1. Scope for the preliminary round

### The primary use case (what you demo)
**New product launch.** The user enters a **product name and photo** (price and a short note optional), picks a **schedule**, and eViral builds a campaign: improved images, optional promo video, captions per platform, and a calendar of posts. An Owner approves; posts publish on schedule.

### Must work live
1. "New product" form: name, photo upload, optional price and note.
2. **Product understanding:** a vision model describes the photo; the user confirms.
3. **Image improvement** through YouCam (for example background change or enhance).
4. **Captions** per platform through OpenRouter.
5. **Launch-sequence schedule** that expands into dated posts.
6. **Validator** blocks wrong prices, dates and banned claims.
7. **Role switcher** (Owner / Staff / Viewer) with real permission checks in the API.
8. **Campaign approval** by the Owner, then **automatic publishing on schedule** (mock publisher).
9. **Calendar** and **activity log**.
10. Public GitHub repo, README, seed script, architecture diagram.

### Next (if time allows)
Short promo video from the image (YouCam), recurring weekly cadence, simulated analytics, BM / EN / mixed language.

### Stretch
Comment-reply drafts with escalation to a human.

### Roadmap only (do not build)
Real Meta / TikTok publishing, real Orbyte Connect sync, trend and competitor monitoring, multi-outlet.

---

## 2. Architecture

```
┌────────────────────────────── Next.js (App Router, TS) ──────────────────────────────┐
│ /products/new (wizard)  /campaigns  /review (approval)  /calendar  /audit  /settings │
│ Role switcher (simulated login)    Poster/overlay route: /api/overlay (Satori)       │
│ next.config rewrites:  /backend/*  →  http://localhost:8000/*                         │
└───────────────────────────────┬──────────────────────────────────────────────────────┘
                                │ JSON over HTTP
┌───────────────────────────────▼──────────────────────────────────────────────────────┐
│                                       FastAPI                                         │
│ routers: products · campaigns · drafts · approvals · schedule · media · analytics ·   │
│          audit · internal(tick)                                                       │
│                                                                                       │
│ services:                                                                             │
│   CampaignPipeline = Understand → Plan(rules) → Write(LLM) → Media(YouCam) → Validate │
│   Scheduler        = tick: publish due approved posts; prepare next recurring batch   │
│   MediaWorker      = background YouCam tasks (upload → task → poll → download)        │
│   AuditService     = append-only writes on every state change                         │
│                                                                                       │
│ adapters (interfaces):                                                                │
│   LLMProvider       (OpenRouter | Cached)                                              │
│   MediaProvider     (YouCam | Passthrough/Cached)                                      │
│   PublisherAdapter  (Mock | Meta stub | TikTok stub)                                   │
│   CatalogAdapter    (Local | OrbyteConnect stub)                                       │
└───────────────────────────────┬──────────────────────────────────────────────────────┘
                                │ SQLModel + SQLModel.metadata.create_all
                    ┌───────────▼───────────┐       ┌───────────────────────────┐
                    │  Neon Postgres        │       │  File storage (media)     │
                    │  (pooled connection)  │       │  Replit object storage or │
                    └───────────────────────┘       │  local ./media (see §11)  │
                                                    └───────────────────────────┘
```

**Why adapters:** judges score "fit the hub", "reusable" and "no dependency on live Orbyte". Each external thing (LLM, media AI, social platforms, Orbyte product data) sits behind an interface, so you can say: *"Today it reads products entered by the owner. Tomorrow `OrbyteConnectCatalog` reads POS data. Nothing else changes."* It also gives you cached fallbacks for the demo.

---

## 3. Tech choices

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui | Client components for the wizard and review screen |
| Overlay / poster text | `next/og` (Satori) route | Draws the price badge and headline on top of the AI-improved image, so price text is deterministic and always matches the catalog |
| Backend | FastAPI, Pydantic v2, SQLModel | `uvicorn` on port 8000 |
| DB | Neon Postgres | **Pooled** connection string, `sslmode=require`; tables via `SQLModel.metadata.create_all` (§5) |
| LLM | **OpenRouter** through the **OpenAI Python SDK** | `base_url="https://openrouter.ai/api/v1"`; model name from env (§7) |
| Images and video | **YouCam API** (Perfect Corp) | REST, Bearer auth, async tasks (§8) |
| Scheduler | APScheduler in-process, plus `/internal/tick` | Needs an always-on process (see §11) |
| Auth (simulated) | Signed demo token with `{user_id, role}` | Real permission checks in FastAPI |
| Hosting | **Replit** (web and API), Neon (DB) | See §11 |
| HTTP client | `httpx` | For YouCam calls and file download |

---

## 4. Repository layout

```
eviral/
├── README.md                    # what it is, how to run, demo script, architecture diagram
├── .env.example
├── run.sh                       # starts API and web (see §11)
├── apps/
│   ├── web/                     # Next.js
│   │   ├── app/
│   │   │   ├── (app)/dashboard/page.tsx
│   │   │   ├── (app)/products/new/page.tsx     # wizard: name, photo, schedule
│   │   │   ├── (app)/campaigns/page.tsx
│   │   │   ├── (app)/review/[campaignId]/page.tsx   # approval screen
│   │   │   ├── (app)/calendar/page.tsx
│   │   │   ├── (app)/audit/page.tsx
│   │   │   └── api/overlay/route.tsx           # Satori price/headline overlay
│   │   ├── components/ (RoleSwitcher, ImageCompare, DraftCard, ValidatorBadge, ScheduleBuilder, AuditTable)
│   │   └── lib/ (api client, role context)
│   └── api/                     # FastAPI
│       ├── app/
│       │   ├── main.py            # lifespan: create_all, start scheduler
│       │   ├── config.py
│       │   ├── db.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   ├── deps.py            # current_user, require_role
│       │   ├── routers/ (products, campaigns, drafts, approvals, schedule, media, analytics, audit, internal)
│       │   ├── services/
│       │   │   ├── pipeline.py    # orchestrates a campaign build
│       │   │   ├── understand.py  # vision: describe product from photo
│       │   │   ├── planner.py     # sequence templates, times, formats (rules)
│       │   │   ├── writer.py      # LLM captions (structured)
│       │   │   ├── media.py       # YouCam jobs
│       │   │   ├── validator.py   # accuracy layer
│       │   │   ├── scheduler.py
│       │   │   └── audit.py
│       │   └── adapters/
│       │       ├── llm.py         # LLMProvider, OpenRouterProvider, CachedProvider
│       │       ├── media.py       # MediaProvider, YouCamProvider, PassthroughProvider
│       │       ├── publisher.py   # PublisherAdapter, MockPublisher, MetaStub
│       │       └── catalog.py     # CatalogAdapter, LocalCatalog, OrbyteConnectStub
│       ├── seed/ (businesses.json, products.json, images/, cached_outputs/)
│       ├── seed.py
│       └── reset_db.py            # drop_all + create_all + seed
└── docs/ (architecture.png, data-model.md, orbyte-adapter-assumptions.md, privacy-pdpa.md)
```

---

## 5. Data model and table creation

**No migrations.** Define models with SQLModel and create tables at startup:

```python
# app/main.py (sketch)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel
from .db import engine
from . import models            # import so all tables are registered
from .services.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    sched = start_scheduler()
    yield
    sched.shutdown()

app = FastAPI(lifespan=lifespan)
```

> **Caveat:** `create_all` only creates **missing** tables. It does not alter existing ones. If you change a column during the hackathon, run `python reset_db.py` (drop all, create all, reseed). Do not use it on data you care about.

```
business(id, name, tone, languages[], halal_status, business_hours json,
         banned_claims[], brand_colors json, logo_asset_id)

app_user(id, business_id, name, role)                 -- owner | staff | viewer

media_asset(id, business_id, kind, source, path_or_url, mime, width, height,
            parent_asset_id, provider, provider_task_id, created_at)
            -- kind: image | video | overlay ; source: upload | youcam | seed

product(id, business_id, name, price_myr numeric(10,2) null, note text null,
        original_asset_id, understood json null,      -- AI-observed attributes
        understood_confirmed bool default false, stock_status, created_at)

campaign(id, business_id, product_id, kind, goal, language,
         status, created_by, approved_by, approved_at, created_at)
         -- kind: launch | promo | evergreen ; status: building | review | approved | active | paused | cancelled | done

schedule_rule(id, campaign_id, mode, template, days_of_week[], time_local,
              start_date, end_date, platforms[], timezone default 'Asia/Kuala_Lumpur')
              -- mode: launch_sequence | weekly | custom

post_draft(id, campaign_id, platform, language, caption, hashtags[],
           image_asset_id, video_asset_id null, overlay json,
           scheduled_at timestamptz, status, ai_rationale, validator_flags json,
           version int, updated_at)
           -- status: building | blocked | pending_approval | approved | scheduled | published | failed | rejected | paused

media_task(id, campaign_id, kind, provider, provider_task_id, status, attempts, error, created_at, finished_at)

approval(id, campaign_id, draft_id null, actor_id, decision, comment, created_at)

audit_log(id bigserial, business_id, actor_id, actor_role, action, entity_type, entity_id,
          before json, after json, created_at)

post_metric(id, draft_id, impressions, likes, comments, clicks, is_simulated bool default true, captured_at)
```

**Notes**
- `price_myr` is **nullable**. If the owner doesn't enter a price, posts must not mention one (validator rule).
- Keep the **original** product image as its own `media_asset`; every AI output links back through `parent_asset_id`. The review screen needs both.
- Store money as `numeric`, never float.
- `audit_log` is append-only: expose no update or delete endpoints.
- Seed two fictional businesses (a home bakery and a boutique) to show reuse.

---

## 6. The campaign pipeline

```
Trigger: owner submits "New product" (or promo / weekly tick / manual)
   │
   ▼
Understand   vision LLM looks at photo + name → attributes (type, colours, material, setting)
             owner confirms or edits  ("AI-observed" until confirmed)
   │
   ▼
Plan (rules) schedule template → dated slots per platform; formats; language mix
   │
   ├──► Write (LLM)   captions + hashtags per slot, using only confirmed facts
   │
   └──► Media (YouCam, async background jobs)
            image: improve / background change / enhance   → image asset(s)
            video (optional): image → short video          → video asset
   │
   ▼
Assemble drafts (caption + image/video + overlay + time)
   │
   ▼
Validate (rules) → pass / warn / block, saved in validator_flags
   │
   ▼
Campaign status = review → Owner approves the whole campaign → status = active
   │
   ▼
Scheduler tick publishes due, approved posts → audit log, calendar, analytics
```

Run the pipeline as a **background task** (FastAPI `BackgroundTasks`, or a simple in-process queue). The UI polls `GET /campaigns/{id}` and shows progress ("Understanding photo… Improving images… Writing captions…"). Media tasks are asynchronous on YouCam's side, so never block the request on them.

### 6.1 Understand (vision)

Send the product photo plus the name to a vision-capable model on OpenRouter. Return structured attributes:

```json
{
  "product_type": "layered cake",
  "visible_attributes": ["round", "brown and cream layers", "sliced, on a white plate"],
  "suggested_category": "food",
  "uncertain": ["flavour", "ingredients"]
}
```

Rules:
- The UI shows these as **"What we see"** with editable chips. The owner confirms (`understood_confirmed = true`) before captions are written.
- The writer may use **only** confirmed attributes and the owner's own inputs (name, price, note). Anything the AI can't see (flavour, ingredients, size, halal status, price) stays out unless the owner provided it. This is the main defence against hallucinated claims when the only input is a name and a photo.

### 6.2 Plan (rules, not AI)

| Template | Slots (relative to start date) |
|---|---|
| `launch_sequence` | teaser (day 0), launch (day 2–3), social proof or detail (day 4), reminder (day 5), last chance (day 7) |
| `weekly` | user-chosen weekdays and time, N weeks ahead |
| `custom` | user-picked date and time per post |

Further rules: respect business hours, avoid more than one post per platform per day, choose times from `schedule_rule` (or from past engagement later), and give each slot a **stage** (teaser, launch, reminder…) so the writer varies the message. Return a short "why this time" string for the UI.

### 6.3 Write (LLM via OpenRouter)

See §7. Structured output; one call per platform per slot, or one call per platform returning all slots (cheaper and more consistent in tone).

### 6.4 Media (YouCam)

See §8. Prefer operations that **keep the real product** (cutout, background change, enhance) over pure text-to-image generation of the product.

### 6.5 Validate

See §9.

---

## 7. LLM through OpenRouter with the OpenAI SDK

```python
# app/adapters/llm.py (sketch)
import json, os
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

TEXT_MODEL   = os.environ.get("LLM_MODEL_TEXT")     # set from https://openrouter.ai/models
VISION_MODEL = os.environ.get("LLM_MODEL_VISION")   # must accept image input

def write_posts(system: str, user_json: dict, schema: dict) -> dict:
    resp = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user_json)},
        ],
        response_format={"type": "json_schema", "json_schema": {
            "name": "posts", "strict": True, "schema": schema}},
        temperature=0.7,
    )
    return json.loads(resp.choices[0].message.content)

def describe_product(image_data_url: str, name: str) -> dict:
    resp = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{"role": "user", "content": [
            {"type": "text", "text": f"Product name: {name}. Describe only what is visible. "
                                     "Return JSON with product_type, visible_attributes[], uncertain[]."},
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]}],
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)
```

**Notes**
- Model names change. Pick them from the OpenRouter model list and keep them in env vars. Not every model supports strict JSON schema or image input; check each model's page. If a model doesn't support `json_schema`, use `json_object`, validate with Pydantic, and retry once.
- OpenRouter lets you set fallback models and routing options; check their docs if you want automatic fallback.
- Keep temperature moderate (around 0.6–0.8) for copy; keep it low for the vision step.
- Wrap both calls in `LLMProvider`, with a `CachedProvider` that returns saved outputs for seeded products. Use it for rehearsals and as a live-demo safety net.

### Writer prompt (core rules)

```
You write social media posts for a small Malaysian business.
Use ONLY the facts in <facts>. Do not invent prices, discounts, dates, flavours,
ingredients, sizes, certifications or awards. If a fact is missing, leave it out.
If <facts>.price is null, do not mention any price.
Match the brand tone and language setting ('ms', 'en', or 'mixed' = natural BM + English).
Vary the message by campaign stage (teaser, launch, reminder, last_chance).
Never promise virality or guaranteed results. Never mention customers by name.
Platform rules: Facebook = friendly, 1–3 short paragraphs; Instagram = punchy caption + 5–10 hashtags;
TikTok = very short hook + 3–5 hashtags + a one-line video idea.
List every number, price, and date you used in figures_used, and every factual claim in claims_used.
```

Output schema per post: `caption`, `hashtags[]`, `video_idea?`, `rationale`, `figures_used[]`, `claims_used[]`.

---

## 8. Media with the YouCam API

### 8.1 What the official docs say (checked)

- **Auth:** `Authorization: Bearer YOUR_API_KEY`.
- **Flow:** (1) call the **File API** to get an upload URL and a `file_id`; (2) upload the image to that URL; (3) `POST` a task to the feature's endpoint (the quick-start example is `/s2s/v2.0/task/skin-analysis`) and receive a `task_id`; (4) **poll** the task status until `success` or `error`; (5) the success response contains a **download URL** for the result.
- **Other points in the docs:** a Webhook option, rate limits, and a File Retention Period page. The product page states uploaded pictures are deleted within 24 hours, so **download results and store them yourself immediately**.
- **Relevant features** on the product page: AI Image Generator (text-to-image and image-to-image), AI Photo Enhance, AI Photo Background Removal, AI Photo Background Change (with text prompts, aimed at e-commerce product images), AI Image Extender (change aspect ratio), AI Replace, and AI Video Generator (image to video, with motion effects, text prompts and templates).

> ⚠️ **Not verified here:** the exact task endpoint paths, request fields, polling paths and result shapes for the image and video features, plus costs per call. Open each feature's page under **docs.perfectcorp.com/reference** and use the **API Playground** and the **Unit Calculator** before you write the client. The code below shows the *shape* of the integration, not exact field names.

### 8.2 Suggested media recipes

| Goal | Suggested YouCam feature(s) | Why |
|---|---|---|
| Clean, consistent product image | Photo Background Removal, then Photo Background Change (prompted scene, for example "warm festive table, soft light") | Keeps the real product and changes the setting |
| Sharper or better-lit photo | Photo Enhance, Photo Lighting | Fixes common phone-photo issues |
| Different aspect ratios (feed, story) | Image Extender | One photo, several formats |
| Lifestyle or concept image | Image Generator (image-to-image, using the product photo as input) | More creative, higher risk of drifting from the real product, so keep it optional and clearly labelled |
| Short promo video | Video Generator (image to video, with a text prompt or template) | For TikTok and Reels |

Start with **background change + enhance** for the demo. Add video only after the core flow works.

### 8.3 Client sketch

```python
# app/adapters/media.py (sketch; endpoint names and fields are placeholders, confirm in the docs)
import os, time, httpx

BASE = os.environ["YOUCAM_BASE_URL"]       # from docs: API Server page
KEY  = os.environ["YOUCAM_API_KEY"]
H    = {"Authorization": f"Bearer {KEY}"}

class YouCamProvider:
    def upload(self, path: str, mime: str) -> str:
        # 1) File API → returns upload URL + file_id   (see "File API" in the reference)
        meta = httpx.post(f"{BASE}/<file-api-path>", headers=H, json={...}).json()
        httpx.put(meta["requests"]["url"], content=open(path, "rb").read(),
                  headers={"Content-Type": mime})
        return meta["file_id"]

    def run_task(self, feature_path: str, payload: dict, timeout=180) -> str:
        # 2) POST task → task_id
        tid = httpx.post(f"{BASE}{feature_path}", headers=H, json=payload).json()["<task id field>"]
        # 3) poll
        t0 = time.time()
        while time.time() - t0 < timeout:
            r = httpx.get(f"{BASE}{feature_path}/{tid}", headers=H).json()
            status = r["<status field>"]
            if status == "success":
                return r["<result url field>"]
            if status == "error":
                raise RuntimeError(r)
            time.sleep(2)
        raise TimeoutError(tid)

    def download(self, url: str, dest: str):
        with httpx.stream("GET", url) as r, open(dest, "wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
```

### 8.4 Credits, cost and reliability

- **Credits are limited.** Generate media only after the user clicks "Build campaign", not on every keystroke. Cap regenerations per product (for example 3) and show the remaining count.
- **Cache everything:** store each result as a `media_asset` and reuse it. Never regenerate an unchanged input.
- **Pre-generate demo assets** for the seeded products so the demo works even if the API is slow or credits run out (`PassthroughProvider` / `CachedProvider`).
- **Fallback chain:** YouCam result → cached asset → original photo with a Satori overlay. The pipeline must never fail just because media failed; mark the draft "using original image".
- **Rate limits:** check the Rate Limit page; run media tasks sequentially or with a small concurrency limit.
- **Failures:** store `media_task.status`, `attempts`, `error`; retry once, then fall back.

### 8.5 Product fidelity guardrails (important)

AI-edited product images can end up misrepresenting the product. Design for it:
1. Always keep and display the **original**.
2. The review screen shows **original vs improved** side by side.
3. The Owner must tick **"This still looks like my product"** before a campaign can be approved.
4. Label AI-generated or AI-edited media in the UI, and let the owner switch any post back to the original.
5. Prefer cutout and background change over full generation.

---

## 9. Validator (the accuracy layer)

Runs after generation and **again after every edit**. Facts come from `product`, `campaign` and `business`, never from the LLM.

| Check | Logic | Result |
|---|---|---|
| Price present only if provided | If `product.price_myr` is null, caption and overlay must contain no `RM` amount | **block** |
| Price match | Every `RM` amount in caption and overlay equals the product price (or promo price) | **block** |
| Discount match | Any `%` equals the campaign's discount, if one exists; otherwise no `%` | **block** |
| Date window | Dates mentioned must match the campaign window | **block** |
| Unconfirmed attributes | Any claim in `claims_used` not covered by confirmed attributes or the owner's note | **warn** (or **block** for ingredients, allergens, certifications) |
| Banned and risky claims | Business `banned_claims` plus defaults (for example "cures", "guaranteed", "No. 1", "viral guaranteed") | **block** |
| Halal | "halal" only if the profile says certified | **block** |
| Personal data | Phone numbers, emails, IC numbers | **block** |
| Media fidelity | Owner has ticked "still looks like my product" for the images used | **block approval** if not |
| Length and hashtags | Platform limits | **warn** or auto-trim |
| `figures_used` consistency | Declared figures match what the regex finds | **warn** |

```python
# app/services/validator.py (sketch)
import re
from decimal import Decimal

PRICE_RE = re.compile(r"RM\s?(\d+(?:\.\d{1,2})?)", re.I)
PCT_RE   = re.compile(r"(\d{1,3})\s?%")
DEFAULT_BANNED = ["cure", "guaranteed", "no. 1", "#1", "go viral guaranteed", "100% safe"]

def validate(draft, product, campaign, business) -> list[dict]:
    text = f"{draft.caption} {draft.overlay.get('headline','')} {draft.overlay.get('badge','')}"
    flags = []

    prices = {Decimal(m) for m in PRICE_RE.findall(text)}
    if product.price_myr is None and prices:
        flags.append({"code": "PRICE_NOT_PROVIDED", "severity": "block", "detail": str(sorted(prices))})
    elif product.price_myr is not None:
        allowed = {Decimal(str(product.price_myr))}
        for p in prices - allowed:
            flags.append({"code": "PRICE_MISMATCH", "severity": "block",
                          "detail": f"RM{p} not in {sorted(allowed)}"})

    for phrase in business.banned_claims + DEFAULT_BANNED:
        if phrase.lower() in text.lower():
            flags.append({"code": "BANNED_CLAIM", "severity": "block", "detail": phrase})

    if "halal" in text.lower() and business.halal_status != "certified":
        flags.append({"code": "HALAL_UNVERIFIED", "severity": "block", "detail": "Not certified in profile"})

    return flags

def has_block(flags): return any(f["severity"] == "block" for f in flags)
```

**Evidence without a test suite:** every blocked draft writes a `draft.blocked` audit entry, so the dashboard can show a live **"Errors blocked: N"** counter from the activity log. In the demo, deliberately edit a caption to "RM79" and show it being blocked.

---

## 10. Governance: roles, approval, audit, scheduling

### Roles

| Action | Owner | Staff | Viewer |
|---|---|---|---|
| View campaigns, drafts, calendar, analytics | ✅ | ✅ | ✅ |
| Create product, build campaign, edit drafts | ✅ | ✅ | ❌ |
| Submit campaign for approval | ✅ | ✅ | ❌ |
| **Approve, reject, pause, cancel campaign** | ✅ | ❌ | ❌ |
| Edit business profile and banned claims | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ (read) | ❌ |

```python
# app/deps.py (sketch)
def require_role(*roles):
    def checker(user = Depends(current_user)):
        if user.role not in roles:
            audit.log_denied(user, request_path)       # log denied attempts too
            raise HTTPException(403, f"Role '{user.role}' cannot do this")
        return user
    return checker
```

### Approval model for scheduled and recurring posts
- **Launch sequence and custom:** Owner approves the **whole campaign once**. Approved posts are `scheduled` and publish automatically at their times.
- **Recurring (weekly):** the scheduler prepares each next batch of drafts ahead of time as `pending_approval`. **Nothing publishes unapproved.** Optionally let the Owner approve a full week at once.
- **Editing after approval:** any edit to caption, media or time sends that post back to `pending_approval` (and logs it).
- **Controls:** Owner can **pause** (posts become `paused`, not deleted), **resume**, or **cancel** a campaign at any time.
- **Always** run the validator again at approval time and just before publishing.

### Draft state machine

```
building ─► blocked ─(edit)─► (re-validate)
   │                              │
   └────► pending_approval ◄──────┘
              │ approve (owner)        │ reject (owner)
              ▼                        ▼
          scheduled ──► published     rejected
              │  └──► failed (retry once)
              └─► paused ◄─► scheduled (resume)
```

Enforce legal transitions in **one** function; never set `status` ad hoc.

### Audit events (one row each)
`product.created`, `product.understood`, `product.confirmed`, `campaign.built`, `media.created`, `media.failed`, `draft.generated`, `draft.blocked`, `draft.edited`, `campaign.submitted`, `campaign.approved`, `campaign.rejected`, `campaign.paused`, `campaign.resumed`, `campaign.cancelled`, `draft.scheduled`, `draft.published`, `draft.failed`, `permission.denied`.

### Scheduler

```python
# app/services/scheduler.py (sketch)
from apscheduler.schedulers.background import BackgroundScheduler

def tick():
    now = utcnow()
    for d in due_drafts(now):                  # status == scheduled and scheduled_at <= now
        if has_block(validate_again(d)):
            mark(d, "failed", reason="validator"); continue
        result = publisher.publish(d)          # MockPublisher in the prototype
        mark(d, "published" if result.ok else "failed"); audit(...)
    prepare_next_batches(now)                  # for recurring campaigns: create drafts (pending_approval)

def start_scheduler():
    s = BackgroundScheduler(timezone="Asia/Kuala_Lumpur")
    s.add_job(tick, "interval", seconds=30)
    s.start()
    return s
```

Also expose `POST /internal/tick` (protected by a secret header) so an external pinger can trigger it if the host sleeps, plus a **"Publish now"** button for the demo. Store all times in UTC and show them in `Asia/Kuala_Lumpur`.

---

## 11. Hosting on Replit

> Replit's deployment types and settings change. Check the current Replit docs for port handling, deployment options, secrets and storage before relying on the details below.

**Suggested setup**
- One Replit project (monorepo) with **two processes**: FastAPI (`uvicorn` on port 8000, internal) and Next.js (on the externally exposed port).
- Use `next.config.js` **rewrites** so the browser only talks to Next.js: `/backend/:path*` → `http://localhost:8000/:path*`. This avoids CORS and keeps one public URL.
- `run.sh` starts both:

```bash
#!/usr/bin/env bash
(cd apps/api && uvicorn app.main:app --host 0.0.0.0 --port 8000) &
(cd apps/web && npm run build && npm run start -- -p 3000) &
wait
```

- **Secrets:** use Replit's Secrets for `DATABASE_URL`, `OPENROUTER_API_KEY`, `YOUCAM_API_KEY`, etc. Never commit them.
- **Always-on for the scheduler:** the in-process scheduler only runs while the app is running. Use a deployment type that stays up (not one that scales to zero when idle), or ping `/internal/tick` from an external cron service. For the live demo, keep the Repl running and also provide the "Publish now" button.
- **Media files:** deployed filesystems may not persist between restarts. Prefer Replit's object/app storage if available, or store resized images in the database as a fallback for small demo assets. Always keep the YouCam outputs, because YouCam deletes uploads and results after about 24 hours.
- **Neon:** use the pooled connection string, expect a cold-start delay after idle, and send a warm-up request before the demo.
- Provide a **local run path** (`README`: install, set `.env`, run `run.sh`) as a backup in case Replit has trouble during judging.

---

## 12. API surface

| Method & path | Purpose | Roles |
|---|---|---|
| `POST /products` (multipart: name, photo, price?, note?) | Create product, save original asset, start "understand" | owner, staff |
| `GET /products/{id}` | Product with original and understood attributes | all |
| `PATCH /products/{id}/understood` | Confirm or edit AI-observed attributes | owner, staff |
| `POST /campaigns` (product_id, kind, goal, language, schedule) | Create campaign; start build in background | owner, staff |
| `GET /campaigns/{id}` | Status, progress, drafts, flags | all |
| `POST /campaigns/{id}/media/regenerate` | Rerun media (counts against the cap) | owner, staff |
| `PATCH /drafts/{id}` | Edit caption, hashtags, time, image choice (re-validates) | owner, staff |
| `POST /campaigns/{id}/submit` | Staff submits for approval | owner, staff |
| `POST /campaigns/{id}/approve` | Approves the campaign (requires the fidelity tick) | **owner** |
| `POST /campaigns/{id}/reject` | Reject with comment | owner |
| `POST /campaigns/{id}/pause` · `/resume` · `/cancel` | Controls | owner |
| `GET /calendar?from=&to=` | Scheduled and published posts | all |
| `POST /internal/tick` | Run the scheduler once (secret header) | system |
| `POST /drafts/{id}/publish-now` | Demo helper | owner |
| `GET /analytics/summary` | Simulated metrics and "errors blocked" counter | all |
| `GET /audit` | Activity log | owner, staff |
| `GET /health` | Health check | open |

---

## 13. Frontend screens

| Screen | Content |
|---|---|
| **Dashboard** | Campaigns, drafts waiting for approval, posts this week, time-saved counter, errors blocked |
| **New product wizard** | Step 1: name + photo (+ optional price and note). Step 2: "What we see" (confirm attributes). Step 3: pick a schedule (launch sequence, weekly, custom) and languages. Step 4: Build |
| **Build progress** | Live steps: understanding, improving images, writing captions, checking facts |
| **Review (approval)** | Original vs improved image side by side with the fidelity tick; per-platform preview cards; validator badges (✅ ⚠ ⛔); "why this time"; schedule list; **Approve campaign** (disabled with a tooltip for Staff) |
| **Calendar** | Week and month view of scheduled and published posts; pause or resume controls |
| **Audit log** | Who, what, when; expand for before/after |
| **Role switcher** | Top-bar: Owner (Aisha), Staff (Daniel), Viewer (Mei Ling) |

**Ease-of-learning details:** a three-step banner ("Tell us, Review, Approve"), plain BM/EN labels, a useful empty state, and a timer for the first-time-user test.

**Overlay route:** `/api/overlay?image=<url>&headline=...&price=RM...&badge=...` composes the final feed image (price badge, headline) on top of the improved image. The price is taken from the product record, not from the LLM.

---

## 14. Synthetic data

- 2 businesses: **Kek Kak Nora** (home bakery, halal-certified in the demo data) and **Butik Seri Mawar** (boutique).
- 4–6 products each, with product photos that are your own, AI-generated, or free-licence, with **no real people, brands or customers**.
- For each seeded product, pre-generated cached outputs (improved image, one video, captions) in `seed/cached_outputs/`.
- 30 days of simulated metrics; 10–15 fictional comments if you build the stretch feature.
- State clearly in the README that all data is fictional.

---

## 15. Config and environment

```
# .env.example
DATABASE_URL=postgresql+psycopg://USER:PASS@HOST/db?sslmode=require     # Neon pooled string
OPENROUTER_API_KEY=...
LLM_MODEL_TEXT=...                  # pick from openrouter.ai/models
LLM_MODEL_VISION=...                # must support image input
LLM_MODE=live                       # live | cached
YOUCAM_API_KEY=...
YOUCAM_BASE_URL=...                 # from the YouCam "API Server" docs page
MEDIA_MODE=live                     # live | cached | passthrough
MEDIA_REGEN_CAP=3
DEMO_TOKEN_SECRET=change-me
INTERNAL_TICK_SECRET=change-me
PUBLISHER=mock                      # mock | meta
```

Python packages (suggested): `fastapi`, `uvicorn`, `sqlmodel`, `psycopg[binary]`, `openai`, `httpx`, `apscheduler`, `pydantic`, `python-multipart`, `pillow`.

---

## 16. Risks and fallbacks (technical)

| Risk | Fallback |
|---|---|
| LLM output malformed or wrong | Structured output, one retry, then cached draft; validator blocks bad facts regardless |
| Model doesn't support strict JSON schema | `json_object` mode plus Pydantic validation and retry |
| YouCam slow, failing or out of credits | Cached assets, then original photo plus Satori overlay; clear "using original image" label |
| AI image drifts from the real product | Cutout and background-change recipes, side-by-side review, fidelity tick, easy revert to original |
| Real publishing impossible in time | `MockPublisher`, "copy and download" button, documented Meta adapter stub |
| Replit sleeps or restarts during the demo | Always-on deployment or external pinger, "Publish now" button, local run backup |
| Media files lost on restart | Persist to object storage or DB, keep seed assets in the repo |
| `create_all` doesn't update changed tables | `reset_db.py` (drop, create, seed) |
| Scope creep | Freeze scope at the "Must work live" list in §1 |

---

## 17. Build order (suggested)

1. **Skeleton on Replit:** repo, Neon connection, FastAPI health, Next.js shell with rewrite to the API, role switcher, `create_all` and seed.
2. **Product intake:** wizard step 1, upload, save original asset.
3. **LLM adapter** with the cached provider first, so the UI can be built early; then switch on OpenRouter for vision and captions.
4. **Planner and drafts:** launch-sequence template, draft creation, calendar view.
5. **Validator** and the blocked state. Do this early; it is the accuracy story.
6. **Review screen,** RBAC, state machine, audit writes, campaign approval.
7. **Scheduler and mock publisher,** pause and resume.
8. **YouCam image recipe** (background change plus enhance), original vs improved view, fidelity tick, fallbacks.
9. **Overlay route,** dashboard counters, simulated analytics.
10. **Polish:** empty states, error messages, README, architecture diagram, demo rehearsal.
11. **Stretch:** video generation, weekly cadence, BM/EN toggle, comment replies.

### Suggested ownership (4 people)
- **Frontend:** wizard, review screen, calendar, overlay route
- **Backend:** FastAPI, DB, state machine, audit, scheduler
- **AI and media:** OpenRouter prompts and schemas, YouCam client and recipes, validator rules
- **Product and pitch:** interviews, metrics, README, slides, demo rehearsal

---

## 18. Demo script (about 3 minutes)

1. Sign in as **Owner**. Start **New product**: "Kek Lapis Premium", upload a photo, price RM65.
2. Confirm **"What we see"** (the AI describes the cake; fix one wrong attribute).
3. Choose **Launch sequence**, Facebook + Instagram + TikTok, mixed language. Click **Build**. Show live progress.
4. Open **Review**: original vs improved image, captions per platform, the schedule of five posts.
5. Edit one caption to say "RM55". It is **blocked** by the validator. Fix it.
6. Switch to **Staff**: try to approve and get a friendly 403 (also logged).
7. Switch to **Owner**: tick "still looks like my product" and **Approve campaign**. The calendar fills.
8. Click **Publish now** on the first post (or let the scheduler fire). It shows as published.
9. Open the **Audit log**: built, blocked, edited, denied, approved, published. Show **minutes to approve** and **errors blocked**.
10. Pause the campaign to show control. Close on the Orbyte adapter and roadmap slide.

**Rehearse with the LLM and media caches both on and off, and know which one you're showing.**

---

## 19. README checklist (judges will open the repo)

- [ ] One-paragraph description and the problem
- [ ] Architecture diagram (use §2)
- [ ] Quick start (Replit and local), `.env.example`, seed and reset commands
- [ ] Demo accounts (Owner, Staff, Viewer)
- [ ] Demo script (§18)
- [ ] Synthetic data statement and PDPA note
- [ ] API assumptions for the Orbyte adapters
- [ ] Known limitations (mock publishing, simulated analytics, cached demo assets) and the roadmap
- [ ] Public repo, and a link that matches exactly what you demo