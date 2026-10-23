import { describe, expect, it } from "vitest";

import { cn, formatRM } from "@/lib/utils";

describe("formatRM", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatRM(65)).toBe("RM65");
    expect(formatRM(0)).toBe("RM0");
  });

  it("formats fractional amounts with two decimals", () => {
    expect(formatRM(38.5)).toBe("RM38.50");
    expect(formatRM(12.345)).toBe("RM12.35");
  });

  it("renders a dash for missing prices", () => {
    expect(formatRM(null)).toBe("—");
    expect(formatRM(undefined)).toBe("—");
  });
});

describe("cn", () => {
  it("joins conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("lets later tailwind classes win conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
