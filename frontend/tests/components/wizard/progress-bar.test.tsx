import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WizardProgress } from "@/components/wizard/progress-bar";

const STEPS = ["Tell us", "Confirm", "Schedule", "Build"];

describe("WizardProgress", () => {
  it("renders every step label", () => {
    render(<WizardProgress steps={STEPS} current={1} />);
    for (const label of STEPS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks completed steps with a check glyph", () => {
    const { container } = render(<WizardProgress steps={STEPS} current={2} />);
    // lucide renders each Check as an svg — one per completed step
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });

  it("highlights the current and done labels, mutes future ones", () => {
    render(<WizardProgress steps={STEPS} current={1} />);
    expect(screen.getByText("Tell us").className).toContain("font-medium");
    expect(screen.getByText("Confirm").className).toContain("font-medium");
    expect(screen.getByText("Build").className).toContain("text-gray-400");
  });
});
