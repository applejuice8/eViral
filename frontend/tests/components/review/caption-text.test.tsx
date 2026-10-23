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

describe("CaptionText hashtags", () => {
  it("puts hashtags on their own line under the caption, styled blue", () => {
    render(
      <CaptionText
        text={"Something layered is coming...\n\nTunggu reveal-nya!"}
        hashtags={["#KekKakNora", "#KekLapis"]}
      />
    );
    const line = screen.getByTestId("hashtags");
    expect(line).toHaveTextContent("#KekKakNora #KekLapis");
    // The caption paragraph comes first, then the hashtag line.
    const caption = screen.getByText(/Something layered/);
    expect(caption.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(caption).not.toHaveTextContent("#KekKakNora");
    for (const tag of ["#KekKakNora", "#KekLapis"]) {
      expect(screen.getByText(tag).className).toContain("text-info-600");
    }
  });

  it("leaves out the hashtag line when there are none", () => {
    render(<CaptionText text="Just words" hashtags={[]} />);
    expect(screen.queryByTestId("hashtags")).toBeNull();
  });

  it("shows the author handle before the caption", () => {
    render(<CaptionText author="kekkaknora" text="Hello" />);
    expect(screen.getByText("kekkaknora").tagName).toBe("STRONG");
  });
});
