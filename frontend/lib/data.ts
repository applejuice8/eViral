// Mock data for the eViral demo UI. No backend — everything is synthetic.
// Single-user scope: the app runs as one Owner (Aisha), no login, no role switcher.

import type { Platform } from "@/lib/api";
export type { Platform };

export type DraftStatus =
  | "building"
  | "blocked"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "failed"
  | "rejected"
  | "paused";

export type ValidatorSeverity = "pass" | "warn" | "block";

export interface ValidatorFlag {
  code: string;
  severity: Exclude<ValidatorSeverity, "pass">;
  detail: string;
}

export interface PostDraft {
  id: string;
  campaignId: string;
  platform: Platform;
  stage: "teaser" | "launch" | "detail" | "reminder" | "last_chance";
  caption: string;
  hashtags: string[];
  videoIdea?: string;
  scheduledAt: string; // ISO, Asia/Kuala_Lumpur local wall time for display
  status: DraftStatus;
  flags: ValidatorFlag[];
  whyThisTime: string;
  usesOriginalImage?: boolean;
}

export interface Campaign {
  id: string;
  productName: string;
  productImageOriginal: string;
  productImageImproved: string;
  price: number | null;
  note?: string;
  kind: "launch" | "promo" | "evergreen";
  language: "ms" | "en" | "mixed";
  goal: string;
  status: "building" | "review" | "approved" | "active" | "paused" | "done";
  createdAt: string;
  drafts: PostDraft[];
}

export interface AuditEvent {
  id: number;
  actor: string;
  actorInitials: string;
  action:
    | "built"
    | "generated"
    | "blocked"
    | "edited"
    | "approved"
    | "published"
    | "paused"
    | "resumed"
    | "confirmed";
  entityType: "campaign" | "draft" | "product";
  entityName: string;
  detail?: string;
  before?: string;
  after?: string;
  at: string;
}

export const owner = {
  name: "Aisha Rahman",
  initials: "AR",
  business: "Kek Kak Nora",
  businessTagline: "Home bakery · Halal certified",
};

export const kpis = {
  draftsAwaitingApproval: 3,
  postsThisWeek: 9,
  minutesToApprove: 3.2,
  errorsBlocked: 7,
};

// One AI-generated caption shared by every platform post. Hashtags are part
// of the caption text (rendered with hashtag styling when detected).
export const aiCaption =
  "It's here! Kek Lapis Sarawak Premium — RM65 sebiji, batch terhad, sedia 1 Dec. Tempah awal sebelum habis! Pre-order now before it's gone. #KekKakNora #KekLapis #SarawakFood #PreOrderMY";

export const demoCampaign: Campaign = {
  id: "cmp_kek-lapis",
  productName: "Kek Lapis Sarawak Premium",
  productImageOriginal: "/assets/kek-lapis-original.svg",
  productImageImproved: "/assets/kek-lapis-improved.svg",
  price: 65,
  note: "Limited batch — ready 1 Dec",
  kind: "launch",
  language: "mixed",
  goal: "Get pre-orders",
  status: "review",
  createdAt: "2026-10-23T09:12:00+08:00",
  drafts: [
    {
      id: "d1",
      campaignId: "cmp_kek-lapis",
      platform: "facebook",
      stage: "launch",
      caption: aiCaption,
      hashtags: [],
      scheduledAt: "2026-10-29T12:00:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "Thursday lunch — launch posts land best mid-day on weekdays.",
    },
    {
      id: "d2",
      campaignId: "cmp_kek-lapis",
      platform: "instagram",
      stage: "launch",
      caption: aiCaption,
      hashtags: [],
      scheduledAt: "2026-10-29T12:00:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "Same slot as the Facebook post for a coordinated push.",
    },
    {
      id: "d3",
      campaignId: "cmp_kek-lapis",
      platform: "tiktok",
      stage: "teaser",
      caption: aiCaption,
      hashtags: [],
      videoIdea:
        "Slow pan across the sliced layers, quick cut to the whole cake, text overlay: 'Coming Monday'.",
      scheduledAt: "2026-10-26T20:30:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "TikTok peaks slightly later — 30 minutes after the feed posts.",
    },
  ],
};

export const calendarExtras: PostDraft[] = [
  {
    id: "x1",
    campaignId: "cmp_scones",
    platform: "instagram",
    stage: "detail",
    caption: "Behind the scenes: scones fresh from the oven. #KekKakNora",
    hashtags: [],
    scheduledAt: "2026-10-21T18:00:00+08:00",
    status: "published",
    flags: [],
    whyThisTime: "",
  },
  {
    id: "x2",
    campaignId: "cmp_scones",
    platform: "facebook",
    stage: "detail",
    caption: "Resipi mudah, rasa luar biasa — scones Kak Nora. #KekKakNora",
    hashtags: [],
    scheduledAt: "2026-10-22T20:00:00+08:00",
    status: "published",
    flags: [],
    whyThisTime: "",
  },
  {
    id: "x3",
    campaignId: "cmp_scones",
    platform: "tiktok",
    stage: "detail",
    caption: "Rating our own scones #FoodTokMY",
    hashtags: [],
    scheduledAt: "2026-10-24T21:00:00+08:00",
    status: "scheduled",
    flags: [],
    whyThisTime: "",
  },
  {
    id: "x4",
    campaignId: "cmp_scones",
    platform: "instagram",
    stage: "reminder",
    caption: "Weekend bake list is open #KekKakNora",
    hashtags: [],
    scheduledAt: "2026-10-25T10:00:00+08:00",
    status: "approved",
    flags: [],
    whyThisTime: "",
  },
];

export const auditEvents: AuditEvent[] = [
  {
    id: 1,
    actor: "Aisha Rahman",
    actorInitials: "AR",
    action: "built",
    entityType: "campaign",
    entityName: "Kek Lapis Sarawak Premium — Launch",
    detail: "Campaign built: 7 drafts across 3 platforms",
    at: "2026-10-23T09:12:00+08:00",
  },
  {
    id: 2,
    actor: "Aisha Rahman",
    actorInitials: "AR",
    action: "confirmed",
    entityType: "product",
    entityName: "Kek Lapis Sarawak Premium",
    detail: "Confirmed AI-observed attributes (edited 1)",
    at: "2026-10-23T09:10:00+08:00",
  },
  {
    id: 3,
    actor: "eViral",
    actorInitials: "eV",
    action: "blocked",
    entityType: "draft",
    entityName: "Facebook · Launch post",
    detail: "PRICE_MISMATCH — RM79 in caption, product price is RM65",
    before: "…kini dibuka untuk tempahan! RM79 sebiji…",
    after: "…kini dibuka untuk tempahan! RM65 sebiji…",
    at: "2026-10-23T09:13:00+08:00",
  },
  {
    id: 4,
    actor: "Aisha Rahman",
    actorInitials: "AR",
    action: "edited",
    entityType: "draft",
    entityName: "Facebook · Launch post",
    detail: "Caption edited — re-validated (pass)",
    before: "RM79 sebiji",
    after: "RM65 sebiji",
    at: "2026-10-23T09:15:00+08:00",
  },
  {
    id: 5,
    actor: "eViral",
    actorInitials: "eV",
    action: "generated",
    entityType: "draft",
    entityName: "TikTok · Teaser",
    detail: "Caption + video idea generated (mixed BM/EN)",
    at: "2026-10-23T09:12:30+08:00",
  },
  {
    id: 6,
    actor: "Aisha Rahman",
    actorInitials: "AR",
    action: "approved",
    entityType: "campaign",
    entityName: "Scones Weekender — Evergreen",
    detail: "Campaign approved — 3 posts scheduled",
    at: "2026-10-20T18:02:00+08:00",
  },
  {
    id: 7,
    actor: "eViral",
    actorInitials: "eV",
    action: "published",
    entityType: "draft",
    entityName: "Instagram · Behind the scenes",
    detail: "Published on schedule (mock publisher)",
    at: "2026-10-21T18:00:00+08:00",
  },
  {
    id: 8,
    actor: "eViral",
    actorInitials: "eV",
    action: "blocked",
    entityType: "draft",
    entityName: "Instagram · Promo post",
    detail: "BANNED_CLAIM — 'guaranteed best seller' is on the banned list",
    before: "…guaranteed best seller!…",
    at: "2026-10-19T11:41:00+08:00",
  },
  {
    id: 9,
    actor: "Aisha Rahman",
    actorInitials: "AR",
    action: "paused",
    entityType: "campaign",
    entityName: "October Promo",
    detail: "Campaign paused — remaining posts held",
    at: "2026-10-18T08:22:00+08:00",
  },
  {
    id: 10,
    actor: "Aisha Rahman",
    actorInitials: "AR",
    action: "resumed",
    entityType: "campaign",
    entityName: "October Promo",
    detail: "Campaign resumed",
    at: "2026-10-18T14:05:00+08:00",
  },
];

export const needsApproval = demoCampaign.drafts.filter(
  (d) => d.status === "pending_approval"
);

export const platformLabel: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export const stageLabel: Record<PostDraft["stage"], string> = {
  teaser: "Teaser",
  launch: "Launch",
  detail: "Detail",
  reminder: "Reminder",
  last_chance: "Last chance",
};
