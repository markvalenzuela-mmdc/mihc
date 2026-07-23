# Smoke Queue and Idempotency Design

## Context

ClickUp task `86d3rttu7` requires Smoke result writes to tolerate duplicate
reporter and Inngest deliveries. The VPS must also execute only one Smoke suite
at a time and only one Playwright test case at a time. E2E Testing is outside
this change.

## Decisions

- Persist every accepted Smoke request before publishing its Inngest event.
- Represent waiting runs with an explicit `queued` status.
- Limit the Smoke Inngest function to one globally executing step so all Smoke
  apps share one FIFO queue.
- Launch Smoke Playwright processes with one worker.
- Let Inngest hold the queue. Do not keep an HTTP request, database transaction,
  or database lock open while a run waits.
- Mark a persisted run as `failure` if publishing its Inngest event fails.
- Treat Inngest retries as the documented exception to strict FIFO ordering.
- Keep retry attempts as distinct, independently queryable result rows.

## Architecture

The Next.js request action creates a `queued` `smoke_runs` row, then publishes a
`smoke-test/requested` event containing that row's `runId`. The Hono-hosted
Inngest consumer uses function concurrency `1`, conditionally claims the row by
changing `queued` to `running`, and starts Playwright only when the claim
succeeds.

The Playwright child process receives `--workers=1`. Its incremental reporter
persists each test attempt through idempotent start and completion operations.
The consumer finalizes the run after Playwright exits. Reaching a terminal run
status releases the Inngest concurrency slot for the oldest eligible queued
run.

## Data Model

`smoke_runs` gains:

- `queued` in the status union.
- A unique, non-null `correlation_id`.
- A nullable `started_at` set by the successful queue claim.

The existing `checked_at` records when the request entered the persisted queue.
`completed_at` remains null until a run becomes terminal.

`smoke_runs_test_results` gains:

- A non-null stable Playwright `test_id`.
- A non-null integer `retry_attempt`.
- A unique constraint on `(run_id, test_id, retry_attempt)`.

The canonical schema and migration remain owned by `nextjs/`; the Playwright
consumer schema mirrors only the columns it uses.

## State and Idempotency Rules

Run states follow:

```text
queued -> running -> success | degraded | failure
```

- Queue creation is idempotent by `correlation_id`.
- Only a conditional `queued -> running` update may claim a run.
- A duplicate event that cannot claim the run does not launch Playwright.
- A failed Inngest publication conditionally changes its queued run to
  `failure`.
- Test start inserts by `(run_id, test_id, retry_attempt)`. A conflict returns
  the existing result without incrementing `total`.
- Test completion changes only `running` results to a terminal result status.
  Only that successful transition updates `passed` or `failed`.
- The first terminal completion for a test attempt wins.
- Run finalization converts remaining running results to interrupted failures,
  reconciles aggregates from persisted results, and conditionally changes only
  a running run to its terminal status.
- Repeated completion and finalization calls are no-ops.

## Failure Handling

- If queued-row creation fails, do not publish an event.
- If event publication fails, retain the run as `failure` for auditability.
- If Playwright crashes or produces no report, finalize the run as `failure`.
- If the consumer is retried, it reuses the event's `runId`; a non-queued run
  cannot be claimed or executed again.
- A failed or interrupted run reaches a terminal state before the next ordinary
  FIFO run proceeds.

## Verification

Next.js tests cover queued-row creation before event publication, the `runId`
wire contract, publication failure, authentication, and unsupported apps.

Playwright server tests cover global Inngest concurrency `1`, conditional queue
claims, duplicate events, `--workers=1`, duplicate starts and completions,
distinct retries, repeated finalization, interruption handling, and failure
recovery.

Schema tests cover the new statuses, columns, and uniqueness constraints.
Existing Smoke and E2E unit tests, typechecks, and lint must remain green. A
live browser suite is not required for this persistence and orchestration
change.

## Non-Goals

- Changing E2E queueing, execution, persistence, or worker settings.
- Building a custom database-polling worker.
- Adding queue cancellation, priority, or manual retry controls.
- Guaranteeing retry ordering beyond Inngest's documented behavior.
