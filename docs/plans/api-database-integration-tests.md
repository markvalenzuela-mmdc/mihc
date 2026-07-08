# API and Database Integration Test Plan

## Scope

ClickUp task `86d3k505r` covers integration tests for existing Next.js route handlers and Drizzle queries against a real PostgreSQL test database.

This slice uses the same local PostgreSQL container as the app, but a separate database named `mihc-test` through PgDog. The setup command is `pnpm db:test:setup` from `nextjs/`.

## Implemented Test Coverage

- `GET /api/smoke-runs/[runId]`
  - Returns seeded smoke run details.
  - Returns `404` for a missing run.
- `GET /api/e2e-profiles/[profileId]`
  - Returns seeded profile workspace data.
  - Returns `404` for a missing profile.
- `GET /api/e2e-profiles/[profileId]/runs`
  - Returns paginated seeded E2E run history.
- `GET /api/e2e-profiles/[profileId]/runs/[runId]`
  - Returns seeded selected run details.
  - Returns `404` for a missing run.
- Drizzle integration checks
  - Inserts and queries `smoke_runs` with `smoke_runs_test_results`.
  - Verifies unique smoke run numbers per app.
  - Inserts and queries `e2e_runs` with `e2e_run_steps`.
  - Verifies unique E2E run numbers per profile.
  - Verifies foreign key failures for missing parent rows.

## Future CRUD Shape

Profile management CRUD is intentionally out of scope for this ticket because the current app only exposes read routes for E2E profile data.

When profile management is added, use this API shape:

```text
POST   /api/e2e-profiles              create profile
GET    /api/e2e-profiles/[profileId]  read profile
PATCH  /api/e2e-profiles/[profileId]  update profile
DELETE /api/e2e-profiles/[profileId]  delete profile
```

Future CRUD tests should cover successful create/update/delete, validation failures, duplicate email or constraint failures, and `404` behavior for missing profile IDs.
