import { describe, expect, it } from "vitest";

import { calendarExtras, demoCampaign, kpis } from "@/lib/data";

const VALID_DRAFT_STATUSES = new Set([
  "building",
  "blocked",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "failed",
  "rejected",
  "paused",
]);

const VALID_PLATFORMS = new Set(["facebook", "instagram", "tiktok"]);

function collectDrafts() {
  return [...demoCampaign.drafts, ...calendarExtras];
}

describe("demo data integrity", () => {
  it("has unique draft ids across campaigns", () => {
    const ids = collectDrafts().map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses known platforms and statuses", () => {
    for (const draft of collectDrafts()) {
      expect(VALID_PLATFORMS.has(draft.platform)).toBe(true);
      expect(VALID_DRAFT_STATUSES.has(draft.status)).toBe(true);
    }
  });

  it("has parseable schedule times", () => {
    for (const draft of collectDrafts()) {
      expect(Number.isNaN(Date.parse(draft.scheduledAt))).toBe(false);
    }
  });

  it("never mentions a price other than the product price in captions", () => {
    // Mirrors the backend validator: the only allowed RM amount is the
    // product's price (the blocked RM79 sample lives in flag details,
    // not in any caption).
    const price = demoCampaign.price;
    expect(price).not.toBeNull();
    for (const draft of demoCampaign.drafts) {
      const amounts = [...draft.caption.matchAll(/RM\s?(\d+(?:\.\d{1,2})?)/g)].map(
        (m) => Number(m[1])
      );
      for (const amount of amounts) {
        expect(amount).toBe(price);
      }
    }
  });

  it("tracks every KPI the dashboard renders", () => {
    for (const value of Object.values(kpis)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});
