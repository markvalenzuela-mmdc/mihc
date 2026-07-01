# Agent Instructions — `playwright/`

The testing layer that replaces Ghost Inspector. Two targets:

- **MMDC website** → smoke tests (implemented).
- **EnrollMate** (enrollment platform) → e2e tests (future; not yet here).

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
- `results/` — generated per-run JSON (git-ignored).

## Running

```sh
pnpm install
npx playwright install chromium     # first time
pnpm test:smoke                     # chromium only
```

## Run mode (automated vs manual)

A single test reports how it was invoked, via env vars read by the reporter:

- **Automated** (CI/scheduled) — defaults: `mode=automated`, `triggeredBy=ci`.
- **Manual** (Next.js frontend) — spawn with:
  `TEST_MODE=manual TRIGGERED_BY=<user> npx playwright test <filter>`

`TEST_TARGET` overrides the target (default `mmdc-website`).

## Conventions

- A smoke test passes when: HTTP 200, key content visible, all declared CTAs
  present/visible/enabled with valid href, and the primary CTA click reaches its
  expected destination.
- Do NOT assert on console errors — the live site emits third-party noise.
- For e2e later: reuse `TestResult` and the reporter; set `type='e2e'` and
  `target='enrollmate'` (per-project `metadata` in `playwright.config.ts`).
