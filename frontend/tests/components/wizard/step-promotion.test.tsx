import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  EMPTY_PROMO,
  StepPromotion,
  percentFrom,
  promoError,
  promoPayload,
  promoPriceFrom,
  promoPreview,
  type PromoData,
} from "@/components/wizard/step-promotion";
import type { Product } from "@/lib/api";

// next/image needs real image loading; stub it as a plain <img>.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { unoptimized, fill, ...rest } = props;
    void unoptimized;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

const product: Product = {
  id: 1,
  name: "Nasi Lemak Ayam Goreng",
  price_myr: "15.00",
  note: null,
  photo_url: "/media/p.jpg",
  understood: null,
  confirmed_attributes: null,
  understood_confirmed: true,
  understood_model: null,
  created_at: "2026-10-24T00:00:00Z",
};

const noPriceProduct: Product = { ...product, id: 2, name: "Kuih", price_myr: null };

function setup(
  products: Product[] = [product],
  picked: Product | null = null,
  promo: PromoData = EMPTY_PROMO
) {
  const onPick = vi.fn();
  const onPromoChange = vi.fn();
  render(
    <StepPromotion
      products={products}
      loading={false}
      picked={picked}
      onPick={onPick}
      promo={promo}
      onPromoChange={onPromoChange}
    />
  );
  return { onPick, onPromoChange };
}

describe("StepPromotion", () => {
  it("lists products and picks one", () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByTestId("pick-1"));
    expect(onPick).toHaveBeenCalledWith(product);
  });

  it("filters products by name", () => {
    setup([product, noPriceProduct]);
    fireEvent.change(screen.getByLabelText(/which product/i), {
      target: { value: "lemak" },
    });
    expect(screen.getByTestId("pick-1")).toBeVisible();
    expect(screen.queryByTestId("pick-2")).not.toBeInTheDocument();
  });

  it("shows an empty message when there are no products", () => {
    setup([]);
    expect(screen.getByText(/no products yet/i)).toBeVisible();
  });

  it("hides the discount panel for promote-only campaigns", () => {
    setup([product], product);
    expect(screen.queryByTestId("promo-input")).not.toBeInTheDocument();
  });

  it("shows the discount panel when discount is chosen", () => {
    const promo = { ...EMPTY_PROMO, kind: "discount" as const };
    setup([product], product, promo);
    expect(screen.getByTestId("promo-input")).toBeVisible();
  });

  it("computes the promo price from a percent", () => {
    const promo = { ...EMPTY_PROMO, kind: "discount" as const, mode: "percent" as const, value: "20" };
    setup([product], product, promo);
    expect(screen.getByTestId("counterpart")).toHaveTextContent("= RM12");
    expect(screen.getByTestId("promo-preview")).toHaveTextContent(
      "Nasi Lemak Ayam Goreng — RM15 → RM12 (20% off)"
    );
  });

  it("computes the percent from a promo price", () => {
    const promo = {
      ...EMPTY_PROMO,
      kind: "discount" as const,
      mode: "price" as const,
      value: "12",
    };
    setup([product], product, promo);
    expect(screen.getByTestId("counterpart")).toHaveTextContent("= 20% off");
  });

  it("rejects a discount on a product without a price", () => {
    const promo = { ...EMPTY_PROMO, kind: "discount" as const, value: "20" };
    setup([noPriceProduct], noPriceProduct, promo);
    expect(screen.getByRole("alert")).toHaveTextContent(/no price/i);
  });

  it("rejects a promo price at or above the original", () => {
    const promo = {
      ...EMPTY_PROMO,
      kind: "discount" as const,
      mode: "price" as const,
      value: "15",
    };
    setup([product], product, promo);
    expect(screen.getByRole("alert")).toHaveTextContent(/lower than RM15/i);
  });

  it("rejects percents outside 1-99", () => {
    const promo = { ...EMPTY_PROMO, kind: "discount" as const, value: "150" };
    setup([product], product, promo);
    expect(screen.getByRole("alert")).toHaveTextContent(/between 1 and 99/i);
  });
});

describe("promo helpers", () => {
  it("converts between percent and price", () => {
    expect(percentFrom(15, 12)).toBe(20);
    expect(promoPriceFrom(15, 20)).toBe(12);
    expect(percentFrom(65, 52)).toBe(20);
    expect(promoPriceFrom(65, 20)).toBe(52);
  });

  it("builds the payload from a percent", () => {
    const promo = { ...EMPTY_PROMO, kind: "discount" as const, value: "20", note: "Raya" };
    expect(promoPayload(promo, product)).toEqual({
      promo_kind: "discount",
      discount_percent: "20",
      promo_price_myr: "12.00",
      promo_note: "Raya",
    });
  });

  it("builds the payload from a price", () => {
    const promo = { ...EMPTY_PROMO, kind: "discount" as const, mode: "price" as const, value: "12" };
    expect(promoPayload(promo, product)).toEqual({
      promo_kind: "discount",
      discount_percent: "20",
      promo_price_myr: "12.00",
      promo_note: null,
    });
  });

  it("builds a promote payload without discount numbers", () => {
    expect(promoPayload(EMPTY_PROMO, product)).toEqual({
      promo_kind: "promote",
      discount_percent: null,
      promo_price_myr: null,
      promo_note: null,
    });
  });

  it("flags invalid discounts", () => {
    expect(promoError({ ...EMPTY_PROMO, kind: "discount", value: "" }, product)).toMatch(
      /Enter a discount/
    );
    expect(promoError({ ...EMPTY_PROMO, kind: "discount", value: "0.5" }, product)).toMatch(
      /between 1 and 99/
    );
    expect(
      promoError(
        { ...EMPTY_PROMO, kind: "discount", mode: "price", value: "20" },
        product
      )
    ).toMatch(/lower than/);
    expect(promoError(EMPTY_PROMO, product)).toBeNull();
    expect(promoError({ ...EMPTY_PROMO, kind: "discount", value: "20" }, product)).toBeNull();
  });

  it("gives no preview before the input is valid", () => {
    expect(promoPreview({ ...EMPTY_PROMO, kind: "discount", value: "" }, product)).toBeNull();
    expect(
      promoPreview({ ...EMPTY_PROMO, kind: "discount", value: "150" }, product)
    ).toBeNull();
    expect(promoPreview(EMPTY_PROMO, product)).toBeNull();
  });
});
