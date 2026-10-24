import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatDuration,
  formatPrice,
  formatTime,
  initials,
  mytDateKey,
  timeAgo,
} from "@/lib/format";

describe("Malaysia time formatting", () => {
  it("shows UTC times in Asia/Kuala_Lumpur", () => {
    expect(formatTime("2026-10-25T12:00:00Z")).toBe("8:00 PM");
    expect(formatDateTime("2026-10-25T12:00:00Z")).toBe("Sun 25 Oct, 8:00 PM");
  });

  it("puts late UTC evenings on the next Malaysian day", () => {
    expect(mytDateKey("2026-10-25T17:30:00Z")).toBe("2026-10-26");
    expect(mytDateKey("2026-10-25T15:59:00Z")).toBe("2026-10-25");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-25T12:00:00Z");
  it("uses short social-style units", () => {
    expect(timeAgo("2026-10-25T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-25T11:55:00Z", now)).toBe("5m");
    expect(timeAgo("2026-10-25T09:00:00Z", now)).toBe("3h");
    expect(timeAgo("2026-10-23T12:00:00Z", now)).toBe("2d");
  });
});

describe("small helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(8_400)).toBe("8s");
    expect(formatDuration(65_000)).toBe("1m 05s");
  });

  it("formats API prices", () => {
    expect(formatPrice("65.00")).toBe("RM65");
    expect(formatPrice("65.90")).toBe("RM65.90");
    expect(formatPrice(null)).toBeNull();
  });

  it("makes initials", () => {
    expect(initials("Aisha Rahman")).toBe("AR");
    expect(initials("KK Kopitiam")).toBe("KK");
  });
});
