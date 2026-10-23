import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLastBuild,
  parsePriceInput,
  runCampaignBuild,
  saveLastBuild,
  type BuildFacts,
} from "@/lib/campaign-build";

const FACTS: BuildFacts = {
  productName: "Kek Lapis Sarawak Premium",
  price: "65",
  note: "Limited batch — ready 1 Dec",
  platforms: ["facebook", "instagram", "tiktok"],
  language: "mixed",
};

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("parsePriceInput", () => {
  it("parses whole and decimal prices", () => {
    expect(parsePriceInput("65")).toBe(65);
    expect(parsePriceInput("65.90")).toBe(65.9);
  });

  it("treats blank or invalid input as no price", () => {
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("  ")).toBeNull();
    expect(parsePriceInput("abc")).toBeNull();
  });
});

describe("runCampaignBuild", () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("sends exactly the owner-entered facts to the caption service", async () => {
    const fetchMock = mockFetchOnce({
      captions: [
        {
          platform: "facebook",
          caption: "Launch post",
          hashtags: ["#KekLapis"],
          video_idea: null,
        },
      ],
      model: "test-model",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await runCampaignBuild(FACTS);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/backend/captions/generate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      product_name: "Kek Lapis Sarawak Premium",
      price: 65,
      note: "Limited batch — ready 1 Dec",
      platforms: ["facebook", "instagram", "tiktok"],
      stage: "launch",
      language: "mixed",
      goal: null,
    });
  });

  it("omits the price and note when the owner left them blank", async () => {
    const fetchMock = mockFetchOnce({
      captions: [{ platform: "tiktok", caption: "Hi" }],
      model: "m",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await runCampaignBuild({ ...FACTS, price: "", note: "" });

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    );
    expect(body.price).toBeNull();
    expect(body.note).toBeNull();
  });

  it("inlines hashtags into the caption text and keeps wizard platform order", async () => {
    global.fetch = mockFetchOnce({
      captions: [
        { platform: "tiktok", caption: "Teaser", hashtags: ["#FoodTokMY", "#KekLapis"], video_idea: "Slow pan" },
        { platform: "facebook", caption: "Launch", hashtags: [] },
      ],
      model: "m",
    }) as unknown as typeof fetch;

    const entry = await runCampaignBuild(FACTS);

    expect(entry.captions.map((c) => c.platform)).toEqual([
      "facebook",
      "tiktok", // instagram missing from the response is tolerated
    ]);
    expect(entry.captions[0].caption).toBe("Launch");
    expect(entry.captions[1].caption).toBe("Teaser #FoodTokMY #KekLapis");
    expect(entry.captions[1].videoIdea).toBe("Slow pan");
    expect(entry.model).toBe("m");
  });

  it("throws with the service detail on HTTP errors", async () => {
    global.fetch = mockFetchOnce(
      { detail: "Caption generation failed: model error" },
      false,
      502
    ) as unknown as typeof fetch;

    await expect(runCampaignBuild(FACTS)).rejects.toThrow(
      "Caption generation failed: model error"
    );
  });

  it("throws when the service returns no usable captions", async () => {
    global.fetch = mockFetchOnce({ captions: [], model: "m" }) as unknown as typeof fetch;
    await expect(runCampaignBuild(FACTS)).rejects.toThrow(/no captions/i);

    global.fetch = mockFetchOnce({
      captions: [{ platform: "myspace", caption: "wrong platform" }],
      model: "m",
    }) as unknown as typeof fetch;
    await expect(runCampaignBuild(FACTS)).rejects.toThrow(/no captions/i);
  });
});

describe("sessionStorage build handoff", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("round-trips a successful build", () => {
    const entry = {
      facts: FACTS,
      captions: [
        { platform: "facebook" as const, caption: "Launch", videoIdea: null },
      ],
      model: "m",
      at: "2026-10-23T00:00:00.000Z",
    };
    saveLastBuild(entry);
    expect(getLastBuild()).toEqual(entry);
  });

  it("round-trips a failed build so the review screen can explain itself", () => {
    saveLastBuild({ failed: true, error: "boom", at: "2026-10-23T00:00:00.000Z" });
    const last = getLastBuild();
    expect(last && "failed" in last && last.failed).toBe(true);
  });

  it("returns null when nothing was stored or the payload is corrupt", () => {
    expect(getLastBuild()).toBeNull();
    sessionStorage.setItem("eviral:last-campaign-build", "{not json");
    expect(getLastBuild()).toBeNull();
    sessionStorage.setItem("eviral:last-campaign-build", "42");
    expect(getLastBuild()).toBeNull();
  });
});
