"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CheckCheck, Pause, Rocket, XCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/input";
import { ImageCompare } from "@/components/review/image-compare";
import { CaptionText } from "@/components/review/caption-text";
import {
  PostPreviewCard,
  validateCaption,
  type DraftState,
} from "@/components/review/post-preview-card";
import { aiCaption, demoCampaign, type ValidatorFlag } from "@/lib/data";
import { cn, formatRM } from "@/lib/utils";

type OverrideMap = Partial<Record<DraftState["platform"], string>>;

export default function ReviewPage() {
  const router = useRouter();
  const [fidelityTicked, setFidelityTicked] = React.useState(false);
  const [approved, setApproved] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [publishedFirst, setPublishedFirst] = React.useState(false);
  const [editingShared, setEditingShared] = React.useState(false);
  const [sharedValue, setSharedValue] = React.useState(aiCaption);

  const drafts: DraftState[] = React.useMemo(
    () =>
      demoCampaign.drafts.map((d) => ({
        ...d,
        liveFlags: [],
      })),
    []
  );

  // Per-platform caption overrides (a post edited on its own keeps its version
  // even when the shared caption changes afterwards).
  const [overrides, setOverrides] = React.useState<OverrideMap>({});

  const price = demoCampaign.price;
  const sharedFlags = validateCaption(sharedValue, price);

  // Effective caption + flags per post: override wins, otherwise the shared caption.
  const effective = drafts.map((d) => {
    const caption = overrides[d.platform] ?? sharedValue;
    return { draft: d, caption, flags: validateCaption(caption, price) };
  });
  const anyBlocked = effective.some(({ flags }) =>
    flags.some((f) => f.severity === "block")
  );
  const canApprove = fidelityTicked && !anyBlocked && !approved;

  function handleSharedCommit() {
    setEditingShared(false);
    // Shared caption changed — per-post flags re-derive automatically for
    // posts without their own override.
  }

  function handlePlatformEdit(id: string, caption: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setOverrides((o) => ({ ...o, [draft.platform]: caption }));
  }

  function resetPlatformEdit(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setOverrides((o) => {
      const next = { ...o };
      delete next[draft.platform];
      return next;
    });
  }

  const first = effective[0];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header / campaign summary */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {demoCampaign.productName}
            </h1>
            <Badge variant="default">Launch</Badge>
            <Badge variant="muted">Mixed BM + EN</Badge>
            <Badge variant="muted">Goal: {demoCampaign.goal}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-gray-500">
            {effective.length} posts ·{" "}
            {format(parseISO(drafts[0].scheduledAt), "d MMM")} –{" "}
            {format(parseISO(drafts[drafts.length - 1].scheduledAt), "d MMM")} ·{" "}
            {formatRM(demoCampaign.price)}
            {demoCampaign.note ? ` · ${demoCampaign.note}` : ""}
          </p>
        </div>
        {approved && (
          <Badge variant="success" className="px-2.5 py-1 text-xs">
            {paused ? "Campaign paused" : "Campaign approved — posts will go out on schedule"}
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: fidelity panel (image + shared AI caption) + actions */}
        <div className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Does it still look like your product?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageCompare
                original={demoCampaign.productImageOriginal}
                improved={demoCampaign.productImageImproved}
                productName={demoCampaign.productName}
              />

              {/* Shared AI-generated caption — edit for all */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-gray-500">
                    AI-generated caption
                  </p>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    Same on all platforms
                  </span>
                </div>

                {editingShared ? (
                  <div className="mt-2">
                    <Textarea
                      autoFocus
                      rows={5}
                      value={sharedValue}
                      onChange={(e) => setSharedValue(e.target.value)}
                      onBlur={handleSharedCommit}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setSharedValue(sharedValue === aiCaption ? aiCaption : sharedValue);
                          setEditingShared(false);
                        }
                      }}
                      className="text-[13px]"
                    />
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Editing here updates all 3 posts. Posts with their own edit
                      keep their version. Hashtags are part of the caption — type
                      them with # and they get styled automatically.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => !approved && setEditingShared(true)}
                    className={cn(
                      "group mt-2 block w-full text-left",
                      approved ? "cursor-default" : "cursor-text"
                    )}
                    title={approved ? undefined : "Click to edit the caption for all platforms"}
                  >
                    <div className="relative">
                      <CaptionText text={sharedValue} />
                      {!approved && (
                        <Pencil className="absolute right-0 top-0 h-3 w-3 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </div>
                  </button>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sharedFlags.map((f, i) => (
                    <Badge
                      key={i}
                      variant={f.severity === "block" ? "danger" : "warning"}
                      title={f.detail}
                    >
                      {f.severity === "block" ? "⛔" : "⚠"}{" "}
                      {f.code.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  ))}
                  {sharedFlags.length === 0 && (
                    <Badge variant="success">✓ Facts check passed</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {overrides && Object.keys(overrides).length > 0
                    ? `${3 - Object.keys(overrides).length} of 3 posts follow this caption.`
                    : "Applies to all 3 posts."}
                </p>
              </div>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                  fidelityTicked
                    ? "border-success-600 bg-success-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <Checkbox
                  checked={fidelityTicked}
                  onCheckedChange={setFidelityTicked}
                  className="mt-0.5"
                />
                <span className="text-[13px] leading-snug text-gray-700">
                  <span className="font-medium">
                    This still looks like my product.
                  </span>{" "}
                  I&apos;m happy for the AI-edited image to represent it.
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2.5 p-4">
              <Button
                variant="success"
                size="lg"
                className="w-full"
                disabled={!canApprove}
                onClick={() => setApproved(true)}
                title={
                  !fidelityTicked
                    ? "Tick “This still looks like my product” first"
                    : anyBlocked
                      ? "Fix blocked posts first"
                      : undefined
                }
              >
                <CheckCheck className="h-4 w-4" />
                {approved ? "Campaign approved" : "Approve campaign"}
              </Button>
              {!approved && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  <XCircle className="h-4 w-4" />
                  Reject & send back
                </Button>
              )}
              {approved && !publishedFirst && (
                <Button
                  className="w-full"
                  onClick={() => setPublishedFirst(true)}
                >
                  <Rocket className="h-4 w-4" />
                  Publish first post now
                </Button>
              )}
              {publishedFirst && (
                <p className="rounded-lg bg-success-50 px-3 py-2 text-center text-xs font-medium text-success-700">
                  🎉 First post published (mock publisher) — see the calendar.
                </p>
              )}
              {approved && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPaused((p) => !p)}
                >
                  <Pause className="h-4 w-4" />
                  {paused ? "Resume campaign" : "Pause campaign"}
                </Button>
              )}
              <p className="text-center text-[11px] leading-relaxed text-gray-400">
                Nothing publishes without your approval. You can pause or cancel
                at any time.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: 3 per-platform preview cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {effective.map(({ draft, caption, flags }) => {
            const overridden = overrides[draft.platform] !== undefined;
            return (
              <div key={draft.id} className="space-y-1.5">
                {overridden && (
                  <div className="flex items-center justify-between px-1">
                    <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700">
                      Edited for {draft.platform} only
                    </span>
                    <button
                      type="button"
                      onClick={() => resetPlatformEdit(draft.id)}
                      disabled={approved}
                      className="text-[11px] font-medium text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline disabled:opacity-40"
                    >
                      Use shared caption
                    </button>
                  </div>
                )}
                <PostPreviewCard
                  draft={
                    publishedFirst && draft.id === first.draft.id
                      ? { ...draft, liveFlags: flags, status: "published" }
                      : { ...draft, liveFlags: flags }
                  }
                  caption={caption}
                  image={demoCampaign.productImageImproved}
                  price={price}
                  approved={approved}
                  editLabel={`Click to edit the ${draft.platform} caption only`}
                  onEdit={handlePlatformEdit}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
