FROM mcr.microsoft.com/playwright:v1.61.1-noble AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

FROM base AS deps

COPY packages/enrollmate-contract ./packages/enrollmate-contract
COPY playwright/package.json playwright/pnpm-lock.yaml playwright/pnpm-workspace.yaml ./playwright/

WORKDIR /app/playwright
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS verified

WORKDIR /app

COPY packages/enrollmate-contract ./packages/enrollmate-contract
COPY playwright ./playwright

WORKDIR /app/playwright
RUN pnpm typecheck

FROM base AS prod-deps

COPY packages/enrollmate-contract ./packages/enrollmate-contract
COPY playwright/package.json playwright/pnpm-lock.yaml playwright/pnpm-workspace.yaml ./playwright/

WORKDIR /app/playwright
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

FROM base AS runner

ENV NODE_ENV="production"
ENV PORT="3939"

WORKDIR /app

COPY --from=prod-deps /app/packages ./packages
COPY --from=prod-deps /app/playwright/node_modules ./playwright/node_modules

COPY --from=verified /app/playwright/package.json ./playwright/package.json
COPY --from=verified /app/playwright/playwright.config.ts ./playwright/playwright.config.ts
COPY --from=verified /app/playwright/tsconfig.json ./playwright/tsconfig.json
COPY --from=verified /app/playwright/config ./playwright/config
COPY --from=verified /app/playwright/lib ./playwright/lib
COPY --from=verified /app/playwright/reporters ./playwright/reporters
COPY --from=verified /app/playwright/server ./playwright/server
COPY --from=verified /app/playwright/tests ./playwright/tests

WORKDIR /app/playwright

RUN touch .env

EXPOSE 3939

CMD ["pnpm", "serve:start"]