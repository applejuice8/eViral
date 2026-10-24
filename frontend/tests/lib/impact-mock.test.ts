import { describe, expect, it } from "vitest";

import {
  MOCK_IMPACT,
  compactNumber,
  formatHours,
} from "@/lib/impact-mock";

describe("impact-mock helpers", () => {
  it("formats compact numbers", () => {
    expect(compactNumber(940)).toBe("940");
    expect(compactNumber(8940)).toBe("8.9k");
    expect(compactNumber(18540)).toBe("18.5k");
    expect(compactNumber(16500)).toBe("16.5k");
    expect(compactNumber(3_000_000)).toBe("3M");
  });

  it("formats hours as h/m", () => {
    expect(formatHours(34.5)).toBe("34h 30m");
    expect(formatHours(12)).toBe("12h");
    expect(formatHours(0.25)).toBe("15m");
  });
});

describe("MOCK_IMPACT invariants", () => {
  it("audience totals match the per-platform breakdown", () => {
    const sum = MOCK_IMPACT.audience.byPlatform.reduce((acc, p) => acc + p.reached, 0);
    expect(sum).toBe(MOCK_IMPACT.audience.total);
  });

  it("filled slots never exceed planned slots", () => {
    for (const week of MOCK_IMPACT.consistency) {
      expect(week.filled).toBeLessThanOrEqual(week.planned);
      expect(week.planned).toBeGreaterThan(0);
    }
  });

  it("on-time posts never exceed total posts", () => {
    expect(MOCK_IMPACT.postsOnTime).toBeLessThanOrEqual(MOCK_IMPACT.postsTotal);
    expect(MOCK_IMPACT.onTimeRatePct).toBe(
      Math.round((MOCK_IMPACT.postsOnTime / MOCK_IMPACT.postsTotal) * 100)
    );
  });

  it("cumulative savings only go up", () => {
    const saved = MOCK_IMPACT.cumulativeSavings.map((p) => p.savedMyr);
    for (let i = 1; i < saved.length; i++) {
      expect(saved[i]).toBeGreaterThan(saved[i - 1]);
    }
  });

  it("keeps the manual baseline honest vs eViral", () => {
    expect(MOCK_IMPACT.baselines.eviralMinutesPerCampaign).toBeLessThan(
      MOCK_IMPACT.baselines.manualHoursPerCampaign * 60
    );
  });
});
