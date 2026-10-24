"use client";

import {
  Menu,
  Bell,
  Search,
  Home,
  Clapperboard,
  Store,
  Users,
  MessageCircle,
  ThumbsUp,
  Share2,
  Globe,
  MoreHorizontal,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CaptionText } from "@/components/review/caption-text";
import { mediaUrl, type FeedPost } from "@/lib/api";
import { initials, timeAgo } from "@/lib/format";
import { usePostedPosts } from "@/lib/use-posted-posts";
import { PostedFeedState } from "@/components/social/posted-feed-state";

const FB_BLUE = "#1877f2";

function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ backgroundColor: FB_BLUE }}
      >
        f
      </span>
      <span className="hidden items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-3 pr-16 text-[13px] text-gray-500 sm:flex">
        <Search className="h-4 w-4" />
        Search Facebook
      </span>

      {/* Center nav */}
      <nav className="mx-auto hidden items-center gap-2 md:flex">
        {[
          { icon: Home, active: true },
          { icon: Clapperboard, active: false },
          { icon: Store, active: false },
          { icon: Users, active: false },
        ].map(({ icon: Icon, active }, i) => (
          <span
            key={i}
            className={cn(
              "relative flex h-12 w-24 items-center justify-center",
              active ? "text-[#1877f2]" : "text-gray-500"
            )}
          >
            <Icon className="h-6 w-6" />
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-[#1877f2]" />
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        {[Menu, MessageCircle, Bell].map((Icon, i) => (
          <span
            key={i}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ))}
      </div>
    </header>
  );
}

function LeftMenu() {
  const items = [
    { icon: Users, label: "Friends" },
    { icon: Users, label: "Groups" },
    { icon: Store, label: "Marketplace" },
    { icon: Video, label: "Watch" },
    { icon: Globe, label: "Memories" },
  ];
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col gap-1 py-4 pl-4 lg:flex">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-200">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-gray-700">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <p className="text-[14px] font-medium text-gray-900">{label}</p>
        </div>
      ))}
    </aside>
  );
}

function RealFbPostCard({ post, now }: { post: FeedPost; now: number }) {
  return (
    <article id={`post-${post.id}`} className="rounded-xl bg-white shadow-xs">
      <header className="flex items-center gap-3 p-3 pb-2">
        <Avatar initials={initials(post.business_name)} size="md" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-gray-900">{post.business_name}</p>
          <p className="flex items-center gap-1 text-[12px] text-gray-500">
            {post.posted_at ? timeAgo(post.posted_at, now) : ""} · <Globe className="h-3 w-3" />
          </p>
        </div>
        <MoreHorizontal className="ml-auto h-5 w-5 text-gray-500" />
      </header>

      <CaptionText
        text={post.caption}
        hashtags={post.hashtags}
        className="px-3 pb-2 text-[14px] text-gray-900"
      />

      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(post.image_url)!}
          alt={post.product_name}
          className="max-h-[360px] w-full border-y border-gray-200 object-cover"
        />
      )}

      <div className="flex items-center justify-around border-t border-gray-200 px-3 py-1">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Share2, label: "Share" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-2 rounded-lg px-6 py-2 text-[13px] font-medium text-gray-600"
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

export function FacebookFeed() {
  const { posts, now, status, error, retry } = usePostedPosts("facebook");
  return (
    <div className="ev-fade-up min-h-full bg-[#f0f2f5]">
      <TopBar />
      <div className="flex justify-center gap-4 px-4">
        <LeftMenu />

        {/* Feed column */}
        <div className="flex w-full max-w-[560px] flex-col gap-4 py-4">
          {posts.map((post) => (
            <RealFbPostCard key={post.id} post={post} now={now} />
          ))}
          <PostedFeedState status={status} postCount={posts.length} error={error} onRetry={retry} />
        </div>

      </div>
    </div>
  );
}
