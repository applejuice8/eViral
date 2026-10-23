"use client";

import * as React from "react";
import Image from "next/image";
import { AlertTriangle, Loader2, Plus, RotateCw, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ConfirmData {
  attributes: string[];
}

export type VisionState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready" };

const MAX_ATTRIBUTES = 12;
const MAX_ATTRIBUTE_LENGTH = 60;

// Step 2 — "What we see": the vision model's observations of the uploaded
// photo as editable chips. The owner confirms before any captions are written.
export function StepConfirm({
  photoUrl,
  vision,
  uncertain,
  data,
  onChange,
  onRetry,
}: {
  photoUrl: string | null;
  vision: VisionState;
  /** Things the model could not tell from the photo. */
  uncertain: string[];
  data: ConfirmData;
  onChange: (patch: Partial<ConfirmData>) => void;
  onRetry: () => void;
}) {
  const [draft, setDraft] = React.useState("");
  const full = data.attributes.length >= MAX_ATTRIBUTES;

  function remove(attr: string) {
    onChange({ attributes: data.attributes.filter((a) => a !== attr) });
  }
  function add(value: string) {
    const v = value.trim().slice(0, MAX_ATTRIBUTE_LENGTH);
    if (!v || full || data.attributes.includes(v)) return;
    onChange({ attributes: [...data.attributes, v] });
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-5">
      <div className="sm:col-span-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {photoUrl && (
            <Image
              src={photoUrl}
              alt="Your product photo"
              fill
              unoptimized
              className="object-cover"
            />
          )}
          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            Your photo
          </span>
          {vision.status === "loading" && (
            <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-brand-100">
              <span className="block h-full w-1/3 animate-pulse bg-brand-500" />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 sm:col-span-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            <p className="text-xs font-medium text-gray-700">
              What we see <span className="font-normal text-gray-400">(AI-observed)</span>
            </p>
          </div>

          {vision.status === "loading" && (
            <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              <div>
                <p className="text-[13px] font-medium text-gray-800">
                  Looking at your photo…
                </p>
                <p className="text-[11px] text-gray-400">
                  This usually takes 10–20 seconds.
                </p>
              </div>
            </div>
          )}

          {vision.status === "error" && (
            <div className="space-y-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-3">
              <p className="flex items-start gap-2 text-[13px] text-danger-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                We couldn&apos;t read your photo: {vision.error}
              </p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          )}

          {vision.status === "ready" && (
            <>
              <p className="mb-3 text-[13px] leading-relaxed text-gray-500">
                eViral writes captions using only these facts and what you told us.
                Remove anything wrong, add anything missing.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.attributes.map((attr) => (
                  <span
                    key={attr}
                    className="inline-flex items-center gap-1 rounded bg-brand-50 py-1 pl-2 pr-1 text-xs font-medium text-brand-700"
                  >
                    {attr}
                    <button
                      type="button"
                      aria-label={`Remove ${attr}`}
                      onClick={() => remove(attr)}
                      className="cursor-pointer rounded p-0.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {!full && (
                  <span className="inline-flex items-center overflow-hidden rounded border border-dashed border-gray-300">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          add(draft);
                          setDraft("");
                        }
                      }}
                      maxLength={MAX_ATTRIBUTE_LENGTH}
                      placeholder="Add detail…"
                      aria-label="Add detail"
                      className="h-7 w-28 rounded-none border-0 px-2 text-xs shadow-none focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        add(draft);
                        setDraft("");
                      }}
                      aria-label="Add attribute"
                      className="cursor-pointer px-1.5 text-gray-400 hover:text-brand-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              {full && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  That&apos;s the maximum of {MAX_ATTRIBUTES} details.
                </p>
              )}
            </>
          )}
        </div>

        {vision.status === "ready" && uncertain.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-700">
              Not sure about{" "}
              <span className="font-normal text-gray-400">
                (kept out of your posts unless you add it)
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uncertain
                .filter((u) => !data.attributes.includes(u))
                .map((u) => (
                  <button
                    key={u}
                    type="button"
                    disabled={full}
                    onClick={() => add(u)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {u}
                    <Plus className="h-3 w-3" />
                  </button>
                ))}
            </div>
          </div>
        )}

        {vision.status === "ready" && data.attributes.length === 0 && (
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
            Add at least one detail so captions have something true to say.
          </p>
        )}
      </div>
    </div>
  );
}
