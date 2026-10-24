"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/wizard/progress-bar";
import { StepType } from "@/components/wizard/step-type";
import { StepTellUs, type TellUsData } from "@/components/wizard/step-tell-us";
import {
  StepConfirm,
  type ConfirmData,
  type VisionState,
} from "@/components/wizard/step-confirm";
import {
  StepPromotion,
  EMPTY_PROMO,
  promoError,
  promoPayload,
  type PromoData,
} from "@/components/wizard/step-promotion";
import {
  StepSchedule,
  type ScheduleData,
} from "@/components/wizard/step-schedule";
import { BuildProgress } from "@/components/wizard/build-progress";
import { api, ApiError, mediaUrl, type CampaignType, type Product } from "@/lib/api";

type StepId = "type" | "tellus" | "confirm" | "pick" | "schedule" | "build";

const FLOWS: Record<CampaignType, StepId[]> = {
  new_product: ["tellus", "confirm", "schedule", "build"],
  promotion: ["pick", "schedule", "build"],
};

const FLOW_LABELS: Record<StepId, string> = {
  type: "Type",
  tellus: "Tell us",
  confirm: "Confirm",
  pick: "Pick product",
  schedule: "Schedule",
  build: "Build",
};

const STEP_TITLES: Record<StepId, { title: string; sub: string }> = {
  type: {
    title: "What are we launching?",
    sub: "Pick the kind of campaign you want to run.",
  },
  tellus: {
    title: "Tell us about your product",
    sub: "A name and a photo is all we need — the rest is optional.",
  },
  confirm: {
    title: "Confirm what we see",
    sub: "Captions are written only from facts you confirm here.",
  },
  pick: {
    title: "Promote a product",
    sub: "Pick something you already sell — no photo upload needed.",
  },
  schedule: {
    title: "Pick a schedule",
    sub: "Posts go out automatically at the times you pick.",
  },
  build: { title: "Build your campaign", sub: "" },
};

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
  const [step, setStep] = React.useState(0); // 0 = type, then 1..n = active flow
  const [campaignType, setCampaignType] = React.useState<CampaignType | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const flow = campaignType ? FLOWS[campaignType] : [];
  const stepId: StepId = step === 0 ? "type" : flow[step - 1];

  const [tellUs, setTellUs] = React.useState<TellUsData>({
    name: "",
    price: "",
    note: "",
    photo: null,
    photoUrl: null,
  });
  // saved product + the input it was saved from
  const [product, setProduct] = React.useState<Product | null>(null);
  const savedFrom = React.useRef<Saved | null>(null);

  // promotion flow state
  const [products, setProducts] = React.useState<Product[] | null>(null);
  const [picked, setPicked] = React.useState<Product | null>(null);
  const [promo, setPromo] = React.useState<PromoData>(EMPTY_PROMO);

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

  // products for the promotion picker
  React.useEffect(() => {
    let cancelled = false;
    api
      .listProducts()
      .then((list) => !cancelled && setProducts(list))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // free the preview URL on unmount
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

  // ignore late answers for a replaced product
  const activeProductId = React.useRef<number | null>(null);

  function chooseType(type: CampaignType) {
    setCampaignType(type);
    if (step === 0) setStep(1);
  }

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
      setStep(2);
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
    setStep(2);
    understand(created.id);
  }

  async function submitConfirm() {
    if (!product) return;
    const updated = await api.confirmAttributes(product.id, confirm.attributes);
    setProduct(updated);
    setStep(3);
  }

  async function startBuild() {
    if (campaignType === "promotion" && picked) {
      const campaign = await api.createCampaign({
        product_id: picked.id,
        language: schedule.language,
        platforms: schedule.platforms,
        schedule: {
          mode: schedule.mode,
          dates: schedule.dates,
          time: schedule.time || "20:00",
          days: schedule.days,
        },
        campaign_type: "promotion",
        ...promoPayload(promo, picked),
      });
      setCampaignId(campaign.id);
      setStep(flow.indexOf("build") + 1);
      return;
    }
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
      campaign_type: "new_product",
    });
    setCampaignId(campaign.id);
    setStep(flow.indexOf("build") + 1);
  }

  async function next() {
    setBusy(true);
    setError(null);
    try {
      if (step === 0) setStep(1);
      else if (stepId === "tellus") await submitTellUs();
      else if (stepId === "confirm") await submitConfirm();
      else if (stepId === "pick") setStep(step + 1);
      else if (stepId === "schedule") await startBuild();
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

  const promoInvalid = promoError(promo, picked) !== null;
  const canContinue =
    step === 0
      ? campaignType !== null
      : stepId === "tellus"
        ? tellUs.name.trim().length > 0 && tellUs.photo !== null
        : stepId === "confirm"
          ? vision.status === "ready" && confirm.attributes.length > 0
          : stepId === "pick"
            ? picked !== null && !promoInvalid
            : stepId === "schedule"
              ? schedule.platforms.length > 0 &&
                (schedule.mode === "launch_sequence"
                  ? schedule.dates.length === 1
                  : schedule.mode === "weekly"
                    ? schedule.days.length > 0 && schedule.dates.length === 1
                    : schedule.dates.length > 0)
              : false;

  const building = stepId === "build";
  const photoUrl = tellUs.photoUrl ?? mediaUrl(product?.photo_url);
  const progressSteps = ["Type", ...flow.map((id) => FLOW_LABELS[id])];
  const heading = STEP_TITLES[stepId];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{heading.title}</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {building ? "Hang tight." : `Step ${step + 1} of ${progressSteps.length} · `}
            {heading.sub}
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

      <WizardProgress steps={progressSteps} current={step} />

      <div className="ev-fade-up" key={step}>
        {stepId === "type" && <StepType value={campaignType} onChange={chooseType} />}
        {stepId === "tellus" && (
          <StepTellUs
            data={tellUs}
            onChange={(p) => setTellUs((d) => ({ ...d, ...p }))}
          />
        )}
        {stepId === "confirm" && (
          <StepConfirm
            photoUrl={photoUrl}
            vision={vision}
            uncertain={product?.understood?.uncertain ?? []}
            data={confirm}
            onChange={(p) => setConfirm((d) => ({ ...d, ...p }))}
            onRetry={() => product && understand(product.id)}
          />
        )}
        {stepId === "pick" && (
          <StepPromotion
            products={products}
            loading={products === null}
            picked={picked}
            onPick={setPicked}
            promo={promo}
            onPromoChange={(p) => setPromo((d) => ({ ...d, ...p }))}
          />
        )}
        {stepId === "schedule" && (
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
        {stepId === "build" && campaignId !== null && (
          <BuildProgress
            key={campaignId}
            campaignId={campaignId}
            productName={product?.name ?? picked?.name ?? tellUs.name.trim()}
            onRetry={retryBuild}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-700">
          {error}
        </p>
      )}

      {/* footer */}
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
              !canContinue && stepId === "tellus"
                ? "Add a product name and photo to continue"
                : !canContinue && stepId === "pick"
                  ? "Pick a product to continue"
                  : undefined
            }
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {stepId === "schedule" ? "Build campaign" : "Continue"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
