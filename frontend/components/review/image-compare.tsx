"use client";

import * as React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

// Original vs AI-improved, side by side. The original is always kept and shown.
// With no AI image (image editing off) only the original is shown.
export function ImageCompare({
  original,
  improved,
  productName,
}: {
  original: string;
  improved: string | null;
  productName: string;
}) {
  return (
    <div className={improved ? "grid grid-cols-2 gap-3" : "mx-auto max-w-56"}>
      <figure>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white">
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
          What you uploaded
        </figcaption>
      </figure>
      {improved && (
        <figure>
          <div className="relative aspect-square overflow-hidden rounded-xl border border-brand-200 bg-white ring-1 ring-brand-100">
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
            What your posts use — your product, better setting
          </figcaption>
        </figure>
      )}
    </div>
  );
}
