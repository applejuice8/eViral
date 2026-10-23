"use client";

import * as React from "react";
import { Rocket, Repeat, CalendarClock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Label } from "@/components/ui/input";
import { PlatformIcon } from "@/components/platform-icon";
import type { Platform } from "@/lib/data";

export interface ScheduleData {
  mode: "launch_sequence" | "weekly" | "custom";
  platforms: Platform[];
  language: "ms" | "en" | "mixed";
  days: string[];
  time: string;
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LANGUAGES = [
  { id: "ms" as const, label: "Bahasa Melayu" },
  { id: "en" as const, label: "English" },
  { id: "mixed" as const, label: "Campur (BM + EN)" },
];

export function StepSchedule({
  data,
  onChange,
}: {
  data: ScheduleData;
  onChange: (patch: Partial<ScheduleData>) => void;
}) {
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
                onClick={() => onChange({ mode: m.id })}
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

      {/* Weekly extras */}
      {data.mode === "weekly" && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <Label className="mb-2 block">Posting days & time</Label>
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
            <Input
              type="time"
              value={data.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="ml-2 h-8 w-28 px-2 text-xs"
            />
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
