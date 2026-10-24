import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FacebookFeed } from "@/components/social/facebook-feed";
import { InstagramFeed } from "@/components/social/instagram-feed";
import { TikTokFeed } from "@/components/social/tiktok-feed";

afterEach(() => vi.restoreAllMocks());

describe("InstagramFeed", () => {
  it("shows only posts returned by the API", async () => {
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
    expect(articles).toHaveLength(1);
  });

  it("shows an error and retry action when the backend is down", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("down")) as unknown as typeof fetch;
    render(<InstagramFeed />);
    await act(async () => {});
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load published posts");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });

  it("shows an empty state when the API has no posted posts", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    }) as unknown as typeof fetch;
    render(<InstagramFeed />);
    await act(async () => {});
    expect(screen.getByText("No posts have been published to this platform yet.")).toBeInTheDocument();
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });

  it.each([
    ["Facebook", FacebookFeed, "facebook"],
    ["TikTok", TikTokFeed, "tiktok"],
  ] as const)("shows only API posts in the %s feed", async (_name, Feed, platform) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 9,
            business_name: "KK Kopitiam",
            product_name: "Kek Lapis",
            platform,
            caption: "Published from eViral",
            hashtags: [],
            image_url: null,
            status: "posted",
            posted_at: new Date().toISOString(),
          },
        ]),
    }) as unknown as typeof fetch;

    render(<Feed />);
    await act(async () => {});

    expect(fetchMockUrl(global.fetch)).toBe(`/backend/posts?status=posted&platform=${platform}&limit=50`);
    expect(document.querySelectorAll("article")).toHaveLength(1);
    expect(document.querySelector("article")).toHaveTextContent("Published from eViral");
  });
});

function fetchMockUrl(fetcher: typeof fetch) {
  return vi.mocked(fetcher).mock.calls[0]?.[0];
}
