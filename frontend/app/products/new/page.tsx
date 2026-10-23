"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/wizard/progress-bar";
import { StepTellUs, type TellUsData } from "@/components/wizard/step-tell-us";
import {
  StepConfirm,
  type ConfirmData,
  type VisionState,
} from "@/components/wizard/step-confirm";
import {
  StepSchedule,
  type ScheduleData,
} from "@/components/wizard/step-schedule";
import { BuildProgress } from "@/components/wizard/build-progress";
import { api, ApiError, mediaUrl, type Product } from "@/lib/api";

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
    sub: "Posts go out automatically at the times you pick.",
  },
  { title: "Build your campaign", sub: "" },
];

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

type Saved = Pick<TellUsData, "name" | "price" | "note" | "photo">;

function sameInput(a: Saved | null, b: TellUsData): boolean {
  return (
    a !== null &&
    a.name.trim() === b.name.trim() &&
    a.price.trim() === b.price.trim() &&
    a.note.trim() === b.note.trim() &&
    a.photo === b.photo
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [tellUs, setTellUs] = React.useState<TellUsData>({
    name: "",
    price: "",
    note: "",
    photo: null,
    photoUrl: null,
  });
  // The product saved on the backend, and the input it was saved from.
  // Going back and changing anything creates a fresh product.
  const [product, setProduct] = React.useState<Product | null>(null);
  const savedFrom = React.useRef<Saved | null>(null);

  const [vision, setVision] = React.useState<VisionState>({ status: "loading" });
  const [confirm, setConfirm] = React.useState<ConfirmData>({ attributes: [] });
  const [schedule, setSchedule] = React.useState<ScheduleData>({
    mode: "launch_sequence",
    platforms: ["facebook", "instagram", "tiktok"],
    language: "mixed",
    days: ["Tue", "Thu", "Sat"],
    time: "20:00",
    dates: [],
  });
  const [campaignId, setCampaignId] = React.useState<number | null>(null);

  // Free the preview object URL when leaving the wizard.
  const photoUrlRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    photoUrlRef.current = tellUs.photoUrl;
  }, [tellUs.photoUrl]);
  React.useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    []
  );

  // Ignore late answers for a product the owner has since replaced.
  const activeProductId = React.useRef<number | null>(null);

  async function understand(id: number) {
    activeProductId.current = id;
    setVision({ status: "loading" });
    try {
      const p = await api.understandProduct(id);
      if (activeProductId.current !== id) return;
      setProduct(p);
      setConfirm({
        attributes: p.confirmed_attributes ?? p.understood?.visible_attributes ?? [],
      });
      setVision({ status: "ready" });
    } catch (err) {
      if (activeProductId.current !== id) return;
      setVision({ status: "error", error: errorText(err) });
    }
  }

  async function submitTellUs() {
    if (!tellUs.photo) return;
    if (product && sameInput(savedFrom.current, tellUs)) {
      setStep(1);
      if (vision.status === "error") understand(product.id);
      return;
    }
    const created = await api.createProduct({
      name: tellUs.name,
      price: tellUs.price,
      note: tellUs.note,
      photo: tellUs.photo,
    });
    savedFrom.current = { ...tellUs };
    setProduct(created);
    setConfirm({ attributes: [] });
    setStep(1);
    understand(created.id);
  }

  async function submitConfirm() {
    if (!product) return;
    const updated = await api.confirmAttributes(product.id, confirm.attributes);
    setProduct(updated);
    setStep(2);
  }

  async function startBuild() {
    if (!product) return;
    const campaign = await api.createCampaign({
      product_id: product.id,
      language: schedule.language,
      platforms: schedule.platforms,
      schedule: {
        mode: schedule.mode,
        dates: schedule.dates,
        time: schedule.time || "20:00",
        days: schedule.days,
      },
    });
    setCampaignId(campaign.id);
    setStep(3);
  }

  async function next() {
    setBusy(true);
    setError(null);
    try {
      if (step === 0) await submitTellUs();
      else if (step === 1) await submitConfirm();
      else if (step === 2) await startBuild();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function retryBuild() {
    setError(null);
    try {
      await startBuild();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const canContinue =
    step === 0
      ? tellUs.name.trim().length > 0 && tellUs.photo !== null
      : step === 1
        ? vision.status === "ready" && confirm.attributes.length > 0
        : step === 2
          ? schedule.platforms.length > 0 &&
            (schedule.mode === "launch_sequence"
              ? schedule.dates.length === 1
              : schedule.mode === "weekly"
                ? schedule.days.length > 0 && schedule.dates.length === 1
                : schedule.dates.length > 0)
          : false;

  const building = step === 3;
  const photoUrl = tellUs.photoUrl ?? mediaUrl(product?.photo_url);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
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
            photoUrl={photoUrl}
            vision={vision}
            uncertain={product?.understood?.uncertain ?? []}
            data={confirm}
            onChange={(p) => setConfirm((d) => ({ ...d, ...p }))}
            onRetry={() => product && understand(product.id)}
          />
        )}
        {step === 2 && (
          <StepSchedule
            data={schedule}
            onChange={(p) =>
              setSchedule((d) => ({
                ...d,
                ...(typeof p === "function" ? p(d) : p),
              }))
            }
          />
        )}
        {step === 3 && campaignId !== null && (
          <BuildProgress
            key={campaignId}
            campaignId={campaignId}
            productName={product?.name ?? tellUs.name.trim()}
            onRetry={retryBuild}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-700">
          {error}
        </p>
      )}

      {/* Footer — Back always works: step 0 leaves to the dashboard,
          later steps go back one step (including during the build). */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            if (step === 0) router.push("/");
            else setStep((s) => Math.max(0, s - 1));
          }}
          title={step === 0 ? "Back to dashboard" : "Go back one step"}
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Back to dashboard" : "Back"}
        </Button>
        {!building && (
          <Button
            onClick={() => canContinue && !busy && next()}
            disabled={!canContinue || busy}
            title={
              !canContinue && step === 0
                ? "Add a product name and photo to continue"
                : undefined
            }
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 2 ? "Build campaign" : "Continue"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
