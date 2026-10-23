// Wizard -> backend -> review integration.
//
// The wizard collects owner-entered facts (product name, price, note,
// platforms, language); `runCampaignBuild` sends them to the backend's
// POST /captions/generate (proxied via /backend/* so no CORS) and
// normalises the response into per-platform caption strings that the
// review screen can render directly. The last build is kept in
// sessionStorage so the review page can pick it up after the build
// animation finishes.

import type { Platform } from "@/lib/data";

export type CaptionLanguage = "ms" | "en" | "mixed";

export interface BuildFacts {
  productName: string;
  price: string; // raw wizard input, "" when blank
  note: string; // raw wizard input, "" when blank
  platforms: Platform[];
  language: CaptionLanguage;
}

export interface BuiltCaption {
  platform: Platform;
  caption: string; // caption text with hashtags already inlined
  videoIdea: string | null;
}

export interface BuildEntry {
  facts: BuildFacts;
  captions: BuiltCaption[];
  model: string;
  at: string;
}

export interface FailedBuildEntry {
  failed: true;
  error: string;
  at: string;
}

export type LastBuild = BuildEntry | FailedBuildEntry;

const STORAGE_KEY = "eviral:last-campaign-build";

/** "65" -> 65, "65.90" -> 65.9, "" / garbage -> null (no price entered). */
export function parsePriceInput(raw: string): number | null {
  const value = Number(raw);
  return raw.trim() !== "" && Number.isFinite(value) ? value : null;
}

interface ApiCaption {
  platform: Platform;
  caption: string;
  hashtags?: string[];
  video_idea?: string | null;
}

interface ApiResponse {
  captions: ApiCaption[];
  model: string;
}

/**
 * Generate captions from the owner-entered facts. Throws on network or
 * HTTP errors — callers decide how to fall back (the review screen shows
 * the demo campaign when the service is unreachable).
 */
export async function runCampaignBuild(facts: BuildFacts): Promise<BuildEntry> {
  const price = parsePriceInput(facts.price);
  const note = facts.note.trim();

  const response = await fetch("/backend/captions/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_name: facts.productName.trim(),
      price,
      note: note ? note : null,
      platforms: facts.platforms,
      stage: "launch",
      language: facts.language,
      goal: null,
    }),
  });

  if (!response.ok) {
    let detail = `Caption service returned ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // keep the status-code message
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as ApiResponse;
  if (!Array.isArray(data.captions) || data.captions.length === 0) {
    throw new Error("Caption service returned no captions");
  }

  // Normalise: inline hashtags into the caption text (CaptionText styles
  // any #token) and keep only requested platforms, in wizard order.
  const byPlatform = new Map<Platform, BuiltCaption>();
  for (const cap of data.captions) {
    if (!cap?.platform || typeof cap.caption !== "string") continue;
    const hashtags = Array.isArray(cap.hashtags) ? cap.hashtags : [];
    const text = [cap.caption, ...hashtags].filter(Boolean).join(" ").trim();
    byPlatform.set(cap.platform, {
      platform: cap.platform,
      caption: text,
      videoIdea: typeof cap.video_idea === "string" ? cap.video_idea : null,
    });
  }

  const captions = facts.platforms
    .map((p) => byPlatform.get(p))
    .filter((c): c is BuiltCaption => c !== undefined);
  if (captions.length === 0) {
    throw new Error("Caption service returned no captions for the chosen platforms");
  }

  return {
    facts,
    captions,
    model: typeof data.model === "string" ? data.model : "unknown",
    at: new Date().toISOString(),
  };
}

export function saveLastBuild(entry: LastBuild): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage unavailable (private mode etc.) — the build still
    // works, the review screen just falls back to the demo campaign.
  }
}

export function getLastBuild(): LastBuild | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastBuild;
    if (parsed && typeof parsed === "object" && "at" in parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}
