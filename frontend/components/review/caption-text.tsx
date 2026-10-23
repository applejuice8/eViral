import * as React from "react";
import { cn } from "@/lib/utils";

// Renders caption text with hashtag styling: any "#tag" token detected in the
// text is highlighted, since hashtags are part of the caption itself.
export function CaptionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800",
        className
      )}
    >
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="font-medium text-info-600">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}
