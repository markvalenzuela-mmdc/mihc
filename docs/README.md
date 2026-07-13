# Project Documentation

Start here when working in this monorepo or asking an AI agent to modify it.
The repository has separate Next.js, Playwright, Docker, and shared-package
surfaces; read the relevant project instructions before editing.

## Current source-of-truth map

| Area | Authoritative location | Consumer guidance |
|---|---|---|
| Shared EnrollMate definition | `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json` | `packages/enrollmate-contract/README.md` |
| EnrollMate runtime contract | `packages/enrollmate-contract/src/form-definition.schema.ts`, `form-data.schema.ts`, and `registry.ts` | `packages/enrollmate-contract/README.md` |
| Next.js application | `nextjs/` | `nextjs/AGENTS.md` and `nextjs/README.md` |
| Next.js profile JSONB model | `nextjs/lib/drizzle/schema/`, `nextjs/lib/drizzle/seed/`, and `nextjs/drizzle/` | `docs/brainstorm/enrollmate-jsonb-profile-model.md` |
| Server-side Playwright tooling | `playwright/server/` and `playwright/server/__tests__/` | `playwright/AGENTS.md` and `playwright/README.md` |
| Browser Playwright suite | `playwright/tests/` | `playwright/AGENTS.md` |

## EnrollMate implementation documents

- `brainstorm/enrollmate-jsonb-profile-model.md` — approved JSONB profile
  design and its implementation amendment for the shared option-set API.
- `brainstorm/2026-07-11-profile-flow-cardinality.md` — approved profile flow
  cardinality amendment governing the one-profile/one-flow/one-form boundary.
- `plans/2026-07-10-enrollmate-jsonb-profile-model.md` — implementation plan
  and follow-up addendum for shared package consumers.
- `../packages/enrollmate-contract/README.md` — concrete package API and
  source-update workflow.

## E2E profile form delivery

- `brainstorm/2026-07-13-e2e-profile-form-phased-delivery.md` — current approved
  UI-first, two-phase design.
- `plans/2026-07-13-e2e-profile-form-phased-delivery.md` — current execution
  plan: client-only creation UX first, pair-programmed backend wiring second.

The older `brainstorm/2026-07-13-e2e-profile-form.md`,
`plans/2026-07-13-e2e-profile-form.md`,
`plans/2026-07-13-e2e-profile-form-structure-rewrite.md`, and
`plans/2026-07-13-e2e-profile-form-page-rewrite.md` describe the discarded
backend-first rendition and its later rewrites. They are retained as historical
decision records; do not execute them instead of the phased plan.

The older `brainstorm/enrollmate-profile-schema.md` and
`plans/2026-07-09-enrollmate-profile-schema.md` are retained as historical
records only. They describe the superseded relational option-catalog model;
do not use them as the current implementation contract.

## Test boundaries

- Next.js tests use `nextjs/__tests__/unit` and
  `nextjs/__tests__/integration`.
- Playwright browser tests use `playwright/tests` and the `playwright test`
  command.
- Playwright server-only Node tests use `playwright/server/__tests__/unit` or
  `playwright/server/__tests__/integration` and must not be placed under
  `playwright/tests`.

The EnrollMate contract test is a server unit test at
`playwright/server/__tests__/unit/enrollmate-contract.test.ts`. It imports the
shared package and does not launch a browser.

## AI agent workflow

Before making changes:

1. Read the root `AGENTS.md`.
2. Read the applicable project instructions (`nextjs/AGENTS.md`,
   `playwright/AGENTS.md`, or future project guidance).
3. Read this file and the current design/plan document for the area.
4. Run `git status --short --branch` and `git diff`; preserve existing work.
5. Make the smallest scoped change and update the relevant docs when a
   source-of-truth boundary, test boundary, package API, or migration changes.
6. Run the project-specific tests and typechecks, then run `git diff --check`.

When a document is marked superseded or historical, use it to understand prior
decisions but follow the current source-of-truth map and implementation docs.
