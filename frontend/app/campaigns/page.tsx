"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Inbox, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { api, ApiError, mediaUrl, type CampaignStatus, type CampaignSummary } from "@/lib/api";
import { formatDay, formatPrice, scheduleModeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

// owner-facing words for campaign statuses
const campaignStatusView: Record<
  CampaignStatus,
  { label: string; badge: "warning" | "info" | "success" | "danger" }
> = {
  building: { label: "Draft", badge: "warning" },
  scheduled: { label: "Scheduled", badge: "info" },
  done: { label: "Launched", badge: "success" },
  failed: { label: "Failed", badge: "danger" },
};

type Filter = "all" | "draft" | "scheduled" | "launched" | "failed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
  { key: "launched", label: "Launched" },
  { key: "failed", label: "Failed" },
];

function matchesFilter(status: CampaignStatus, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "draft") return status === "building";
  if (filter === "launched") return status === "done";
  return status === filter;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; campaigns: CampaignSummary[] };

export default function CampaignsPage() {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [filter, setFilter] = React.useState<Filter>("all");

  React.useEffect(() => {
    let cancelled = false;
    api
      .listCampaigns()
      .then((campaigns) => !cancelled && setState({ status: "ready", campaigns }))
      .catch((err) => {
        if (!cancelled)
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Couldn't load the campaigns.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts =
    state.status === "ready"
      ? (["draft", "scheduled", "launched", "failed"] as const).reduce(
          (acc, key) => {
            acc[key] = state.campaigns.filter((c) =>
              matchesFilter(c.status, key)
            ).length;
            return acc;
          },
          {} as Record<Exclude<Filter, "all">, number>
        )
      : null;

  const visible =
    state.status === "ready"
      ? state.campaigns.filter((c) => matchesFilter(c.status, filter))
      : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Megaphone className="h-6 w-6 text-brand-600" />
          Campaigns
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Every campaign for your products — drafts, what&apos;s scheduled and what has
          launched.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="mx-auto max-w-md py-16 text-center">
          <p className="text-sm font-semibold text-gray-900">Couldn&apos;t load campaigns</p>
          <p className="mt-1 text-[13px] text-gray-500">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter campaigns">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  filter === f.key
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f.label}
                {f.key !== "all" && counts ? (
                  <span className="ml-1 tabular-nums opacity-70">{counts[f.key]}</span>
                ) : null}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyCampaigns filter={filter} hasAny={state.campaigns.length > 0} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  const view = campaignStatusView[campaign.status];
  const cover = mediaUrl(campaign.cover_url ?? campaign.photo_url);
  return (
    <Link
      href={`/review/${campaign.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-gray-100">
        {cover && (
          <Image
            src={cover}
            alt={campaign.product_name}
            fill
            unoptimized
            className="object-cover"
          />
        )}
        <span className="absolute left-2.5 top-2.5">
          <Badge variant={view.badge}>{view.label}</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate text-[14px] font-semibold text-gray-900">
          {campaign.product_name}
        </p>
        <p className="text-[11px] text-gray-500">
          {campaign.posts_total} post{campaign.posts_total === 1 ? "" : "s"} ·{" "}
          {scheduleModeLabel[campaign.schedule_mode].toLowerCase()}
          {campaign.promo_kind === "discount" && campaign.promo_price_myr
            ? ` · ${formatPrice(campaign.promo_price_myr)} promo`
            : campaign.promo_kind === "promote"
              ? " · Promotion"
              : ""}
          {campaign.first_post_at && campaign.last_post_at
            ? ` · ${formatDay(campaign.first_post_at)} – ${formatDay(campaign.last_post_at)}`
            : ""}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="flex items-center gap-1.5">
            {campaign.platforms.map((p) => (
              <PlatformIcon key={p} platform={p} />
            ))}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:text-brand-700">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyCampaigns({ filter, hasAny }: { filter: Filter; hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Inbox className="h-6 w-6 text-gray-400" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">
          {hasAny ? "Nothing here" : "No campaigns yet"}
        </p>
        <p className="mx-auto mt-1 max-w-70 text-[13px] text-gray-500">
          {hasAny
            ? "No campaigns match this filter right now."
            : "Add a product and eViral will plan, write and schedule the posts for you."}
        </p>
      </div>
      {!hasAny && (
        <Link href="/products/new">
          <Button size="sm">Add your first product</Button>
        </Link>
      )}
    </div>
  );
}
