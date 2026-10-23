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
import {
  igUser,
  igStories,
  igPosts,
  igSuggestions,
  type IgPost,
} from "@/lib/social-mock";

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
      <span className="mt-1 rounded-full ring-2 ring-gray-900 ring-offset-2">
        <Avatar initials={igUser.initials} size="md" />
      </span>
    </div>
  );
}

function StoriesRow() {
  return (
    <div className="flex gap-4 overflow-x-auto border border-gray-200 bg-white px-4 py-4 md:rounded-xl">
      {igStories.map((story) => (
        <div key={story.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span
            className={cn(
              "rounded-full p-[2.5px]",
              story.viewed ? "bg-gray-300" : "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
            )}
          >
            <span className="block rounded-full bg-white p-[2px]">
              <Avatar initials={story.user.initials} size="lg" />
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px] text-gray-700">
            {story.user.handle}
          </span>
        </div>
      ))}
    </div>
  );
}

function IgPostCard({ post }: { post: IgPost }) {
  return (
    <article className="border-b border-gray-200 pb-4">
      <header className="flex items-center gap-3 py-3">
        <span className="rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar initials={post.user.initials} size="md" />
          </span>
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-semibold text-gray-900">
            {post.user.handle}
          </p>
          <p className="text-[11px] text-gray-500">{post.timeAgo}</p>
        </div>
        <MoreHorizontal className="ml-auto h-5 w-5 text-gray-700" />
      </header>

      <img
        src={post.image}
        alt={post.alt}
        className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
      />

      <div className="flex items-center gap-4 pt-3">
        <Heart
          className={cn("h-6 w-6", post.liked ? "fill-danger-600 text-danger-600" : "text-gray-900")}
        />
        <MessageCircle className="h-6 w-6 -scale-x-100 text-gray-900" />
        <Send className="h-6 w-6 text-gray-900" />
        <Bookmark className="ml-auto h-6 w-6 text-gray-900" />
      </div>

      <p className="pt-2 text-[13px] font-semibold text-gray-900">{post.likes} likes</p>
      <p className="pt-1 text-[13px] text-gray-900">
        <span className="font-semibold">{post.user.handle}</span> {post.caption}
      </p>
      <p className="pt-1 text-[13px] text-gray-400">
        View all {post.commentCount} comments
      </p>
    </article>
  );
}

export function InstagramFeed() {
  return (
    <div className="ev-fade-up flex bg-white">
      <IgIconRail />

      {/* Feed column */}
      <div className="mx-auto w-full max-w-[470px] px-4 pt-4 md:px-6">
        <StoriesRow />
        <div className="mt-2">
          {igPosts.map((post) => (
            <IgPostCard key={post.id} post={post} />
          ))}
        </div>
        <p className="py-8 text-center text-[13px] text-gray-400">
          You're all caught up
        </p>
      </div>

      {/* Suggestions rail */}
      <aside className="hidden w-[320px] shrink-0 border-l border-gray-200 px-6 py-6 xl:block">
        <div className="flex items-center gap-3">
          <Avatar initials={igUser.initials} size="lg" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-gray-900">{igUser.handle}</p>
            <p className="text-[13px] text-gray-500">{igUser.name}</p>
          </div>
          <span className="ml-auto text-[13px] font-semibold text-[#0095f6]">
            Switch
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-500">Suggested for you</p>
          <span className="text-[12px] font-semibold text-gray-900">See all</span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {igSuggestions.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <Avatar initials={s.user.initials} size="md" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-semibold text-gray-900">
                  {s.user.handle}
                </p>
                <p className="truncate text-[12px] text-gray-500">{s.reason}</p>
              </div>
              <span className="ml-auto text-[13px] font-semibold text-[#0095f6]">
                Follow
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-gray-400">
          Mock UI for demo purposes only · Kek Kak Nora · eViral
        </p>
      </aside>
    </div>
  );
}
