"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/wizard/progress-bar";
import { StepTellUs, type TellUsData } from "@/components/wizard/step-tell-us";
import { StepConfirm, type ConfirmData } from "@/components/wizard/step-confirm";
import {
  StepSchedule,
  type ScheduleData,
} from "@/components/wizard/step-schedule";
import { BuildProgress } from "@/components/wizard/build-progress";

const STEPS = ["Tell us", "Confirm", "Schedule", "Build"];

const STEP_TITLES = [
  {
    title: "Tell us about your product",
    sub: "A name and a photo is all we need — the rest is optional.",
  },
  {
    title: "Confirm what we see",
    sub: "Captions are written only from facts you confirm here.",
  },
  {
    title: "Pick a schedule",
    sub: "You approve everything before anything goes out.",
  },
  { title: "Build your campaign", sub: "" },
];

export default function NewProductPage() {
  const [step, setStep] = React.useState(0);
  const [tellUs, setTellUs] = React.useState<TellUsData>({
    name: "",
    price: "",
    note: "",
    photoChosen: false,
  });
  const [confirm, setConfirm] = React.useState<ConfirmData>({
    attributes: ["Layered cake", "Round", "Brown & cream layers", "Sliced, on a plate"],
  });
  const [schedule, setSchedule] = React.useState<ScheduleData>({
    mode: "launch_sequence",
    platforms: ["facebook", "instagram", "tiktok"],
    language: "mixed",
    days: ["Tue", "Thu", "Sat"],
    time: "20:00",
  });

  const canContinue =
    step === 0
      ? tellUs.name.trim().length > 0 && tellUs.photoChosen
      : step === 1
        ? confirm.attributes.length > 0
        : step === 2
          ? schedule.platforms.length > 0 &&
            (schedule.mode !== "weekly" || schedule.days.length > 0)
          : false;

  const building = step === 3;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Zillow-style header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {STEP_TITLES[step].title}
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {building ? "Hang tight." : `Step ${step + 1} of ${STEPS.length} · `}
            {STEP_TITLES[step].sub}
          </p>
        </div>
        {!building && (
          <Link href="/">
            <Button variant="outline" size="sm">
              Save & exit
            </Button>
          </Link>
        )}
      </div>

      <WizardProgress steps={STEPS} current={step} />

      <div className="ev-fade-up" key={step}>
        {step === 0 && (
          <StepTellUs
            data={tellUs}
            onChange={(p) => setTellUs((d) => ({ ...d, ...p }))}
          />
        )}
        {step === 1 && (
          <StepConfirm
            data={confirm}
            onChange={(p) => setConfirm((d) => ({ ...d, ...p }))}
          />
        )}
        {step === 2 && (
          <StepSchedule
            data={schedule}
            onChange={(p) => setSchedule((d) => ({ ...d, ...p }))}
          />
        )}
        {step === 3 && <BuildProgress productName={tellUs.name} />}
      </div>

      {/* Footer */}
      {!building && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => canContinue && setStep((s) => s + 1)}
            disabled={!canContinue}
            title={
              !canContinue && step === 0
                ? "Add a product name and photo to continue"
                : undefined
            }
          >
            {step === 2 ? "Build campaign" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
