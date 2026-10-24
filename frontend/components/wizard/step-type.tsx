"use client";

import { PackagePlus, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignType } from "@/lib/api";

// Step 0 — choose what kind of campaign this is. New product keeps the
// photo-first flow; promotion reuses something the business already sells.
export function StepType({
  value,
  onChange,
}: {
  value: CampaignType | null;
  onChange: (type: CampaignType) => void;
}) {
  const options: {
    key: CampaignType;
    icon: typeof PackagePlus;
    title: string;
    body: string;
  }[] = [
    {
      key: "new_product",
      icon: PackagePlus,
      title: "A new product",
      body: "Upload a photo and eViral will understand it, then plan the launch.",
    },
    {
      key: "promotion",
      icon: Tags,
      title: "Promote something you sell",
      body: "Pick a product you already have — spread the word or run a discount.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="step-type">
      {options.map(({ key, icon: Icon, title, body }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            data-testid={`type-${key}`}
            onClick={() => onChange(key)}
            className={cn(
              "flex flex-col items-start gap-3 rounded-xl border-2 bg-white p-5 text-left transition-colors",
              selected
                ? "border-brand-500 bg-brand-50/40"
                : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/20"
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                selected ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-gray-900">
                {title}
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-gray-500">
                {body}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
