// mock stats for the impact page, shaped like the future GET /impact

import type { Platform } from "@/lib/api";

// manual baselines the figures are measured against
export interface ImpactBaselines {
  // hours per manual launch
  manualHoursPerCampaign: number;
  // minutes per eViral campaign
  eviralMinutesPerCampaign: number;
  // agency cost range (RM/month)
  agencyCostMinMyr: number;
  agencyCostMaxMyr: number;
}

export interface PlatformReach {
  platform: Platform;
  reached: number;
  engagementRatePct: number;
}

export interface ConsistencyWeek {
  // the week's Monday, "yyyy-MM-dd"
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
  // estimated reach of published posts
  audience: {
    total: number;
    byPlatform: PlatformReach[];
  };
  // hours saved vs the manual baseline
  timeSavedHours: number;
  campaignsLaunched: number;
  // RM saved vs the agency baseline
  costAvoidedMyr: number;
  // drafts the validator stopped
  errorsBlocked: {
    total: number;
    recent: BlockedError[];
  };
  // posts published on time, percent
  onTimeRatePct: number;
  postsTotal: number;
  postsOnTime: number;
  // planned vs filled slots, oldest first
  consistency: ConsistencyWeek[];
  // cumulative RM saved per month
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

// 18540 -> "18.5k"
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}k`;
  return `${n}`;
}

function trim(n: number): string {
  return n.toFixed(n >= 100 || Number.isInteger(n) ? 0 : 1).replace(/\.0$/, "");
}

// 34.5 -> "34h 30m"
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
