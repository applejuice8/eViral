"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ImageChoice = "original" | "ai";

// original vs AI image; selectable when onChoose is given
export function ImageCompare({
  original,
  improved,
  productName,
  choice = "ai",
  onChoose,
  pending = false,
}: {
  original: string;
  improved: string | null;
  productName: string;
  // image the posts currently use
  choice?: ImageChoice;
  onChoose?: (choice: ImageChoice) => void;
  pending?: boolean;
}) {
  const selectable = Boolean(improved && onChoose);
  return (
    <div className="space-y-3">
      <div className={improved ? "grid grid-cols-2 gap-3" : "mx-auto max-w-56"}>
        <figure>
          <div
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl border bg-white transition-shadow",
              selectable && choice === "original"
                ? "border-brand-400 ring-2 ring-brand-200"
                : "border-gray-200"
            )}
          >
            <Image
              src={original}
              alt={`${productName} — original photo`}
              fill
              unoptimized
              className="object-cover"
            />
            <span className="absolute left-2 top-2">
              <Badge variant="muted" className="bg-black/55 text-white">
                Original photo
              </Badge>
            </span>
          </div>
          <figcaption className="mt-1.5 text-center text-[11px] text-gray-500">
            {selectable && choice === "original"
              ? "What your posts use — exactly as you took it"
              : "What you uploaded"}
          </figcaption>
        </figure>
        {improved && (
          <figure>
            <div
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border bg-white transition-shadow",
                selectable && choice === "ai"
                  ? "border-brand-400 ring-2 ring-brand-200"
                  : "border-brand-200 ring-1 ring-brand-100"
              )}
            >
              <Image
                src={improved}
                alt={`${productName} — AI-improved image`}
                fill
                unoptimized
                className="object-cover"
              />
              <span className="absolute left-2 top-2">
                <Badge variant="default">AI image</Badge>
              </span>
            </div>
            <figcaption className="mt-1.5 text-center text-[11px] text-gray-500">
              {selectable && choice === "ai"
                ? "What your posts use — your product, better setting"
                : "AI-improved version of your photo"}
            </figcaption>
          </figure>
        )}
      </div>

      {selectable && (
        <div className="flex items-center justify-center gap-2" role="group" aria-label="Choose post image">
          <Button
            type="button"
            size="sm"
            variant={choice === "original" ? "default" : "outline"}
            disabled={pending}
            aria-pressed={choice === "original"}
            data-testid="choose-original"
            onClick={() => onChoose?.("original")}
          >
            Use original photo
          </Button>
          <Button
            type="button"
            size="sm"
            variant={choice === "ai" ? "default" : "outline"}
            disabled={pending}
            aria-pressed={choice === "ai"}
            data-testid="choose-ai"
            onClick={() => onChoose?.("ai")}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Use AI image
          </Button>
        </div>
      )}
    </div>
  );
}
