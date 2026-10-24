import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InstagramFeed } from "@/components/social/instagram-feed";

afterEach(() => vi.restoreAllMocks());

describe("InstagramFeed", () => {
  it("shows real posted posts first, then the filler posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 2,
            business_name: "KK Kopitiam",
            product_name: "Kek Lapis",
            platform: "instagram",
            caption: "Something lapis is coming...",
            hashtags: ["#KKKopitiam"],
            image_url: "/media/stage_x.png",
            status: "posted",
            posted_at: new Date().toISOString(),
          },
        ]),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<InstagramFeed />);
    await act(async () => {});

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/backend/posts?status=posted&platform=instagram&limit=50"
    );
    const articles = document.querySelectorAll("article");
    expect(articles[0]).toHaveAttribute("id", "post-2");
    expect(articles[0]).toHaveTextContent("Something lapis is coming...");
    expect(screen.getByAltText("Kek Lapis")).toHaveAttribute("src", "/backend/media/stage_x.png");
    expect(screen.getByText("#KKKopitiam").className).toContain("text-info-600");
    // Filler posts are still there after the real one.
    expect(articles.length).toBeGreaterThan(1);
  });

  it("still shows the filler feed when the backend is down", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("down")) as unknown as typeof fetch;
    render(<InstagramFeed />);
    await act(async () => {});
    expect(document.querySelectorAll("article").length).toBeGreaterThan(0);
  });
});
