import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BuildProgress } from "@/components/wizard/build-progress";
import type { BuildFacts } from "@/lib/campaign-build";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const FACTS: BuildFacts = {
  productName: "Kek Lapis Sarawak Premium",
  price: "65",
  note: "Limited batch",
  platforms: ["facebook", "tiktok"],
  language: "mixed",
};

const STAGE_MS = 1800;
const STAGES = 4;

/** Advance the build animation all the way to the done screen.
 *
 * Each stage timeout is scheduled from an effect that only flushes at an
 * act() boundary, so every 1800ms step needs its own act block.
 */
async function advanceOneStage() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(STAGE_MS);
  });
}

async function finishBuild() {
  for (let i = 0; i < STAGES + 1; i++) {
    await advanceOneStage();
  }
}

describe("BuildProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("generates captions from the entered facts and hands them to the review screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          captions: [
            { platform: "facebook", caption: "RM65 launch post #KekLapis", hashtags: [] },
            { platform: "tiktok", caption: "Teaser #FoodTokMY", hashtags: [], video_idea: "Slow pan" },
          ],
          model: "test-model",
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<BuildProgress facts={FACTS} />);

    await finishBuild();

    // The request used what the owner entered, not the demo product.
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/backend/captions/generate");
    expect(JSON.parse(init.body as string).product_name).toBe("Kek Lapis Sarawak Premium");
    expect(JSON.parse(init.body as string).price).toBe(65);

    // Done screen reflects the real post count.
    expect(screen.getByText(/We prepared 2 posts/i)).toBeInTheDocument();

    // The generated captions are persisted for the review page.
    const stored = sessionStorage.getItem("eviral:last-campaign-build");
    expect(stored).not.toBeNull();
    const entry = JSON.parse(stored as string);
    expect(entry.facts.productName).toBe("Kek Lapis Sarawak Premium");
    expect(entry.captions).toHaveLength(2);
    expect(entry.captions[0].caption).toBe("RM65 launch post #KekLapis");
  });

  it("finishes with a warning when the caption service is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<BuildProgress facts={FACTS} />);

    await finishBuild();

    expect(
      screen.getByText(/Caption service was unreachable/i)
    ).toBeInTheDocument();
    const stored = sessionStorage.getItem("eviral:last-campaign-build");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).failed).toBe(true);
  });

  it("waits for the caption call before showing the done screen", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    ) as unknown as typeof fetch;

    render(<BuildProgress facts={FACTS} />);

    // Animation has fully elapsed, but the fetch is still pending.
    for (let i = 0; i < STAGES + 1; i++) {
      await advanceOneStage();
    }
    expect(screen.queryByText(/ready to review/i)).toBeNull();

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            captions: [{ platform: "facebook", caption: "Hi" }],
            model: "m",
          }),
      });
    });
    await advanceOneStage();

    expect(screen.getByText(/ready to review/i)).toBeInTheDocument();
  });
});
