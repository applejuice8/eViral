// Mock data for the eViral demo UI. No backend — everything is synthetic.
// Single-user scope: the app runs as one Owner (Aisha), no login, no role switcher.

export type Platform = "facebook" | "instagram" | "tiktok";

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
  draftsAwaitingApproval: 4,
  postsThisWeek: 9,
  minutesToApprove: 3.2,
  errorsBlocked: 7,
};

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
      stage: "teaser",
      caption:
        "Ada bau baru dari dapur Kak Nora 👀 Sesuatu yang berlapis-lapis sedang disiapkan… Nantikan Isnin ini!",
      hashtags: ["#KekKakNora", "#KekLapis", "#ComingSoon"],
      scheduledAt: "2026-10-26T20:00:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "Monday 8pm — your audience is most active on weekday evenings.",
    },
    {
      id: "d2",
      campaignId: "cmp_kek-lapis",
      platform: "instagram",
      stage: "teaser",
      caption:
        "Something layered is coming 🍰✨ Teaser: Kek Lapis Sarawak Premium dari dapur Kak Nora. Stay tuned!",
      hashtags: [
        "#KekLapis",
        "#SarawakFood",
        "#HomeBaker",
        "#KekKakNora",
        "#Teaser",
        "#MalaysiaEats",
      ],
      scheduledAt: "2026-10-26T20:00:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "Monday 8pm — pairs with the Facebook teaser for a coordinated reveal.",
    },
    {
      id: "d3",
      campaignId: "cmp_kek-lapis",
      platform: "tiktok",
      stage: "teaser",
      caption: "POV: the layered cake everyone asks about is almost here 👀",
      hashtags: ["#KekLapis", "#HomeBakerMY", "#FoodTokMY"],
      videoIdea:
        "Slow pan across the sliced layers, quick cut to the whole cake, text overlay: 'Coming Monday'.",
      scheduledAt: "2026-10-26T20:30:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "TikTok peaks slightly later — 30 minutes after the feed posts.",
    },
    {
      id: "d4",
      campaignId: "cmp_kek-lapis",
      platform: "facebook",
      stage: "launch",
      caption:
        "Kek Lapis Sarawak Premium kini dibuka untuk tempahan! 🎉 RM65 sebiji. Batch terhad — sedia 1 Dis. Tempah awal supaya tak kecewa. WhatsApp kami atau komen NAK di bawah!",
      hashtags: ["#KekKakNora", "#KekLapisSarawak", "#PreOrder"],
      scheduledAt: "2026-10-29T12:00:00+08:00",
      status: "blocked",
      flags: [
        {
          code: "PRICE_MISMATCH",
          severity: "block",
          detail: "Caption earlier said RM79 — product price is RM65. (Sample of a blocked draft.)",
        },
      ],
      whyThisTime: "Thursday lunch — launch posts land best mid-day on weekdays.",
    },
    {
      id: "d5",
      campaignId: "cmp_kek-lapis",
      platform: "instagram",
      stage: "launch",
      caption:
        "It's here ✨ Kek Lapis Sarawak Premium — RM65, limited batch, ready 1 Dec. Pre-order now before it's gone!",
      hashtags: [
        "#KekLapis",
        "#SarawakFood",
        "#PreOrderMY",
        "#HomeBaker",
        "#KekKakNora",
        "#FoodieMY",
        "#SupportLocal",
      ],
      scheduledAt: "2026-10-29T12:00:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "Same slot as the Facebook launch for a coordinated push.",
    },
    {
      id: "d6",
      campaignId: "cmp_kek-lapis",
      platform: "facebook",
      stage: "reminder",
      caption:
        "Peringatan mesra 💛 Kek Lapis Sarawak Premium (RM65) — batch terhad, sedia 1 Dis. Yang dah tempah, terima kasih! Yang belum, jangan tunggu last minute.",
      hashtags: ["#KekKakNora", "#KekLapis"],
      scheduledAt: "2026-10-31T20:00:00+08:00",
      status: "pending_approval",
      flags: [
        {
          code: "UNCONFIRMED_ATTRIBUTE",
          severity: "warn",
          detail: "'Premium' is an AI-observed attribute — owner confirmed it during intake.",
        },
      ],
      whyThisTime: "Saturday evening — weekend browsing slot.",
    },
    {
      id: "d7",
      campaignId: "cmp_kek-lapis",
      platform: "instagram",
      stage: "last_chance",
      caption:
        "Last call 🚨 Kek Lapis Sarawak Premium (RM65). Batch terhad — once it's gone, it's gone. Ready 1 Dec. DM to pre-order!",
      hashtags: [
        "#LastCall",
        "#KekLapis",
        "#KekKakNora",
        "#PreOrderMY",
        "#SarawakFood",
      ],
      scheduledAt: "2026-11-02T20:00:00+08:00",
      status: "pending_approval",
      flags: [],
      whyThisTime: "Monday 8pm — closes the 7-day launch sequence.",
    },
  ],
};

export const calendarExtras: PostDraft[] = [
  {
    id: "x1",
    campaignId: "cmp_scones",
    platform: "instagram",
    stage: "detail",
    caption: "Behind the scenes: scones fresh from the oven 🧈",
    hashtags: ["#KekKakNora"],
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
    caption: "Resipi mudah, rasa luar biasa — scones Kak Nora.",
    hashtags: ["#KekKakNora"],
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
    caption: "Rating our own scones 🫣",
    hashtags: ["#FoodTokMY"],
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
    caption: "Weekend bake list is open 🍓",
    hashtags: ["#KekKakNora"],
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
