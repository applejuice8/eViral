# eViral — Web

Frontend for **eViral**, an Orbyte module for AI-assisted social media marketing.
All screens read data from the FastAPI backend (`../backend`) through the Next
rewrite at `/backend/*` (`lib/api.ts`). Social pages show only posts returned
by the backend's mock publisher; they do not include fixture feed content.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style primitives (`components/ui`) · pnpm.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000, expects the backend on :8000 (BACKEND_ORIGIN)
pnpm test
```

> Build output goes to `.next/` (gitignored). If `.next` ever gets stuck with a
> stale cache that can't be cleaned, delete it (`rm -rf .next`) and rebuild —
> or build into a throwaway dir with `NEXT_DIST_DIR=<dir> pnpm build`.
> Remember to delete the throwaway dir afterwards; it is not gitignored.

## Screens

| Route | What it is | Design reference (Mobbin) |
|---|---|---|
| `/` | Dashboard: post and campaign counts, next posts, latest campaign, recent activity | Later overview |
| `/products/new` | 4-step wizard: Tell us (photo upload, Load mock data) → Confirm (what the AI saw) → Schedule → Build (real progress) | Zillow progress bar, OpenSea intake form, Asana editable chips, Employment Hero loading |
| `/review/[campaignId]` | Campaign: original vs AI image, post previews per stage with inline caption editing and Publish now | Buffer composer |
| `/calendar` | Week/month calendar of posts (Malaysia time), click for side panel and Publish now | Buffer calendar |
| `/audit` | Activity feed: Draft, Generated, Posted | 7shifts activity log |
| `/instagram` `/facebook` `/tiktok` | Mock social feeds: real posted posts first, then filler posts | — |

## Conventions

- **Single-user demo:** the app runs as one Owner (Aisha, KK Kopitiam, from `/summary`). No login. Posts go out on schedule without an approval step.
- **Post statuses:** draft → scheduled → posted (or failed). Colors: blue = scheduled · green = posted · red = failed · grey = draft.
- All times come from the API in UTC and are shown in Asia/Kuala_Lumpur (`lib/format.ts`).
- Captions are shown with hashtags on their own line at the bottom, in blue.
- Brand color: violet (`brand-*` tokens in `app/globals.css`).
- `public/assets/kek-lapis-sample.jpg` is the sample photo used by "Load mock data". The SVGs are only used by the filler social posts.
