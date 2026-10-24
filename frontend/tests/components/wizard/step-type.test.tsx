import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StepType } from "@/components/wizard/step-type";

describe("StepType", () => {
  it("shows both campaign type options", () => {
    render(<StepType value={null} onChange={vi.fn()} />);
    expect(screen.getByTestId("type-new_product")).toBeVisible();
    expect(screen.getByTestId("type-promotion")).toBeVisible();
  });

  it("reports the chosen type", () => {
    const onChange = vi.fn();
    render(<StepType value={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("type-promotion"));
    expect(onChange).toHaveBeenCalledWith("promotion");
  });

  it("marks the selected option as pressed", () => {
    render(<StepType value="new_product" onChange={vi.fn()} />);
    expect(screen.getByTestId("type-new_product")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("type-promotion")).toHaveAttribute("aria-pressed", "false");
  });
});
