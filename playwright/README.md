# Playwright Test Suite

This directory contains Playwright tests and an Inngest consumer server.

## Layout

- `tests/smoke/` — Playwright smoke specs against the MMDC website
- `server/` — Hono/Inngest consumer server (handles test-run events)
- `lib/` — Shared helpers (`results.ts`, `smoke.ts`)
- `reporters/` — Custom Playwright reporter (writes JSON results)
- `config/` — Page and CTA configuration

See `AGENTS.md` for full layout and conventions.

## Consumer server

The Inngest consumer server listens for events and spawns test runs. Start it in a separate terminal:

```bash
just serve-playwright   # from repo root
```

Or directly:

```bash
cd playwright && pnpm run serve
```

Runs on `http://localhost:3939` by default (configurable via `PORT`).

## Environment Variables

The server reads from `playwright/.env` (loaded via `--env-file`). See `.env.example` for defaults.

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string via PgDog |
| `INNGEST_BASE_URL` | Inngest server URL (`http://localhost:8288`) |
| `INNGEST_EVENT_KEY` | Event key for sending events to Inngest |
| `INNGEST_SIGNING_KEY` | Signing key for Inngest webhook verification |
| `INNGEST_DEV` | Set to `1` for local Inngest dev mode |
| `PORT` | Consumer server port (`3939`) |

Test-run env vars (`TEST_MODE`, `TRIGGERED_BY`, `TEST_TARGET`) are documented in `AGENTS.md`.

## Commands

| Command | Description |
|---|---|
| `pnpm test:smoke` | Run smoke tests against live MMDC website (chromium) |
| `pnpm test:unit` | Run consumer unit tests |
| `pnpm serve` | Start consumer server with file watch |
| `pnpm typecheck` | TypeScript check |