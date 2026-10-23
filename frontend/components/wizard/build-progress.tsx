"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PartyPopper, ScanSearch, ImagePlus, PenLine, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  runCampaignBuild,
  saveLastBuild,
  type BuildFacts,
} from "@/lib/campaign-build";

// Employment Hero-style build screen: calm, branded, stage lines with
// live status. The caption stage is REAL: the entered facts go to
// POST /backend/captions/generate and the result is saved for the
// review screen. If the service is unreachable the build still finishes
// and the review screen falls back to the demo campaign.
const STAGES = [
  { id: "understand", label: "Understanding your photo", icon: ScanSearch },
  { id: "media", label: "Improving images", icon: ImagePlus },
  { id: "write", label: "Writing captions", icon: PenLine },
  { id: "validate", label: "Checking facts", icon: ShieldCheck },
];

const STAGE_MS = 1800;

export function BuildProgress({ facts }: { facts: BuildFacts }) {
  const router = useRouter();
  const [stageIndex, setStageIndex] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [genState, setGenState] = React.useState<
    "pending" | "ok" | "failed"
  >("pending");
  const [postCount, setPostCount] = React.useState(0);

  // Fire the real caption generation as soon as the build starts.
  React.useEffect(() => {
    let cancelled = false;
    runCampaignBuild(facts)
      .then((entry) => {
        if (cancelled) return;
        saveLastBuild(entry);
        setPostCount(entry.captions.length);
        setGenState("ok");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        saveLastBuild({
          failed: true,
          error: err instanceof Error ? err.message : String(err),
          at: new Date().toISOString(),
        });
        setPostCount(facts.platforms.length);
        setGenState("failed");
      });
    return () => {
      cancelled = true;
    };
    // Generation must run exactly once per build, not on every wizard
    // re-render, hence [] deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const settled = genState !== "pending";
    if (stageIndex >= STAGES.length && settled) {
      const t = setTimeout(() => setDone(true), 400);
      return () => clearTimeout(t);
    }
    if (stageIndex >= STAGES.length) return; // wait for the caption call
    const t = setTimeout(() => setStageIndex((i) => i + 1), STAGE_MS);
    return () => clearTimeout(t);
  }, [stageIndex, genState]);

  const pct = Math.min(
    100,
    ((Math.min(stageIndex, STAGES.length) +
      (genState === "pending" ? 0 : 0.5)) /
      (STAGES.length + 0.5)) *
      100
  );

  return (
    <Card className="flex flex-col items-center gap-5 px-6 py-12 text-center">
      {!done ? (
        <>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Building your campaign…
            </h2>
            <p className="mt-1 text-[13px] text-gray-500">
              {facts.productName ? `"${facts.productName}" — ` : ""}this usually takes under a
              minute. You can leave this page; we&apos;ll keep working.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <Progress value={pct} />
            <p className="mt-1.5 text-right text-[11px] text-gray-400">
              {Math.round(pct)}%
            </p>
          </div>
          <ul className="w-full max-w-xs space-y-2.5 text-left">
            {STAGES.map((s, i) => {
              const state =
                i < stageIndex ? "done" : i === stageIndex ? "active" : "todo";
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2.5 text-[13px] transition-colors",
                    state === "done" && "text-gray-900",
                    state === "active" && "font-medium text-brand-700",
                    state === "todo" && "text-gray-400"
                  )}
                >
                  {state === "done" ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100">
                      <Check className="h-3 w-3 text-success-600" strokeWidth={3} />
                    </span>
                  ) : state === "active" ? (
                    <Loader2 className="h-5 w-5 animate-spin p-0.5 text-brand-500" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                      <s.icon className="h-3 w-3 text-gray-400" />
                    </span>
                  )}
                  {s.label}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="ev-fade-up flex flex-col items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50">
            <PartyPopper className="h-7 w-7 text-success-600" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Your campaign is ready to review
            </h2>
            <p className="mt-1 max-w-sm text-[13px] text-gray-500">
              We prepared {postCount} post{postCount === 1 ? "" : "s"} — one per
              platform. Check the captions and images, then approve — nothing
              posts without your OK.
            </p>
            {genState === "ok" && (
              <p className="mt-1.5 text-[11px] text-gray-400">
                Captions were written from what you entered — the model only
                sees your confirmed facts.
              </p>
            )}
            {genState === "failed" && (
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-warning-700">
                <AlertTriangle className="h-3 w-3" />
                Caption service was unreachable — the review screen will show the
                demo campaign.
              </p>
            )}
          </div>
          <Button onClick={() => router.push("/review/latest")}>
            Review campaign
          </Button>
        </div>
      )}
    </Card>
  );
}
