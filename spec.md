# Foundation Setup Spec — IT Monitoring & E2E Platform

**Audience:** Coding agent.
**Objective:** Stand up the project skeleton and local dev environment, ending in ONE working vertical slice that proves the pipeline. **Do not build any product features.**

---

## 0. Golden rule

Build the **skeleton + one smoke slice** only. If you find yourself implementing systems, scenarios, Salesforce, scheduling, availability, cleanup, or webhooks — **stop**. Those are later epics. See §9 (Out of scope) and §10 (Stop conditions).

The smoke slice: a button in the web app enqueues a job; the runner picks it up, runs a hard-coded Playwright check against `https://example.com`, uploads a screenshot to MinIO, and writes a result; the web app shows the result transition `QUEUED → RUNNING → PASSED`.

---

## 1. Tech stack (pin these)

- **Runtime:** Node.js 20 LTS. **Package manager:** pnpm (workspaces).
- **Web:** Next.js (App Router) + TypeScript.
- **Worker:** Node + TypeScript.
- **DB:** Postgres 16 + Prisma.
- **Queue:** BullMQ + ioredis.
- **Object storage:** MinIO locally via `@aws-sdk/client-s3` (S3-compatible).
- **Browser automation:** `playwright` (Chromium only for the smoke).
- **Containers:** Docker + Docker Compose.
- **Quality:** ESLint + Prettier + `tsc --noEmit` typecheck.

---

## 2. Repository structure

Create exactly this layout:

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
│   ├── web/                     # Next.js (App Router)
│   └── runner/                  # BullMQ worker + Playwright
└── packages/
    └── shared/                  # env, prisma client, queue + s3 helpers, shared types
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 3. Environment variables

`.env.example` (committed; real `.env` git-ignored):
```
# Postgres
DATABASE_URL=postgresql://app:app@localhost:5432/platform

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (S3-compatible)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=artifacts
S3_FORCE_PATH_STYLE=true

# Web
WEB_PORT=3000
```

`packages/shared` must export a typed, validated `env` object (use `zod` to parse `process.env`) so missing vars fail fast.

---

## 4. Docker Compose (infra services)

`docker-compose.yml` provides the **infra only**; web + runner run via pnpm in dev for hot reload (add them later under a compose profile if needed).

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: platform
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]

  createbucket:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      until (mc alias set local http://minio:9000 minioadmin minioadmin) do sleep 1; done;
      mc mb --ignore-existing local/artifacts;
      "

volumes:
  pgdata:
  miniodata:
```

---

## 5. `packages/shared` (the only shared code)

Implement and export:
- `env` — zod-validated environment config (§3).
- `prisma` — a singleton `PrismaClient`.
- `queue` — a BullMQ `Queue` factory + the **job contract type** below.
- `s3` — an `S3Client` configured for MinIO (`forcePathStyle: true`) plus `uploadArtifact(key, body)` and `getSignedArtifactUrl(key)` helpers.
- `types` — shared TypeScript types.

**Job contract (the only one for now):**
```ts
export type SmokeJob = { kind: "smoke"; runId: string };
export const SMOKE_QUEUE = "smoke";
```

---

## 6. Database (minimal — NOT the feature schema)

`prisma/schema.prisma` — one model just to prove the pipe. **Do not add System, Scenario, Run hierarchies, etc.** Those arrive with feature epics.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model SmokeRun {
  id          String     @id @default(cuid())
  status      SmokeStatus @default(QUEUED)
  startedAt   DateTime?
  finishedAt  DateTime?
  durationMs  Int?
  result      String?     // "ok" or error message
  artifactKey String?     // MinIO key of the screenshot
  createdAt   DateTime    @default(now())
}

enum SmokeStatus { QUEUED RUNNING PASSED FAILED }
```

Provide a first migration and a no-op seed script.

---

## 7. The vertical smoke slice (the deliverable)

### 7.1 Web — `apps/web`
- Next.js App Router with **three placeholder nav tabs**: `Inspector`, `E2E`, `Configuration`. Each is an empty page reading "Coming soon" — **no feature UI**.
- A **Home / Smoke** page that:
  - has a **"Run smoke check"** button → `POST /api/smoke`,
  - lists recent `SmokeRun` rows (poll every ~2s) showing status, duration, and a screenshot link when present.
- API routes:
  - `POST /api/smoke` → create `SmokeRun(QUEUED)`, enqueue `SmokeJob`, return `{ runId }`.
  - `GET /api/smoke-runs` → latest 20 `SmokeRun` rows.
  - `GET /api/artifacts/[key]` → signed MinIO URL redirect.

### 7.2 Runner — `apps/runner`
- A BullMQ `Worker` on `SMOKE_QUEUE` that, per job:
  1. set `SmokeRun` → `RUNNING`, `startedAt = now()`;
  2. launch Chromium (`playwright`), open `https://example.com`, assert the page title contains `"Example"`;
  3. capture a screenshot, `uploadArtifact()` to MinIO, store `artifactKey`;
  4. set `PASSED` (or `FAILED` with the error in `result`), `finishedAt`, `durationMs`.
- Browsers: document `pnpm exec playwright install --with-deps chromium` for local dev. The runner's Dockerfile (when added) must use `mcr.microsoft.com/playwright` as the base.

> This hard-coded check is throwaway scaffolding to prove the wiring — it is replaced by real check execution in the Inspector epic. Keep it isolated and obviously labeled as such.

---

## 8. Root scripts (`package.json`)

Provide working scripts:
```
pnpm dev            # run web + runner concurrently (e.g. via concurrently)
pnpm build          # build all packages
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit across the workspace
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # prisma db seed (no-op for now)
pnpm db:studio      # prisma studio
```

`README.md` must document the full from-zero run:
```
cp .env.example .env
docker compose up -d            # postgres, redis, minio, bucket
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm db:migrate
pnpm dev                        # web on :3000, runner consuming the queue
```

---

## 9. Out of scope (DO NOT build)

- ❌ Systems / Inspector UI, scheduling, availability, HTTP checks.
- ❌ Scenarios, environments config, E2E stage chain, manual/automated modes.
- ❌ Salesforce / jsforce / markers / cleanup.
- ❌ Webhooks, alerting, flap control.
- ❌ Heartbeat / reaper / stalled-job handling (liveness epic).
- ❌ Auth/roles beyond a trivial stub if needed for routes to render.
- ❌ AWS/Terraform/Fargate/Caddy — local dev only.
- ❌ The full feature data model from spec §9.

If any of these seem necessary to finish the smoke slice, they are not — leave a `// TODO (epic: …)` and move on.

---

## 10. Definition of Done

- [ ] `docker compose up -d` brings up postgres, redis, minio, and creates the `artifacts` bucket.
- [ ] `pnpm install`, `pnpm db:migrate`, `pnpm dev` start web (:3000) and runner with no errors.
- [ ] Visiting `:3000` shows the three placeholder tabs + the smoke page.
- [ ] Clicking **Run smoke check** creates a run that visibly goes `QUEUED → RUNNING → PASSED`, with a working screenshot link.
- [ ] A forced failure (e.g. point the check at a bad URL temporarily) yields `FAILED` with the error in `result` — then revert.
- [ ] `pnpm lint` and `pnpm typecheck` pass clean.
- [ ] `README.md` reproduces the environment from zero.
- [ ] **No product-feature code exists.** Only the smoke scaffolding and the shared infra wiring.

---

## 11. Notes for the agent

- Prefer the smallest correct implementation; this is a foundation, not a showcase.
- Keep `packages/shared` the single source of truth for env, db, queue, and s3 clients — apps import from it, they don't re-instantiate.
- Make the hard-coded smoke check easy to find and delete (single file, clearly named, e.g. `runner/src/checks/smoke.ts`).
- Commit `.env.example`, never `.env`.