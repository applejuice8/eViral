"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCompare } from "@/components/review/image-compare";
import { PostPreviewCard } from "@/components/review/post-preview-card";
import { api, ApiError, mediaUrl, type Campaign, type Post } from "@/lib/api";
import { useScrollToHash } from "@/lib/use-scroll-to-hash";
import {
  formatDateTime,
  formatDay,
  formatPrice,
  languageLabel,
  mytDateKey,
  scheduleModeLabel,
  stageLabel,
} from "@/lib/format";

const PLATFORM_ORDER = ["facebook", "instagram", "tiktok"];
const BUILD_POLL_MS = 3000;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; campaign: Campaign };

interface PostGroup {
  key: string;
  title: string;
  when: string | null;
  posts: Post[];
}

// Launch posts are grouped by stage; weekly/custom posts by day.
function groupPosts(posts: Post[]): PostGroup[] {
  const sorted = [...posts].sort(
    (a, b) =>
      (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "") ||
      PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
  );
  const groups = new Map<string, PostGroup>();
  for (const post of sorted) {
    const key = post.stage ?? (post.scheduled_at ? mytDateKey(post.scheduled_at) : "unscheduled");
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        title: post.stage ? stageLabel[post.stage] : post.scheduled_at ? formatDay(post.scheduled_at) : "Not scheduled",
        when: post.scheduled_at ? formatDateTime(post.scheduled_at) : null,
        posts: [],
      };
      groups.set(key, group);
    }
    group.posts.push(post);
  }
  // Posts are in time order, so launch stages already come out in order.
  return [...groups.values()];
}

export function ReviewCampaign() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = Number(params.campaignId);
  const validId = Number.isInteger(campaignId) && campaignId > 0;
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [businessName, setBusinessName] = React.useState("Kek Kak Nora");
  useScrollToHash(state.status === "ready");

  React.useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const campaign = await api.getCampaign(campaignId);
        if (cancelled) return;
        setState({ status: "ready", campaign });
        // Opened while the build is still running: keep checking.
        if (campaign.status === "building") timer = setTimeout(load, BUILD_POLL_MS);
      } catch (err) {
        if (cancelled) return;
        const notFound = err instanceof ApiError && err.status === 404;
        setState({
          status: "error",
          notFound,
          message: err instanceof ApiError ? err.message : "Couldn't load this campaign.",
        });
      }
    }

    load();
    api
      .summary()
      .then((s) => !cancelled && setBusinessName(s.business_name))
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campaignId, validId]);

  function replacePost(updated: Post) {
    setState((s) =>
      s.status === "ready"
        ? {
            ...s,
            campaign: {
              ...s.campaign,
              posts: s.campaign.posts.map((p) => (p.id === updated.id ? updated : p)),
            },
          }
        : s
    );
  }

  if (!validId || (state.status === "error" && state.notFound)) {
    return (
      <Message title="Campaign not found" body="This campaign doesn't exist or was deleted." />
    );
  }
  if (state.status === "error") {
    return <Message title="Couldn't load the campaign" body={state.message} />;
  }
  if (state.status === "loading") return <ReviewSkeleton />;

  const { campaign } = state;
  const { product, posts } = campaign;
  const price = formatPrice(product.price_myr);
  const original = mediaUrl(product.photo_url) ?? "";
  const groups = groupPosts(posts);
  const aiPost = groups
    .flatMap((g) => g.posts)
    .find((p) => !p.uses_original_image && p.image_url);
  const improved = mediaUrl(aiPost?.image_url);
  const times = posts.map((p) => p.scheduled_at).filter((t): t is string => !!t).sort();
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
          <Badge variant="default">{scheduleModeLabel[campaign.schedule.mode]}</Badge>
          <Badge variant="muted">{languageLabel[campaign.language]}</Badge>
        </div>
        <p className="mt-1 text-[13px] text-gray-500">
          {posts.length} post{posts.length === 1 ? "" : "s"}
          {times.length > 0 &&
            ` · ${formatDay(times[0])} – ${formatDay(times[times.length - 1])}`}
          {price ? ` · ${price}` : " · No price"}
          {product.note ? ` · ${product.note}` : ""}
        </p>
      </div>

      {campaign.status === "building" && (
        <div className="flex items-center gap-2.5 rounded-lg border border-info-100 bg-info-50 px-4 py-3 text-[13px] text-info-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          This campaign is still being built. Posts will show up here when it&apos;s done.
        </div>
      )}
      {campaign.status === "failed" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-[13px] text-danger-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          The build failed: {campaign.error ?? "unknown error"}. Start a new product to try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{improved ? "Your photo and the AI version" : "Your photo"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageCompare original={original} improved={improved} productName={product.name} />
              {!improved && (
                <p className="text-[11px] text-gray-400">
                  Image editing was off for this campaign, so posts use your original photo.
                </p>
              )}
              {product.confirmed_attributes && product.confirmed_attributes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-gray-500">
                    Facts you confirmed
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.confirmed_attributes.map((a) => (
                      <span
                        key={a}
                        className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4 text-[13px] text-gray-600">
              <p>
                <span className="font-semibold text-gray-900">{scheduledCount}</span> scheduled ·{" "}
                <span className="font-semibold text-gray-900">{postedCount}</span> posted
              </p>
              <p className="text-[12px] leading-relaxed text-gray-400">
                Posts go out on their own at the times shown. Click a caption to edit it,
                or use Publish now to send a post straight away to the demo social pages.
              </p>
              <Link href="/calendar">
                <Button variant="outline" size="sm" className="mt-1 w-full">
                  Open calendar
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-gray-900">{group.title}</h2>
                {group.when && <p className="text-[12px] text-gray-500">{group.when}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.posts.map((post) => (
                  <PostPreviewCard
                    key={post.id}
                    post={post}
                    businessName={businessName}
                    onChange={replacePost}
                  />
                ))}
              </div>
            </section>
          ))}
          {posts.length === 0 && campaign.status !== "building" && (
            <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-[13px] text-gray-500">
              This campaign has no posts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="h-8 w-72 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100 lg:col-span-2" />
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <AlertTriangle className="h-6 w-6 text-gray-400" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-[13px] text-gray-500">{body}</p>
      </div>
      <Link href="/">
        <Button size="sm" variant="outline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
