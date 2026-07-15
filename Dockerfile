# Debian, not Alpine: better-sqlite3 publishes glibc prebuilds, so musl would
# force a from-source compile (python3/make/g++) on every build.
FROM node:26-bookworm-slim AS base
# Node 26 images no longer ship corepack; pin pnpm to match the lockfile.
RUN npm install -g pnpm@10.32.1
WORKDIR /app

# ---- deps -------------------------------------------------------------------
# Installed inside the image so better-sqlite3's native binding is compiled for
# the container's platform. Never copy host node_modules in.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder ----------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runner -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_PATH=/data/comp.db \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Read at boot by instrumentation.ts; not part of the traced bundle.
COPY --from=builder /app/drizzle ./drizzle

# This only covers the image's own /data — a bind mount shadows it entirely, so
# the *host* directory's ownership is what decides whether the app can write.
# The app runs as `node` (uid 1000), so ./data on the host must be owned by
# 1000; see "Deploying to the VPS" in the README.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]
