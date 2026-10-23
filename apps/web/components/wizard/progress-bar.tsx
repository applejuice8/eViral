"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Zillow-style slim top progress bar: completed = filled, current = ringed,
// future = muted. Labels sit below the nodes.
export function WizardProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number; // 0-based index of current step
}) {
  return (
    <div className="w-full">
      <div className="relative flex items-start justify-between">
        {/* track */}
        <div className="absolute top-[7px] right-4 left-4 h-1 rounded-full bg-gray-200" />
        {/* fill */}
        <div
          className="absolute top-[7px] left-4 h-1 rounded-full bg-brand-500 transition-[width] duration-500"
          style={{
            width: `calc(${(current / (steps.length - 1)) * 100}% - ${(current / (steps.length - 1)) * 32}px)`,
          }}
        />
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div
              key={label}
              className="relative flex w-16 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-brand-500 bg-brand-500",
                  active && "border-brand-500 bg-white",
                  !done && !active && "border-gray-300 bg-gray-200"
                )}
              >
                {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight",
                  done || active ? "font-medium text-gray-800" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
