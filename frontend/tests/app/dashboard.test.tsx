import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/page";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { unoptimized, fill, ...rest } = props;
    void unoptimized;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

const SUMMARY = {
  business_name: "Kek Kak Nora",
  owner_name: "Aisha Rahman",
  scheduled: 11,
  posted: 1,
  this_week: 3,
  campaigns: 1,
  active_campaigns: 1,
  products: 2,
  next_post: null,
  upcoming: [],
  latest_campaign: null,
};

function mockApi(summary: object, activity: object[] = []) {
  global.fetch = vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(url.startsWith("/backend/summary") ? summary : activity),
    })
  ) as unknown as typeof fetch;
}

afterEach(() => vi.restoreAllMocks());

describe("Dashboard", () => {
  it("shows real numbers from /summary and recent activity", async () => {
    mockApi(SUMMARY, [
      {
        id: 8,
        action: "posted",
        entity_type: "post",
        entity_id: 2,
        summary: "Posted to Instagram: Kek Lapis (teaser)",
        actor: "eViral AI",
        detail: null,
        created_at: "2026-10-23T17:48:07Z",
      },
    ]);
    render(<DashboardPage />);
    await act(async () => {});

    expect(screen.getByText("Welcome back, Aisha")).toBeInTheDocument();
    expect(screen.getByText("Scheduled posts").closest("div")?.parentElement).toHaveTextContent("11");
    expect(screen.getByText("Campaigns").closest("div")?.parentElement).toHaveTextContent("1 active · 2 products");
    expect(screen.getByText(/Posted to Instagram/)).toBeInTheDocument();
  });

  it("invites the owner to add a first product when there are no campaigns", async () => {
    mockApi({ ...SUMMARY, campaigns: 0, scheduled: 0, posted: 0, this_week: 0 });
    render(<DashboardPage />);
    await act(async () => {});
    expect(screen.getByRole("link", { name: /add your first product/i })).toHaveAttribute(
      "href",
      "/products/new"
    );
  });
});
