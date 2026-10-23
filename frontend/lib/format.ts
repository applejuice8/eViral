// Labels and date formatting. The API sends UTC; the business is in Malaysia,
// so every time on screen is shown in Asia/Kuala_Lumpur.
import type { ActivityAction, Platform, PostStatus, Stage } from "@/lib/api";

export const TIME_ZONE = "Asia/Kuala_Lumpur";

export const platformLabel: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export const stageLabel: Record<Stage, string> = {
  teaser: "Teaser",
  launch: "Launch",
  reminder: "Reminder",
  last_chance: "Last chance",
};

export const STAGE_ORDER: Stage[] = ["teaser", "launch", "reminder", "last_chance"];

export const statusLabel: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  posted: "Posted",
  failed: "Failed",
};

export const actionLabel: Record<ActivityAction, string> = {
  draft: "Draft",
  generated: "Generated",
  posted: "Posted",
};

export const languageLabel = {
  ms: "Bahasa Melayu",
  en: "English",
  mixed: "Mixed BM + EN",
} as const;

export const scheduleModeLabel = {
  launch_sequence: "Launch sequence",
  weekly: "Weekly",
  custom: "Custom dates",
} as const;

function parts(iso: string, options: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    ...options,
  }).formatToParts(new Date(iso))) {
    out[p.type] = p.value;
  }
  return out;
}

/** "8:00 PM" */
export function formatTime(iso: string): string {
  const p = parts(iso, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${p.hour}:${p.minute} ${p.dayPeriod.toUpperCase()}`;
}

/** "25 Oct" */
export function formatDay(iso: string): string {
  const p = parts(iso, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}`;
}

/** "Sun 25 Oct" */
export function formatWeekdayDay(iso: string): string {
  const p = parts(iso, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "Sun 25 Oct, 8:00 PM" */
export function formatDateTime(iso: string): string {
  return `${formatWeekdayDay(iso)}, ${formatTime(iso)}`;
}

/** Malaysia calendar day of a UTC timestamp, as "yyyy-MM-dd". */
export function mytDateKey(iso: string): string {
  const p = parts(iso, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Short relative time like social apps show: "just now", "5m", "3h", "2d". */
export function timeAgo(iso: string, now: number): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return formatDay(iso);
}

/** Elapsed time for build steps: "8s", "1m 05s". */
export function formatDuration(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
}

/** "RM65" / "RM65.90" from the API's "65.00" string; null when no price. */
export function formatPrice(priceMyr: string | null): string | null {
  if (priceMyr == null) return null;
  const n = Number(priceMyr);
  if (!Number.isFinite(n)) return null;
  return `RM${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
