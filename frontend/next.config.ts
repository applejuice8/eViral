import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow overriding the build dir (used by the verify script when the
  // default .next cache contains stale entries that can't be cleaned).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
