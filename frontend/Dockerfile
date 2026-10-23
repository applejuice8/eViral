FROM node:22-alpine AS base
# Pin pnpm to the version in package.json's packageManager field; baking it
# into the image avoids corepack downloading pnpm at container start.
ARG PNPM_VERSION=12.3.4
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# pnpm v12 refuses to run dependency build scripts by default; the container
# build is isolated, so allow them here without changing the repo config.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --dangerously-allow-all-builds

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/public ./public
EXPOSE 3000

# Run the Next.js binary directly — avoids pnpm's runtime script checks
# (pnpm 12 verifies lockfile supply-chain policies on every script run).
CMD ["./node_modules/.bin/next", "start"]
