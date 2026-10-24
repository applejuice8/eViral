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
  ImagePlus,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { fbUser, fbStories, fbPosts, fbContacts, type FbPost } from "@/lib/social-mock";
import { CaptionText } from "@/components/review/caption-text";
import { mediaUrl, type FeedPost } from "@/lib/api";
import { initials, timeAgo } from "@/lib/format";
import { usePostedPosts } from "@/lib/use-posted-posts";

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
        <Avatar initials={fbUser.initials} size="md" />
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
      <div className="flex items-center gap-3 rounded-lg p-2">
        <Avatar initials={fbUser.initials} size="lg" />
        <p className="text-[14px] font-semibold text-gray-900">{fbUser.name}</p>
      </div>
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

function StoriesRow() {
  return (
    <div className="flex gap-2">
      {fbStories.map((story) => (
        <div
          key={story.id}
          className="relative h-44 w-28 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <img
            src="/assets/kek-lapis-original.svg"
            alt={`${story.user.name} story`}
            className="h-full w-full object-cover"
          />
          <span className="absolute left-2 top-2 rounded-full border-4 border-[#1877f2]">
            <Avatar initials={story.user.initials} size="sm" />
          </span>
          <p className="absolute inset-x-0 bottom-0 bg-white/90 px-2 py-1.5 text-[12px] font-medium text-gray-900">
            {story.user.name}
          </p>
        </div>
      ))}
    </div>
  );
}

function Composer() {
  return (
    <div className="rounded-xl bg-white p-3 shadow-xs">
      <div className="flex items-center gap-3">
        <Avatar initials={fbUser.initials} size="md" />
        <p className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-[14px] text-gray-500">
          What's on your mind, Aisha?
        </p>
      </div>
      <div className="mt-3 flex items-center justify-around border-t border-gray-200 pt-2">
        {[
          { icon: Video, label: "Live video", color: "text-danger-600" },
          { icon: ImagePlus, label: "Photo/video", color: "text-success-600" },
          { icon: Smile, label: "Feeling/activity", color: "text-warning-600" },
        ].map(({ icon: Icon, label, color }) => (
          <span key={label} className={cn("flex items-center gap-2 text-[13px] font-medium", color)}>
            <Icon className="h-5 w-5" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FbPostCard({ post }: { post: FbPost }) {
  return (
    <article className="rounded-xl bg-white shadow-xs">
      <header className="flex items-center gap-3 p-3 pb-2">
        <Avatar initials={post.user.initials} size="md" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-gray-900">{post.user.name}</p>
          <p className="flex items-center gap-1 text-[12px] text-gray-500">
            {post.timeAgo} · <Globe className="h-3 w-3" />
          </p>
        </div>
        <MoreHorizontal className="ml-auto h-5 w-5 text-gray-500" />
      </header>

      <p className="px-3 pb-2 text-[14px] leading-relaxed text-gray-900">{post.text}</p>

      {post.image && (
        <img
          src={post.image}
          alt={post.imageAlt ?? post.text}
          className="max-h-[360px] w-full border-y border-gray-200 object-cover"
        />
      )}

      <div className="flex items-center justify-between px-3 py-2 text-[13px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: FB_BLUE }}
          >
            <ThumbsUp className="h-3 w-3" fill="currentColor" />
          </span>
          {post.likes}
        </span>
        <span>
          {post.comments} comments · {post.shares} shares
        </span>
      </div>

      <div className="flex items-center justify-around border-t border-gray-200 px-3 py-1">
        {[
          { icon: ThumbsUp, label: "Like", active: post.liked },
          { icon: MessageCircle, label: "Comment", active: false },
          { icon: Share2, label: "Share", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <span
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-2 text-[13px] font-medium",
              active ? "text-[#1877f2]" : "text-gray-600"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

// A real post from the mock publisher, drawn like the filler posts.
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
  const { posts: realPosts, now } = usePostedPosts("facebook");
  return (
    <div className="ev-fade-up min-h-full bg-[#f0f2f5]">
      <TopBar />
      <div className="flex justify-center gap-4 px-4">
        <LeftMenu />

        {/* Feed column */}
        <div className="flex w-full max-w-[560px] flex-col gap-4 py-4">
          <StoriesRow />
          <Composer />
          {realPosts.map((post) => (
            <RealFbPostCard key={`real-${post.id}`} post={post} now={now} />
          ))}
          {fbPosts.map((post) => (
            <FbPostCard key={post.id} post={post} />
          ))}
          <p className="py-4 text-center text-[13px] text-gray-400">
            You're all caught up
          </p>
        </div>

        {/* Contacts rail */}
        <aside className="hidden w-[300px] shrink-0 py-4 pr-2 xl:block">
          <p className="px-2 text-[15px] font-semibold text-gray-500">Sponsored</p>
          <div className="mt-2 flex gap-3 rounded-xl bg-white p-3 shadow-xs">
            <img
              src="/assets/kek-lapis-improved.svg"
              alt="Sponsored: Kek Lapis Sarawak Premium"
              className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14px] font-semibold text-gray-900">
                Kek Lapis Sarawak Premium
              </p>
              <p className="text-[12px] text-gray-500">kkkopitiam.my</p>
            </div>
          </div>

          <p className="mt-6 px-2 text-[15px] font-semibold text-gray-500">Contacts</p>
          <div className="mt-1 flex flex-col gap-0.5">
            {fbContacts.map((c) => (
              <div key={c.handle} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-200">
                <span className="relative">
                  <Avatar initials={c.initials} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#f0f2f5] bg-success-600" />
                </span>
                <p className="text-[14px] font-medium text-gray-900">{c.name}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
