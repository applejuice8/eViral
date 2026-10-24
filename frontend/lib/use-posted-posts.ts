"use client";

import * as React from "react";
import { api, type FeedPost, type Platform } from "@/lib/api";
import { useScrollToHash } from "@/lib/use-scroll-to-hash";

// posted posts for this platform, newest first
export function usePostedPosts(platform: Platform) {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<{
    status: "loading" | "loaded" | "error";
    posts: FeedPost[];
    now: number;
    error: string | null;
  }>({ status: "loading", posts: [], now: 0, error: null });

  React.useEffect(() => {
    let cancelled = false;
    api
      .posts({ status: "posted", platform, limit: 50 })
      .then((posts) => {
        if (!cancelled) setState({ status: "loaded", posts, now: Date.now(), error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            posts: [],
            now: Date.now(),
            error: error instanceof Error ? error.message : "Unable to load posts.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [platform, attempt]);

  useScrollToHash(state.status !== "loading");
  return {
    ...state,
    retry: () => {
      setState({ status: "loading", posts: [], now: 0, error: null });
      setAttempt((value) => value + 1);
    },
  };
}
