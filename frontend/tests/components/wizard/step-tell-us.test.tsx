import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StepTellUs, type TellUsData } from "@/components/wizard/step-tell-us";

// next/image needs real image loading; stub it as a plain <img>.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

const emptyData: TellUsData = {
  name: "",
  price: "",
  note: "",
  photoChosen: false,
};

function setup(data: TellUsData = emptyData) {
  const onChange = vi.fn();
  render(<StepTellUs data={data} onChange={onChange} />);
  return { onChange };
}

describe("StepTellUs", () => {
  it("shows the upload prompt before a photo is chosen", () => {
    setup();
    expect(screen.getByText(/Click to upload or drag and drop/i)).toBeVisible();
  });

  it("marks the photo as chosen when the media panel is clicked", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /click to upload/i }));
    expect(onChange).toHaveBeenCalledWith({ photoChosen: true });
  });

  it("patches the product name on input", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: "Kek Lapis" },
    });
    expect(onChange).toHaveBeenCalledWith({ name: "Kek Lapis" });
  });

  it("strips non-numeric characters from the price field", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: "RM 6a5.9!" },
    });
    expect(onChange).toHaveBeenCalledWith({ price: "65.9" });
  });

  it("patches the note and shows character counters", () => {
    const { onChange } = setup({ ...emptyData, name: "Kek", note: "Limited" });
    fireEvent.change(screen.getByLabelText(/short note/i), {
      target: { value: "Limited batch" },
    });
    expect(onChange).toHaveBeenCalledWith({ note: "Limited batch" });
    expect(screen.getByText("3/80")).toBeInTheDocument(); // name counter
    expect(screen.getByText("7/140")).toBeInTheDocument(); // note counter
  });
});
