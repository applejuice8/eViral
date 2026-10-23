// Mock data for the Socials pages (Instagram / Facebook / TikTok web mocks).
// All content is synthetic and reuses the demo brand (Kek Kak Nora / Kek Lapis).

export interface SocialUser {
  name: string;
  handle: string;
  initials: string;
}

export interface IgStory {
  id: string;
  user: SocialUser;
  viewed: boolean;
}

export interface IgPost {
  id: string;
  user: SocialUser;
  timeAgo: string;
  image: string;
  alt: string;
  likes: string;
  caption: string;
  commentCount: number;
  liked: boolean;
}

export interface IgSuggestion {
  id: string;
  user: SocialUser;
  reason: string;
}

export const igUser: SocialUser = {
  name: "Aisha Rahman",
  handle: "kekkaknora",
  initials: "AR",
};

export const igStories: IgStory[] = [
  { id: "s1", user: { name: "Your story", handle: "kekkaknora", initials: "AR" }, viewed: true },
  { id: "s2", user: { name: "nurul.bakes", handle: "nurul.bakes", initials: "NB" }, viewed: false },
  { id: "s3", user: { name: "sarawak.eats", handle: "sarawak.eats", initials: "SE" }, viewed: false },
  { id: "s4", user: { name: "kuchingfoodie", handle: "kuchingfoodie", initials: "KF" }, viewed: false },
  { id: "s5", user: { name: "teatime.my", handle: "teatime.my", initials: "TM" }, viewed: true },
];

export const igPosts: IgPost[] = [
  {
    id: "p1",
    user: { name: "Kek Kak Nora", handle: "kekkaknora", initials: "KN" },
    timeAgo: "2h",
    image: "/assets/kek-lapis-improved.svg",
    alt: "Kek Lapis Sarawak Premium — layered cake, AI-improved photo",
    likes: "1,284",
    caption: "Something layered is coming from our oven. Kek Lapis Sarawak Premium — pre-orders open Monday.",
    commentCount: 42,
    liked: true,
  },
  {
    id: "p2",
    user: { name: "nurul.bakes", handle: "nurul.bakes", initials: "NB" },
    timeAgo: "5h",
    image: "/assets/kek-lapis-original.svg",
    alt: "Original phone photo of a layered cake",
    likes: "873",
    caption: "Weekend bake list is open. Slots are limited this month.",
    commentCount: 17,
    liked: false,
  },
];

export const igSuggestions: IgSuggestion[] = [
  { id: "g1", user: { name: "sarawak.eats", handle: "sarawak.eats", initials: "SE" }, reason: "Followed by nurul.bakes" },
  { id: "g2", user: { name: "kuchingfoodie", handle: "kuchingfoodie", initials: "KF" }, reason: "New to Instagram" },
  { id: "g3", user: { name: "teatime.my", handle: "teatime.my", initials: "TM" }, reason: "Popular" },
  { id: "g4", user: { name: "homemade.my", handle: "homemade.my", initials: "HM" }, reason: "Followed by sarawak.eats" },
];

export interface FbStory {
  id: string;
  user: SocialUser;
}

export interface FbPost {
  id: string;
  user: SocialUser;
  timeAgo: string;
  text: string;
  image?: string;
  imageAlt?: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
}

export const fbUser: SocialUser = igUser;

export const fbStories: FbStory[] = [
  { id: "fbs1", user: { name: "nurul.bakes", handle: "nurul.bakes", initials: "NB" } },
  { id: "fbs2", user: { name: "sarawak.eats", handle: "sarawak.eats", initials: "SE" } },
  { id: "fbs3", user: { name: "kuchingfoodie", handle: "kuchingfoodie", initials: "KF" } },
];

export const fbPosts: FbPost[] = [
  {
    id: "fp1",
    user: { name: "Kek Kak Nora", handle: "kekkaknora", initials: "KN" },
    timeAgo: "2h",
    text: "Kek Lapis Sarawak Premium kini dibuka untuk tempahan! RM65 sebiji. Batch terhad — sedia 1 Dis. Tempah awal supaya tak kecewa.",
    image: "/assets/kek-lapis-improved.svg",
    imageAlt: "Kek Lapis Sarawak Premium — layered cake",
    likes: 248,
    comments: 36,
    shares: 12,
    liked: true,
  },
  {
    id: "fp2",
    user: { name: "sarawak.eats", handle: "sarawak.eats", initials: "SE" },
    timeAgo: "6h",
    text: "Kuih raya ni memang worth the wait. Siapa dah try kek lapis Kak Nora?",
    likes: 96,
    comments: 14,
    shares: 3,
    liked: false,
  },
];

export const fbContacts: SocialUser[] = [
  { name: "Nurul Aiman", handle: "nurul.bakes", initials: "NA" },
  { name: "Sarah Ting", handle: "sarawak.eats", initials: "ST" },
  { name: "Desmond Lu", handle: "kuchingfoodie", initials: "DL" },
  { name: "Mira Yusof", handle: "teatime.my", initials: "MY" },
  { name: "Hafiz Zain", handle: "homemade.my", initials: "HZ" },
  { name: "Lily Chai", handle: "lilychai", initials: "LC" },
];

export interface TtVideo {
  id: string;
  user: SocialUser;
  caption: string;
  hashtags: string[];
  sound: string;
  image: string;
  imageAlt: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  liked: boolean;
}

export const ttVideos: TtVideo[] = [
  {
    id: "tt1",
    user: { name: "Kek Kak Nora", handle: "kekkaknora", initials: "KN" },
    caption: "POV: the layered cake everyone asks about is almost here",
    hashtags: ["#KekLapis", "#HomeBakerMY", "#FoodTokMY"],
    sound: "original sound - Kek Kak Nora",
    image: "/assets/kek-lapis-improved.svg",
    imageAlt: "Kek Lapis Sarawak Premium — layered cake",
    likes: "12.4K",
    comments: "856",
    saves: "1.2K",
    shares: "340",
    liked: true,
  },
];
