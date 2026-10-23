"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ActivityAvatar } from "@/components/activity-avatar";
import { api, ApiError, type ActivityAction, type ActivityEvent } from "@/lib/api";
import { actionLabel, formatDateTime } from "@/lib/format";

const chipVariant: Record<ActivityAction, "muted" | "info" | "success"> = {
  draft: "muted",
  generated: "info",
  posted: "success",
};

const FILTERS: { id: ActivityAction | "all"; label: string }[] = [
  { id: "all", label: "All activity" },
  { id: "draft", label: "Draft" },
  { id: "generated", label: "Generated" },
  { id: "posted", label: "Posted" },
];

const DETAIL_LABELS: Record<string, string> = {
  model: "AI model",
  posts: "Posts",
  mode: "Schedule",
  platform: "Platform",
  product_name: "Product",
};

function detailRows(detail: ActivityEvent["detail"]): [string, string][] {
  if (!detail) return [];
  return Object.entries(detail)
    .filter(([k, v]) => k in DETAIL_LABELS && v !== null && v !== "")
    .map(([k, v]) => [DETAIL_LABELS[k], String(v).replaceAll("_", " ")]);
}

function linkFor(e: ActivityEvent): { href: string; label: string } | null {
  const url = e.detail?.url;
  if (typeof url === "string") return { href: url, label: "View the post" };
  const campaignId = e.detail?.campaign_id ?? (e.entity_type === "campaign" ? e.entity_id : null);
  if (typeof campaignId === "number") return { href: `/review/${campaignId}`, label: "Open campaign" };
  return null;
}

export default function AuditPage() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["id"]>("all");
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [loaded, setLoaded] = React.useState<{
    filter: string;
    events: ActivityEvent[];
    error: string | null;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    api
      .activity({ action: filter === "all" ? undefined : filter, limit: 100 })
      .then((events) => !cancelled && setLoaded({ filter, events, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setLoaded({
            filter,
            events: [],
            error: err instanceof ApiError ? err.message : "Couldn't load activity.",
          })
      );
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const loading = loaded?.filter !== filter;
  const events = loading ? [] : loaded.events;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activity log</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Every product, AI result and post is recorded — nothing happens silently.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-8 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="space-y-px">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((e) => {
              const open = expanded === e.id;
              const rows = detailRows(e.detail);
              const link = linkFor(e);
              const hasDetail = rows.length > 0 || link !== null;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => hasDetail && setExpanded(open ? null : e.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      hasDetail ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
                    )}
                  >
                    <ActivityAvatar actor={e.actor} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
                        <span className="font-semibold text-gray-900">{e.actor}</span>
                        <Badge variant={chipVariant[e.action]}>{actionLabel[e.action]}</Badge>
                        <span className="text-gray-600">{e.summary}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(e.created_at)}</p>
                    </div>
                    {hasDetail && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    )}
                  </button>
                  {open && (
                    <div className="ev-fade-up space-y-1.5 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs">
                      {rows.map(([k, v]) => (
                        <p key={k} className="text-gray-600">
                          <span className="text-gray-400">{k}:</span> {v}
                        </p>
                      ))}
                      {link && (
                        <Link href={link.href} className="font-medium text-brand-600 hover:text-brand-700">
                          {link.label} →
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {events.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <ScrollText className="h-6 w-6 text-gray-300" />
                <p className="text-[13px] text-gray-500">
                  {loaded?.error ?? "Nothing here yet."}
                </p>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
