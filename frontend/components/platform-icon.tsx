import * as React from "react";
import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/api";

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.7V4.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.4V14h2.7v8h3.4z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 3c.4 2.1 1.8 3.5 3.9 3.7v3c-1.5 0-2.9-.5-3.9-1.2v6.2a5.9 5.9 0 1 1-5.9-5.9c.3 0 .7 0 1 .1v3.1a2.8 2.8 0 1 0 1.9 2.7V3h3z" />
    </svg>
  );
}

const config: Record<
  Platform,
  { bg: string; fg: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  facebook: { bg: "bg-[#1877F2]", fg: "text-white", Icon: FacebookGlyph },
  instagram: {
    bg: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    fg: "text-white",
    Icon: InstagramGlyph,
  },
  tiktok: { bg: "bg-gray-900", fg: "text-white", Icon: TikTokGlyph },
};

export function PlatformIcon({
  platform,
  size = "md",
  className,
}: {
  platform: Platform;
  size?: "sm" | "md";
  className?: string;
}) {
  const { bg, fg, Icon } = config[platform];
  return (
    <span
      title={platform}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        bg,
        fg,
        className
      )}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
    </span>
  );
}
