FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder

ARG DATABASE_URL="postgresql://mihc:change-me@app-pgdog:6432/mihc?sslmode=disable"
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG BETTER_AUTH_SECRET="change-me"
ARG BETTER_AUTH_URL="http://localhost:3000"
ARG INNGEST_EVENT_KEY="local-event-key"
ARG INNGEST_BASE_URL="http://inngest:8288"

ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV INNGEST_EVENT_KEY=$INNGEST_EVENT_KEY
ENV INNGEST_BASE_URL=$INNGEST_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
