# eViral — Design Spec (final choices via Mobbin)

> All parts decided. This is the single design reference for the build.
> Note: previews couldn't be rendered inline in this session, so skim each linked screen before build; descriptions are based on app + screen type.

---

## Locked choices

| # | Part | Choice | Reference |
|---|---|---|---|
| 1 | Wizard progress | **Zillow** — top progress bar | [Zillow guided listing flow](https://mobbin.com/screens/27ea6e18-6341-44cc-8456-75f54b8b2fb7) |
| 2 | Product intake form | **OpenSea** — product listing form | [OpenSea listing form](https://mobbin.com/screens/b4326929-e8a3-4c16-bbe0-e590e11f26c6) |
| 3 | Review / draft editing | **Buffer** — social media post composer | [Buffer composer](https://mobbin.com/screens/24370d2b-c8ce-46bc-9434-99c2c630c594) |
| 4 | Build progress / loading | **Employment Hero** — loading screen | [Employment Hero loading](https://mobbin.com/screens/ed845e9e-1e6f-4e7e-b92f-2801bbc83d81) |
| 5 | Calendar | **Buffer** — post calendar | [Buffer calendar](https://mobbin.com/screens/d6f0c6d4-f50b-45a5-954b-d03e48cdc655) |
| 6 | Dashboard | **Later** — performance overview | [Later overview](https://mobbin.com/screens/527fbc54-2171-4419-b374-67abab12932f) |
| 7 | Activity / audit log | **7shifts** — activity feed | [7shifts activity feed](https://mobbin.com/screens/8b845427-b403-4eb7-87c9-aa771a00d378) |

**Still open (only one):** the "What we see" AI-attribute confirmation step (wizard step 2). My standing recommendation is Asana-style inline-editable chips — [Asana](https://mobbin.com/screens/a7c7d26a-be3a-4cfa-aef0-8c5688f18034) — but it can also be folded into the OpenSea intake form as a review panel. Decide before building the wizard.

---

## How each screen is built

### `/products/new` — New product wizard
- **Top:** Zillow-style slim horizontal progress bar: *Tell us → Confirm → Schedule → Build*. Completed steps filled, current highlighted, future muted.
- **Step 1 (OpenSea listing form):** NFT-marketplace-grade listing layout — large media upload panel as the hero element, name field prominent, price and note as clearly optional secondary fields. OpenSea's form proves a photo-first intake can look premium and stay simple.
- **Step 2:** "What we see" — AI-observed attributes as editable chips next to the uploaded photo (pattern TBD, see "Still open"). One "Looks right ✓" confirm.
- **Step 3:** Schedule picker (launch sequence / weekly / custom) + language choice.
- **Step 4:** Build → hands off to the loading screen.

### Build progress (Employment Hero loading)
- Employment Hero-style polished loading state during the pipeline run. Adapt to show the pipeline stages as light status lines or animated progress — *Understanding photo → Improving images → Writing captions → Checking facts* — while keeping the visual style (clean, branded, non-anxious animation).
- Poll `GET /campaigns/{id}`; show partial results as they land where the layout allows.

### `/review/[campaignId]` — Review & approval (Buffer composer)
- Each platform draft rendered as a **real post preview card** (Facebook / Instagram / TikTok mock frames), Buffer-composer style, with inline caption editing, hashtags, and scheduled time.
- Above the cards: campaign summary, **original vs AI-improved image side by side**, "AI-edited" label, and the **"This still looks like my product" checkbox** gating the Approve button.
- Validator results as badges on each card (✅ pass · ⚠ warn · ⛔ blocked, red left border).
- "Publish now" on the first approved post for the demo.

### `/calendar` — Buffer calendar
- Week view default, month toggle. Entries = thumbnail + platform icon + time, color-coded by status (approved/pending/published/blocked).
- Click an entry → side panel with post preview, validator flags, publish/pause controls.
- Mirrors the Buffer composer styling from the review screen — one visual language.

### `/` Dashboard — Later overview
- Image-first KPI cards: **Drafts awaiting approval · Posts this week · Minutes to approve · Errors blocked** (the last two are judge-facing metrics).
- Below: "Needs your approval" action list + recent activity preview (links to the audit page).
- Teaching empty state: "Add your first product →".

### `/audit` — 7shifts activity feed
- 7shifts-style activity feed: avatar/actor, action chip colored by type (blocked=red, approved=green, published=blue, edited=amber), entity link, expandable before/after detail.
- "Errors blocked" filter chip as a one-click demo moment feeding the dashboard counter.

---

## Scope simplification: single user, no login

For the demo, eViral runs as **one user (the Owner)** with no login screen and no role switcher:

- No sign-in, no account picker, no workspace switcher — app opens straight to the dashboard.
- Approve / pause / cancel / publish-now buttons are always enabled (single-Owner assumption).
- The demo-script step "switch to Staff and get a friendly 403" is **dropped**; the "errors blocked" validator moment becomes the governance showcase instead.
- Backend note: the API keeps a stubbed `current_user` returning the single Owner identity, so audit rows still have an actor and RBAC can be re-enabled post-demo without rework. This deviates from TECHNICAL_IMPLEMENTATION.md §10/§12 role tables — update the README's demo script accordingly.

## Overall visual direction

- **Feel:** friendly, image-first, low-density — Buffer/Later-adjacent; premium-but-simple intake à la OpenSea.
- **Stack:** shadcn/ui + Tailwind covers every pattern above.
- **Color semantics:** green = approved/published · amber = pending/warning · red = blocked/failed · blue = informational — consistent across badges, calendar cells, audit chips.
- **Mobile:** wizard + review must work on a phone — owners run everything from their phone.
