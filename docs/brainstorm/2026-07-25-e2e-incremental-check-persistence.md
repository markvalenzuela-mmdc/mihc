# E2E Incremental Check Persistence

**Status:** Approved design

**Date:** 2026-07-25

**Related work:** ClickUp `86d3u0drm` — Add live E2E run updates with SSE

## Context

The E2E Testing page now has authenticated SSE and targeted React Query
invalidation. The browser receives invalidation signals, but the E2E runner
currently waits for the complete Playwright JSON report before writing any
`e2e_run_steps` or `e2e_run_tests` rows. As a result, the page cannot show
individual checks while the flow is still running.

The visible checks (`page-loads`, `step N: filled`, `step N: advanced`,
`submit`, and `submission-confirmed`) are annotations inside one Playwright
test today. A reporter `onTestEnd` callback therefore fires only after the
whole enrollment flow completes.

Smoke Testing is the precedent. It creates the run before launching
Playwright, passes the run ID to the child, uses a custom reporter that writes
directly to PostgreSQL from Playwright lifecycle callbacks, serializes writes
through a queue, and lets finalization close the run without replacing
incremental rows.

## Goals

- Persist each visible E2E check as soon as its Playwright test case ends.
- Emit the existing `e2e_run_changed` notification after each successful
  check transaction.
- Let the existing SSE hook refresh the workspace, run history, and selected
  run details while the flow is still executing.
- Reuse the Smoke direct-child-to-PostgreSQL reporter lifecycle.
- Preserve already-written checks when later checks fail or the browser exits.
- Keep PostgreSQL and the existing E2E APIs as the only displayed-state source.

## Non-goals

- Do not add an stdout/IPC progress protocol.
- Do not add polling, WebSockets, or a generalized reporter/event framework.
- Do not add a new SSE endpoint or change the existing SSE payload.
- Do not add a new `running` status to E2E test rows.
- Do not add a schema migration unless implementation proves the existing rows
  cannot represent the requested incremental state.
- Do not change Smoke Testing behavior.

## Existing Smoke Precedent

The Smoke flow is:

1. Inngest creates and commits an active run before spawning Playwright.
2. `run-smoke.ts` passes the run ID and correlation ID to the child and enables
   `incremental-smoke-reporter.ts` alongside the JSON reporter.
3. The reporter receives `onTestBegin`/`onTestEnd` callbacks, calls direct
   PostgreSQL persistence operations, and queues callbacks because Playwright
   reporter methods are synchronous.
4. Each persistence transaction emits `smoke_run_changed` after its write.
5. The finalizer marks the run terminal and normalizes only interrupted rows;
   it does not bulk-replace completed results.

The E2E implementation follows this shape rather than introducing a second
transport between the child and the Hono/Inngest process.

## Considered Approaches

### 1. Split checks into serial Playwright test cases — selected

Define one serial test group per flow type, reuse one browser page for the
group, and make each visible check its own Playwright test. The existing
reporter lifecycle then becomes the natural persistence boundary. A custom E2E
reporter can mirror Smoke with `onTestEnd` and direct database writes.

This is the most faithful precedent and removes the need to invent a check
event protocol. The trade-off is a focused rewrite of the E2E spec's test
shape and shared-page lifecycle.

### 2. Structured stdout markers — rejected

Have the single test print a marker after each check and parse it from a
reporter or parent process. This would preserve the current test shape, but it
adds framing, partial-chunk handling, malformed-event behavior, and a custom
protocol that Smoke does not need.

### 3. Direct database writes from the assertion helper — rejected

Have the test helper open or reuse a database connection and write each check
itself. This would be short initially, but it couples browser test helpers to
database persistence and bypasses the reporter boundary established by Smoke.

## Test Structure

For each active flow type:

- Use `test.describe.serial`.
- Create one browser page in `beforeAll` and close it in `afterAll`.
- Resolve profile data and the unique submission email once for the group.
- Define separate tests for `page-loads`, each step's `filled` check, each
  step's `advanced` check, `submit`, and `submission-confirmed`.
- Keep `initSmoke` and the existing `assertCheck` annotation contract on every
  test. Each test should produce one check annotation.
- Let serial failure behavior stop later checks, matching the current early
  return behavior. Checks already completed remain persisted.

The page state is intentionally shared within one serial group. This keeps the
wizard progression intact while making each visible result reporter-observable.
No new browser state or application API is introduced.

## E2E Reporter

Add an E2E-specific reporter next to the Smoke reporter. `run-e2e.ts` passes
the run ID, profile ID, selected step IDs, and correlation ID through
E2E-specific environment variables and enables the reporter alongside the
existing JSON reporter.

On `onTestEnd`, the reporter:

1. Finds the check annotation on the test.
2. Resolves its lifecycle step using the existing E2E check-to-step mapping.
3. Maps Playwright status to `success`, `failure`, or `skipped`.
4. Formats failure details through the existing E2E formatter.
5. Queues one direct persistence operation.

The queue preserves `onTestEnd` order and records the first persistence error.
`onEnd` awaits the queue and reports a reporter failure if a write failed, while
the parent still runs the existing terminal cleanup path.

## Persistence

Add a short E2E transaction for one completed check:

- Find or create the `e2e_run_steps` row for `(runId, stepId)`.
- Insert the `e2e_run_tests` row with its name, terminal status, duration, and
  formatted error message.
- Recalculate that step's status and duration from its stored test rows.
- Emit `pg_notify('e2e_run_changed', { profileId, runId })` before commit.

The existing E2E step status model is sufficient: a step is `failure` when any
stored check failed and otherwise `success`. Skipped checks remain represented
by their test status; they do not introduce a new step status.

The terminal persistence operation updates `e2e_runs.status` and
`completed_at`, emits one final notification, and leaves incremental step/test
rows intact. It no longer bulk-inserts the complete mapped report. The mapped
report remains useful for determining the terminal run status and preserving
the existing aborted-run behavior.

## SSE and Frontend

No SSE or React Query changes are needed. Every check transaction emits the
same identifier-only E2E notification, so the existing hook invalidates the
affected profile workspace, all history pages for that profile, and the exact
selected run details query. PostgreSQL-backed APIs refetch the newly stored
test row and step aggregate.

## Failure and Cleanup Behavior

- A check that completes successfully is committed before the next check
  starts.
- A failed check is still persisted as a terminal `failure` result, then serial
  execution stops as it does today.
- If Playwright crashes, completed checks remain; the run finalizer marks the
  run according to the existing mapped report/aborted rules.
- If the reporter database write fails, the reporter records the error and the
  child reports failure; no partial transaction is published.
- Existing E2E run creation busy-profile handling and SSE cleanup remain
  unchanged.

## Testing Strategy

### Playwright persistence

- Persist one completed check and its step aggregate in one transaction.
- Emit one notification with the profile/run identifiers after a successful
  check write.
- Preserve previous check rows when another check fails.
- Finalization changes only the run terminal fields and does not bulk replace
  stored rows.

### E2E reporter

- Map each test's annotation and Playwright status to one persistence call.
- Verify writes are ordered and `onEnd` waits for pending work.
- Verify malformed or annotation-free tests are ignored or reported according
  to the existing E2E result contract.
- Verify the child runner enables the E2E reporter and passes run context.

### E2E spec and regression

- Verify the serial flow exposes each visible check as its own test case.
- Run existing E2E mapper, feature, typecheck, and lint suites.
- Run focused persistence and reporter tests.
- Confirm `git diff --check` and no Smoke files change.

## Acceptance Criteria

- `page-loads` appears in PostgreSQL and the workspace after it completes.
- Each `filled` and `advanced` check appears independently as it completes.
- Failed checks are visible immediately and do not erase earlier successes.
- The selected run details view refreshes through the existing SSE invalidation.
- The final run status and completion timestamp remain authoritative in
  PostgreSQL.
- The implementation follows Smoke's direct reporter lifecycle without adding
  polling, a new transport, or a generalized framework.

## Approved Decisions

- Use serial Playwright test cases per visible E2E check.
- Share one browser page within each serial flow group.
- Use a direct E2E reporter with queued `onTestEnd` persistence.
- Emit the existing identifier-only E2E PostgreSQL notification per check.
- Keep terminal finalization separate from incremental result writes.
- Preserve the existing E2E SSE route, hook, API contracts, and database schema.

## Open Questions

None. The design is ready for implementation planning.
