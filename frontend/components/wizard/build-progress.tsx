"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Loader2,
  PenLine,
  RotateCw,
  ScanSearch,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { api, ApiError, type BuildStep, type Campaign, type StepProgress } from "@/lib/api";
import { formatDuration } from "@/lib/format";

const STEPS: { id: BuildStep; label: string; icon: typeof ScanSearch }[] = [
  { id: "understand", label: "Understanding your photo", icon: ScanSearch },
  { id: "images", label: "Improving images", icon: ImagePlus },
  { id: "captions", label: "Writing captions", icon: PenLine },
];

export const POLL_MS = 2000;

function elapsed(step: StepProgress, now: number | null): string | null {
  if (!step.started_at) return null;
  const start = Date.parse(step.started_at);
  if (step.finished_at) return formatDuration(Date.parse(step.finished_at) - start);
  if (step.state === "running" && now != null) return formatDuration(now - start);
  return null;
}

// Shows the real build progress of a campaign by polling the backend.
// When the build finishes the owner is taken to the review screen.
export function BuildProgress({
  campaignId,
  productName,
  onRetry,
}: {
  campaignId: number;
  productName: string;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [pollError, setPollError] = React.useState<string | null>(null);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const c = await api.getCampaign(campaignId);
        if (cancelled) return;
        setCampaign(c);
        setNow(Date.now());
        setPollError(null);
        if (c.status === "scheduled" || c.status === "done") {
          router.push(`/review/${c.id}`);
          return;
        }
        if (c.status === "failed") return;
      } catch (err) {
        if (cancelled) return;
        setPollError(err instanceof ApiError ? err.message : "Lost contact with the server.");
      }
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campaignId, router]);

  // Ticks the timer of the step that is running right now.
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const progress = campaign?.progress;
  const failed = campaign?.status === "failed";
  const finished = campaign?.status === "scheduled" || campaign?.status === "done";

  const doneCount = STEPS.filter((s) => progress?.[s.id].state === "done").length;
  const running = STEPS.some((s) => progress?.[s.id].state === "running");
  const pct = finished ? 100 : ((doneCount + (running ? 0.5 : 0)) / STEPS.length) * 100;

  const failedStep = STEPS.find((s) => progress?.[s.id].state === "failed");
  const failMessage =
    campaign?.error ?? (failedStep ? progress?.[failedStep.id].error : null) ?? "Something went wrong.";

  return (
    <Card className="flex flex-col items-center gap-5 px-6 py-12 text-center">
      <span
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl",
          failed ? "bg-danger-50" : finished ? "bg-success-50" : "bg-brand-50"
        )}
      >
        {failed ? (
          <AlertTriangle className="h-7 w-7 text-danger-600" />
        ) : finished ? (
          <Check className="h-7 w-7 text-success-600" />
        ) : (
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
        )}
      </span>
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          {failed
            ? "The build didn't finish"
            : finished
              ? "Your campaign is ready"
              : "Building your campaign…"}
        </h2>
        <p className="mt-1 text-[13px] text-gray-500">
          {failed
            ? failMessage
            : finished
              ? "Opening the review screen…"
              : `${productName ? `"${productName}" — ` : ""}this usually takes 2–3 minutes. You can leave this page; we'll keep working.`}
        </p>
      </div>

      {!failed && (
        <div className="w-full max-w-sm">
          <Progress value={pct} />
          <p className="mt-1.5 text-right text-[11px] text-gray-400">
            {Math.round(pct)}%
          </p>
        </div>
      )}

      <ul className="w-full max-w-xs space-y-2.5 text-left">
        {STEPS.map((s) => {
          const step = progress?.[s.id];
          const state = step?.state ?? "pending";
          const time = step ? elapsed(step, now) : null;
          return (
            <li
              key={s.id}
              data-state={state}
              className={cn(
                "flex items-center gap-2.5 text-[13px] transition-colors",
                state === "done" && "text-gray-900",
                state === "running" && "font-medium text-brand-700",
                state === "pending" && "text-gray-400",
                state === "failed" && "font-medium text-danger-700"
              )}
            >
              {state === "done" ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100">
                  <Check className="h-3 w-3 text-success-600" strokeWidth={3} />
                </span>
              ) : state === "running" ? (
                <Loader2 className="h-5 w-5 animate-spin p-0.5 text-brand-500" />
              ) : state === "failed" ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-100">
                  <X className="h-3 w-3 text-danger-600" strokeWidth={3} />
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                  <s.icon className="h-3 w-3 text-gray-400" />
                </span>
              )}
              <span className="flex-1">{s.label}</span>
              {time && (
                <span className="text-[11px] tabular-nums text-gray-400">{time}</span>
              )}
            </li>
          );
        })}
      </ul>

      {pollError && !failed && (
        <p className="text-xs text-warning-700">{pollError} Retrying…</p>
      )}

      {failed && (
        <Button onClick={onRetry}>
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </Card>
  );
}
