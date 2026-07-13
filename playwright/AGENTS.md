# Agent Instructions — `playwright/`

The `playwright/` project contains two deliberately separate test targets:

- **Browser suite:** Playwright specs for the MMDC website under `tests/`.
- **Server tests:** Node-only unit/integration tests under `server/__tests__/`; these
  must not be run through the Playwright browser runner.

The EnrollMate browser target is future work. The shared
`@mihc/enrollmate-contract` package is already consumed by server-side tests
and can also be consumed by the Next.js application.

## Layout

- `config/pages.config.ts` — canonical catalog of MMDC pages + their CTAs.
  Enumeration of individual cert/program pages is **hardcoded** (slug arrays),
  not scraped. Update the slug arrays when the live catalog changes.
- `lib/checks.ts` — shared check/annotation primitives (`initSmoke`,
  `assertCheck`) used by both the smoke and e2e targets. Each records a named
  pass/fail into test annotations AND drives test status via `expect.soft`, so
  every check runs and the test still fails if any check failed.
- `lib/smoke.ts` — smoke-specific page/CTA check helpers built on `checks.ts`.
- `tests/*.spec.ts` — 4 single-page specs + 2 looped detail specs (college
  programs, certifications).
- `server/__tests__/unit/` — server-only Node unit tests, including shared
  EnrollMate contract checks.
- `server/__tests__/integration/` — reserved for server/database integration tests;
  do not place browser specs here.
- `server/` — Hono/Inngest consumer server and co-located runner helpers.
  Results are persisted to the database: `server/runner/run-smoke.ts` spawns the
  suite with `--reporter=json`, `server/runner/map-results.ts` maps that report,
  and `server/db/persist-run.ts` writes the run + per-test rows.

## Running

```sh
pnpm install
npx playwright install chromium     # first time
pnpm test:smoke                     # chromium only
pnpm test:unit                      # Node server unit tests, no browser
```

## Run mode (automated vs manual)

Run context is carried on the Inngest event (`trigger`, `requestedBy`) and
threaded as function arguments through `smoke-consumer.ts` → `persistRun`, which
records it on the `smoke_runs` row (`trigger`, `started_by`). It is NOT derived
from env vars inside the suite. The child suite receives only
`PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_JSON_OUTPUT_FILE` (see `run-smoke.ts`).

Server unit tests use Node's test runner and do not create smoke run records.

## Conventions

- A smoke test passes when: HTTP 200, key content visible, all declared CTAs
  present/visible/enabled with valid href, and the primary CTA click reaches its
  expected destination.
- Do NOT assert on console errors — the live site emits third-party noise.
- Browser E2E lives under `tests/e2e/` with its own project (`type='e2e'`,
  `target='enrollmate'`) set via per-project `metadata` in
  `playwright.config.ts`.

## Shared EnrollMate contract

Server-side Playwright code imports the shared package by name:

```ts
import { getEnrollmateReusableOptionSets } from "@mihc/enrollmate-contract";
```

Do not copy `enrollmate-form-fields.json` into this project or put contract
tests under `tests/`, because that would make them browser-suite tests.
