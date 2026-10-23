"use client";

import * as React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

// Original vs AI-improved, side by side. The original is always kept and shown.
export function ImageCompare({
  original,
  improved,
  productName,
}: {
  original: string;
  improved: string;
  productName: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <figure>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Image
            src={original}
            alt={`${productName} — original photo`}
            fill
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
      <figure>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-brand-200 bg-white ring-1 ring-brand-100">
          <Image
            src={improved}
            alt={`${productName} — AI-improved image`}
            fill
            className="object-cover"
          />
          <span className="absolute left-2 top-2">
            <Badge variant="default">✨ AI-edited</Badge>
          </span>
        </div>
        <figcaption className="mt-1.5 text-center text-[11px] text-gray-500">
          eViral&apos;s improved version — your product, better setting
        </figcaption>
      </figure>
    </div>
  );
}
