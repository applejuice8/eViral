// Mock statistics for the Impact dashboard (#33). Posting is mocked, so the
// reach numbers and savings are synthetic estimates — shaped like the future
// GET /impact response so the page can switch to real aggregation later.

import type { Platform } from "@/lib/api";

/** Config, not hardcode: the manual baselines the impact figures are measured against. */
export interface ImpactBaselines {
  /** Hours a manual launch takes (≈3 evenings / campaign). */
  manualHoursPerCampaign: number;
  /** Minutes a campaign takes with eViral (input → approval). */
  eviralMinutesPerCampaign: number;
  /** Agency / social media manager monthly cost range (RM). */
  agencyCostMinMyr: number;
  agencyCostMaxMyr: number;
}

export interface PlatformReach {
  platform: Platform;
  reached: number;
  engagementRatePct: number;
}

export interface ConsistencyWeek {
  /** "yyyy-MM-dd" of the week's Monday. */
  weekOf: string;
  planned: number;
  filled: number;
}

export interface BlockedError {
  date: string;
  reason: string;
}

export interface ImpactData {
  baselines: ImpactBaselines;
  /** Estimated people reached by published posts. */
  audience: {
    total: number;
    byPlatform: PlatformReach[];
  };
  /** Cumulative hours saved vs the manual baseline. */
  timeSavedHours: number;
  campaignsLaunched: number;
  /** RM saved vs the agency baseline, since signing up. */
  costAvoidedMyr: number;
  /** Drafts the fact validator stopped from publishing. */
  errorsBlocked: {
    total: number;
    recent: BlockedError[];
  };
  /** % of posts published at their scheduled time. */
  onTimeRatePct: number;
  postsTotal: number;
  postsOnTime: number;
  /** Planned vs actually-filled slots, most recent last. */
  consistency: ConsistencyWeek[];
  /** Cumulative RM saved at the end of each month, oldest first. */
  cumulativeSavings: { month: string; savedMyr: number }[];
}

export const MOCK_IMPACT: ImpactData = {
  baselines: {
    manualHoursPerCampaign: 12,
    eviralMinutesPerCampaign: 25,
    agencyCostMinMyr: 3000,
    agencyCostMaxMyr: 8000,
  },
  audience: {
    total: 18540,
    byPlatform: [
      { platform: "instagram", reached: 8940, engagementRatePct: 6.2 },
      { platform: "tiktok", reached: 6320, engagementRatePct: 8.9 },
      { platform: "facebook", reached: 3280, engagementRatePct: 3.4 },
    ],
  },
  timeSavedHours: 34.5,
  campaignsLaunched: 3,
  costAvoidedMyr: 16500,
  errorsBlocked: {
    total: 7,
    recent: [
      { date: "2026-10-21", reason: "Price mismatch — draft said RM12, menu says RM15" },
      { date: "2026-10-18", reason: "Expired date — promo ended 15 Oct" },
      { date: "2026-10-12", reason: "Banned claim — “guaranteed weight loss” removed" },
      { date: "2026-10-05", reason: "Price mismatch — draft said RM8.90, menu says RM9.50" },
    ],
  },
  onTimeRatePct: 96,
  postsTotal: 50,
  postsOnTime: 48,
  consistency: [
    { weekOf: "2026-08-31", planned: 5, filled: 3 },
    { weekOf: "2026-09-07", planned: 5, filled: 4 },
    { weekOf: "2026-09-14", planned: 5, filled: 5 },
    { weekOf: "2026-09-21", planned: 5, filled: 4 },
    { weekOf: "2026-09-28", planned: 5, filled: 5 },
    { weekOf: "2026-10-05", planned: 5, filled: 5 },
    { weekOf: "2026-10-12", planned: 5, filled: 5 },
    { weekOf: "2026-10-19", planned: 5, filled: 4 },
  ],
  cumulativeSavings: [
    { month: "Aug", savedMyr: 4800 },
    { month: "Sep", savedMyr: 10400 },
    { month: "Oct", savedMyr: 16500 },
  ],
};

/** "18540" -> "18.5k" for big stat numbers. */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}k`;
  return `${n}`;
}

function trim(n: number): string {
  return n.toFixed(n >= 100 || Number.isInteger(n) ? 0 : 1).replace(/\.0$/, "");
}

/** 34.5 -> "34h 30m" */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
