# eViral — Web (UI demo)

Frontend for **eViral**, an Orbyte module for AI-assisted social media marketing.
**UI only** — all data is synthetic mock data (`lib/data.ts`); there is no backend logic.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style primitives (`components/ui`) · pnpm.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

> Note: if the local environment blocks cleaning the default `.next` cache,
> build into a fresh dir instead: `NEXT_DIST_DIR=.next-build pnpm build`.

## Screens

| Route | What it is | Design reference (Mobbin) |
|---|---|---|
| `/` | Dashboard: KPI cards, approval queue, activity preview | Later overview |
| `/products/new` | 4-step wizard: Tell us → Confirm → Schedule → Build | Zillow progress bar, OpenSea intake form, Asana editable chips, Employment Hero loading |
| `/review/[campaignId]` | Approval screen: original vs AI-edited image, fidelity tick, per-platform post previews with inline editing and live fact-check badges | Buffer composer |
| `/calendar` | Week/month calendar of posts, click for side panel | Buffer calendar |
| `/audit` | Activity feed with action chips and before/after detail | 7shifts activity log |

## Conventions

- **Single-user demo:** the app runs as one Owner (Aisha, Kek Kak Nora). No login, no role switcher. Approve/pause/publish are always enabled.
- **Status colors (used consistently across badges, calendar, audit):** green = approved/published · amber = pending/warning · red = blocked/failed · blue = informational/scheduled.
- Brand color: violet (`brand-*` tokens in `app/globals.css`).
- Product images in `public/assets/` are synthetic SVG placeholders (original vs AI-improved).
- Demo moment: on `/review/cmp_kek-lapis`, edit a caption to a wrong price (e.g. RM79) — the fact-check flags it as blocked. The Approve button stays disabled until all blocks are fixed and the fidelity box is ticked.
