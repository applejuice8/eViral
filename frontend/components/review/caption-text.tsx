import * as React from "react";
import { cn } from "@/lib/utils";

function withTags(text: string) {
  return text.split(/(#[\p{L}\p{N}_]+)/gu).map((part, i) =>
    part.startsWith("#") && part.length > 1 ? (
      <span key={i} className="font-medium text-info-600">
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

// Renders a caption with hashtags styled blue. Hashtags passed separately go
// on their own line at the bottom, the way the posts are published.
export function CaptionText({
  text,
  hashtags = [],
  author,
  className,
}: {
  text: string;
  hashtags?: string[];
  /** Shown in bold before the caption, like an Instagram handle. */
  author?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-[13px] leading-relaxed text-gray-800", className)}>
      <p className="whitespace-pre-wrap">
        {author && <strong className="mr-1 font-semibold text-gray-900">{author}</strong>}
        {withTags(text)}
      </p>
      {hashtags.length > 0 && (
        <p data-testid="hashtags" className="mt-2">
          {withTags(hashtags.join(" "))}
        </p>
      )}
    </div>
  );
}
