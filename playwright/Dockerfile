FROM mcr.microsoft.com/playwright:v1.61.1-noble AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS verified

COPY . .
# The Hono consumer runs TypeScript through tsx at runtime; this stage verifies
# the source before the production runner copies only runtime deps and app files.
RUN pnpm typecheck

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

FROM base AS runner

ENV NODE_ENV="production"
ENV PORT="3939"

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=verified /app/package.json ./package.json
COPY --from=verified /app/playwright.config.ts ./playwright.config.ts
COPY --from=verified /app/tsconfig.json ./tsconfig.json
COPY --from=verified /app/config ./config
COPY --from=verified /app/lib ./lib
COPY --from=verified /app/reporters ./reporters
COPY --from=verified /app/server ./server
COPY --from=verified /app/tests ./tests
RUN touch .env

EXPOSE 3939

CMD ["pnpm", "serve:start"]
