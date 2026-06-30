# Database Schema Plan

## Overview

Database schema for the MMDC Testing Dashboard. Uses Drizzle ORM with PostgreSQL.
Auth wired with better-auth (config only — frontend/backend untouched in this phase).

---

## Entity Relationship Summary

```
users ──┬── apps (created_by, updated_by)
         ├── smoke_runs (started_by)
         ├── profiles (created_by, updated_by)
         └── e2e_runs (started_by)

apps ──── smoke_runs ──── smoke_runs_test_results

profiles ──── profile_enrollment_data (1:1)

e2e_steps (lookup) ──── e2e_runs ──── e2e_run_steps ──── e2e_run_tests
```

---

## Tables

### `users`

Operator accounts. better-auth identity source.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| name | `text` | NOT NULL |
| email | `text` | NOT NULL, UNIQUE |
| created_at | `timestamptz` | default `now()` |
| updated_at | `timestamptz` | default `now()` |

### `apps`

Monitored applications. Each app has a test suite (defined externally in Playwright configs).

| Column | Type | Constraints |
|---|---|---|
| id | `text` | PK — stable key: `'website'`, `'enrollmate'`, `'enrollmate-clp'`, `'n8n'` |
| name | `text` | NOT NULL |
| description | `text` | nullable |
| created_by | `uuid` | FK → users.id, nullable |
| updated_by | `uuid` | FK → users.id, nullable |
| created_at | `timestamptz` | default `now()` |
| updated_at | `timestamptz` | default `now()` |

### `smoke_runs`

A single run of an app's test suite. Overall pass/fail/degraded status with aggregate counts.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| run_number | `integer` | NOT NULL — sequential **per app** |
| app_id | `text` | NOT NULL, FK → apps.id |
| status | `text` | NOT NULL — `'success' \| 'degraded' \| 'failure'` |
| trigger | `text` | NOT NULL — `'scheduled' \| 'manual'` |
| total | `integer` | NOT NULL, default 0 |
| passed | `integer` | NOT NULL, default 0 |
| failed | `integer` | NOT NULL, default 0 |
| duration_seconds | `integer` | nullable |
| started_by | `uuid` | FK → users.id, nullable (null = system/scheduled) |
| checked_at | `timestamptz` | NOT NULL |
| created_at | `timestamptz` | default `now()` |

**Constraints**: UNIQUE `(app_id, run_number)`
**Index**: `(app_id, run_number DESC)` — fast "recent runs for this app" query

### `smoke_runs_test_results`

Individual test-level results within a suite run.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| run_id | `uuid` | NOT NULL, FK → smoke_runs.id |
| test_name | `text` | NOT NULL — e.g. `"Homepage loads"` |
| test_file | `text` | nullable — Playwright spec file path |
| status | `text` | NOT NULL — `'success' \| 'failure' \| 'skipped'` |
| duration_ms | `integer` | nullable |
| error_message | `text` | nullable |
| error_stack | `text` | nullable |
| created_at | `timestamptz` | default `now()` |

**Index**: `(run_id)` — expand a suite run into its test details

### `profiles`

Student test personas. Core identity used for display and management in the dashboard.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| name | `text` | NOT NULL |
| email | `text` | NOT NULL, UNIQUE |
| program | `text` | NOT NULL — e.g. `"BS Information Technology"` |
| cohort | `text` | NOT NULL — e.g. `"2026-A"` |
| status | `text` | NOT NULL, default `'ready'` — `'ready' \| 'needs review'` |
| created_by | `uuid` | FK → users.id |
| updated_by | `uuid` | FK → users.id |
| created_at | `timestamptz` | default `now()` |
| updated_at | `timestamptz` | default `now()` |

### `profile_enrollment_data`

Detailed enrollment form data (1:1 with profile). Stores all fields from the Enrollmate enrollment wizard (Step 1 — Student's Information, Step 2 — Parent/Guardian's Information).

| Column | Type | Notes |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| profile_id | `uuid` | NOT NULL, UNIQUE, FK → profiles.id |
| **Student Info** | |
| given_name | `text` | |
| family_name | `text` | |
| birthplace | `text` | |
| birthdate | `date` | |
| gender | `text` | |
| nationality | `text` | |
| civil_status | `text` | |
| monthly_income | `text` | |
| mobile | `text` | |
| preferred_learning_hub | `text` | |
| student_type | `text` | e.g. `'Freshman'`, `'Transferee'` |
| sub_student_type | `text` | |
| student_status | `text` | |
| religion | `text` | |
| strand | `text` | e.g. `'STEM'` |
| last_school_attended | `text` | |
| term_applied | `text` | |
| program_focus | `text` | |
| program_applied | `text` | |
| **Current Address** | |
| current_address_country | `text` | |
| current_address_line1 | `text` | |
| current_address_line2 | `text` | |
| current_address_province | `text` | |
| current_address_city | `text` | |
| current_address_barangay | `text` | |
| current_address_zip_code | `text` | |
| **Permanent Address** | |
| permanent_address_country | `text` | |
| permanent_address_line1 | `text` | |
| permanent_address_line2 | `text` | |
| permanent_address_province | `text` | |
| permanent_address_city | `text` | |
| permanent_address_barangay | `text` | |
| permanent_address_zip_code | `text` | |
| **Misc** | |
| interested_in_scholarship | `text` | |
| with_medical_condition | `text` | |
| **Parent/Guardian** | |
| father_status | `text` | `'Living' \| 'Deceased' \| 'Unknown'` |
| mother_status | `text` | `'Living' \| 'Deceased' \| 'Unknown'` |
| guardian_type | `text` | |
| guardian_given_name | `text` | |
| guardian_family_name | `text` | |
| guardian_suffix | `text` | |
| guardian_birthdate | `date` | |
| guardian_mobile | `text` | |
| guardian_email | `text` | |
| guardian_occupation | `text` | |
| guardian_relationship | `text` | |
| copy_guardian_address | `boolean` | default false |
| copy_permanent_guardian_address | `boolean` | default false |
| **Audit** | |
| created_at | `timestamptz` | default `now()` |
| updated_at | `timestamptz` | default `now()` |

### `e2e_steps`

Preconfigured step definitions. Uniform across all profiles, extensible later.

| Column | Type | Constraints |
|---|---|---|
| id | `text` | PK — `'stage-1'` through `'stage-4'` |
| label | `text` | NOT NULL — e.g. `"Stage 1 — Authenticate"` |
| description | `text` | nullable |
| sort_order | `integer` | NOT NULL |
| created_at | `timestamptz` | default `now()` |

### `e2e_runs`

E2E test run sessions executed against a profile.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| run_number | `integer` | NOT NULL — sequential **per profile** |
| profile_id | `uuid` | NOT NULL, FK → profiles.id |
| status | `text` | NOT NULL — `'running' \| 'completed' \| 'aborted'` |
| started_by | `uuid` | FK → users.id |
| started_at | `timestamptz` | NOT NULL |
| completed_at | `timestamptz` | nullable |
| created_at | `timestamptz` | default `now()` |

**Constraints**: UNIQUE `(profile_id, run_number)`

### `e2e_run_steps`

Step-level results within an E2E run.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| run_id | `uuid` | NOT NULL, FK → e2e_runs.id |
| step_id | `text` | NOT NULL, FK → e2e_steps.id |
| status | `text` | NOT NULL — `'queued' \| 'running' \| 'success' \| 'failure'` |
| duration_seconds | `integer` | nullable |
| note | `text` | nullable |
| created_at | `timestamptz` | default `now()` |

**Index**: `(run_id)`

### `e2e_run_tests`

Fine-grained test assertions within a step.

| Column | Type | Constraints |
|---|---|---|
| id | `uuid` | PK, default `gen_random_uuid()` |
| run_step_id | `uuid` | NOT NULL, FK → e2e_run_steps.id |
| test_name | `text` | NOT NULL — e.g. `"Login page loads"` |
| status | `text` | NOT NULL — `'success' \| 'failure' \| 'skipped'` |
| duration_ms | `integer` | nullable |
| error_message | `text` | nullable |
| created_at | `timestamptz` | default `now()` |

**Index**: `(run_step_id)`

---

## File Layout

```
nextjs/
├── drizzle.config.ts              — Drizzle Kit config
├── lib/
│   ├── drizzle/
│   │   ├── db.ts                  — drizzle() + pool
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── apps.ts            — apps, smoke_runs, smoke_runs_test_results
│   │   │   ├── profiles.ts        — profiles, profile_enrollment_data,
│   │   │   │                        e2e_steps, e2e_runs, e2e_run_steps, e2e_run_tests
│   │   │   └── relations.ts       — Drizzle relations
│   │   ├── auth/
│   │   │   └── ...                — better-auth config (next phase)
│   │   └── ...
```

---

## Frontend Migration Notes

The following changes will be needed after the schema is in place:

1. **`lib/mock-testing-data.ts`** — Replace hardcoded types with Drizzle-inferred types. Remove mock data arrays.
2. **`smoke-testing-client.tsx`** — Adapt to 3-value status (`success` / `degraded` / `failure`). Add expandable detail to show `smoke_runs_test_results` sub-table per run. Display `run_number` instead of UUID in UI.
3. **`e2e-testing-client.tsx`** — Wire to `e2e_steps` lookup instead of hardcoded stage list. Add fine-grained test expansion per step. Update profile selection to load `profile_enrollment_data`.
4. **Data layer** — Replace `useState` + synthetic runs with TanStack Query hooks calling server actions.

---

## Decisions & Rationale

| Decision | Rationale |
|---|---|
| UUID PK + separate `run_number` on smoke_runs/e2e_runs | Allows per-app/per-profile sequential numbering without composite PK complexity |
| `run_number` scoped per app/profile via UNIQUE constraint | Semantic numbering per context (app `website` has runs 1,2,3 independently) |
| 3-way smoke_runs.status (`success`/`degraded`/`failure`) | Degraded captures "some tests failed but majority passed" |
| `smoke_runs_test_results` naming | Clearer scope than generic `test_results` — explicitly belongs to smoke runs |
| Separate `profile_enrollment_data` table | Keeps profile list queries lean; enrollment data only loaded when running E2E tests |
| `e2e_steps` lookup table | Preconfigured, uniform across profiles, extensible |
| 3-level E2E hierarchy (run → step → test) | Matches real test execution: one run session, N steps, each with M assertions |
| `started_by` nullable on smoke_runs | Scheduled runs have no user; manual runs have FK to users |
| No `scenarios` table | Replaced by `e2e_steps` (preconfigured) + `e2e_run_steps` (execution records) |
