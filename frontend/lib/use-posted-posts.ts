"use client";

import * as React from "react";
import { api, type FeedPost, type Platform } from "@/lib/api";
import { useScrollToHash } from "@/lib/use-scroll-to-hash";

/**
 * Real posts the mock publisher has posted to this platform, newest first.
 * Empty while loading or if the backend is down, so the fake feed still shows.
 */
export function usePostedPosts(platform: Platform) {
  const [data, setData] = React.useState<{ posts: FeedPost[]; now: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    api
      .posts({ status: "posted", platform, limit: 50 })
      .then((posts) => !cancelled && setData({ posts, now: Date.now() }))
      .catch(() => !cancelled && setData({ posts: [], now: Date.now() }));
    return () => {
      cancelled = true;
    };
  }, [platform]);

  useScrollToHash(data !== null);
  return data ?? { posts: [], now: 0 };
}
