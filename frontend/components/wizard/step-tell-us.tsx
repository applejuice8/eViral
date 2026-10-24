"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TellUsData {
  name: string;
  price: string;
  note: string;
  photo: File | null;
  /** Object URL for previewing `photo`. */
  photoUrl: string | null;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];

export const MOCK_PRODUCT = {
  name: "Nasi Lemak Ayam Goreng",
  price: "15",
  note: "Crispy ayam goreng, fragrant sambal & coconut rice — packed fresh daily.",
  photoPath: "/assets/nasi-lemak.jpeg",
};

/** Returns an error message, or null when the file is fine to upload. */
export function checkPhoto(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Please pick a JPG or PNG photo.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is over 10 MB. Please pick a smaller one.";
  return null;
}

// Step 1 — photo-first intake: large media panel as hero, prominent name
// field, price & note clearly optional.
export function StepTellUs({
  data,
  onChange,
}: {
  data: TellUsData;
  onChange: (patch: Partial<TellUsData>) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [loadingMock, setLoadingMock] = React.useState(false);

  function setPhoto(file: File) {
    const problem = checkPhoto(file);
    setPhotoError(problem);
    if (problem) return;
    if (data.photoUrl) URL.revokeObjectURL(data.photoUrl);
    onChange({ photo: file, photoUrl: URL.createObjectURL(file) });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setPhoto(file);
  }

  async function loadMockData() {
    setLoadingMock(true);
    setPhotoError(null);
    try {
      const res = await fetch(MOCK_PRODUCT.photoPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], "nasi-lemak.jpeg", { type: "image/jpeg" });
      if (data.photoUrl) URL.revokeObjectURL(data.photoUrl);
      onChange({
        name: MOCK_PRODUCT.name,
        price: MOCK_PRODUCT.price,
        note: MOCK_PRODUCT.note,
        photo: file,
        photoUrl: URL.createObjectURL(file),
      });
    } catch {
      setPhotoError("Couldn't load the sample photo.");
    } finally {
      setLoadingMock(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-500">
          Just trying it out? Fill everything in with a sample product.
        </p>
        <Button variant="outline" size="sm" onClick={loadMockData} disabled={loadingMock}>
          {loadingMock ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          Load mock data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-5">
        {/* Media panel */}
        <div className="sm:col-span-2">
          <Label className="mb-2 block">Product photo</Label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            data-testid="photo-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhoto(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 transition-colors",
              data.photoUrl
                ? "border-solid border-gray-200"
                : "border-dashed border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/40",
              dragging && "border-brand-500 bg-brand-50/60"
            )}
          >
            {data.photoUrl ? (
              <>
                <Image
                  src={data.photoUrl}
                  alt="Product photo"
                  fill
                  unoptimized
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
                  A normal phone photo is fine · JPG or PNG, up to 10 MB
                </p>
              </>
            )}
          </button>
          {photoError && (
            <p role="alert" className="mt-2 text-xs text-danger-700">
              {photoError}
            </p>
          )}
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
    </div>
  );
}
