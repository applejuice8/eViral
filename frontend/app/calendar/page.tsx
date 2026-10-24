"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Loader2, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { StatusBadge, statusDot } from "@/components/status-badge";
import { CaptionText } from "@/components/review/caption-text";
import { api, ApiError, mediaUrl, type Post, type PostStatus } from "@/lib/api";
import {
  formatDateTime,
  formatTime,
  mytDateKey,
  platformLabel,
  stageLabel,
} from "@/lib/format";

const LEGEND: [PostStatus, string][] = [
  ["scheduled", "Scheduled"],
  ["posted", "Posted"],
  ["failed", "Failed"],
];

// show posted_at when in range, else the planned time
function postTime(p: Post, from: string, to: string): string | null {
  if (p.status === "posted" && p.posted_at) {
    const day = mytDateKey(p.posted_at);
    if (day >= from && day <= to) return p.posted_at;
  }
  return p.scheduled_at;
}

export default function CalendarPage() {
  const [view, setView] = React.useState<"week" | "month">("week");
  // current time is client-only
  const [cursor, setCursor] = React.useState<Date | null>(null);
  React.useEffect(() => setCursor(new Date()), []);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  // cache posts per visible range
  const [loaded, setLoaded] = React.useState<{ key: string; posts: Post[]; error: string | null } | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const days = React.useMemo(() => {
    if (!cursor) return [];
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) =>
        addDays(startOfWeek(cursor, { weekStartsOn: 1 }), i)
      );
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor, view]);

  const from = days.length ? format(days[0], "yyyy-MM-dd") : null;
  const to = days.length ? format(days[days.length - 1], "yyyy-MM-dd") : null;
  const rangeKey = `${from}_${to}`;

  React.useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    api
      .calendar(from, to)
      .then((posts) => !cancelled && setLoaded({ key: `${from}_${to}`, posts, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setLoaded({
            key: `${from}_${to}`,
            posts: [],
            error: err instanceof ApiError ? err.message : "Couldn't load posts.",
          })
      );
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  if (!cursor) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const loading = loaded?.key !== rangeKey;
  const posts = loading ? [] : loaded.posts;
  const selected = posts.find((p) => p.id === selectedId) ?? null;

  const byDay = new Map<string, Post[]>();
  const at = (p: Post) => postTime(p, from ?? "", to ?? "");
  for (const p of posts) {
    const t = at(p);
    if (!t) continue;
    const key = mytDateKey(t);
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => (at(a) ?? "").localeCompare(at(b) ?? ""));
  }

  async function publishNow(post: Post) {
    setPublishing(true);
    setActionError(null);
    try {
      const updated = await api.publishNow(post.id);
      setLoaded((l) =>
        l ? { ...l, posts: l.posts.map((p) => (p.id === updated.id ? updated : p)) } : l
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't publish the post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "h-7 cursor-pointer rounded-md px-3 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-900"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous"
              onClick={() =>
                setCursor((c) => (c ? (view === "week" ? addWeeks(c, -1) : addMonths(c, -1)) : c))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Next"
              onClick={() =>
                setCursor((c) => (c ? (view === "week" ? addWeeks(c, 1) : addMonths(c, 1)) : c))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-1 text-[15px] font-semibold text-gray-900">
              {format(cursor, "MMMM yyyy")}
            </h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
          {LEGEND.map(([s, label]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", statusDot[s])} />
              {label}
            </span>
          ))}
          <span className="text-gray-400">· Times in Malaysia time</span>
        </div>

        {!loading && loaded.error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-700">
            {loaded.error}
          </p>
        )}

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayPosts = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
            const today = isToday(day);
            const dim = view === "month" && !isSameMonth(day, cursor);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-24 min-w-0 rounded-lg border p-1.5",
                  today ? "border-brand-200 bg-brand-50/50" : "border-gray-200 bg-white",
                  dim && "opacity-40",
                  view === "week" && "min-h-64"
                )}
              >
                <p
                  className={cn(
                    "mb-1 px-1 text-[11px]",
                    today ? "font-semibold text-brand-700" : "text-gray-500"
                  )}
                >
                  {view === "week" ? format(day, "EEE d") : format(day, "d")}
                </p>
                <div className="space-y-1">
                  {dayPosts.map((p) => {
                    const t = at(p);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedId(p.id);
                          setActionError(null);
                        }}
                        className={cn(
                          "block w-full cursor-pointer rounded-md border bg-white p-1.5 text-left shadow-xs transition-colors hover:border-brand-300",
                          selectedId === p.id ? "border-brand-400" : "border-gray-200",
                          view === "month" && "px-1 py-0.5"
                        )}
                      >
                        <span className="flex items-center gap-1">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[p.status])} />
                          <PlatformIcon platform={p.platform} size="sm" />
                          <span className="truncate text-[10px] font-semibold text-gray-700">
                            {t ? formatTime(t) : ""}
                          </span>
                        </span>
                        {view === "week" && (
                          <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-gray-500">
                            {p.caption}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {!loading && posts.length === 0 && !loaded.error && (
          <p className="text-center text-[13px] text-gray-400">No posts in this {view}.</p>
        )}
      </div>

      {selected && (
        <aside className="ev-fade-up fixed inset-x-4 bottom-20 top-auto z-40 max-h-[70dvh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg md:static md:z-auto md:block md:max-h-none md:w-80 md:shrink-0 md:self-start md:shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-gray-900">
              {platformLabel[selected.platform]}
              {selected.stage ? ` · ${stageLabel[selected.stage]}` : ""}
            </p>
            <button
              onClick={() => setSelectedId(null)}
              className="cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-[12px] font-medium text-gray-500">{selected.product_name}</p>
            {selected.image_url && (
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200">
                <Image
                  src={mediaUrl(selected.image_url)!}
                  alt="Post image"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            <CaptionText text={selected.caption} hashtags={selected.hashtags} />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {selected.status === "posted" && selected.posted_at
                ? `Posted ${formatDateTime(selected.posted_at)}`
                : selected.scheduled_at
                  ? formatDateTime(selected.scheduled_at)
                  : "Not scheduled"}
            </div>
            {selected.why_this_time && selected.status !== "posted" && (
              <p className="text-[11px] leading-snug text-gray-400">{selected.why_this_time}</p>
            )}
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
            </div>
            {actionError && (
              <p role="alert" className="rounded-md bg-danger-50 px-2.5 py-1.5 text-[11px] text-danger-700">
                {actionError}
              </p>
            )}
            {selected.status === "scheduled" && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => publishNow(selected)}
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Rocket className="h-3.5 w-3.5" />
                )}
                Publish now
              </Button>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium">
              <Link
                href={`/review/${selected.campaign_id}#post-${selected.id}`}
                className="text-brand-600 hover:text-brand-700"
              >
                Open campaign
              </Link>
              {selected.status === "posted" && selected.published_url && (
                <Link
                  href={selected.published_url}
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
                >
                  View on {platformLabel[selected.platform]}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
