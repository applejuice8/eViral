"use client";

import {
  Home,
  Search,
  Compass,
  Clapperboard,
  Send,
  Heart,
  SquarePlus,
  MoreHorizontal,
  Bookmark,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CaptionText } from "@/components/review/caption-text";
import { mediaUrl, type FeedPost } from "@/lib/api";
import { handleOf, initials, timeAgo } from "@/lib/format";
import { usePostedPosts } from "@/lib/use-posted-posts";
import { PostedFeedState } from "@/components/social/posted-feed-state";

function IgIconRail() {
  return (
    <div className="sticky top-0 hidden h-[calc(100dvh-3.5rem)] w-[72px] shrink-0 flex-col items-center gap-1 border-r border-gray-200 py-4 lg:flex">
      <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-1.5 text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {[
        { icon: Home, active: true },
        { icon: Search, active: false },
        { icon: Compass, active: false },
        { icon: Clapperboard, active: false },
        { icon: Send, active: false },
        { icon: Heart, active: false },
        { icon: SquarePlus, active: false },
      ].map(({ icon: Icon, active }, i) => (
        <span
          key={i}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            active ? "text-gray-900" : "text-gray-500"
          )}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
        </span>
      ))}
    </div>
  );
}

// A real post from the mock publisher, drawn like the filler posts.
function RealIgPostCard({ post, now }: { post: FeedPost; now: number }) {
  const handle = handleOf(post.business_name);
  return (
    <article id={`post-${post.id}`} className="border-b border-gray-200 pb-4">
      <header className="flex items-center gap-3 py-3">
        <span className="rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar initials={initials(post.business_name)} size="md" />
          </span>
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-semibold text-gray-900">{handle}</p>
          <p className="text-[11px] text-gray-500">
            {post.posted_at ? timeAgo(post.posted_at, now) : ""}
          </p>
        </div>
        <MoreHorizontal className="ml-auto h-5 w-5 text-gray-700" />
      </header>

      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(post.image_url)!}
          alt={post.product_name}
          className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
        />
      )}

      <div className="flex items-center gap-4 pt-3">
        <Heart className="h-6 w-6 text-gray-900" />
        <MessageCircle className="h-6 w-6 -scale-x-100 text-gray-900" />
        <Send className="h-6 w-6 text-gray-900" />
        <Bookmark className="ml-auto h-6 w-6 text-gray-900" />
      </div>

      <p className="pt-2 text-[13px] font-semibold text-gray-900">Be the first to like this</p>
      <CaptionText
        author={handle}
        text={post.caption}
        hashtags={post.hashtags}
        className="pt-1 text-gray-900"
      />
    </article>
  );
}

export function InstagramFeed() {
  const { posts, now, status, error, retry } = usePostedPosts("instagram");
  return (
    <div className="ev-fade-up flex bg-white">
      <IgIconRail />

      {/* Feed column */}
      <div className="mx-auto w-full max-w-[470px] px-4 pt-4 md:px-6">
        <div>
          {posts.map((post) => (
            <RealIgPostCard key={post.id} post={post} now={now} />
          ))}
        </div>
        <PostedFeedState status={status} postCount={posts.length} error={error} onRetry={retry} />
      </div>
    </div>
  );
}
