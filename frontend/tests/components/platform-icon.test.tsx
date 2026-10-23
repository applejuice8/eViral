import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlatformIcon } from "@/components/platform-icon";

describe("PlatformIcon", () => {
  it("titles itself with the platform name", () => {
    const { container } = render(<PlatformIcon platform="facebook" />);
    expect(container.querySelector('[title="facebook"]')).not.toBeNull();
  });

  it("renders a glyph for each platform", () => {
    for (const platform of ["facebook", "instagram", "tiktok"] as const) {
      const { container } = render(<PlatformIcon platform={platform} />);
      expect(container.querySelector("svg")).not.toBeNull();
    }
  });

  it("uses the small size class when requested", () => {
    const { container } = render(<PlatformIcon platform="tiktok" size="sm" />);
    expect(container.firstElementChild?.className).toContain("h-4 w-4");
  });
});
