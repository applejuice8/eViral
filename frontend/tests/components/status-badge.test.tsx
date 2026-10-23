import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlagsBadges, StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it("labels blocked drafts as Blocked", () => {
    render(<StatusBadge status="blocked" />);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("labels pending drafts as needing approval", () => {
    render(<StatusBadge status="pending_approval" />);
    expect(screen.getByText("Needs approval")).toBeInTheDocument();
  });

  it("labels published drafts as Published", () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("covers every draft status without throwing", () => {
    for (const status of [
      "building",
      "blocked",
      "pending_approval",
      "approved",
      "scheduled",
      "published",
      "failed",
      "rejected",
      "paused",
    ] as const) {
      expect(() => render(<StatusBadge status={status} />)).not.toThrow();
    }
  });
});

describe("FlagsBadges", () => {
  it("shows a pass badge when there are no flags", () => {
    render(<FlagsBadges flags={[]} />);
    expect(screen.getByText("✓ Facts check passed")).toBeInTheDocument();
  });

  it("renders warn flags as warnings", () => {
    render(
      <FlagsBadges
        flags={[
          { code: "UNCONFIRMED_ATTRIBUTE", severity: "warn", detail: "chips" },
        ]}
      />
    );
    expect(screen.getByText(/unconfirmed attribute/i)).toBeInTheDocument();
  });

  it("renders block flags with the stop marker", () => {
    render(
      <FlagsBadges
        flags={[{ code: "PRICE_MISMATCH", severity: "block", detail: "RM79" }]}
      />
    );
    expect(screen.getByText(/price mismatch/i)).toHaveTextContent("⛔");
  });
});
