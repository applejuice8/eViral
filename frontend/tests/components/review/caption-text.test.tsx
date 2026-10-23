import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CaptionText } from "@/components/review/caption-text";

describe("CaptionText", () => {
  it("styles every hashtag token as a highlighted span", () => {
    render(<CaptionText text="Pre-order now #KekLapis #FoodTokMY" />);
    const tag1 = screen.getByText("#KekLapis");
    const tag2 = screen.getByText("#FoodTokMY");
    expect(tag1.className).toContain("text-info-600");
    expect(tag2.className).toContain("text-info-600");
  });

  it("keeps plain text outside hashtags unstyled", () => {
    render(<CaptionText text="Batch terhad — sedia 1 Dec #PreOrderMY" />);
    const plain = screen.getByText(/Batch terhad/);
    expect(plain.tagName).toBe("P");
    // Exactly one styled span exists, and it is the hashtag — the plain
    // text segments stay as unstyled text nodes of the paragraph.
    const spans = plain.querySelectorAll("span");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveTextContent("#PreOrderMY");
  });

  it("handles captions without any hashtags", () => {
    render(<CaptionText text="No tags here, just words." />);
    expect(screen.getByText("No tags here, just words.")).toBeInTheDocument();
  });

  it("preserves multiple hashtags inside one caption", () => {
    render(
      <CaptionText text="It's here! #KekKakNora #KekLapis #SarawakFood #PreOrderMY" />
    );
    for (const tag of [
      "#KekKakNora",
      "#KekLapis",
      "#SarawakFood",
      "#PreOrderMY",
    ]) {
      expect(screen.getByText(tag).className).toContain("text-info-600");
    }
  });

  it("does not style a lone hash followed by a space", () => {
    // "# " is not a hashtag token and must stay plain text.
    render(<CaptionText text="Order via DM # or WhatsApp" />);
    const tags = document.querySelectorAll("span.text-info-600");
    expect(tags).toHaveLength(0);
    expect(screen.getByText("Order via DM # or WhatsApp")).toBeInTheDocument();
  });
});
