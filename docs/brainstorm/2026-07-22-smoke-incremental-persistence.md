# Incremental Smoke Run Persistence

**Status:** Approved design
**Date:** 2026-07-22
**ClickUp:** [Persist Smoke test runs incrementally from Hono](https://app.clickup.com/t/86d3rttua)

## Context

The Hono/Playwright service currently waits for the complete Playwright JSON report and then inserts the Smoke run and every result in one database transaction. The frontend therefore cannot observe a run or any completed test until the entire suite finishes, and a crash before final persistence loses all progress.

This design makes PostgreSQL the source of truth throughout execution. It adds incremental Smoke-only persistence and temporary frontend polling without changing E2E Testing.

## Goals

- Commit a visible Smoke run before Playwright starts.
- Persist only tests Playwright actually reports.
- Persist test starts and completions through short database operations.
- Preserve completed results when later tests or the suite fail.
- Reconstruct active state from PostgreSQL after a page reload.
- Poll active state every two seconds and stop at a terminal run status.
- Keep temporary polling isolated so a later live-update strategy can replace it by deleting a narrow integration boundary.
- Add automated coverage for incremental persistence, interruption handling, polling, and E2E isolation.

## Non-goals

- Do not change E2E tables, consumers, runners, pages, or tests.
- Do not add expected-test records.
- Do not add Server-Sent Events, WebSockets, PostgreSQL notifications, or another permanent live-update transport.
- Do not add stable event identifiers, uniqueness constraints, replay handling, concurrency hardening, or idempotent upserts. Those belong to ClickUp task `86d3rttu7`.
- Do not prevent multiple Smoke runs from being enqueued; preserve the current behavior.

## Considered Approaches

### 1. Custom reporter with direct PostgreSQL writes — selected

The Smoke-only Playwright reporter receives the committed run ID, inserts a result when a test begins, and updates that row when the test completes. Each callback performs a short database operation. The child process already inherits the service environment, so this introduces no new network boundary.

This is the smallest implementation and keeps incremental persistence close to Playwright's native reporter lifecycle.

### 2. Stream reporter events to the parent process — rejected

A custom reporter could emit structured events for `run-smoke.ts` to parse and persist. This keeps database access out of the reporter but requires a reliable IPC channel, event framing, buffering, malformed-output handling, and backpressure behavior. That complexity is not justified for the current same-service deployment.

### 3. Post reporter events to an internal Hono endpoint — rejected

An internal HTTP endpoint would provide a strong validation boundary, but it adds routing, authentication, retries, address discovery, and deployment assumptions for communication within one service. It is premature for this ticket.

## Backend Architecture

The Inngest Smoke consumer is split into three durable steps:

1. `create-smoke-run` inserts and commits a `smoke_runs` row with `status = "running"` before the browser suite starts.
2. `run-suite` passes the run ID to the child process. The custom Smoke reporter writes observed test progress while the existing JSON reporter continues producing the terminal report.
3. `finalize-smoke-run` sets the terminal run status and duration after the child exits. It preserves existing result rows and normalizes any interrupted observed result.

Run creation returns the run ID and run number. If run creation fails, Playwright is not launched. The expensive suite remains inside its Inngest step, while run creation and finalization are separate steps.

### Reporter lifecycle

The child receives the run ID through a Smoke-specific environment variable. The custom reporter uses a process-local map from Playwright's result object to the inserted database result ID.

- `onTestBegin` inserts one observed result with `status = "running"`, start time, test name, and test file. It increments the run's observed total.
- `onTestEnd` updates that exact row with `success`, `failure`, or `skipped`, duration, completion time, and formatted failure details. It updates the run's passed and failed counters.
- The reporter never creates records for tests Playwright did not start.

The process-local database ID is intentionally not a replay-safe identity. A later idempotency change will define stable test and retry identifiers and database constraints.

### Finalization and interruption

The existing JSON report remains the terminal source for overall run status and duration. It no longer inserts result rows.

If the child fails to spawn, crashes, is interrupted, or exits without a readable report, finalization marks the run `failure`. Any observed result still marked `running` becomes `failure` with an interruption message and completion timestamp. Already completed rows remain unchanged. Final counters are recomputed from persisted observed rows so the run summary matches PostgreSQL.

Database failures propagate to Inngest. Replay-safe reporter writes are explicitly deferred to the idempotency ticket.

## Schema Changes

Smoke-only schema copies in Next.js and Playwright remain synchronized.

### `smoke_runs`

- Extend status to `running | success | degraded | failure`.
- Add nullable `completed_at`.
- Set `checked_at` when the run is created and leave it stable as the run start/check timestamp.
- Keep aggregate counters at zero initially and update them incrementally.
- Keep `duration_seconds` null until finalization.

### `smoke_runs_test_results`

- Extend status to `running | success | failure | skipped`.
- Add `started_at`, set when Playwright reports the test start.
- Add nullable `completed_at`, set when the test completes or is normalized as interrupted.
- Keep existing duration and error fields for terminal details.
- Do not add uniqueness, retry, or stable event-identity columns in this ticket.

The canonical schema and migration remain owned by `nextjs/`; the Playwright schema stays a consumer-owned synchronized copy.

## Frontend Design

The frontend polls every two seconds only while it is waiting for a newly enqueued run to appear or PostgreSQL reports an active Smoke run.

### Page data

A small Smoke-specific polling hook owns the `router.refresh()` timer. The run-history component starts the waiting state after a successful manual enqueue. That state bridges the queue-to-database gap and is bounded to 60 seconds so a consumer that never starts cannot cause indefinite polling.

Server-rendered data exposes whether an active run exists. A page reload with a `running` row therefore restarts polling without relying on client memory. Terminal server data stops the page timer.

### Run details

The existing TanStack details query uses a two-second `refetchInterval` only while the returned run status is `running`. Each response may add newly observed results or update existing results. A terminal response disables the interval.

### Disposable polling boundary

Temporary behavior is limited to:

- one `SMOKE_POLL_INTERVAL_MS` constant;
- one Smoke page-refresh polling hook;
- one details-query `refetchInterval` callback.

Polling does not alter API response contracts, persistence interfaces, or shared components. Replacing it later requires removing the hook invocation and query callback, then deleting the polling-only module. The database-backed active-state model remains reusable by the replacement transport.

### Active UI states

- Run and result types accept `running`.
- Existing status badges render the active status.
- Cards and history visually distinguish a running run.
- Active duration is displayed as `In progress` rather than zero.
- Existing filters, pagination, completed runs, and details behavior remain intact.

## Testing Strategy

### Playwright server tests

- Verify run creation occurs before suite execution.
- Verify `onTestBegin` inserts a running observed result.
- Verify `onTestEnd` updates the inserted row with status, timing, and failure details.
- Verify aggregate counts change as events arrive.
- Verify a later suite failure preserves completed rows.
- Verify crash finalization marks the run and interrupted observed rows as failures.
- Verify no expected-test rows are created.

Reporter tests use an injected persistence adapter so lifecycle behavior can be tested without launching a browser. Persistence tests exercise the short database operations through focused database-executor seams.

### Next.js tests

- Accept active Smoke run and result statuses.
- Refresh the page every two seconds while awaiting or running.
- Stop page polling after terminal state or the bounded start timeout.
- Resume page polling from server-rendered running state after reload.
- Refetch active run details every two seconds and stop on terminal data.
- Preserve existing completed-run rendering and service behavior.

### Boundary checks

- Run Playwright server unit tests and typecheck.
- Run focused Next.js Smoke tests, then the Next.js test suite and lint if practical.
- Confirm the diff contains no E2E implementation changes.

## Risks and Mitigations

- **Reporter/database coupling:** Keep database operations behind a narrow Smoke persistence adapter so reporter lifecycle logic remains independently testable.
- **Interrupted callbacks:** Parent finalization converts only observed running rows and preserves completed rows.
- **Temporary polling spreading through the UI:** Keep all timer behavior in a dedicated hook/config boundary and the details query callback.
- **Inngest replay duplicates:** Explicitly defer stable identities and upserts to task `86d3rttu7`; document that limitation in implementation notes.
- **Schema drift:** Change the canonical Next.js schema first, generate its migration, and mirror only the required table shapes in Playwright.

## Approved Decisions

- Use a custom Smoke Playwright reporter with direct PostgreSQL writes.
- Use short database operations for each lifecycle event.
- Use two-second temporary polling.
- Make polling easy to remove and replace.
- Preserve PostgreSQL as the sole frontend data source.
- Keep E2E Testing and idempotency hardening out of scope.

## Open Questions

None. The design is ready for implementation planning.
