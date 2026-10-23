import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiError, mediaUrl } from "@/lib/api";

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api client", () => {
  it("uploads a product as multipart form data through the proxy", async () => {
    const fetchMock = respond({ id: 7, name: "Kek" }, 201);
    global.fetch = fetchMock as unknown as typeof fetch;
    const photo = new File(["x"], "cake.jpg", { type: "image/jpeg" });

    const product = await api.createProduct({
      name: " Kek Lapis ",
      price: "65",
      note: "",
      photo,
    });

    expect(product.id).toBe(7);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/backend/products");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form.get("name")).toBe("Kek Lapis");
    expect(form.get("price")).toBe("65");
    expect(form.get("note")).toBe("");
    expect((form.get("photo") as File).name).toBe("cake.jpg");
  });

  it("sends the wizard schedule as JSON when creating a campaign", async () => {
    const fetchMock = respond({ id: 3, status: "building" }, 202);
    global.fetch = fetchMock as unknown as typeof fetch;

    await api.createCampaign({
      product_id: 2,
      language: "mixed",
      platforms: ["facebook", "tiktok"],
      schedule: { mode: "launch_sequence", dates: ["2026-10-25"], time: "20:00", days: [] },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/backend/campaigns");
    expect(JSON.parse(init.body as string)).toEqual({
      product_id: 2,
      language: "mixed",
      platforms: ["facebook", "tiktok"],
      schedule: { mode: "launch_sequence", dates: ["2026-10-25"], time: "20:00", days: [] },
    });
  });

  it("builds query strings and skips empty params", async () => {
    const fetchMock = respond([]);
    global.fetch = fetchMock as unknown as typeof fetch;

    await api.posts({ status: "posted", platform: "instagram", limit: 50 });
    await api.activity({});
    await api.calendar("2026-10-01", "2026-10-31");
    await api.understandProduct(4, true);

    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toEqual([
      "/backend/posts?status=posted&platform=instagram&limit=50",
      "/backend/activity",
      "/backend/calendar?from=2026-10-01&to=2026-10-31",
      "/backend/products/4/understand?force=true",
    ]);
  });

  it("raises ApiError with the server's detail message", async () => {
    global.fetch = respond({ detail: "Post already posted" }, 409) as unknown as typeof fetch;
    await expect(api.publishNow(1)).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "Post already posted",
    });
  });

  it("joins validation errors from a 422", async () => {
    global.fetch = respond(
      { detail: [{ msg: "name is required" }, { msg: "bad photo" }] },
      422
    ) as unknown as typeof fetch;
    await expect(api.getProduct(1)).rejects.toThrow("name is required; bad photo");
  });

  it("explains when the server can't be reached", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    const err = await api.summary().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/can't reach/i);
  });
});

describe("mediaUrl", () => {
  it("prefixes media paths with the proxy", () => {
    expect(mediaUrl("/media/a.jpg")).toBe("/backend/media/a.jpg");
    expect(mediaUrl(null)).toBeNull();
  });
});
