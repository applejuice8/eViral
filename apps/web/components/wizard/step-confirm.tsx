"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ConfirmData {
  attributes: string[];
}

const AI_OBSERVED = ["Layered cake", "Round", "Brown & cream layers", "Sliced, on a plate"];
const UNCERTAIN = ["Flavour", "Ingredients", "Size"];

// Step 2 — "What we see": Asana-style inline-editable chips next to the
// uploaded photo. Owner confirms before any captions are written.
export function StepConfirm({
  data,
  onChange,
}: {
  data: ConfirmData;
  onChange: (patch: Partial<ConfirmData>) => void;
}) {
  const [draft, setDraft] = React.useState("");

  function remove(attr: string) {
    onChange({ attributes: data.attributes.filter((a) => a !== attr) });
  }
  function add() {
    const v = draft.trim();
    if (!v || data.attributes.includes(v)) return;
    onChange({ attributes: [...data.attributes, v] });
    setDraft("");
  }

  return (
    <div className="grid gap-6 sm:grid-cols-5">
      <div className="sm:col-span-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200">
          <Image
            src="/assets/kek-lapis-original.svg"
            alt="Your product photo"
            fill
            className="object-cover"
          />
          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            Your photo
          </span>
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
            <span className="inline-flex items-center overflow-hidden rounded border border-dashed border-gray-300">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
                placeholder="Add detail…"
                className="h-7 w-28 rounded-none border-0 px-2 text-xs shadow-none focus:outline-none"
              />
              <button
                type="button"
                onClick={add}
                aria-label="Add attribute"
                className="cursor-pointer px-1.5 text-gray-400 hover:text-brand-600"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-700">
            Not sure about{" "}
            <span className="font-normal text-gray-400">
              (kept out of your posts unless you add it)
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {UNCERTAIN.filter((u) => !data.attributes.includes(u)).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onChange({ attributes: [...data.attributes, u] })}
                className="inline-flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-200"
              >
                {u}
                <Plus className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>

        {data.attributes.length === 0 && (
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
            Add at least one attribute so captions have something true to say.
          </p>
        )}
      </div>
    </div>
  );
}
