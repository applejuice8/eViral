import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it.each([
    ["draft", "Draft", "bg-gray-100"],
    ["scheduled", "Scheduled", "bg-info-50"],
    ["posted", "Posted", "bg-success-50"],
    ["failed", "Failed", "bg-danger-50"],
  ] as const)("shows %s posts as %s", (status, label, colour) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label).className).toContain(colour);
  });
});
