# ── Étape 1 : build ───────────────────────────────────────────────
FROM node:22-slim AS builder
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @casbah/api...

COPY packages/shared/src ./packages/shared/src
COPY apps/api/src ./apps/api/src
RUN pnpm --filter @casbah/shared build && pnpm --filter @casbah/api build

# ── Étape 2 : dépendances de production ───────────────────────────
FROM node:22-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod --filter @casbah/api...

# ── Étape 3 : exécution ───────────────────────────────────────────
FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY pnpm-workspace.yaml package.json ./

USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/server.js"]
