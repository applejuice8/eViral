import * as React from "react";
import { cn } from "@/lib/utils";

const palette = [
  "bg-brand-100 text-brand-700",
  "bg-success-100 text-success-700",
  "bg-info-100 text-info-700",
  "bg-warning-100 text-warning-700",
];

export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const color = palette[initials.charCodeAt(0) % palette.length];
  const dims =
    size === "sm"
      ? "h-6 w-6 text-[10px]"
      : size === "lg"
        ? "h-10 w-10 text-sm"
        : "h-8 w-8 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        dims,
        color,
        className
      )}
    >
      {initials}
    </span>
  );
}
