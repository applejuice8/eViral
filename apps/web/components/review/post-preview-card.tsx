"use client";

import * as React from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { Heart, MessageCircle, Send, Bookmark, Clock, Clapperboard, Pencil } from "lucide-react";
import { cn, formatRM } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { FlagsBadges, StatusBadge } from "@/components/status-badge";
import { PlatformIcon } from "@/components/platform-icon";
import {
  owner,
  platformLabel,
  stageLabel,
  type PostDraft,
  type ValidatorFlag,
} from "@/lib/data";

const PRICE_RE = /RM\s?(\d+(?:\.\d{1,2})?)/gi;

// Demo validator: re-checks RM amounts against the product price on every edit.
export function validateCaption(
  caption: string,
  price: number | null
): ValidatorFlag[] {
  const flags: ValidatorFlag[] = [];
  const found = [...caption.matchAll(PRICE_RE)].map((m) => Number(m[1]));
  if (price == null && found.length > 0) {
    flags.push({
      code: "PRICE_NOT_PROVIDED",
      severity: "block",
      detail: "No price was entered for this product — posts must not mention one.",
    });
  } else if (price != null) {
    for (const p of found) {
      if (p !== price) {
        flags.push({
          code: "PRICE_MISMATCH",
          severity: "block",
          detail: `RM${p} doesn't match the product price (${formatRM(price)}).`,
        });
      }
    }
  }
  for (const phrase of ["guaranteed", "cure", "no. 1", "#1"]) {
    if (caption.toLowerCase().includes(phrase)) {
      flags.push({
        code: "BANNED_CLAIM",
        severity: "block",
        detail: `"${phrase}" is on the banned-claims list.`,
      });
    }
  }
  return flags;
}

export interface DraftState extends PostDraft {
  liveFlags: ValidatorFlag[];
}

// Buffer-composer-style real post preview card with inline caption editing.
export function PostPreviewCard({
  draft,
  image,
  price,
  approved,
  onEdit,
}: {
  draft: DraftState;
  image: string;
  price: number | null;
  approved: boolean;
  onEdit: (id: string, caption: string, flags: ValidatorFlag[]) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(draft.caption);
  const blocked = draft.liveFlags.some((f) => f.severity === "block");

  function commit() {
    setEditing(false);
    if (value !== draft.caption) {
      onEdit(draft.id, value, validateCaption(value, price));
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-xs",
        blocked ? "border-danger-200 border-l-4 border-l-danger-600" : "border-gray-200"
      )}
    >
      {/* phone-frame header */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-2.5">
        <PlatformIcon platform={draft.platform} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold text-gray-900">
            {owner.business}
          </p>
          <p className="text-[11px] text-gray-400">
            {platformLabel[draft.platform]} · {stageLabel[draft.stage]}
          </p>
        </div>
        <StatusBadge status={blocked ? "blocked" : approved ? "approved" : draft.status} />
      </div>

      {/* media */}
      <div className="relative aspect-square w-full bg-gray-50">
        <Image src={image} alt="Post image" fill className="object-cover" />
        <span className="absolute left-2 top-2">
          <Badge variant="muted" className="bg-black/55 text-white">
            AI-edited image
          </Badge>
        </span>
      </div>

      {/* action row (decorative, platform mock) */}
      <div className="flex items-center gap-4 px-3.5 pt-2.5 text-gray-700">
        <Heart className="h-4.5 w-4.5" />
        <MessageCircle className="h-4.5 w-4.5" />
        <Send className="h-4.5 w-4.5" />
        <Bookmark className="ml-auto h-4.5 w-4.5" />
      </div>

      {/* caption */}
      <div className="px-3.5 py-2.5">
        {editing ? (
          <Textarea
            autoFocus
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Escape" && (setValue(draft.caption), setEditing(false))}
            className="text-[13px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => !approved && (setValue(draft.caption), setEditing(true))}
            className={cn(
              "group block w-full text-left",
              approved ? "cursor-default" : "cursor-text"
            )}
            title={approved ? undefined : "Click to edit — edits go back through fact-checking"}
          >
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800">
              <span className="font-semibold">{owner.business.toLowerCase().replaceAll(" ", "")}</span>{" "}
              {draft.caption}
              {!approved && (
                <Pencil className="ml-1.5 inline h-3 w-3 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </p>
          </button>
        )}
        <p className="mt-1.5 text-[13px] leading-relaxed text-info-600">
          {draft.hashtags.join(" ")}
        </p>
        {draft.videoIdea && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2 text-[11px] text-gray-500">
            <Clapperboard className="mt-0.5 h-3 w-3 shrink-0" />
            Video idea: {draft.videoIdea}
          </p>
        )}
      </div>

      {/* footer: time + validator */}
      <div className="space-y-2 border-t border-gray-100 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Clock className="h-3 w-3" />
          {format(parseISO(draft.scheduledAt), "EEE d MMM, h:mm a")}
        </div>
        {draft.whyThisTime && (
          <p className="text-[11px] leading-snug text-gray-400">
            {draft.whyThisTime}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <FlagsBadges flags={draft.liveFlags} />
        </div>
        {blocked && (
          <p className="rounded-md bg-danger-50 px-2.5 py-1.5 text-[11px] text-danger-700">
            This post is blocked and can&apos;t be approved until fixed. Edit the
            caption to resolve it.
          </p>
        )}
      </div>
    </div>
  );
}
