FROM mcr.microsoft.com/playwright:v1.61.1-noble AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS runner

ENV NODE_ENV="production"
ENV PORT="3939"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3939

CMD ["pnpm", "exec", "tsx", "server/index.ts"]
