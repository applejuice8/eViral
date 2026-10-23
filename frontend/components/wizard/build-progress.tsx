"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PartyPopper, ScanSearch, ImagePlus, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Employment Hero-style build screen: calm, branded, stage lines with
// live status. Simulated locally — no backend calls.
const STAGES = [
  { id: "understand", label: "Understanding your photo", icon: ScanSearch },
  { id: "media", label: "Improving images", icon: ImagePlus },
  { id: "write", label: "Writing captions", icon: PenLine },
  { id: "validate", label: "Checking facts", icon: ShieldCheck },
];

const STAGE_MS = 1800;

export function BuildProgress({ productName }: { productName: string }) {
  const router = useRouter();
  const [stageIndex, setStageIndex] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (stageIndex >= STAGES.length) {
      const t = setTimeout(() => setDone(true), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStageIndex((i) => i + 1), STAGE_MS);
    return () => clearTimeout(t);
  }, [stageIndex]);

  const pct = Math.min(100, (stageIndex / STAGES.length) * 100);

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
              {productName ? `"${productName}" — ` : ""}this usually takes under a
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
              We prepared 7 posts across your platforms. Check the captions and
              images, then approve — nothing posts without your OK.
            </p>
          </div>
          <Button onClick={() => router.push("/review/cmp_kek-lapis")}>
            Review campaign
          </Button>
        </div>
      )}
    </Card>
  );
}
