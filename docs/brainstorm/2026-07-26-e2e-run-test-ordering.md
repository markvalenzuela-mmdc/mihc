# E2E Run Test Ordering

## Context

Playwright executes EnrollMate checks serially and the incremental reporter
persists them through a serialized queue. The run details queries load nested
`e2e_run_tests` rows without an explicit order, so PostgreSQL may return them
in an arbitrary sequence and the UI renders that sequence unchanged.

## Decision

Order nested run tests by `e2e_run_tests.created_at` ascending in both queries
that return run details:

- the active run included in the profile workspace;
- a selected historical run.

Keep ordering in the data query rather than sorting in the UI. The existing
timestamp records persistence order, so this needs no schema or reporter
change.

## Validation

Add a unit assertion that both Drizzle relation configurations include an
ascending `createdAt` order, run the focused E2E profile service test, and run
`git diff --check`.

## Scope

Do not change Playwright execution, lifecycle-step bucketing, database schema,
or unrelated working-tree changes.
