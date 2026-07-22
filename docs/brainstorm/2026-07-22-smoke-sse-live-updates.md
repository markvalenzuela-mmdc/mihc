# Smoke Testing Server-Sent Events

**Status:** Approved design

**Date:** 2026-07-22

**ClickUp:** [Determine live update strategy for Smoke Testing](https://app.clickup.com/t/86d3rttu6)

## Context

Smoke runs and observed test results are now persisted incrementally while the
Playwright suite is active. The Smoke Testing page temporarily discovers those
changes by polling every two seconds. Polling is isolated behind a dedicated
page hook, one interval configuration module, and the run-details query's
`refetchInterval` callback.

This design replaces that temporary polling with Server-Sent Events (SSE).
PostgreSQL remains the source of truth. Notifications contain only the affected
Smoke run ID and tell clients to refetch the existing database-backed state.

## Goals

- Update Smoke Testing cards, run history, and open run details after committed
  incremental persistence changes.
- Keep one SSE connection open whenever the Smoke Testing page is mounted,
  including when no run is active.
- Recover missed notifications by resynchronizing after every initial
  connection and reconnection.
- Use the existing PgDog connection boundary for ordinary queries,
  notifications, and listeners.
- Remove all temporary Smoke polling without adding a polling fallback.
- Keep the transport isolated from Smoke UI components so another feature can
  extract a shared EventSource lifecycle later if a second real consumer
  appears.

## Non-goals

- Do not send Smoke results or complete run state through SSE payloads.
- Do not make notifications durable, replayable, or authoritative.
- Do not add WebSockets, Redis pub/sub, a Hono SSE proxy, or a second database
  connection endpoint.
- Do not add a generic EventSource framework for a single consumer.
- Do not change E2E Testing code, tables, pages, consumers, or tests.
- Do not add database columns or migrations.

## Considered Approaches

### 1. PgDog pub/sub to Next.js SSE -- selected

Playwright sends `pg_notify` through its existing persistence transaction.
PgDog forwards committed notifications to a Next.js listener, and an
authenticated Next.js route exposes them to the browser as SSE.

This has the fewest runtime hops, preserves same-origin authentication, and
does not require a second database URL. PgDog's pub/sub support handles
`LISTEN`/`NOTIFY` while ordinary application traffic remains transaction
pooled.

### 2. Session-pooled or direct PostgreSQL listener -- rejected

A dedicated session connection would provide native PostgreSQL `LISTEN`
semantics but would add a separate connection route and bypass the existing
PgDog boundary. It is unnecessary if the pinned PgDog deployment passes the
required pub/sub integration check.

### 3. Hono SSE with a Next.js proxy -- rejected

Hono is a suitable long-lived SSE server, but the incremental reporter runs in
a child process and still needs an inter-process notification bridge. Routing
PostgreSQL notifications through Hono and then proxying the stream through
Next.js adds another long-lived hop and duplicates disconnect handling without
improving delivery guarantees.

## Architecture

The selected flow is:

```text
Playwright persistence transaction
  -> pg_notify("smoke_run_changed", runId)
  -> PgDog pub/sub
  -> authenticated Next.js SSE route
  -> page-mounted EventSource
  -> router.refresh() and matching query invalidation
  -> existing PostgreSQL-backed reads
```

### Notification producer

Each Smoke lifecycle transaction emits one notification after its mutations:

- run creation;
- observed test start;
- observed test completion;
- run finalization.

The notification uses this stable contract:

```text
channel: smoke_run_changed
payload: <run UUID>
```

The notification executes through the same transaction executor as the
corresponding writes. PostgreSQL/PgDog therefore publishes it only after a
successful commit and drops it when the transaction rolls back. No change-type
field is needed because every consumer action is an idempotent refetch.

### SSE endpoint

The SSE endpoint is an authenticated Next.js Node route. For each connected
browser it:

1. opens one `pg.Client` through the existing `DATABASE_URL`;
2. executes `LISTEN smoke_run_changed`;
3. emits `ready` only after the subscription succeeds;
4. forwards notifications as `smoke-change` events whose data is the run ID;
5. writes an SSE heartbeat comment every 20 seconds;
6. closes the heartbeat, database client, and response stream when the request
   aborts or the database listener fails.

One PgDog client per mounted page keeps the resource lifecycle explicit and
avoids a process-global Next.js broadcaster. PgDog owns the shared PostgreSQL
subscription and client fan-out.

The response must disable caching and transformation so intermediaries do not
buffer the stream. A heartbeat prevents normal proxy idle timeouts from
treating a quiet connection as abandoned.

### Browser integration

A page-level `SmokeTestingLiveUpdates` client component mounts independently
of the selected application and run. It invokes a focused
`useSmokeRunEvents` hook that uses native `EventSource` directly.

The hook owns only Smoke behavior:

- open `/api/smoke-runs/events` once while the page is mounted;
- on `ready`, refresh the server-rendered page data and invalidate any open
  run-details query;
- on `smoke-change`, refresh the page and invalidate the matching run-details
  query;
- close EventSource on unmount.

Native EventSource owns automatic HTTP reconnection. The implementation does
not introduce a custom retry timer, connection-state UI, or polling fallback.

The hook remains domain-specific. If another feature later needs SSE, the
shared EventSource lifecycle can be extracted from two proven consumers while
their domain-specific reactions remain separate.

## Recovery And Delivery Semantics

Notifications are advisory and at-most-once. A browser can miss an event while
disconnected, and a proxy or process restart can terminate an active stream.
Correctness does not depend on replay:

1. the route establishes `LISTEN` before sending `ready`;
2. every `ready` event triggers an immediate database-backed resynchronization;
3. subsequent notifications trigger more database-backed refetches;
4. listener failure closes the SSE response instead of hiding a stale
   subscription;
5. EventSource reconnects and receives a new `ready` event.

Duplicate events and duplicate refetches are harmless. A notification never
contains state that could conflict with PostgreSQL.

There is intentionally no degraded polling mode. If SSE remains unavailable,
the page retains its last rendered state until EventSource reconnects or the
user reloads it.

## Infrastructure

The current local and deploy Compose entrypoints use PgDog `v0.1.26` on port
`6432`. The existing `pgdog.toml` does not enable pub/sub.

Add this setting under `[general]`:

```toml
pub_sub_channel_size = 4096
```

No new service, port, credential, or connection-string variable is required.
Both the notification producer and listener continue using `DATABASE_URL`.

The pinned image must pass a real `LISTEN`/`NOTIFY` integration check after the
setting is enabled. Upgrade PgDog only if the pinned version fails the check or
its reconnect behavior proves unreliable. Any upgrade must remain explicit in
the implementation diff and validation evidence.

The deployment documentation must identify PgDog consistently rather than
describing the current deploy Compose path as PgBouncer. Coolify proxy behavior
must be checked for streaming and idle-connection compatibility; the heartbeat
is the default mitigation before adding proxy-specific configuration.

## File Boundaries

### Playwright

- Modify `playwright/server/db/persist-run.ts` to emit transactional Smoke
  notifications.
- Modify `playwright/server/db/persist-run.test.ts` to verify notification
  payloads and transaction placement.

### Next.js

- Create `nextjs/app/api/smoke-runs/events/route.ts` for authentication and the
  SSE response.
- Create a server-only Smoke event-stream service for `pg.Client`, `LISTEN`,
  heartbeat, forwarding, and cleanup.
- Create a page-level `SmokeTestingLiveUpdates` component.
- Create `nextjs/feature/smoke/hooks/use-smoke-run-events.ts` for the native
  EventSource lifecycle and Smoke refetch behavior.
- Modify `nextjs/app/smoke-testing/page.tsx` to mount live updates and remove
  database-derived polling state.
- Modify the Smoke table to remove polling integration.
- Modify the run-details query to remove `refetchInterval`.
- Delete the temporary polling hook and polling configuration.
- Add focused event-stream and client-hook tests.

### Infrastructure and documentation

- Modify `docker/services/pgdog-postgres/files/pgdog.toml` to enable pub/sub.
- Correct the proxy description and record the SSE/PgDog requirement in
  `docs/containerized-infrastructure.md`.

## Testing Strategy

### Playwright persistence

- Verify run creation, test start, test completion, and run finalization each
  issue one notification with the affected run ID.
- Verify notification execution shares the mutation transaction.
- Verify a failed transaction does not result in a committed notification.

### Next.js server

- Verify unauthenticated requests are rejected before a stream is opened.
- Verify `ready` follows successful subscription.
- Verify PostgreSQL notifications become correctly framed `smoke-change`
  events.
- Verify heartbeats are emitted.
- Verify abort and listener failure release timers, database clients, and the
  response stream.

### Next.js client

- Verify one EventSource opens while the page coordinator is mounted.
- Verify `ready` refreshes the page and invalidates open details.
- Verify `smoke-change` refreshes the page and invalidates only the matching
  run-details query.
- Verify unmount closes EventSource.
- Verify no polling timer or TanStack `refetchInterval` remains.

### Integration and boundary checks

- Exercise `LISTEN` and transactional `NOTIFY` through the pinned PgDog image.
- Run focused Playwright and Next.js tests.
- Run both TypeScript checks and Next.js lint where practical.
- Run `git diff --check`.
- Confirm the implementation diff contains no E2E Testing changes.

## Acceptance Criteria

- A newly persisted Smoke run appears without a manual reload.
- Observed test starts and completions update cards, history, and open details
  while the run is active.
- A terminal run update is reflected without polling.
- Scheduled runs are discovered because the page connection remains mounted
  while idle.
- Reloading or reconnecting immediately resynchronizes from PostgreSQL.
- PostgreSQL remains the only source of displayed Smoke state.
- Temporary Smoke polling code is removed completely.
- E2E Testing remains unchanged.

## Approved Decisions

- Use PgDog pub/sub, Next.js SSE, and native browser EventSource.
- Keep the SSE connection mounted for the lifetime of the Smoke Testing page.
- Use only the Smoke run ID as the notification payload.
- Refetch authoritative state after connect, reconnect, and notifications.
- Remove polling completely and do not add a slow fallback.
- Keep the client hook Smoke-specific until a second SSE consumer exists.
- Validate the pinned PgDog version before considering an upgrade.

## Open Questions

None. The design is ready for implementation planning.

## Follow-up Amendment: Client Query Synchronization

After implementation review, the browser integration no longer uses
`router.refresh()` for Smoke updates. The Smoke Testing page keeps its
authenticated server shell, while cards and run history are rendered by a
client TanStack Query backed by `/api/smoke-runs` and keyed by the existing URL
filters. SSE `ready` and `smoke-change` events invalidate that query directly;
open run details remain separately invalidated by their existing query keys.

This amendment supersedes only the page-refresh reaction described in the
browser integration section. PostgreSQL remains authoritative, the SSE
connection remains page-mounted, and polling remains removed with no fallback.
