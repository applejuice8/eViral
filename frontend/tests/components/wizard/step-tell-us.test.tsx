import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_PRODUCT, StepTellUs, type TellUsData } from "@/components/wizard/step-tell-us";

// next/image needs real image loading; stub it as a plain <img>.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { unoptimized, fill, ...rest } = props;
    void unoptimized;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

const emptyData: TellUsData = {
  name: "",
  price: "",
  note: "",
  photo: null,
  photoUrl: null,
};

function setup(data: TellUsData = emptyData) {
  const onChange = vi.fn();
  render(<StepTellUs data={data} onChange={onChange} />);
  return { onChange };
}

describe("StepTellUs", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the upload prompt before a photo is chosen", () => {
    setup();
    expect(screen.getByText(/Click to upload or drag and drop/i)).toBeVisible();
  });

  it("accepts a picked JPG and gives back a preview URL", () => {
    const { onChange } = setup();
    const file = new File(["x"], "cake.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("photo-input"), { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith({ photo: file, photoUrl: "blob:preview" });
  });

  it("accepts a dropped PNG", () => {
    const { onChange } = setup();
    const file = new File(["x"], "cake.png", { type: "image/png" });
    fireEvent.drop(screen.getByRole("button", { name: /click to upload/i }), {
      dataTransfer: { files: [file] },
    });
    expect(onChange).toHaveBeenCalledWith({ photo: file, photoUrl: "blob:preview" });
  });

  it("rejects files that are not JPG or PNG", () => {
    const { onChange } = setup();
    const file = new File(["x"], "cake.gif", { type: "image/gif" });
    fireEvent.change(screen.getByTestId("photo-input"), { target: { files: [file] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/JPG or PNG/);
  });

  it("rejects photos over 10 MB", () => {
    const { onChange } = setup();
    const file = new File(["x"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });
    fireEvent.change(screen.getByTestId("photo-input"), { target: { files: [file] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/10 MB/);
  });

  it("fills in the sample product with Load mock data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["jpg"], { type: "image/jpeg" })),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { onChange } = setup();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load mock data/i }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/assets/kek-lapis-sample.jpg");
    const patch = onChange.mock.calls[0][0] as Partial<TellUsData>;
    expect(patch.name).toBe("Kek Lapis Sarawak Premium");
    expect(patch.price).toBe("65");
    expect(patch.note).toBe(MOCK_PRODUCT.note);
    expect(patch.photo).toBeInstanceOf(File);
    expect(patch.photo?.type).toBe("image/jpeg");
    expect(patch.photoUrl).toBe("blob:preview");
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
    expect(screen.getByText("3/80")).toBeInTheDocument();
    expect(screen.getByText("7/140")).toBeInTheDocument();
  });
});
