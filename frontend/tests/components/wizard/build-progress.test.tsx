import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BuildProgress, POLL_MS } from "@/components/wizard/build-progress";
import type { BuildStep, Campaign, StepProgress } from "@/lib/api";

const push = vi.fn();
const router = { push };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const T0 = Date.parse("2026-10-24T10:00:00Z");
const iso = (secs: number) => new Date(T0 + secs * 1000).toISOString();

function step(state: StepProgress["state"], start?: number, end?: number): StepProgress {
  return {
    state,
    started_at: start === undefined ? null : iso(start),
    finished_at: end === undefined ? null : iso(end),
    error: state === "failed" ? "provider down" : null,
  };
}

function campaign(
  status: Campaign["status"],
  progress: Record<BuildStep, StepProgress>,
  error: string | null = null
): Campaign {
  return { id: 9, status, progress, error } as unknown as Campaign;
}

function respond(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("BuildProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls the campaign and shows real step states with elapsed times", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        respond(
          campaign("building", {
            understand: step("done", 0, 3),
            images: step("running", 3),
            captions: step("pending"),
            checks: step("pending"),
          })
        )
      )
      .mockResolvedValueOnce(
        respond(
          campaign("building", {
            understand: step("done", 0, 3),
            images: step("done", 3, 10),
            captions: step("running", 10),
            checks: step("pending"),
          })
        )
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<BuildProgress campaignId={9} productName="Kek" onRetry={() => {}} />);
    await tick(0);

    expect(fetchMock).toHaveBeenCalledWith("/backend/campaigns/9", undefined);
    const understand = screen.getByText("Understanding your photo").closest("li")!;
    expect(understand).toHaveAttribute("data-state", "done");
    expect(understand).toHaveTextContent("3s");
    expect(screen.getByText("Improving images").closest("li")).toHaveAttribute(
      "data-state",
      "running"
    );

    await tick(POLL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Improving images").closest("li")).toHaveTextContent("7s");
    expect(screen.getByText("Writing captions").closest("li")).toHaveAttribute(
      "data-state",
      "running"
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("goes to the review screen once the campaign is scheduled", async () => {
    const done = step("done", 0, 1);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond(
          campaign("building", {
            understand: done,
            images: done,
            captions: step("running", 1),
            checks: step("pending"),
          })
        )
      )
      .mockResolvedValue(
        respond(
          campaign("scheduled", { understand: done, images: done, captions: done, checks: done })
        )
      ) as unknown as typeof fetch;

    render(<BuildProgress campaignId={9} productName="Kek" onRetry={() => {}} />);
    await tick(0);
    expect(push).not.toHaveBeenCalled();

    await tick(POLL_MS);
    expect(push).toHaveBeenCalledWith("/review/9");

    // Polling stops after the build is finished.
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await tick(POLL_MS * 3);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it("shows the error and lets the owner retry when the build fails", async () => {
    const done = step("done", 0, 1);
    global.fetch = vi.fn().mockResolvedValue(
      respond(
        campaign(
          "failed",
          { understand: done, images: done, captions: step("failed", 1, 5), checks: step("pending") },
          "Caption writing failed: provider down"
        )
      )
    ) as unknown as typeof fetch;
    const onRetry = vi.fn();

    render(<BuildProgress campaignId={9} productName="Kek" onRetry={onRetry} />);
    await tick(0);

    expect(screen.getByText(/didn't finish/i)).toBeInTheDocument();
    expect(screen.getByText("Caption writing failed: provider down")).toBeInTheDocument();
    expect(screen.getByText("Writing captions").closest("li")).toHaveAttribute(
      "data-state",
      "failed"
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
