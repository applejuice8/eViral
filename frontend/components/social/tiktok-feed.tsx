import {
  Home,
  Users,
  Compass,
  Radio,
  SquarePlus,
  CircleUser,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ttVideos, type TtVideo } from "@/lib/social-mock";

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

      <div className="mt-6 rounded-xl border border-gray-200 p-4">
        <p className="text-[13px] leading-relaxed text-gray-600">
          Log in to follow creators, like videos and view comments.
        </p>
        <span
          className="mt-3 block rounded-lg py-2 text-center text-[14px] font-semibold text-white"
          style={{ backgroundColor: TT_RED }}
        >
          Log in
        </span>
      </div>

      <p className="mt-auto px-2 text-[11px] leading-relaxed text-gray-400">
        Mock UI for demo purposes only · eViral
      </p>
    </aside>
  );
}

function TtVideoCard({ video }: { video: TtVideo }) {
  return (
    <div className="flex gap-4">
      {/* Video */}
      <div className="relative w-full max-w-[300px] overflow-hidden rounded-xl bg-gray-100">
        <img
          src={video.image}
          alt={video.imageAlt}
          className="aspect-[9/14] w-full object-cover"
        />
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white">
          <Play className="h-7 w-7" fill="currentColor" />
        </span>
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
          <span className="h-[3px] flex-1 rounded bg-black/20">
            <span className="block h-[3px] w-2/5 rounded bg-white" />
          </span>
          <span className="text-[11px] font-medium text-white">0:12 / 0:30</span>
        </div>
      </div>

      {/* Action rail */}
      <div className="flex w-16 flex-col items-center gap-5 pt-6">
        <div className="relative">
          <Avatar initials={video.user.initials} size="lg" />
          <span
            className="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: TT_RED }}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M6 2v8M2 6h8" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <div className="mt-3 flex flex-col items-center gap-1">
          <Heart className={cn("h-8 w-8", video.liked ? "text-[#fe2c55]" : "text-gray-900")} fill={video.liked ? TT_RED : "none"} />
          <span className="text-[12px] font-semibold text-gray-900">{video.likes}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 -scale-x-100 text-gray-900" />
          <span className="text-[12px] font-semibold text-gray-900">{video.comments}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Bookmark className="h-8 w-8 text-gray-900" />
          <span className="text-[12px] font-semibold text-gray-900">{video.saves}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Share2 className="h-8 w-8 text-gray-900" />
          <span className="text-[12px] font-semibold text-gray-900">{video.shares}</span>
        </div>
      </div>
    </div>
  );
}

export function TikTokFeed() {
  return (
    <div className="ev-fade-up flex min-h-full bg-white">
      <TtNav />

      {/* Video feed */}
      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-6 md:px-6">
        {ttVideos.map((video) => (
          <div key={video.id} className="flex w-full max-w-[420px] flex-col gap-3">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <span>@{video.user.handle}</span>
              <span className="rounded-md border border-gray-300 px-2 py-0.5 text-[12px] font-medium text-gray-700">
                Follow
              </span>
            </div>
            <TtVideoCard video={video} />
            <div>
              <p className="text-[14px] text-gray-900">{video.caption}</p>
              <p className="pt-0.5 text-[14px] font-medium text-gray-600">
                {video.hashtags.join(" ")}
              </p>
              <p className="flex items-center gap-1.5 pt-1.5 text-[13px] text-gray-600">
                <Music2 className="h-4 w-4" />
                {video.sound}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
