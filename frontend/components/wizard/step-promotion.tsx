"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { mediaUrl, type Product, type PromoKind } from "@/lib/api";

// promotion flow: pick a product, optional discount

export type PromoMode = "percent" | "price";

export interface PromoData {
  kind: PromoKind;
  // "percent" or "price"
  mode: PromoMode;
  // raw input for the active mode
  value: string;
  // occasion for the captions
  note: string;
}

export const EMPTY_PROMO: PromoData = { kind: "promote", mode: "percent", value: "", note: "" };

export function percentFrom(price: number, promoPrice: number): number {
  // RM12 off RM15 -> 20
  return Math.round((1 - promoPrice / price) * 10000) / 100;
}

export function promoPriceFrom(price: number, percent: number): number {
  // RM15 at 20% off -> 12
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

// validation message, null when fine
export function promoError(promo: PromoData, product: Product | null): string | null {
  if (promo.kind !== "discount") return null;
  if (!product) return null;
  const original = product.price_myr == null ? null : Number(product.price_myr);
  if (original == null || !Number.isFinite(original)) {
    return `${product.name} has no price, so it can't be discounted. Add a price to the product first.`;
  }
  const value = Number(promo.value);
  if (promo.value.trim() === "" || !Number.isFinite(value)) {
    return "Enter a discount to continue.";
  }
  if (promo.mode === "percent") {
    if (value < 1 || value > 99) return "Percent off must be between 1 and 99.";
  } else if (value <= 0) {
    return "The promo price must be more than RM0.";
  } else if (value >= original) {
    return `The promo price must be lower than ${formatPrice(product.price_myr)}.`;
  }
  return null;
}

// typed value plus the derived one
export function promoPayload(
  promo: PromoData,
  product: Product
): Pick<
  import("@/lib/api").NewCampaign,
  "promo_kind" | "discount_percent" | "promo_price_myr" | "promo_note"
> {
  const original = Number(product.price_myr);
  let percent: string | null = null;
  let price: string | null = null;
  if (promo.kind === "discount" && Number.isFinite(original) && promo.value.trim() !== "") {
    const value = Number(promo.value);
    if (promo.mode === "percent") {
      percent = String(value);
      price = promoPriceFrom(original, value).toFixed(2);
    } else {
      price = value.toFixed(2);
      percent = String(percentFrom(original, value));
    }
  }
  return {
    promo_kind: promo.kind,
    discount_percent: percent,
    promo_price_myr: price,
    promo_note: promo.note.trim() || null,
  };
}

// preview line, or null
export function promoPreview(promo: PromoData, product: Product | null): string | null {
  if (promo.kind !== "discount" || !product?.price_myr) return null;
  const original = Number(product.price_myr);
  if (!Number.isFinite(original)) return null;
  const value = Number(promo.value);
  if (!Number.isFinite(value) || promo.value.trim() === "") return null;
  const percent =
    promo.mode === "percent" ? value : percentFrom(original, value);
  const price =
    promo.mode === "price" ? value : promoPriceFrom(original, value);
  if (promo.mode === "percent" && (percent < 1 || percent > 99)) return null;
  if (promo.mode === "price" && (price <= 0 || price >= original)) return null;
  return `${product.name} — ${formatPrice(product.price_myr)} → ${formatPrice(price.toFixed(2))} (${Number(percent.toFixed(2))}% off)`;
}

export function StepPromotion({
  products,
  loading,
  picked,
  onPick,
  promo,
  onPromoChange,
}: {
  products: Product[] | null;
  loading: boolean;
  picked: Product | null;
  onPick: (product: Product) => void;
  promo: PromoData;
  onPromoChange: (patch: Partial<PromoData>) => void;
}) {
  const [search, setSearch] = React.useState("");
  const error = promoError(promo, picked);

  const visible = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-5" data-testid="step-promotion">
      <div>
        <Label htmlFor="psearch" className="mb-1.5 block">
          Which product?
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="psearch"
            placeholder="Search your products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-[13px] text-gray-500">
          {products?.length
            ? "No products match that search."
            : "You have no products yet — add one with the new product flow first."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="product-grid">
          {visible.map((p) => {
            const selected = picked?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                data-testid={`pick-${p.id}`}
                onClick={() => onPick(p)}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 bg-white text-left transition-colors",
                  selected
                    ? "border-brand-500"
                    : "border-gray-200 hover:border-brand-300"
                )}
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  {p.photo_url && (
                    <Image
                      src={mediaUrl(p.photo_url) ?? ""}
                      alt={p.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[13px] font-medium text-gray-900">{p.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {formatPrice(p.price_myr) ?? "No price"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {picked && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex gap-1.5" role="tablist" aria-label="Promotion type">
            {(
              [
                { key: "promote", label: "Just promote" },
                { key: "discount", label: "Price discount" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={promo.kind === key}
                data-testid={`promo-${key}`}
                onClick={() => onPromoChange({ kind: key })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  promo.kind === key
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {promo.kind === "discount" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 p-0.5" role="tablist" aria-label="Discount input mode">
                  {(
                    [
                      { key: "percent", label: "%" },
                      { key: "price", label: "RM" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={promo.mode === key}
                      data-testid={`mode-${key}`}
                      onClick={() =>
                        onPromoChange({ mode: key })
                      }
                      className={cn(
                        "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
                        promo.mode === key
                          ? "bg-brand-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Input
                  data-testid="promo-input"
                  inputMode="decimal"
                  placeholder={promo.mode === "percent" ? "20" : "12.00"}
                  value={promo.value}
                  onChange={(e) =>
                    onPromoChange({ value: e.target.value.replace(/[^0-9.]/g, "") })
                  }
                  className="w-32"
                />
                <PromoCounterpart promo={promo} product={picked} />
              </div>
              {error && (
                <p role="alert" className="text-xs text-danger-700">
                  {error}
                </p>
              )}
              {promoPreview(promo, picked) && (
                <p data-testid="promo-preview" className="text-[13px] text-gray-600">
                  {promoPreview(promo, picked)}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="promonote" className="mb-1.5 block">
              Occasion <span className="font-normal text-gray-400">(Optional)</span>
            </Label>
            <Input
              id="promonote"
              placeholder="e.g. Raya sale, weekend only"
              value={promo.note}
              onChange={(e) => onPromoChange({ note: e.target.value })}
              maxLength={140}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Captions can mention what the promo is for.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// live-computed other side
function PromoCounterpart({ promo, product }: { promo: PromoData; product: Product }) {
  const original = product.price_myr == null ? null : Number(product.price_myr);
  const value = Number(promo.value);
  if (
    promo.kind !== "discount" ||
    original == null ||
    !Number.isFinite(original) ||
    promo.value.trim() === "" ||
    !Number.isFinite(value)
  ) {
    return null;
  }
  if (promo.mode === "percent") {
    if (value < 1 || value > 99) return null;
    return (
      <span data-testid="counterpart" className="text-[13px] text-gray-500">
        = {formatPrice(promoPriceFrom(original, value).toFixed(2))}
      </span>
    );
  }
  if (value <= 0 || value >= original) return null;
  const percent = Number(percentFrom(original, value).toFixed(2));
  return (
    <span data-testid="counterpart" className="text-[13px] text-gray-500">
      = {percent}% off
    </span>
  );
}
