// Typed client for the eViral backend. The browser talks to it through the
// Next rewrite at /backend/*, so there is no CORS setup. All datetimes from
// the API are UTC ISO strings ("...Z"); see lib/format.ts for display.

export type Platform = "facebook" | "instagram" | "tiktok";
export type Language = "ms" | "en" | "mixed";
export type Stage = "teaser" | "launch" | "reminder" | "last_chance";
export type PostStatus = "draft" | "scheduled" | "posted" | "failed";
export type CampaignStatus = "building" | "scheduled" | "done" | "failed";
export type ScheduleMode = "launch_sequence" | "weekly" | "custom";
export type StepState = "pending" | "running" | "done" | "failed";
export type BuildStep = "understand" | "images" | "captions" | "checks";
export type ActivityAction = "draft" | "generated" | "posted";

export interface Understood {
  product_type: string;
  visible_attributes: string[];
  suggested_category: string;
  uncertain: string[];
}

export interface Product {
  id: number;
  name: string;
  price_myr: string | null;
  note: string | null;
  photo_url: string;
  understood: Understood | null;
  confirmed_attributes: string[] | null;
  understood_confirmed: boolean;
  understood_model: string | null;
  created_at: string;
}

export interface Post {
  id: number;
  campaign_id: number;
  product_id: number;
  product_name: string;
  platform: Platform;
  stage: Stage | null;
  caption: string;
  hashtags: string[];
  video_idea: string | null;
  image_url: string | null;
  uses_original_image: boolean;
  scheduled_at: string | null;
  status: PostStatus;
  posted_at: string | null;
  published_url: string | null;
  why_this_time: string | null;
}

export interface FeedPost extends Post {
  business_name: string;
}

export interface StepProgress {
  state: StepState;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
}

export interface ScheduleInput {
  mode: ScheduleMode;
  /** Start date for launch_sequence/weekly, every picked date for custom. */
  dates: string[];
  time: string;
  days: string[];
}

export interface Campaign {
  id: number;
  status: CampaignStatus;
  language: Language;
  platforms: Platform[];
  schedule: { mode: ScheduleMode; [key: string]: unknown };
  progress: Record<BuildStep, StepProgress>;
  error: string | null;
  created_at: string;
  updated_at: string;
  product: Product;
  posts: Post[];
}

export interface CampaignSummary {
  id: number;
  status: CampaignStatus;
  product_id: number;
  product_name: string;
  photo_url: string | null;
  cover_url: string | null;
  language: Language;
  platforms: Platform[];
  schedule_mode: ScheduleMode;
  posts_total: number;
  posts_scheduled: number;
  posts_posted: number;
  first_post_at: string | null;
  last_post_at: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: number;
  action: ActivityAction;
  entity_type: string;
  entity_id: number | null;
  summary: string;
  actor: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface Summary {
  business_name: string;
  owner_name: string;
  scheduled: number;
  posted: number;
  this_week: number;
  campaigns: number;
  active_campaigns: number;
  products: number;
  next_post: Post | null;
  upcoming: Post[];
  latest_campaign: CampaignSummary | null;
}

export interface NewProduct {
  name: string;
  price: string;
  note: string;
  photo: File;
}

export interface NewCampaign {
  product_id: number;
  language: Language;
  platforms: Platform[];
  schedule: ScheduleInput;
}

export interface PostPatch {
  caption?: string;
  hashtags?: string[];
  scheduled_at?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/backend";

/** Turn an API media path ("/media/x.jpg") into a URL the browser can load. */
export function mediaUrl(path: string | null | undefined): string | null {
  return path ? `${BASE}${path}` : null;
}

// FastAPI errors look like {"detail": "text"} or {"detail": [{msg: ...}]}.
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      const msgs = body.detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : ""))
        .filter(Boolean);
      if (msgs.length) return msgs.join("; ");
    }
  } catch {
    // not JSON, fall through
  }
  return `Request failed (${res.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("Can't reach the eViral server. Is the backend running?", 0);
  }
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as T;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  createProduct(input: NewProduct) {
    const form = new FormData();
    form.set("name", input.name.trim());
    form.set("price", input.price.trim());
    form.set("note", input.note.trim());
    form.set("photo", input.photo, input.photo.name);
    return request<Product>("/products", { method: "POST", body: form });
  },
  getProduct(id: number) {
    return request<Product>(`/products/${id}`);
  },
  understandProduct(id: number, force = false) {
    return request<Product>(
      `/products/${id}/understand${force ? "?force=true" : ""}`,
      { method: "POST" }
    );
  },
  confirmAttributes(id: number, attributes: string[]) {
    return request<Product>(
      `/products/${id}/understood`,
      json("PATCH", { attributes })
    );
  },
  createCampaign(input: NewCampaign) {
    return request<Campaign>("/campaigns", json("POST", input));
  },
  getCampaign(id: number) {
    return request<Campaign>(`/campaigns/${id}`);
  },
  listCampaigns() {
    return request<CampaignSummary[]>("/campaigns");
  },
  updatePost(id: number, patch: PostPatch) {
    return request<Post>(`/posts/${id}`, json("PATCH", patch));
  },
  publishNow(id: number) {
    return request<Post>(`/posts/${id}/publish-now`, { method: "POST" });
  },
  calendar(from: string, to: string) {
    return request<Post[]>(`/calendar${query({ from, to })}`);
  },
  posts(params: { status?: PostStatus; platform?: Platform; limit?: number }) {
    return request<FeedPost[]>(`/posts${query(params)}`);
  },
  activity(params: { action?: ActivityAction; limit?: number } = {}) {
    return request<ActivityEvent[]>(`/activity${query(params)}`);
  },
  summary() {
    return request<Summary>("/summary");
  },
};
