# Database Schema — Brainstorm

## Context

Designing a database schema for the MMDC Testing Dashboard. The app was purely frontend-mock with hardcoded data in `lib/mock-testing-data.ts`. Drizzle ORM + PostgreSQL were already in `package.json` but not wired.

## Requirements

- Multiple monitored apps, each with a test suite
- Test suite runs with individual test-level results
- E2E testing with student profiles, preconfigured steps, and fine-grained assertions
- User accounts with audit trails
- better-auth integration (config only, no frontend/backend yet)

## Key Decisions

### Identity / Primary Keys

- **UUID PKs** for all generated rows (users, profiles, runs, results)
- **Separate `run_number` column** for display-friendly sequential numbering
  - `smoke_runs.run_number` is sequential **per app** — app `website` has runs 1,2,3; `enrollmate` has its own 1,2,3
  - Same pattern for `e2e_runs` — sequential **per profile**
  - Enforced via UNIQUE `(app_id, run_number)` and `(profile_id, run_number)` respectively
- Initially considered composite PK `(app_id, run_number)` but chose UUID PK + separate column for flexibility

### Naming

- `smoke_runs_test_results` instead of `test_results` — clearer scope
- Drizzle convention: snake_case table names, camelCase JS identifiers

### Status Values

- `smoke_runs.status`: `'success' | 'degraded' | 'failure'` — three-way to capture partial failure
- `smoke_runs_test_results.status`: `'success' | 'failure' | 'skipped'`
- `e2e_runs.status`: `'running' | 'completed' | 'aborted'`
- `e2e_run_steps.status`: `'queued' | 'running' | 'success' | 'failure'`
- `e2e_run_tests.status`: `'success' | 'failure' | 'skipped'`
- `profiles.status`: `'ready' | 'needs review'`

### Profiles

- Split into two 1:1 tables:
  - **`profiles`** — core identity (name, email, program, cohort, status) for listing/management
  - **`profile_enrollment_data`** — all ~48 wizard form fields from the Enrollmate Playwright test suite
- Rationale: keeps profile list queries lean; enrollment data only loaded when needed for E2E runs
- Fields extracted from `playwright-poc/tests/enrollmate/bachelors-apply.spec.ts`
  - Step 1: Student's Information (email, personal details, addresses, etc.)
  - Step 2: Parent/Guardian's Information (status, guardian details, etc.)

### E2E Hierarchy (3-level)

- **`e2e_runs`** → session, a profile gets tested
- **`e2e_run_steps`** → step-level results within a run (FK to preconfigured `e2e_steps` lookup)
- **`e2e_run_tests`** → fine-grained test assertions within a step
- `e2e_steps` is a lookup table — preconfigured, uniform across profiles, extensible later
- `scenarios` table explicitly removed — replaced by `e2e_steps` + `e2e_run_steps`

### Audit Trail

- `created_by` / `updated_by` FK → users.id on mutable tables (apps, profiles)
- `started_by` FK → users.id on run tables (nullable — scheduled runs have no user)
- `users` table ready for better-auth wiring

### better-auth

- Wire config now, leave frontend/backend untouched

## Rejected / Considered

- JSONB on profiles instead of separate table — rejected, proper columns preferred for type safety and queryability
- Composite PK `(app_id, run_number)` — rejected in favor of UUID PK + separate run_number
- Single profiles table with all 48+ columns — rejected in favor of 1:1 split
- Explicit `scenarios` table — replaced by `e2e_steps` lookup
- Global auto-increment run_number — rejected in favor of per-app/per-profile scoping

## Open / Future

- When `run_number` isn't available yet (new app, first run), next value is computed via `SELECT COALESCE(MAX(run_number), 0) + 1 FROM smoke_runs WHERE app_id = ?` in a transaction
- better-auth wiring: needs schema extension for session/account/verification tables
- Frontend migration: mock data → Drizzle queries, TanStack Query hooks, server actions
