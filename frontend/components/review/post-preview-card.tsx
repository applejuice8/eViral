"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Clapperboard,
  Clock,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  Pencil,
  Rocket,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { PlatformIcon } from "@/components/platform-icon";
import { CaptionText } from "@/components/review/caption-text";
import { api, ApiError, mediaUrl, type Post } from "@/lib/api";
import { formatDateTime, handleOf, platformLabel, stageLabel } from "@/lib/format";

/** "#a #b" or "a, b" -> ["#a", "#b"] */
export function parseHashtags(raw: string): string[] {
  const tags = raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean)
    .map((t) => `#${t}`);
  return [...new Set(tags)];
}

// A post as it will look on the platform, with inline caption editing and
// a "Publish now" button for scheduled posts.
export function PostPreviewCard({
  post,
  businessName,
  onChange,
}: {
  post: Post;
  businessName: string;
  onChange: (post: Post) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [caption, setCaption] = React.useState(post.caption);
  const [tags, setTags] = React.useState(post.hashtags.join(" "));
  const [busy, setBusy] = React.useState<"save" | "publish" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canEdit = post.status !== "posted";
  const image = mediaUrl(post.image_url);

  function startEdit() {
    if (!canEdit) return;
    setCaption(post.caption);
    setTags(post.hashtags.join(" "));
    setError(null);
    setEditing(true);
  }

  async function save() {
    const hashtags = parseHashtags(tags);
    if (caption.trim() === post.caption && hashtags.join(" ") === post.hashtags.join(" ")) {
      setEditing(false);
      return;
    }
    if (!caption.trim()) {
      setError("The caption can't be empty.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      onChange(await api.updatePost(post.id, { caption: caption.trim(), hashtags }));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the caption.");
    } finally {
      setBusy(null);
    }
  }

  async function publishNow() {
    setBusy("publish");
    setError(null);
    try {
      onChange(await api.publishNow(post.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't publish the post.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      id={`post-${post.id}`}
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-xs",
        post.status === "failed" ? "border-danger-200" : "border-gray-200"
      )}
    >
      {/* phone-frame header */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-2.5">
        <PlatformIcon platform={post.platform} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold text-gray-900">{businessName}</p>
          <p className="text-[11px] text-gray-400">
            {platformLabel[post.platform]}
            {post.stage ? ` · ${stageLabel[post.stage]}` : ""}
          </p>
        </div>
        <StatusBadge status={post.status} />
      </div>

      {/* media */}
      <div className="relative aspect-square w-full bg-gray-50">
        {image && (
          <Image src={image} alt="Post image" fill unoptimized className="object-cover" />
        )}
        <span className="absolute left-2 top-2">
          <Badge variant="muted" className="bg-black/55 text-white">
            {post.uses_original_image ? "Your photo" : "AI image"}
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

      {/* caption, hashtags on their own line */}
      <div className="px-3.5 py-2.5">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              rows={5}
              aria-label="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="text-[13px]"
            />
            <Input
              aria-label="Hashtags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#KKKopitiam #KekLapis"
              className="h-8 text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={busy !== null}>
                {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={cn(
              "group block w-full text-left",
              canEdit ? "cursor-text" : "cursor-default"
            )}
            title={canEdit ? "Click to edit this caption" : undefined}
          >
            <div className="relative">
              <CaptionText
                author={handleOf(businessName)}
                text={post.caption}
                hashtags={post.hashtags}
              />
              {canEdit && (
                <Pencil className="absolute right-0 top-0 h-3 w-3 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </div>
          </button>
        )}
        {post.video_idea && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2 text-[11px] text-gray-500">
            <Clapperboard className="mt-0.5 h-3 w-3 shrink-0" />
            Video idea: {post.video_idea}
          </p>
        )}
      </div>

      {/* footer: time + actions */}
      <div className="space-y-2 border-t border-gray-100 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Clock className="h-3 w-3" />
          {post.status === "posted" && post.posted_at
            ? `Posted ${formatDateTime(post.posted_at)}`
            : post.scheduled_at
              ? formatDateTime(post.scheduled_at)
              : "Not scheduled"}
        </div>
        {post.why_this_time && post.status !== "posted" && (
          <p className="text-[11px] leading-snug text-gray-400">{post.why_this_time}</p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-danger-50 px-2.5 py-1.5 text-[11px] text-danger-700">
            {error}
          </p>
        )}
        {post.status === "scheduled" && !editing && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={publishNow}
            disabled={busy !== null}
          >
            {busy === "publish" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            Publish now
          </Button>
        )}
        {post.status === "posted" && post.published_url && (
          <Link
            href={post.published_url}
            className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
          >
            View on {platformLabel[post.platform]}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
