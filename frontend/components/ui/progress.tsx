import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  indeterminate = false,
  className,
  barClassName,
}: {
  value?: number; // 0–100
  indeterminate?: boolean;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
    >
      {indeterminate ? (
        <div
          className={cn(
            "h-full w-1/4 rounded-full bg-brand-500",
            "animate-[ev-progress-indeterminate_1.4s_ease-in-out_infinite]",
            barClassName
          )}
        />
      ) : (
        <div
          className={cn(
            "h-full rounded-full bg-brand-500 transition-[width] duration-500",
            barClassName
          )}
          style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
        />
      )}
    </div>
  );
}
