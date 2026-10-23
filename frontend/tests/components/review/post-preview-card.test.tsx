import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseHashtags, PostPreviewCard } from "@/components/review/post-preview-card";
import type { Post } from "@/lib/api";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { unoptimized, fill, ...rest } = props;
    void unoptimized;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

const POST: Post = {
  id: 5,
  campaign_id: 1,
  product_id: 2,
  product_name: "Kek Lapis Sarawak Premium",
  platform: "instagram",
  stage: "launch",
  caption: "It's here! RM65 sebiji.",
  hashtags: ["#KekKakNora", "#KekLapis"],
  video_idea: null,
  image_url: "/media/stage_a.png",
  uses_original_image: false,
  scheduled_at: "2026-10-27T12:00:00Z",
  status: "scheduled",
  posted_at: null,
  published_url: null,
  why_this_time: "Evenings are when people scroll.",
};

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe("PostPreviewCard", () => {
  it("shows the real image, Malaysia time and hashtags on their own line", () => {
    render(<PostPreviewCard post={POST} businessName="Kek Kak Nora" onChange={() => {}} />);
    expect(screen.getByAltText("Post image")).toHaveAttribute("src", "/backend/media/stage_a.png");
    expect(screen.getByText("Tue 27 Oct, 8:00 PM")).toBeInTheDocument();
    expect(screen.getByTestId("hashtags")).toHaveTextContent("#KekKakNora #KekLapis");
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Instagram · Launch")).toBeInTheDocument();
  });

  it("saves an edited caption and hashtags with PATCH /posts/{id}", async () => {
    const updated = { ...POST, caption: "New caption", hashtags: ["#One", "#Two"] };
    const fetchMock = respond(updated);
    global.fetch = fetchMock as unknown as typeof fetch;
    const onChange = vi.fn();
    render(<PostPreviewCard post={POST} businessName="Kek Kak Nora" onChange={onChange} />);

    fireEvent.click(screen.getByTitle("Click to edit this caption"));
    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "New caption" } });
    fireEvent.change(screen.getByLabelText("Hashtags"), { target: { value: "#One Two" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/backend/posts/5");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      caption: "New caption",
      hashtags: ["#One", "#Two"],
    });
    expect(onChange).toHaveBeenCalledWith(updated);
  });

  it("publishes a scheduled post now", async () => {
    const posted = {
      ...POST,
      status: "posted",
      posted_at: "2026-10-24T02:00:00Z",
      published_url: "/instagram#post-5",
    };
    const fetchMock = respond(posted);
    global.fetch = fetchMock as unknown as typeof fetch;
    const onChange = vi.fn();
    render(<PostPreviewCard post={POST} businessName="Kek Kak Nora" onChange={onChange} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    });

    expect(fetchMock.mock.calls[0][0]).toBe("/backend/posts/5/publish-now");
    expect(onChange).toHaveBeenCalledWith(posted);
  });

  it("links to the demo social page once posted and can't be edited", () => {
    render(
      <PostPreviewCard
        post={{ ...POST, status: "posted", posted_at: "2026-10-24T02:00:00Z", published_url: "/instagram#post-5" }}
        businessName="Kek Kak Nora"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("link", { name: /view on instagram/i })).toHaveAttribute(
      "href",
      "/instagram#post-5"
    );
    expect(screen.queryByRole("button", { name: /publish now/i })).toBeNull();
    expect(screen.queryByTitle("Click to edit this caption")).toBeNull();
  });

  it("shows the server error when publishing fails", async () => {
    global.fetch = respond({ detail: "Only scheduled posts can be published" }, 409) as unknown as typeof fetch;
    render(<PostPreviewCard post={POST} businessName="Kek Kak Nora" onChange={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /publish now/i }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Only scheduled posts can be published");
  });
});

describe("parseHashtags", () => {
  it("normalises typed hashtags", () => {
    expect(parseHashtags("#a b, ##c  #a")).toEqual(["#a", "#b", "#c"]);
    expect(parseHashtags("   ")).toEqual([]);
  });
});
