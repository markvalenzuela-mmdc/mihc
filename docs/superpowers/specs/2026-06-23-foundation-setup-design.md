# Foundation Setup Design -- IT Monitoring & E2E Platform

**Date:** 2026-06-23
**Status:** Approved

## Overview

Stand up the project skeleton and local dev environment, ending in one working vertical smoke slice that proves the pipeline. No product features. The smoke slice: a button in the web app enqueues a job; the runner picks it up, runs a hard-coded Playwright check against `https://example.com`, uploads a screenshot to MinIO, and writes a result; the web app shows the result transition `QUEUED -> RUNNING -> PASSED`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Package manager | pnpm (workspaces) |
| Web frontend | Vite + React + TypeScript |
| Web routing | TanStack Router (file-based) |
| Web API server | Hono (inside `apps/web`) |
| Styling | TailwindCSS v4 + shadcn/ui |
| Worker | Node + TypeScript |
| DB | Postgres 16 + Prisma |
| Queue | BullMQ + ioredis |
| Object storage | MinIO via `@aws-sdk/client-s3` |
| Browser automation | `playwright` (Chromium only) |
| Containers | Docker + Docker Compose |
| Quality | ESLint + Prettier + `tsc --noEmit` |

## Architecture

### Dev server topology

```
Browser :3000 -> Vite dev server (React HMR)
                   |-- /api/* proxy --> Hono :3001 (API routes)
                   |-- everything else --> React SPA

apps/runner (separate process) -> BullMQ -> Redis -> Playwright
```

Vite serves the React frontend on `:3000`. Hono runs on `:3001` handling API routes. Vite proxies `/api/*` to Hono in dev. In production, Hono serves the Vite-built static assets.

### Data flow (smoke slice)

```
Browser -> POST /api/smoke -> Hono -> create SmokeRun(QUEUED) -> enqueue SmokeJob -> return { runId }
                                                                    |
Worker polls BullMQ <----------------------------------------------/
  |-> set SmokeRun RUNNING
  |-> launch Chromium, open https://example.com
  |-> assert page title contains "Example"
  |-> capture screenshot
  |-> upload to MinIO, store artifactKey
  |-> set SmokeRun PASSED or FAILED (with error message)

Browser polls GET /api/smoke-runs every 2s -> shows status table
Browser clicks screenshot -> GET /api/artifacts/:key -> 302 redirect to signed MinIO URL
```

## Repository Structure

```
.
├── package.json                 # workspace root, scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
├── prisma/
│   └── schema.prisma
├── apps/
│   ├── web/                     # Vite + React + TanStack Router + Hono
│   └── runner/                  # BullMQ worker + Playwright
└── packages/
    └── shared/                  # env, prisma client, queue + s3 helpers, shared types
```

## Frontend Routes

| Route | Content |
|-------|---------|
| `/` | Home/Smoke page: "Run smoke check" button + live status table (polls every 2s) |
| `/inspector` | Placeholder: "Coming soon" |
| `/e2e` | Placeholder: "Coming soon" |
| `/configuration` | Placeholder: "Coming soon" |

TanStack Router provides file-based routing. A nav bar with four tabs switches between routes.

## Component Tree

```
App
├── Layout (nav bar with 4 tabs)
│   ├── HomePage (smoke button + runs table)
│   ├── InspectorPage (placeholder)
│   ├── E2EPage (placeholder)
│   └── ConfigurationPage (placeholder)
└── shadcn/ui: Button, Table, Badge (for status)
```

## API Routes (Hono)

| Method | Path | Behavior |
|--------|------|----------|
| POST | `/api/smoke` | Create `SmokeRun(QUEUED)`, enqueue `SmokeJob`, return `{ runId }` |
| GET | `/api/smoke-runs` | Latest 20 `SmokeRun` rows |
| GET | `/api/artifacts/:key` | Generate signed MinIO URL, 302 redirect |

## Database

Single model for the smoke slice only:

```prisma
model SmokeRun {
  id          String      @id @default(cuid())
  status      SmokeStatus @default(QUEUED)
  startedAt   DateTime?
  finishedAt  DateTime?
  durationMs  Int?
  result      String?      // "ok" or error message
  artifactKey String?      // MinIO key of the screenshot
  createdAt   DateTime     @default(now())
}

enum SmokeStatus { QUEUED RUNNING PASSED FAILED }
```

No feature data model (Systems, Scenarios, Runs, etc.) -- those arrive with feature epics.

## packages/shared

Exports:
- `env` -- zod-validated environment config
- `prisma` -- singleton `PrismaClient`
- `queue` -- BullMQ `Queue` factory + `SmokeJob` contract type
- `s3` -- `S3Client` configured for MinIO + `uploadArtifact(key, body)` and `getSignedArtifactUrl(key)` helpers
- `types` -- shared TypeScript types

## apps/runner

A BullMQ `Worker` on `SMOKE_QUEUE` that:
1. Sets `SmokeRun` to `RUNNING`, `startedAt = now()`
2. Launches Chromium via Playwright, opens `https://example.com`, asserts page title contains "Example"
3. Captures a screenshot, uploads to MinIO, stores `artifactKey`
4. Sets `PASSED` (or `FAILED` with error in `result`), `finishedAt`, `durationMs`

This hard-coded check is throwaway scaffolding, isolated in a single clearly-named file.

## Root Scripts

```
pnpm dev            # run web + runner concurrently
pnpm build          # build all packages
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit across workspace
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # prisma db seed (no-op)
pnpm db:studio      # prisma studio
```

## Environment Variables

```
DATABASE_URL=postgresql://app:app@localhost:5432/platform
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=artifacts
S3_FORCE_PATH_STYLE=true
WEB_PORT=3000
API_PORT=3001
```

## Out of Scope

- Systems / Inspector UI, scheduling, availability, HTTP checks
- Scenarios, environments config, E2E stage chain
- Salesforce / jsforce / markers / cleanup
- Webhooks, alerting, flap control
- Heartbeat / reaper / stalled-job handling
- Auth/roles
- AWS/Terraform/Fargate/Caddy
- Full feature data model

## Definition of Done

- [ ] `docker compose up -d` brings up postgres, redis, minio, creates `artifacts` bucket
- [ ] `pnpm install`, `pnpm db:migrate`, `pnpm dev` start web (:3000) and runner with no errors
- [ ] Visiting `:3000` shows four nav tabs + smoke page
- [ ] Clicking "Run smoke check" creates a run that goes `QUEUED -> RUNNING -> PASSED`, with working screenshot link
- [ ] Forced failure yields `FAILED` with error in `result`
- [ ] `pnpm lint` and `pnpm typecheck` pass clean
- [ ] `README.md` reproduces environment from zero
- [ ] No product-feature code exists