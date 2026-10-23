"use client";

import * as React from "react";
import {
  Rocket,
  Repeat,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import type { Platform } from "@/lib/data";

export interface ScheduleData {
  mode: "launch_sequence" | "weekly" | "custom";
  platforms: Platform[];
  language: "ms" | "en" | "mixed";
  days: string[];
  time: string;
  /** Selected publish date(s), ISO "yyyy-MM-dd". Single date for launch/weekly (start date), many for custom. */
  dates: string[];
}

const MODES = [
  {
    id: "launch_sequence" as const,
    icon: Rocket,
    title: "Launch sequence",
    desc: "Teaser → launch → reminder → last chance, over 7 days. Approve once, posts go out automatically.",
    slots: ["Teaser", "Launch", "Reminder", "Last chance"],
  },
  {
    id: "weekly" as const,
    icon: Repeat,
    title: "Weekly cadence",
    desc: "Steady posting on the days you pick. Each week's batch waits for your approval.",
    slots: null,
  },
  {
    id: "custom" as const,
    icon: CalendarClock,
    title: "Custom",
    desc: "Pick exact dates and times per post.",
    slots: null,
  },
];

/** Day offsets from the launch start date for each launch-sequence slot. */
const LAUNCH_OFFSETS = [0, 1, 3, 6] as const;

/** How many upcoming occurrences to preview for weekly cadence. */
const WEEKLY_PREVIEW_COUNT = 4;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const LANGUAGES = [
  { id: "ms" as const, label: "Bahasa Melayu" },
  { id: "en" as const, label: "English" },
  { id: "mixed" as const, label: "Campur (BM + EN)" },
];

const MODE_HINTS: Record<ScheduleData["mode"], string> = {
  launch_sequence: "Pick the day the sequence kicks off — the rest follows automatically.",
  weekly: "Pick the first posting date; posts then repeat on your chosen days.",
  custom: "Click any date to add it. Click again to remove.",
};

interface PublishSlot {
  date: Date;
  label: string;
}

export function StepSchedule({
  data,
  onChange,
}: {
  data: ScheduleData;
  onChange: (patch: Partial<ScheduleData>) => void;
}) {
  // Current time is only available on the client (cacheComponents prerender).
  const [cursor, setCursor] = React.useState<Date | null>(null);
  React.useEffect(() => setCursor(new Date()), []);

  function togglePlatform(p: Platform) {
    onChange({
      platforms: data.platforms.includes(p)
        ? data.platforms.filter((x) => x !== p)
        : [...data.platforms, p],
    });
  }
  function toggleDay(d: string) {
    onChange({
      days: data.days.includes(d)
        ? data.days.filter((x) => x !== d)
        : [...data.days, d],
    });
  }

  function toggleDate(day: Date) {
    const iso = format(day, "yyyy-MM-dd");
    if (data.mode === "custom") {
      onChange({
        dates: data.dates.includes(iso)
          ? data.dates.filter((x) => x !== iso)
          : [...data.dates, iso].sort(),
      });
    } else {
      // Launch & weekly use a single start date.
      onChange({ dates: [iso] });
    }
  }

  /**
   * Compute when posts will actually go out, based on mode + selections.
   * These are preview slots rendered on the calendar grid and in the summary.
   */
  function publishSlots(): PublishSlot[] {
    if (!cursor) return [];

    if (data.mode === "launch_sequence") {
      const start = data.dates[0];
      if (!start) return [];
      const startDate = new Date(`${start}T00:00:00`);
      return MODES[0].slots!.map((label, i) => ({
        date: addDays(startDate, LAUNCH_OFFSETS[i]),
        label,
      }));
    }

    if (data.mode === "weekly") {
      const start = data.dates[0];
      if (!start || data.days.length === 0) return [];
      const startDate = new Date(`${start}T00:00:00`);
      const out: PublishSlot[] = [];
      let d = startDate;
      // Walk forward until we've previewed enough occurrences of the chosen weekdays.
      for (let i = 0; i < 60 && out.length < WEEKLY_PREVIEW_COUNT; i++) {
        if (data.days.includes(format(d, "EEE"))) {
          out.push({ date: d, label: format(d, "EEE") });
        }
        d = addDays(d, 1);
      }
      return out;
    }

    // custom — one post per picked date
    return data.dates.map((iso) => ({
      date: new Date(`${iso}T00:00:00`),
      label: format(new Date(`${iso}T00:00:00`), "EEE d MMM"),
    }));
  }

  if (!cursor) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-80 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const slots = publishSlots();
  const slotByIso = new Map(
    slots.map((s) => [format(s.date, "yyyy-MM-dd"), s])
  );
  const selectedSet = new Set(data.dates);

  // Month grid, weeks starting Monday — same layout as the Calendar tab.
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const monthDays: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) monthDays.push(d);

  return (
    <div className="space-y-6">
      {/* Schedule mode */}
      <div>
        <Label className="mb-2 block">How should we schedule it?</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => {
            const active = data.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  onChange({
                    mode: m.id,
                    // Non-custom modes use a single start date — drop extras picked in Custom.
                    dates: m.id === "custom" ? data.dates : data.dates.slice(0, 1),
                  })
                }
                className={cn(
                  "cursor-pointer rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <m.icon
                    className={cn(
                      "h-4.5 w-4.5",
                      active ? "text-brand-600" : "text-gray-400"
                    )}
                  />
                  {active && (
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand-600">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-gray-900">{m.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{m.desc}</p>
                {m.slots && active && (
                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    {m.slots.map((s, i) => (
                      <React.Fragment key={s}>
                        {i > 0 && <span className="text-gray-300">→</span>}
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-brand-200">
                          {s}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date picker calendar — shown for every mode */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label className="block">When should it go out?</Label>
            <p className="mt-0.5 text-xs text-gray-500">{MODE_HINTS[data.mode]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500">Time</Label>
            <Input
              type="time"
              value={data.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="h-8 w-28 px-2 text-xs"
            />
          </div>
        </div>

        {/* Month navigation */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCursor(addMonths(cursor, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCursor(addMonths(cursor, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <p className="ml-1 text-[13px] font-semibold text-gray-900">
              {format(cursor, "MMMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCursor(new Date())}
            >
              Today
            </Button>
            {data.mode === "custom" && data.dates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-gray-500"
                onClick={() => onChange({ dates: [] })}
              >
                Clear {data.dates.length}
              </Button>
            )}
          </div>
        </div>

        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_HEADERS.map((h) => (
            <p key={h} className="px-1 text-center text-[10px] font-medium text-gray-400">
              {h}
            </p>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const selected = selectedSet.has(iso);
            const slot = slotByIso.get(iso);
            const today = isToday(day);
            const dim = !isSameMonth(day, cursor);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleDate(day)}
                className={cn(
                  "min-h-14 cursor-pointer rounded-lg border p-1 text-left align-top transition-colors",
                  selected
                    ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                    : slot
                      ? "border-brand-200 bg-brand-50/40 hover:border-brand-300"
                      : "border-gray-200 bg-white hover:border-gray-300",
                  dim && "opacity-40",
                  today && !selected && "border-brand-200 bg-brand-50/50"
                )}
              >
                <span
                  className={cn(
                    "text-[11px]",
                    today ? "font-semibold text-brand-700" : "text-gray-500",
                    selected && "font-semibold text-brand-700"
                  )}
                >
                  {format(day, "d")}
                </span>
                {slot && (
                  <span className="mt-0.5 block truncate rounded bg-brand-600 px-1 py-px text-[9px] font-medium text-white">
                    {slot.label}
                  </span>
                )}
                {!slot && selected && (
                  <span className="mt-0.5 block truncate rounded bg-brand-600 px-1 py-px text-[9px] font-medium text-white">
                    {data.time || "20:00"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Publish summary — what the calendar above means */}
        {slots.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {data.mode === "custom" ? "Your posts" : "Planned posts"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-info-600" />
                  <span className="font-semibold text-gray-900">
                    {format(s.date, "EEE d MMM")}
                  </span>
                  {data.mode === "launch_sequence" && (
                    <span className="text-brand-700">{s.label}</span>
                  )}
                  <span>{data.time || "20:00"}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weekly extras */}
      {data.mode === "weekly" && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <Label className="mb-2 block">Posting days</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={cn(
                  "h-8 cursor-pointer rounded-lg px-3 text-xs font-medium transition-colors",
                  data.days.includes(d)
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platforms */}
      <div>
        <Label className="mb-2 block">Where should we post?</Label>
        <div className="flex flex-wrap gap-2">
          {(["facebook", "instagram", "tiktok"] as Platform[]).map((p) => {
            const active = data.platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium capitalize transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50/60 text-gray-900 ring-1 ring-brand-500"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                )}
              >
                <PlatformIcon platform={p} />
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <Label className="mb-2 block">Caption language</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onChange({ language: l.id })}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                data.language === l.id
                  ? "border-brand-500 bg-brand-50/60 text-gray-900 ring-1 ring-brand-500"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
