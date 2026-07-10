# Playwright and Server Tooling

This project has two separate execution surfaces:

1. The browser suite under `tests/`, run by Playwright against the MMDC
   website.
2. Server-side tooling and Node tests, which do not launch a browser.

## Layout

- `tests/` — browser specs. These are the only files run by `pnpm test` and
  `pnpm test:smoke`.
- `server/__tests__/unit/` — fast Node unit tests for server-side helpers and
  shared packages.
- `server/__tests__/integration/` — server/database integration tests when they are
  added.
- `server/` — Hono/Inngest consumer server, database helpers, and co-located
  runner implementation tests.
- `lib/` — browser-suite helpers (`results.ts`, `smoke.ts`).
- `reporters/` — custom browser-suite reporter that writes JSON results.
- `config/` — page and CTA configuration.

Server tests belong under `server/__tests__/unit` or
`server/__tests__/integration`; do not
put them under `tests/`, because that would make them part of the browser
suite and would incorrectly require Playwright.

## Commands

| Command | Description |
|---|---|
| `pnpm test` | Run the browser suite. |
| `pnpm test:smoke` | Run browser smoke tests against the live MMDC website. |
| `pnpm test:unit` | Run Node server unit tests; no browser is launched. |
| `pnpm typecheck` | TypeScript check for the whole Playwright project. |
| `pnpm serve` | Start the Hono/Inngest consumer server with file watch. |

For a direct test-file run, use:

```powershell
pnpm exec node --import tsx --test server/__tests__/unit/enrollmate-contract.test.ts
```

## Shared EnrollMate contract

The canonical definition lives in `packages/enrollmate-contract/`. Both
Next.js and server-side Playwright code import it by package name:

```ts
import {
  getEnrollmateFlowDefinition,
  getEnrollmateReusableOptionSets,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
```

Use `getEnrollmateReusableOptionSets()` for the complete dynamic option-set
record. Use `getEnrollmateFlowDefinition(flowType)` when rendering or testing
a field-specific flow; its choice fields already contain resolved options.
Do not copy or import the JSON definition directly from `playwright/`.

The package's `./server` export uses Node crypto for definition hashes and is
server-only. The package root is the shared browser-safe contract API.

## Consumer server

The Inngest consumer server listens for events and spawns browser test runs.
Start it in a separate terminal:

```bash
just serve-playwright   # from repo root
```

Or directly:

```bash
pnpm run serve
```

It runs on `http://localhost:3939` by default; configure `PORT` in
`playwright/.env` if needed.

## Environment variables

The server reads `playwright/.env` (loaded via `--env-file`). See
`.env.example` for defaults.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string via PgDog. |
| `INNGEST_BASE_URL` | Inngest server URL (`http://localhost:8288`). |
| `INNGEST_EVENT_KEY` | Event key for sending events to Inngest. |
| `INNGEST_SIGNING_KEY` | Signing key for Inngest webhook verification. |
| `INNGEST_DEV` | Set to `1` for local Inngest dev mode. |
| `PORT` | Consumer server port (`3939`). |

Browser test-run variables (`TEST_MODE`, `TRIGGERED_BY`, and `TEST_TARGET`)
are documented in `AGENTS.md`. They apply to browser reports, not server unit
tests.
