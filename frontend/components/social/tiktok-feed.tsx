"use client";

import {
  Home,
  Users,
  Compass,
  Radio,
  SquarePlus,
  CircleUser,
  Music2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CaptionText } from "@/components/review/caption-text";
import { mediaUrl, type FeedPost } from "@/lib/api";
import { handleOf, timeAgo } from "@/lib/format";
import { usePostedPosts } from "@/lib/use-posted-posts";
import { PostedFeedState } from "@/components/social/posted-feed-state";

const TT_RED = "#fe2c55";

function TtNav() {
  const items = [
    { icon: Home, label: "For You", active: true },
    { icon: Users, label: "Following", active: false },
    { icon: Compass, label: "Explore", active: false },
    { icon: Radio, label: "LIVE", active: false },
    { icon: SquarePlus, label: "Upload", active: false },
    { icon: CircleUser, label: "Profile", active: false },
  ];
  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-gray-200 px-3 py-4 lg:flex lg:flex-col">
      <div className="flex items-center gap-1.5 px-2 pb-4">
        <Music2 className="h-6 w-6" style={{ color: TT_RED }} />
        <span className="text-[18px] font-bold tracking-tight text-gray-900">
          TikTok
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ icon: Icon, label, active }) => (
          <span
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold",
              active ? "bg-gray-100" : "text-gray-700"
            )}
            style={active ? { color: TT_RED } : undefined}
          >
            <Icon className="h-5 w-5" />
            {label}
          </span>
        ))}
      </nav>

    </aside>
  );
}

function RealTtPost({ post, now }: { post: FeedPost; now: number }) {
  const handle = handleOf(post.business_name);
  return (
    <article id={`post-${post.id}`} className="w-full max-w-[420px]">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
        <span>@{handle}</span>
        <span className="text-[12px] font-normal text-gray-500">
          {post.posted_at ? `· ${timeAgo(post.posted_at, now)}` : ""}
        </span>
      </div>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(post.image_url)!}
          alt={post.product_name}
          className="mt-3 aspect-[9/14] w-full rounded-xl bg-gray-100 object-cover"
        />
      )}
      <div>
        <CaptionText
          text={post.caption}
          hashtags={post.hashtags}
          className="text-[14px] text-gray-900"
        />
      </div>
    </article>
  );
}

export function TikTokFeed() {
  const { posts, now, status, error, retry } = usePostedPosts("tiktok");
  return (
    <div className="ev-fade-up flex min-h-full bg-white">
      <TtNav />

      {/* Video feed */}
      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-6 md:px-6">
        {posts.map((post) => (
          <RealTtPost key={post.id} post={post} now={now} />
        ))}
        <PostedFeedState status={status} postCount={posts.length} error={error} onRetry={retry} />
      </div>
    </div>
  );
}
