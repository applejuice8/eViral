"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, RefreshCw } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TellUsData {
  name: string;
  price: string;
  note: string;
  photoChosen: boolean;
}

// Step 1 — OpenSea-style photo-first intake: large media panel as hero,
// prominent name field, price & note clearly optional.
export function StepTellUs({
  data,
  onChange,
}: {
  data: TellUsData;
  onChange: (patch: Partial<TellUsData>) => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-5">
      {/* Media panel */}
      <div className="sm:col-span-2">
        <Label className="mb-2 block">Product photo</Label>
        <button
          type="button"
          onClick={() => onChange({ photoChosen: true })}
          className={cn(
            "group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 transition-colors",
            data.photoChosen
              ? "border-solid border-gray-200"
              : "border-dashed border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/40"
          )}
        >
          {data.photoChosen ? (
            <>
              <Image
                src="/assets/kek-lapis-original.svg"
                alt="Product photo"
                fill
                className="object-cover"
              />
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                <RefreshCw className="h-3 w-3" /> Replace
              </span>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-brand-100 group-hover:text-brand-600">
                <ImagePlus className="h-5 w-5" />
              </span>
              <p className="px-6 text-center text-[13px] font-medium text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-[11px] text-gray-400">
                A normal phone photo is fine · JPG or PNG
              </p>
              <p className="text-[11px] text-brand-600">
                (Demo: click to use a sample photo)
              </p>
            </>
          )}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
          Your real photo stays the starting point — eViral improves the setting,
          it never invents a different product.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-4 sm:col-span-3">
        <div>
          <Label htmlFor="pname" className="mb-1.5 block">
            Product name
          </Label>
          <Input
            id="pname"
            placeholder="e.g. Kek Lapis Sarawak Premium"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={80}
            className="h-11 text-[15px] font-medium"
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">
            {data.name.length}/80
          </p>
        </div>
        <div>
          <Label htmlFor="pprice" className="mb-1.5 block">
            Price <span className="font-normal text-gray-400">(Optional)</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              RM
            </span>
            <Input
              id="pprice"
              inputMode="decimal"
              placeholder="65"
              value={data.price}
              onChange={(e) =>
                onChange({ price: e.target.value.replace(/[^0-9.]/g, "") })
              }
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            If you leave this blank, posts won&apos;t mention a price.
          </p>
        </div>
        <div>
          <Label htmlFor="pnote" className="mb-1.5 block">
            Short note <span className="font-normal text-gray-400">(Optional)</span>
          </Label>
          <Textarea
            id="pnote"
            rows={3}
            placeholder="e.g. Limited batch — ready 1 Dec"
            value={data.note}
            onChange={(e) => onChange({ note: e.target.value })}
            maxLength={140}
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">
            {data.note.length}/140
          </p>
        </div>
      </div>
    </div>
  );
}
