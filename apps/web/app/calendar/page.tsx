"use client";

import * as React from "react";
import Image from "next/image";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { FlagsBadges, StatusBadge } from "@/components/status-badge";
import {
  calendarExtras,
  demoCampaign,
  platformLabel,
  stageLabel,
  type DraftStatus,
  type PostDraft,
} from "@/lib/data";

const allPosts: PostDraft[] = [...demoCampaign.drafts, ...calendarExtras].sort(
  (a, b) => a.scheduledAt.localeCompare(b.scheduledAt)
);

// Status color semantics shared with badges and audit chips.
const statusDot: Record<DraftStatus, string> = {
  published: "bg-success-600",
  approved: "bg-success-600",
  scheduled: "bg-info-600",
  pending_approval: "bg-warning-600",
  blocked: "bg-danger-600",
  failed: "bg-danger-600",
  rejected: "bg-danger-600",
  paused: "bg-gray-400",
  building: "bg-info-600",
};

export default function CalendarPage() {
  const [view, setView] = React.useState<"week" | "month">("week");
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState<PostDraft | null>(null);

  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) =>
          addDays(startOfWeek(cursor, { weekStartsOn: 1 }), i)
        )
      : (() => {
          const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
          const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
          const out: Date[] = [];
          for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
          return out;
        })();

  function postsFor(day: Date) {
    return allPosts.filter((p) => isSameDay(parseISO(p.scheduledAt), day));
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        {/* Header — Buffer style */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "h-7 cursor-pointer rounded-md px-3 text-xs font-medium capitalize transition-colors",
                  view === v
                    ? "bg-brand-600 text-white"
                    : "text-gray-500 hover:text-gray-900"
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
              onClick={() =>
                setCursor((c) =>
                  view === "week" ? addWeeks(c, -1) : addMonths(c, -1)
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCursor((c) =>
                  view === "week" ? addWeeks(c, 1) : addMonths(c, 1)
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-1 text-[15px] font-semibold text-gray-900">
              {format(cursor, "MMMM yyyy")}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
          {(
            [
              ["published", "Published"],
              ["scheduled", "Scheduled"],
              ["pending_approval", "Needs approval"],
              ["blocked", "Blocked"],
            ] as [DraftStatus, string][]
          ).map(([s, label]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", statusDot[s])} />
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div
          className={cn(
            "grid gap-2",
            view === "week" ? "grid-cols-7" : "grid-cols-7"
          )}
        >
          {days.map((day) => {
            const posts = postsFor(day);
            const today = isToday(day);
            const dim = view === "month" && !isSameMonth(day, cursor);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-24 rounded-lg border p-1.5",
                  today
                    ? "border-brand-200 bg-brand-50/50"
                    : "border-gray-200 bg-white",
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
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "block w-full cursor-pointer rounded-md border border-gray-200 bg-white p-1.5 text-left shadow-xs transition-colors hover:border-brand-300",
                        view === "month" && "px-1 py-0.5"
                      )}
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            statusDot[p.status]
                          )}
                        />
                        <PlatformIcon platform={p.platform} size="sm" />
                        <span className="text-[10px] font-semibold text-gray-700">
                          {format(parseISO(p.scheduledAt), "h:mm a")}
                        </span>
                      </span>
                      {view === "week" && (
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-gray-500">
                          {p.caption}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <aside className="ev-fade-up fixed inset-x-4 bottom-20 top-auto z-40 max-h-[70dvh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg md:static md:z-auto md:block md:max-h-none md:w-80 md:shrink-0 md:self-start md:shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-gray-900">
              {platformLabel[selected.platform]} · {stageLabel[selected.stage]}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200">
              <Image
                src={demoCampaign.productImageImproved}
                alt="Post image"
                fill
                className="object-cover"
              />
            </div>
            <p className="text-[13px] leading-relaxed text-gray-800">
              {selected.caption}
            </p>
            <p className="text-[13px] text-info-600">
              {selected.hashtags.join(" ")}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {format(parseISO(selected.scheduledAt), "EEEE d MMM, h:mm a")}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <FlagsBadges flags={selected.flags} />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
