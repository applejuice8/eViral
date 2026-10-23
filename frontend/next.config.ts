import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow overriding the build dir (used by the verify script when the
  // default .next cache contains stale entries that can't be cleaned).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The photo check (vision model) can take longer than the default 30s
    // proxy timeout, and uploads may be up to 10 MB plus form overhead.
    proxyTimeout: 120_000,
    proxyClientMaxBodySize: 12 * 1024 * 1024,
  },
  // Proxy API calls through Next so the browser has a single origin and
  // no CORS setup is needed. Point BACKEND_ORIGIN at the API container
  // (docker compose sets http://backend:8000); standalone dev uses :8000.
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.BACKEND_ORIGIN ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
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
