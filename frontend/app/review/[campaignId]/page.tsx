"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CheckCheck, Pause, Rocket, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ImageCompare,
} from "@/components/review/image-compare";
import {
  PostPreviewCard,
  type DraftState,
} from "@/components/review/post-preview-card";
import { demoCampaign, type ValidatorFlag } from "@/lib/data";
import { cn, formatRM } from "@/lib/utils";

export default function ReviewPage() {
  const router = useRouter();
  const [fidelityTicked, setFidelityTicked] = React.useState(false);
  const [approved, setApproved] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [publishedFirst, setPublishedFirst] = React.useState(false);
  const [drafts, setDrafts] = React.useState<DraftState[]>(
    demoCampaign.drafts.map((d) => ({
      ...d,
      // Seed live flags from mock, but re-derive for drafts whose stored
      // flags were examples of a *fixed* error (keep the blocked one as-is).
      liveFlags: d.flags,
    }))
  );

  function handleEdit(id: string, caption: string, flags: ValidatorFlag[]) {
    setDrafts((ds) =>
      ds.map((d) =>
        d.id === id
          ? {
              ...d,
              caption,
              liveFlags: flags,
              status: flags.some((f) => f.severity === "block")
                ? "blocked"
                : "pending_approval",
            }
          : d
      )
    );
  }

  const anyBlocked = drafts.some((d) =>
    d.liveFlags.some((f) => f.severity === "block")
  );
  const canApprove = fidelityTicked && !anyBlocked && !approved;
  const firstDraft = drafts[0];

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
            {drafts.length} posts ·{" "}
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
        {/* Left: fidelity panel + actions */}
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

        {/* Right: per-platform preview cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {drafts.map((d) => (
            <PostPreviewCard
              key={d.id}
              draft={
                publishedFirst && d.id === firstDraft.id
                  ? { ...d, status: "published" }
                  : d
              }
              image={demoCampaign.productImageImproved}
              price={demoCampaign.price}
              approved={approved}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
