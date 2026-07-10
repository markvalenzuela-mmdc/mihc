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
- `lib/smoke.ts` — reusable check helpers. Each records a named pass/fail into
  test annotations AND drives test status via `expect.soft`, so every check runs
  and the test still fails if any check failed.
- `lib/results.ts` — the shared `TestResult` schema (serves smoke and future e2e)
  and env-based run context.
- `reporters/results-reporter.ts` — writes one timestamped JSON per test run to
  `results/`. Registered in `playwright.config.ts`.
- `tests/*.spec.ts` — 4 single-page specs + 2 looped detail specs (college
  programs, certifications).
- `server/__tests__/unit/` — server-only Node unit tests, including shared
  EnrollMate contract checks.
- `server/__tests__/integration/` — reserved for server/database integration tests;
  do not place browser specs here.
- `server/` — Hono/Inngest consumer server and co-located runner helpers.
- `results/` — generated per-run JSON (git-ignored).

## Running

```sh
pnpm install
npx playwright install chromium     # first time
pnpm test:smoke                     # chromium only
pnpm test:unit                      # Node server unit tests, no browser
```

## Run mode (automated vs manual)

A single test reports how it was invoked, via env vars read by the reporter:

- **Automated** (CI/scheduled) — defaults: `mode=automated`, `triggeredBy=ci`.
- **Manual** (Next.js frontend) — spawn with:
  `TEST_MODE=manual TRIGGERED_BY=<user> npx playwright test <filter>`

`TEST_TARGET` overrides the target (default `mmdc-website`).

These environment variables apply to browser-run test reports. Server unit
tests use Node's test runner and do not create Playwright browser result
records.

## Conventions

- A smoke test passes when: HTTP 200, key content visible, all declared CTAs
  present/visible/enabled with valid href, and the primary CTA click reaches its
  expected destination.
- Do NOT assert on console errors — the live site emits third-party noise.
- For future browser E2E: reuse `TestResult` and the reporter; set `type='e2e'`
  and `target='enrollmate'` (per-project `metadata` in
  `playwright.config.ts`).

## Shared EnrollMate contract

Server-side Playwright code imports the shared package by name:

```ts
import { getEnrollmateReusableOptionSets } from "@mihc/enrollmate-contract";
```

Do not copy `enrollmate-form-fields.json` into this project or put contract
tests under `tests/`, because that would make them browser-suite tests.
