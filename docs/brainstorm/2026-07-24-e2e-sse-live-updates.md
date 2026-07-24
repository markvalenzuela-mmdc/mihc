# E2E Testing Server-Sent Events

**Status:** Approved design

**Date:** 2026-07-24

**ClickUp:** [Add live E2E run updates with SSE](https://app.clickup.com/t/90161490245/86d3u0drm)

## Context

The E2E Testing workspace reads a selected profile, its run history, and
selected run details through existing PostgreSQL-backed Next.js APIs and React
Query keys. E2E persistence already creates a running row before Playwright
starts and finalizes that row with its step and test results afterward, but the
browser does not discover those changes without reloading.

Smoke Testing already solves the equivalent problem with transactional
PostgreSQL notifications, an authenticated Next.js SSE route, and
domain-specific React Query invalidation. This design applies that established
pattern to E2E runs without introducing polling or a generalized event
framework.

## Goals

- Show a newly created active E2E run in the selected profile workspace without
  a page reload.
- Refresh run history and selected run details after completion or abortion.
- Reconstruct current state from PostgreSQL after page reload or SSE reconnect.
- Match Smoke Testing's ready event, heartbeat, failure, and cleanup behavior.
- Invalidate only the affected E2E profile and run query keys.
- Keep PostgreSQL and the existing E2E APIs authoritative.

## Non-goals

- Do not send run status, steps, tests, or other result state through SSE.
- Do not add polling, WebSockets, replay storage, or a durable event log.
- Do not extract a shared Smoke/E2E event framework.
- Do not change existing E2E API contracts or database schemas.
- Do not change Smoke Testing behavior.

## Considered Approaches

### 1. Dedicated E2E channel and SSE flow — selected

Add an `e2e_run_changed` PostgreSQL channel with a small JSON identifier
payload and mirror the existing Smoke lifecycle in E2E-specific files.

This is the smallest implementation that satisfies the ticket, preserves
domain boundaries, and leaves the proven Smoke flow unchanged.

### 2. Shared Smoke/E2E SSE framework — rejected

Extract the common PostgreSQL listener and EventSource lifecycle into a generic
framework.

Although this could reduce duplicated lifecycle code, it would expand the
change across the existing Smoke implementation and directly conflict with the
ticket's instruction not to add a generalized event framework.

### 3. Shared run-change channel — rejected

Publish Smoke and E2E notifications on one channel with a typed domain payload.

This would reduce the channel count but couple independent features, require
changing established Smoke behavior, and make client routing more complex
without improving the requested E2E behavior.

## Architecture

The selected flow is:

```text
Next.js queues an E2E request
  -> Hono/Inngest consumer creates the running PostgreSQL row
  -> transaction emits e2e_run_changed with { profileId, runId }
  -> authenticated Next.js SSE route forwards an e2e-change event
  -> browser invalidates matching React Query keys
  -> existing Next.js APIs refetch PostgreSQL state
  -> Hono/Inngest persists completion or abortion with results
  -> another notification repeats the invalidation and refetch
```

SSE is an invalidation signal only. It never carries state that could disagree
with PostgreSQL.

## Notification Producer

The existing E2E persistence transactions emit one notification after their
successful mutations:

- `createE2eRun`, after the running row is inserted;
- `completeE2eRun`, after the final status, steps, and tests are persisted.

The notification contract is:

```text
channel: e2e_run_changed
payload: {"profileId":"<profile UUID>","runId":"<run UUID>"}
```

Both identifiers are required because the existing query keys target the
profile workspace and history by profile ID, while selected details are keyed
by profile ID and run ID.

The notification executes through the same transaction executor as the
corresponding writes. PostgreSQL therefore publishes it only after commit and
drops it on rollback.

## SSE Endpoint

An authenticated Next.js Node.js route owns one PostgreSQL client for each
mounted E2E page stream. It:

1. connects through the existing database URL;
2. executes `LISTEN e2e_run_changed`;
3. emits `ready` after subscription succeeds;
4. forwards matching notifications as `e2e-change` events;
5. writes a heartbeat comment every 20 seconds;
6. releases the timer, PostgreSQL client, listeners, and response stream after
   abort, cancellation, subscription failure, or listener error.

The route uses the same uncached, non-buffered SSE response headers as Smoke.
No connection-state UI, custom retry timer, or fallback polling is added.

## Browser Integration

A page-mounted E2E live-updates component opens the native `EventSource` for
the lifetime of the E2E Testing page.

On `ready`, the hook invalidates the E2E workspace, run-history, and run-details
query prefixes so an initial connection or reconnect safely resynchronizes all
currently observed E2E state.

On a valid `e2e-change` payload, the hook invalidates:

- the exact workspace key for `profileId`;
- all run-history pages for `profileId`;
- the exact run-details key for `profileId` and `runId`.

Malformed or incomplete payloads are ignored. Native EventSource owns
reconnection. Duplicate notifications and refetches are harmless because the
database remains authoritative.

## Vercel Hosting

The Next.js SSE route can run as a streaming Vercel Function and does not
require a separate always-on SSE application. Vercel may terminate a stream at
the configured function-duration limit; native EventSource then reconnects,
and the new `ready` event resynchronizes from PostgreSQL.

PostgreSQL and PgDog still require reachable persistent hosting. One listener
connection per mounted page is acceptable for the current internal,
low-concurrency workspace. A shared fan-out service is intentionally deferred
unless measured concurrency or database connection pressure requires it.

## Error Handling

- Reject unauthenticated requests before opening a stream.
- Ignore notifications for other channels or without a payload.
- Ignore malformed browser payloads instead of broadly invalidating caches.
- Close the stream on listener errors so EventSource can reconnect.
- Make cleanup idempotent across abort, cancellation, and failure paths.
- Preserve existing E2E API errors and UI loading/error states.

## Testing Strategy

### Playwright persistence

- Verify run creation emits one transactional notification containing the
  created profile ID and run ID.
- Verify completion emits one transactional notification containing the
  persisted profile ID and run ID.
- Verify unsuccessful mutations do not emit change notifications.

### Next.js server

- Verify unauthenticated requests are rejected before stream creation.
- Verify authenticated responses use the expected SSE headers.
- Verify subscription completes before `ready`.
- Verify matching notifications are framed as `e2e-change` events.
- Verify heartbeats, cancellation, request abort, and listener failure clean up
  timers and PostgreSQL resources.

### Next.js client

- Verify one EventSource opens while the page coordinator is mounted.
- Verify `ready` invalidates all E2E live-state query prefixes.
- Verify a valid change invalidates the exact workspace, profile history, and
  run details.
- Verify malformed payloads cause no invalidation.
- Verify unmount closes EventSource.

### Regression checks

- Run focused Playwright persistence tests.
- Run focused Next.js E2E event tests and existing E2E feature tests.
- Run Playwright and Next.js typechecks.
- Run Next.js lint and `git diff --check`.

## Acceptance Criteria

- Starting a profile run updates the open workspace with its active run without
  reloading.
- Completing or aborting a run refreshes run history and open run details.
- Reloading reconstructs current run state from PostgreSQL.
- Initial connection and reconnect safely revalidate observed E2E state.
- Heartbeat and cleanup behavior matches Smoke Testing.
- No polling or generalized event framework is added.
- Automated tests cover notifications, authentication, streaming lifecycle,
  targeted invalidation, and existing E2E behavior.

## Approved Decisions

- Use a dedicated `e2e_run_changed` PostgreSQL channel.
- Carry only `{ profileId, runId }` as the notification and SSE payload.
- Mirror Smoke's lifecycle in E2E-specific modules.
- Mount one connection for the lifetime of the E2E Testing page.
- Use native EventSource reconnection and `ready` resynchronization.
- Keep the existing APIs and PostgreSQL as the only source of displayed state.
- Support Vercel streaming without introducing a separate SSE service.

## Open Questions

None. The design is ready for implementation planning.
