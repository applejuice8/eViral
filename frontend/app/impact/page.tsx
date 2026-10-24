"use client";

import * as React from "react";
import {
  CalendarCheck,
  Clock,
  Eye,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platform-icon";
import {
  MOCK_IMPACT,
  compactNumber,
  formatHours,
  type ImpactData,
  type PlatformReach,
} from "@/lib/impact-mock";
import { formatDay, platformLabel } from "@/lib/format";

const PLATFORM_DOT: Record<PlatformReach["platform"], string> = {
  instagram: "bg-[#c13584]",
  facebook: "bg-[#1877f2]",
  tiktok: "bg-[#fe2c55]",
};

export default function ImpactPage() {
  const data = MOCK_IMPACT;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impact</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            What eViral has saved you so far — time, money and mistakes.
          </p>
        </div>
        <Badge variant="warning">Estimated from mock data</Badge>
      </div>

      {/* hero stats */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Card className="ev-fade-up lg:col-span-3">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Audience reached</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-50 text-info-600">
                <Eye className="h-4 w-4" />
              </span>
            </div>
            <p className="text-4xl font-semibold leading-none text-gray-900">
              {compactNumber(data.audience.total)}
              <span className="ml-2 text-sm font-normal text-gray-400">people</span>
            </p>
            <p className="text-[11px] text-gray-400">
              Estimated reach of {data.postsTotal} published posts across all platforms
            </p>
            <div className="mt-1 space-y-2.5">
              {data.audience.byPlatform.map((p) => (
                <PlatformReachRow key={p.platform} reach={p} max={maxReach(data)} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="ev-fade-up lg:col-span-2">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Time saved</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <p className="text-4xl font-semibold leading-none text-gray-900">
              {formatHours(data.timeSavedHours)}
            </p>
            <p className="text-[11px] text-gray-400">
              vs {data.baselines.manualHoursPerCampaign}h per manual launch ·{" "}
              {data.campaignsLaunched} campaigns with eViral
            </p>
            <ManualVsEviral data={data} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Cost avoided"
          value={`RM${compactNumber(data.costAvoidedMyr)}`}
          hint={`vs RM${compactNumber(data.baselines.agencyCostMinMyr)}–${compactNumber(
            data.baselines.agencyCostMaxMyr
          )}/mo agency`}
          icon={Wallet}
          iconClass="bg-success-50 text-success-600"
        />
        <StatCard
          label="Errors blocked"
          value={`${data.errorsBlocked.total}`}
          hint={data.errorsBlocked.recent[0]?.reason ?? "No drafts blocked yet"}
          icon={ShieldCheck}
          iconClass="bg-danger-50 text-danger-600"
        />
        <StatCard
          label="On-time posting"
          value={`${data.onTimeRatePct}%`}
          hint={`${data.postsOnTime} of ${data.postsTotal} posts sent at their scheduled time`}
          icon={CalendarCheck}
          iconClass="bg-warning-50 text-warning-600"
        />
      </div>

      {/* audience + consistency */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reach &amp; engagement</CardTitle>
            <p className="text-xs text-gray-500">
              Estimated per platform, last 30 days
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.audience.byPlatform.map((p) => (
              <div key={p.platform}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                    <PlatformIcon platform={p.platform} />
                    {platformLabel[p.platform]}
                  </span>
                  <span className="text-[13px] text-gray-900">
                    {compactNumber(p.reached)}
                    <span className="ml-1.5 text-[11px] text-gray-400">
                      {p.engagementRatePct}% engagement
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${PLATFORM_DOT[p.platform]}`}
                    style={{ width: `${(p.reached / maxReach(data)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-gray-400">
              Reach is synthetic until platform analytics are connected.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posting consistency</CardTitle>
            <p className="text-xs text-gray-500">
              Planned vs actually-filled slots, last {data.consistency.length} weeks
            </p>
          </CardHeader>
          <CardContent>
            <ConsistencyChart weeks={data.consistency} />
            <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Filled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-gray-200" /> Planned
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* before/after + trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manual vs eViral</CardTitle>
            <p className="text-xs text-gray-500">Time to launch one campaign</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-gray-700">Manual</span>
                <span className="text-gray-900">
                  {data.baselines.manualHoursPerCampaign}h
                  <span className="ml-1 text-[11px] text-gray-400">≈ 3 evenings</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-full rounded-full bg-gray-300" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-gray-700">With eViral</span>
                <span className="text-gray-900">
                  {data.baselines.eviralMinutesPerCampaign} min
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{
                    width: `${(data.baselines.eviralMinutesPerCampaign /
                      (data.baselines.manualHoursPerCampaign * 60)) *
                      100}%`,
                  }}
                />
              </div>
            </div>
            <p className="pt-1 text-[11px] text-gray-400">
              Roughly{" "}
              {Math.round(
                (data.baselines.manualHoursPerCampaign * 60) /
                  data.baselines.eviralMinutesPerCampaign
              )}
              × faster per campaign.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumulative savings</CardTitle>
            <p className="text-xs text-gray-500">
              RM saved vs the agency baseline, since signing up
            </p>
          </CardHeader>
          <CardContent>
            <SavingsTrend points={data.cumulativeSavings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function maxReach(data: ImpactData): number {
  return Math.max(...data.audience.byPlatform.map((p) => p.reached));
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}) {
  return (
    <Card className="ev-fade-up">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="text-[28px] font-semibold leading-none text-gray-900">{value}</p>
        <p className="truncate text-[11px] text-gray-400" title={hint}>
          {hint}
        </p>
      </CardContent>
    </Card>
  );
}

function PlatformReachRow({ reach, max }: { reach: PlatformReach; max: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT[reach.platform]}`} />
          {platformLabel[reach.platform]}
        </span>
        <span className="font-medium text-gray-700">{compactNumber(reach.reached)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${PLATFORM_DOT[reach.platform]}`}
          style={{ width: `${(reach.reached / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ManualVsEviral({ data }: { data: ImpactData }) {
  const manualMin = data.baselines.manualHoursPerCampaign * 60;
  const savedPerCampaign = manualMin - data.baselines.eviralMinutesPerCampaign;
  return (
    <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[11px] leading-relaxed text-gray-500">
        Each campaign takes{" "}
        <span className="font-semibold text-gray-900">
          {data.baselines.eviralMinutesPerCampaign} minutes
        </span>{" "}
        instead of {data.baselines.manualHoursPerCampaign} hours — you get{" "}
        <span className="font-semibold text-gray-900">
          {formatHours(savedPerCampaign / 60)} back
        </span>{" "}
        every launch.
      </p>
    </div>
  );
}

function ConsistencyChart({ weeks }: { weeks: ImpactData["consistency"] }) {
  const SLOT_PX = 20; // vertical pixels per planned slot
  return (
    <div className="flex h-32 items-end gap-2">
      {weeks.map((w) => (
        <div key={w.weekOf} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div
            className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-md bg-gray-100"
            style={{ height: `${w.planned * SLOT_PX}px` }}
            title={`Week of ${w.weekOf}: ${w.filled}/${w.planned} filled`}
          >
            <div
              className="w-full bg-brand-500 transition-[height]"
              style={{ height: `${(w.filled / w.planned) * 100}%` }}
            />
          </div>
          <span className="truncate text-[10px] text-gray-400">
            {formatDay(`${w.weekOf}T00:00:00Z`)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SavingsTrend({
  points,
}: {
  points: { month: string; savedMyr: number }[];
}) {
  const width = 320;
  const height = 120;
  const padX = 8;
  const padTop = 10;
  const padBottom = 22;
  const max = Math.max(...points.map((p) => p.savedMyr));
  const min = Math.min(...points.map((p) => p.savedMyr), 0);
  const stepX = (width - padX * 2) / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y =
      padTop +
      (1 - (p.savedMyr - min) / Math.max(max - min, 1)) * (height - padTop - padBottom);
    return { x, y, ...p };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padX},${height - padBottom} ${line} ${width - padX},${height - padBottom}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Cumulative savings trend"
      >
        <polygon points={area} className="fill-brand-50" />
        <polyline
          points={line}
          fill="none"
          className="stroke-brand-500"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c) => (
          <g key={c.month}>
            <circle cx={c.x} cy={c.y} r="3.5" className="fill-white stroke-brand-500" strokeWidth="2" />
            <text
              x={c.x}
              y={height - 6}
              textAnchor={c.x === padX ? "start" : c.x === width - padX ? "end" : "middle"}
              className="fill-gray-400 text-[9px]"
            >
              {c.month}
            </text>
            <text
              x={c.x}
              y={c.y - 9}
              textAnchor="middle"
              className="fill-gray-500 font-medium text-[9px]"
            >
              RM{compactNumber(c.savedMyr)}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
        <TrendingUp className="h-3.5 w-3.5 text-success-600" />
        Total RM{compactNumber(points[points.length - 1].savedMyr)} avoided so far.
      </p>
    </div>
  );
}
