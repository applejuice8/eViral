"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platform-icon";
import { StatusBadge } from "@/components/status-badge";
import { ActivityAvatar } from "@/components/activity-avatar";
import {
  api,
  ApiError,
  mediaUrl,
  type ActivityEvent,
  type CampaignSummary,
  type Summary,
} from "@/lib/api";
import {
  actionLabel,
  formatDateTime,
  formatDay,
  platformLabel,
  scheduleModeLabel,
  stageLabel,
} from "@/lib/format";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: Summary; activity: ActivityEvent[] };

export default function DashboardPage() {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([api.summary(), api.activity({ limit: 5 })])
      .then(([summary, activity]) => {
        if (!cancelled) setState({ status: "ready", summary, activity });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Couldn't load the dashboard.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm font-semibold text-gray-900">Couldn&apos;t load the dashboard</p>
        <p className="mt-1 text-[13px] text-gray-500">{state.message}</p>
      </div>
    );
  }

  const { summary, activity } = state;
  const firstName = summary.owner_name.split(" ")[0];
  const kpiCards = [
    {
      label: "Scheduled posts",
      value: summary.scheduled,
      hint: "Waiting to go out",
      icon: CalendarClock,
      iconClass: "bg-info-50 text-info-600",
    },
    {
      label: "Posted",
      value: summary.posted,
      hint: "Sent by the mock publisher",
      icon: CheckCircle2,
      iconClass: "bg-success-50 text-success-600",
    },
    {
      label: "This week",
      value: summary.this_week,
      hint: "Posts going out or sent, Mon–Sun",
      icon: CalendarCheck,
      iconClass: "bg-brand-50 text-brand-600",
    },
    {
      label: "Campaigns",
      value: summary.campaigns,
      hint: `${summary.active_campaigns} active · ${summary.products} product${summary.products === 1 ? "" : "s"}`,
      icon: Megaphone,
      iconClass: "bg-warning-50 text-warning-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Here&apos;s what&apos;s happening with {summary.business_name}&apos;s marketing.
          </p>
        </div>
        <Link href="/products/new">
          <Button>
            <Sparkles className="h-4 w-4" />
            Launch a product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="ev-fade-up">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.iconClass}`}
                >
                  <kpi.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-[28px] font-semibold leading-none text-gray-900">{kpi.value}</p>
              <p className="text-[11px] text-gray-400">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Coming up</CardTitle>
              <p className="mt-0.5 text-xs text-gray-500">The next posts going out</p>
            </div>
            <Link href="/calendar">
              <Button size="sm" variant="outline">
                Calendar
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {summary.campaigns === 0 ? (
              <EmptyState />
            ) : summary.upcoming.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-gray-500">
                Nothing scheduled right now.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.upcoming.map((p) => {
                  const image = mediaUrl(p.image_url);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/review/${p.campaign_id}#post-${p.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {image && (
                            <Image src={image} alt="" fill unoptimized className="object-cover" />
                          )}
                        </div>
                        <PlatformIcon platform={p.platform} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-gray-900">{p.caption}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            {platformLabel[p.platform]}
                            {p.stage ? ` · ${stageLabel[p.stage]}` : ""}
                            {p.scheduled_at ? ` · ${formatDateTime(p.scheduled_at)}` : ""}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {summary.latest_campaign && <LatestCampaign campaign={summary.latest_campaign} />}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent activity</CardTitle>
              <Link href="/audit" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {activity.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-gray-400">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {activity.map((e) => (
                    <li key={e.id} className="flex items-start gap-2.5 px-5 py-2.5">
                      <ActivityAvatar actor={e.actor} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-xs text-gray-700">
                          <span className="font-medium">{actionLabel[e.action]}</span> · {e.summary}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDateTime(e.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LatestCampaign({ campaign }: { campaign: CampaignSummary }) {
  const cover = mediaUrl(campaign.cover_url ?? campaign.photo_url);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest campaign</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {cover && (
              <Image src={cover} alt={campaign.product_name} fill unoptimized className="object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-gray-900">
              {campaign.product_name}
            </p>
            <p className="text-[11px] text-gray-500">
              {campaign.posts_total} posts · {scheduleModeLabel[campaign.schedule_mode].toLowerCase()}
            </p>
            {campaign.first_post_at && campaign.last_post_at && (
              <p className="text-[11px] text-gray-400">
                {formatDay(campaign.first_post_at)} – {formatDay(campaign.last_post_at)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex gap-1.5">
            <Badge variant="info">{campaign.posts_scheduled} scheduled</Badge>
            <Badge variant="success">{campaign.posts_posted} posted</Badge>
          </span>
          <Link
            href={`/review/${campaign.id}`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Open →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Inbox className="h-6 w-6 text-gray-400" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">No campaigns yet</p>
        <p className="mx-auto mt-1 max-w-70 text-[13px] text-gray-500">
          Add your first product and eViral will plan, write and schedule the posts for you.
        </p>
      </div>
      <Link href="/products/new">
        <Button size="sm">
          <Sparkles className="h-3.5 w-3.5" />
          Add your first product
        </Button>
      </Link>
    </div>
  );
}
