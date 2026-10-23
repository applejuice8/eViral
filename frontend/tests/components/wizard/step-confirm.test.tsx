import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StepConfirm, type VisionState } from "@/components/wizard/step-confirm";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { unoptimized, fill, ...rest } = props;
    void unoptimized;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

function setup(vision: VisionState, attributes: string[] = []) {
  const onChange = vi.fn();
  const onRetry = vi.fn();
  render(
    <StepConfirm
      photoUrl="blob:photo"
      vision={vision}
      uncertain={["flavour", "size"]}
      data={{ attributes }}
      onChange={onChange}
      onRetry={onRetry}
    />
  );
  return { onChange, onRetry };
}

describe("StepConfirm", () => {
  it("shows a loading state while the photo is being read", () => {
    setup({ status: "loading" });
    expect(screen.getByText("Looking at your photo…")).toBeInTheDocument();
    expect(screen.queryByText("flavour")).toBeNull();
  });

  it("shows observed details as removable chips and uncertain ones as suggestions", () => {
    const { onChange } = setup({ status: "ready" }, ["layered cake", "white plate"]);
    expect(screen.getByText("layered cake")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove white plate" }));
    expect(onChange).toHaveBeenLastCalledWith({ attributes: ["layered cake"] });

    fireEvent.click(screen.getByRole("button", { name: /flavour/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      attributes: ["layered cake", "white plate", "flavour"],
    });
  });

  it("adds a typed detail on Enter", () => {
    const { onChange } = setup({ status: "ready" }, ["layered cake"]);
    const input = screen.getByLabelText("Add detail");
    fireEvent.change(input, { target: { value: "  pandan  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith({ attributes: ["layered cake", "pandan"] });
  });

  it("shows the error with a retry button", () => {
    const { onRetry } = setup({ status: "error", error: "Vision provider failed" });
    expect(screen.getByText(/Vision provider failed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
