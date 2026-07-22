# Smoke Testing Server-Sent Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace temporary Smoke Testing polling with authenticated, page-mounted Server-Sent Events driven by transactional PostgreSQL notifications through PgDog.

**Architecture:** Each committed Smoke persistence transaction issues `pg_notify("smoke_run_changed", runId)`. PgDog pub/sub forwards notifications to one Next.js `pg.Client` per mounted browser stream; the browser treats events as invalidations and refetches existing PostgreSQL-backed page and run-detail state.

**Tech Stack:** TypeScript, PostgreSQL `LISTEN`/`NOTIFY`, PgDog `v0.1.26`, `pg` 8, Next.js 16 App Router route handlers, React 19, native EventSource, TanStack Query 5, Vitest 4, Node test runner.

**Execution constraint:** Mode 3 is active. Implement and verify every task on `feat/86d3rttu6`, but leave the design, plan, and implementation uncommitted for review. Do not add commit steps.

**Design:** `docs/brainstorm/2026-07-22-smoke-sse-live-updates.md`

---

## File Map

### PgDog and deployment documentation

- Modify `docker/services/pgdog-postgres/files/pgdog.toml`: enable transaction-mode pub/sub.
- Conditionally modify `docker/services/pgdog-postgres/compose.yml`: upgrade the pinned PgDog image only if `v0.1.26` fails the approved integration check.
- Modify `docs/containerized-infrastructure.md`: document PgDog consistently and record the pub/sub/heartbeat deployment requirements.

### Playwright notification producer

- Modify `playwright/server/db/persist-run.ts`: issue one transactional `pg_notify` after each Smoke lifecycle mutation set.
- Modify `playwright/server/db/persist-run.test.ts`: capture SQL execution and assert the notification channel and run-ID payload.

### Next.js event stream

- Modify `nextjs/lib/drizzle/db.ts`: export the existing database URL resolver for the dedicated `pg.Client`.
- Create `nextjs/feature/smoke/services/smoke-run-events.service.ts`: own `pg.Client`, `LISTEN`, SSE framing, heartbeat, failure closure, and cleanup.
- Create `nextjs/__tests__/unit/feature/smoke/smoke-run-events.service.test.ts`: verify subscription order, forwarding, heartbeat, abort, and listener failure.
- Create `nextjs/app/api/smoke-runs/events/route.ts`: authenticate and return the uncached SSE response.
- Create `nextjs/__tests__/unit/app/api/smoke-runs/events/route.test.ts`: verify authentication and response headers.

### Next.js browser integration

- Create `nextjs/feature/smoke/hooks/use-smoke-run-events.ts`: own native EventSource and Smoke-specific refetch reactions.
- Create `nextjs/feature/smoke/components/smoke-testing-live-updates.tsx`: mount the hook at page scope.
- Replace `nextjs/__tests__/unit/feature/smoke/use-smoke-run-polling.test.tsx` with `use-smoke-run-events.test.tsx`.
- Modify `nextjs/app/smoke-testing/page.tsx`: mount live updates and remove active-run polling state.
- Modify `nextjs/feature/smoke/components/smoke-testing-table.tsx`: remove the polling hook and enqueue handoff.
- Modify `nextjs/feature/smoke/query/smoke-run-details.query.ts`: remove active-run polling.
- Modify `nextjs/__tests__/unit/feature/smoke/smoke-run-details.query.test.ts`: lock in the absence of a refetch interval.
- Delete `nextjs/feature/smoke/hooks/use-smoke-run-polling.ts`.
- Delete `nextjs/feature/smoke/config/smoke-polling.config.ts`.

---

### Task 1: Enable and validate PgDog pub/sub

**Files:**
- Modify: `docker/services/pgdog-postgres/files/pgdog.toml`
- Conditional modify: `docker/services/pgdog-postgres/compose.yml`

- [ ] **Step 1: Confirm the baseline Compose model**

Run from the repository root:

```powershell
docker compose -f docker/compose.local.yml config
```

Expected: exit code 0; `app-pgdog` uses `ghcr.io/pgdogdev/pgdog:v0.1.26`, mounts `pgdog.toml`, and exposes port `6432`.

- [ ] **Step 2: Enable PgDog pub/sub**

Add the queue setting without changing the pool mode:

```toml
[general]
host = "0.0.0.0"
port = 6432
pub_sub_channel_size = 4096
```

- [ ] **Step 3: Restart the proxy with the updated configuration**

```powershell
docker compose -f docker/compose.local.yml up -d app-postgres app-pgdog
docker compose -f docker/compose.local.yml logs --tail 50 app-pgdog
```

Expected: both services start and PgDog reports no unknown-setting or configuration error.

- [ ] **Step 4: Exercise `LISTEN` and transactional `NOTIFY` through PgDog**

Run from `nextjs/` with its existing `.env`:

```powershell
@'
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const listener = new Client({ connectionString });
const sender = new Client({ connectionString });
await listener.connect();
await sender.connect();
await listener.query("LISTEN smoke_run_changed");

const received = new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error("Timed out waiting for PgDog notification")),
    5_000,
  );
  listener.once("notification", (message) => {
    clearTimeout(timeout);
    resolve(message);
  });
});

await sender.query("BEGIN");
await sender.query("select pg_notify($1, $2)", [
  "smoke_run_changed",
  "validation-run",
]);
await sender.query("COMMIT");

const message = await received;
if (message.channel !== "smoke_run_changed" || message.payload !== "validation-run") {
  throw new Error(`Unexpected notification: ${JSON.stringify(message)}`);
}

let rollbackNotificationReceived = false;
const handleRollbackNotification = (candidate: { payload?: string }) => {
  if (candidate.payload === "rolled-back-run") {
    rollbackNotificationReceived = true;
  }
};
listener.on("notification", handleRollbackNotification);
await sender.query("BEGIN");
await sender.query("select pg_notify($1, $2)", [
  "smoke_run_changed",
  "rolled-back-run",
]);
await sender.query("ROLLBACK");
await new Promise((resolve) => setTimeout(resolve, 250));
listener.off("notification", handleRollbackNotification);
if (rollbackNotificationReceived) {
  throw new Error("PgDog published a rolled-back notification");
}

await listener.end();
await sender.end();
console.log("PgDog LISTEN/NOTIFY validation passed");
'@ | pnpm exec tsx --env-file=.env -
```

Expected: `PgDog LISTEN/NOTIFY validation passed`.

- [ ] **Step 5: Apply the approved version contingency only if Step 4 fails because of PgDog**

If `v0.1.26` rejects `pub_sub_channel_size` or fails notification delivery, change only this image pin:

```yaml
services:
  app-pgdog:
    image: ghcr.io/pgdogdev/pgdog:v0.1.31
```

Recreate `app-pgdog` and repeat Steps 3 and 4. `v0.1.31` is the minimum approved fallback because it contains upstream `LISTEN`/`NOTIFY` fixes. If the fallback still fails, stop implementation and report the exact proxy error instead of adding a direct PostgreSQL bypass.

### Task 2: Emit transactional Smoke change notifications

**Files:**
- Modify: `playwright/server/db/persist-run.test.ts`
- Modify: `playwright/server/db/persist-run.ts`

- [ ] **Step 1: Extend the fake transaction executor to capture raw SQL**

Add `PgDialect` and `SQL` imports and record `execute` calls:

```ts
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const dialect = new PgDialect();

function createFakeDb(initialStatuses: string[] = []) {
  const inserts: CapturedWrite[] = [];
  const updates: CapturedWrite[] = [];
  const executions: SQL[] = [];
  const statuses = [...initialStatuses];

  const tx = {
    async execute(query: SQL) {
      executions.push(query);
      return [];
    },
    select(shape: Record<string, unknown>) {
      return {
        from() {
          return {
            async where() {
              if ("value" in shape) return [{ value: 2 }];
              return statuses.map((status) => ({ status }));
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: Record<string, unknown> | Record<string, unknown>[]) {
          inserts.push({ table, values });
          return {
            async returning() {
              return [{ id: table === smokeRuns ? "run-1" : "result-1" }];
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          updates.push({ table, values });
          if (table === smokeRunsTestResults && values.status === "failure") {
            for (let index = 0; index < statuses.length; index++) {
              if (statuses[index] === "running") statuses[index] = "failure";
            }
          }
          return { async where() {} };
        },
      };
    },
  };

  return {
    db: {
      async transaction<T>(callback: (executor: typeof tx) => Promise<T>) {
        return callback(tx);
      },
    },
    inserts,
    updates,
    executions,
  };
}

function assertSmokeNotification(executions: SQL[], runId: string) {
  assert.equal(executions.length, 1);
  const query = dialect.sqlToQuery(executions[0]);
  assert.equal(query.sql, "select pg_notify($1, $2)");
  assert.deepEqual(query.params, ["smoke_run_changed", runId]);
}
```

- [ ] **Step 2: Make all four lifecycle tests require a notification**

Append this assertion to the existing create, start, complete, and finalize tests:

```ts
assertSmokeNotification(fake.executions, "run-1");
```

The fake exposes `execute` only on the transaction executor, so this also proves the notification is issued inside the mutation transaction.

- [ ] **Step 3: Run the persistence test and verify failure**

Run from `playwright/`:

```powershell
pnpm test:unit -- server/db/persist-run.test.ts
```

Expected: four failures because no notification SQL is executed.

- [ ] **Step 4: Add the minimal notification helper**

In `persist-run.ts`, extend the Drizzle import and define one local helper:

```ts
import { and, eq, max, sql, type SQL } from "drizzle-orm";

const SMOKE_RUN_CHANGED_CHANNEL = "smoke_run_changed";

interface SqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

async function notifySmokeRunChanged(
  executor: SqlExecutor,
  runId: string,
): Promise<void> {
  await executor.execute(
    sql`select pg_notify(${SMOKE_RUN_CHANGED_CHANNEL}, ${runId})`,
  );
}
```

- [ ] **Step 5: Emit once after each transaction's mutation set**

Add the same awaited call after the last database mutation and before returning from each transaction callback:

```ts
await notifySmokeRunChanged(tx, runId);
```

For `createSmokeRun`, use `inserted.id` because `runId` is not yet a local variable:

```ts
await notifySmokeRunChanged(tx, inserted.id);
```

Do not emit outside the transaction and do not notify from E2E persistence.

- [ ] **Step 6: Run focused tests and typecheck**

```powershell
pnpm test:unit -- server/db/persist-run.test.ts
pnpm typecheck
```

Expected: both pass.

### Task 3: Build the Next.js Smoke event-stream service

**Files:**
- Modify: `nextjs/lib/drizzle/db.ts`
- Create: `nextjs/feature/smoke/services/smoke-run-events.service.ts`
- Create: `nextjs/__tests__/unit/feature/smoke/smoke-run-events.service.test.ts`

- [ ] **Step 1: Write service tests around an injected PostgreSQL client**

Create a fake client with `EventEmitter` and test the public stream factory:

```ts
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createSmokeRunEventStream,
  SMOKE_EVENT_HEARTBEAT_MS,
} from "@/feature/smoke/services/smoke-run-events.service";

class FakeClient extends EventEmitter {
  connected = false;
  ended = false;
  queries: string[] = [];

  async connect() {
    this.connected = true;
  }

  async query(query: string) {
    this.queries.push(query);
    return {};
  }

  async end() {
    this.ended = true;
  }
}

const decoder = new TextDecoder();

describe("createSmokeRunEventStream", () => {
  it("subscribes before emitting ready and forwards matching notifications", async () => {
    const client = new FakeClient();
    const abort = new AbortController();
    const stream = createSmokeRunEventStream(abort.signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();

    const ready = await reader.read();
    expect(client.connected).toBe(true);
    expect(client.queries).toEqual(["LISTEN smoke_run_changed"]);
    expect(decoder.decode(ready.value)).toBe("event: ready\ndata:\n\n");

    client.emit("notification", {
      channel: "smoke_run_changed",
      payload: "run-1",
      processId: 1,
    });
    const change = await reader.read();
    expect(decoder.decode(change.value)).toBe(
      "event: smoke-change\ndata: run-1\n\n",
    );

    abort.abort();
    await vi.waitFor(() => expect(client.ended).toBe(true));
  });

  it("emits heartbeat comments and releases resources on cancellation", async () => {
    const client = new FakeClient();
    let heartbeat: (() => void) | undefined;
    const clearInterval = vi.fn();
    const stream = createSmokeRunEventStream(new AbortController().signal, {
      createClient: () => client,
      setInterval: (handler, timeout) => {
        expect(timeout).toBe(SMOKE_EVENT_HEARTBEAT_MS);
        heartbeat = handler;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval,
    });
    const reader = stream.getReader();
    await reader.read();

    heartbeat?.();
    const message = await reader.read();
    expect(decoder.decode(message.value)).toBe(": heartbeat\n\n");

    await reader.cancel();
    expect(clearInterval).toHaveBeenCalledTimes(1);
    expect(client.ended).toBe(true);
  });

  it("closes the stream when the PostgreSQL listener fails", async () => {
    const client = new FakeClient();
    const stream = createSmokeRunEventStream(new AbortController().signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();
    await reader.read();

    client.emit("error", new Error("listener disconnected"));
    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(client.ended).toBe(true);
  });
});
```

- [ ] **Step 2: Run the service test and verify the missing module failure**

Run from `nextjs/`:

```powershell
pnpm test -- __tests__/unit/feature/smoke/smoke-run-events.service.test.ts
```

Expected: fail because the event-stream service does not exist.

- [ ] **Step 3: Export the existing database URL resolver**

Change only its export visibility in `nextjs/lib/drizzle/db.ts`:

```ts
export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Postgres");
  }

  return databaseUrl;
}
```

- [ ] **Step 4: Implement the stream factory and explicit resource lifecycle**

Create `smoke-run-events.service.ts` with these contracts and behavior:

```ts
import { Client, type Notification } from "pg";
import { getDatabaseUrl } from "@/lib/drizzle/db";

export const SMOKE_RUN_CHANGED_CHANNEL = "smoke_run_changed";
export const SMOKE_EVENT_HEARTBEAT_MS = 20_000;

interface SmokeEventClient {
  connect(): Promise<void>;
  query(query: string): Promise<unknown>;
  on(
    event: "notification",
    listener: (notification: Notification) => void,
  ): this;
  on(event: "error", listener: (error: Error) => void): this;
  off(
    event: "notification",
    listener: (notification: Notification) => void,
  ): this;
  off(event: "error", listener: (error: Error) => void): this;
  end(): Promise<void>;
}

interface SmokeRunEventStreamDependencies {
  createClient: () => SmokeEventClient;
  setInterval: typeof globalThis.setInterval;
  clearInterval: typeof globalThis.clearInterval;
}

const encoder = new TextEncoder();

function encodeEvent(event: string, data: string) {
  return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
}

const defaultDependencies: SmokeRunEventStreamDependencies = {
  createClient: () =>
    new Client({
      connectionString: getDatabaseUrl(),
    }),
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

export function createSmokeRunEventStream(
  signal: AbortSignal,
  dependencyOverrides: Partial<SmokeRunEventStreamDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  let cleanup: (() => Promise<void>) | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const client = dependencies.createClient();
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let closed = false;

      const onNotification = (notification: Notification) => {
        if (
          closed ||
          notification.channel !== SMOKE_RUN_CHANGED_CHANNEL ||
          !notification.payload
        ) {
          return;
        }

        controller.enqueue(
          encodeEvent("smoke-change", notification.payload),
        );
      };

      const close = async () => {
        if (closed) return;
        closed = true;
        signal.removeEventListener("abort", onAbort);
        client.off("notification", onNotification);
        client.off("error", onError);
        if (heartbeat !== undefined) {
          dependencies.clearInterval(heartbeat);
        }
        try {
          controller.close();
        } catch {
          // The consumer may already have canceled the stream.
        }
        await client.end().catch(() => undefined);
      };

      const onAbort = () => void close();
      const onError = () => void close();
      cleanup = close;

      client.on("notification", onNotification);
      client.on("error", onError);
      signal.addEventListener("abort", onAbort, { once: true });

      if (signal.aborted) {
        void close();
        return;
      }

      void (async () => {
        try {
          await client.connect();
          await client.query(`LISTEN ${SMOKE_RUN_CHANGED_CHANNEL}`);
          if (closed) return;

          controller.enqueue(encodeEvent("ready", ""));
          heartbeat = dependencies.setInterval(() => {
            if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }, SMOKE_EVENT_HEARTBEAT_MS);
        } catch {
          await close();
        }
      })();
    },
    async cancel() {
      await cleanup?.();
    },
  });
}
```

- [ ] **Step 5: Run the focused service test and typecheck**

```powershell
pnpm test -- __tests__/unit/feature/smoke/smoke-run-events.service.test.ts
pnpm exec tsc --noEmit
```

Expected: both pass.

### Task 4: Add the authenticated SSE route

**Files:**
- Create: `nextjs/app/api/smoke-runs/events/route.ts`
- Create: `nextjs/__tests__/unit/app/api/smoke-runs/events/route.test.ts`

- [ ] **Step 1: Write route tests for authentication and SSE headers**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createSmokeRunEventStream: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/feature/smoke/services/smoke-run-events.service", () => ({
  createSmokeRunEventStream: mocks.createSmokeRunEventStream,
}));

import { GET } from "@/app/api/smoke-runs/events/route";

describe("GET /api/smoke-runs/events", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.createSmokeRunEventStream.mockReset();
  });

  it("rejects an unauthenticated request before opening a stream", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/smoke-runs/events"),
    );

    expect(response.status).toBe(401);
    expect(mocks.createSmokeRunEventStream).not.toHaveBeenCalled();
  });

  it("returns an authenticated uncached event stream", async () => {
    const stream = new ReadableStream<Uint8Array>();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.createSmokeRunEventStream.mockReturnValue(stream);
    const request = new Request("http://localhost/api/smoke-runs/events");

    const response = await GET(request);

    expect(mocks.createSmokeRunEventStream).toHaveBeenCalledWith(
      request.signal,
    );
    expect(response.status).toBe(200);
    expect(response.body).toBe(stream);
    expect(response.headers.get("content-type")).toBe(
      "text/event-stream; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "no-cache, no-transform",
    );
    expect(response.headers.get("connection")).toBe("keep-alive");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
  });
});
```

- [ ] **Step 2: Run the route test and verify the missing route failure**

```powershell
pnpm test -- __tests__/unit/app/api/smoke-runs/events/route.test.ts
```

Expected: fail because the route does not exist.

- [ ] **Step 3: Implement the Node route using the existing auth action**

```ts
import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { createSmokeRunEventStream } from "@/feature/smoke/services/smoke-run-events.service";
import { err } from "@/utils/server-action-return";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json(err("Unauthorized"), { status: 401 });
  }

  return new Response(createSmokeRunEventStream(request.signal), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

Do not use a static cache directive; Next.js 16 route handlers are dynamic when they read request/auth runtime state.

- [ ] **Step 4: Run route and service tests**

```powershell
pnpm test -- __tests__/unit/app/api/smoke-runs/events/route.test.ts __tests__/unit/feature/smoke/smoke-run-events.service.test.ts
```

Expected: both pass.

### Task 5: Add the page-mounted EventSource integration

**Files:**
- Create: `nextjs/feature/smoke/hooks/use-smoke-run-events.ts`
- Create: `nextjs/feature/smoke/components/smoke-testing-live-updates.tsx`
- Create: `nextjs/__tests__/unit/feature/smoke/use-smoke-run-events.test.tsx`
- Delete: `nextjs/__tests__/unit/feature/smoke/use-smoke-run-polling.test.tsx`

- [ ] **Step 1: Replace polling-hook tests with EventSource-hook tests**

Create a minimal browser fake and assert Smoke-specific behavior:

```tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmokeRunDetailsQueryKey } from "@/feature/smoke/query/smoke-run-details.query";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  };
});

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, Set<EventListener>>();
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  close() {
    this.closed = true;
  }
}

vi.stubGlobal("EventSource", FakeEventSource);

import { useSmokeRunEvents } from "@/feature/smoke/hooks/use-smoke-run-events";

describe("useSmokeRunEvents", () => {
  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    mocks.refresh.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("resynchronizes all Smoke state when the stream becomes ready", () => {
    renderHook(() => useSmokeRunEvents());
    const source = FakeEventSource.instances[0];

    act(() => source.emit("ready", new Event("ready")));

    expect(source.url).toBe("/api/smoke-runs/events");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: SmokeRunDetailsQueryKey,
    });
  });

  it("refreshes the page and invalidates only the changed run details", () => {
    renderHook(() => useSmokeRunEvents());
    const source = FakeEventSource.instances[0];

    act(() =>
      source.emit(
        "smoke-change",
        new MessageEvent("smoke-change", { data: "run-1" }),
      ),
    );

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...SmokeRunDetailsQueryKey, "run-1"],
    });
  });

  it("closes the page connection on unmount", () => {
    const { unmount } = renderHook(() => useSmokeRunEvents());
    const source = FakeEventSource.instances[0];

    unmount();

    expect(source.closed).toBe(true);
  });
});
```

Delete the old polling-hook test in the same change; it tests behavior that is intentionally removed.

- [ ] **Step 2: Run the hook test and verify the missing hook failure**

```powershell
pnpm test -- __tests__/unit/feature/smoke/use-smoke-run-events.test.tsx
```

Expected: fail because `use-smoke-run-events.ts` does not exist.

- [ ] **Step 3: Implement the focused Smoke hook**

```ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SmokeRunDetailsQueryKey } from "../query/smoke-run-details.query";

export function useSmokeRunEvents() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/smoke-runs/events");

    const handleReady = () => {
      router.refresh();
      void queryClient.invalidateQueries({
        queryKey: SmokeRunDetailsQueryKey,
      });
    };

    const handleSmokeChange = (event: MessageEvent<string>) => {
      if (!event.data) return;
      router.refresh();
      void queryClient.invalidateQueries({
        queryKey: [...SmokeRunDetailsQueryKey, event.data],
      });
    };

    source.addEventListener("ready", handleReady);
    source.addEventListener(
      "smoke-change",
      handleSmokeChange as EventListener,
    );

    return () => {
      source.removeEventListener("ready", handleReady);
      source.removeEventListener(
        "smoke-change",
        handleSmokeChange as EventListener,
      );
      source.close();
    };
  }, [queryClient, router]);
}
```

Do not add `onerror`, retry timers, status state, or fallback polling. Native EventSource owns reconnection.

- [ ] **Step 4: Add the page-level coordinator**

```tsx
"use client";

import { useSmokeRunEvents } from "../hooks/use-smoke-run-events";

export function SmokeTestingLiveUpdates() {
  useSmokeRunEvents();
  return null;
}
```

- [ ] **Step 5: Run the hook test and typecheck**

```powershell
pnpm test -- __tests__/unit/feature/smoke/use-smoke-run-events.test.tsx
pnpm exec tsc --noEmit
```

Expected: both pass.

### Task 6: Wire SSE into the page and remove temporary polling

**Files:**
- Modify: `nextjs/app/smoke-testing/page.tsx`
- Modify: `nextjs/feature/smoke/components/smoke-testing-table.tsx`
- Modify: `nextjs/feature/smoke/query/smoke-run-details.query.ts`
- Modify: `nextjs/__tests__/unit/feature/smoke/smoke-run-details.query.test.ts`
- Delete: `nextjs/feature/smoke/hooks/use-smoke-run-polling.ts`
- Delete: `nextjs/feature/smoke/config/smoke-polling.config.ts`

- [ ] **Step 1: Change the query regression test to require no polling**

Replace the current interval assertions with:

```ts
import { describe, expect, it } from "vitest";
import { smokeRunDetailsOptions } from "@/feature/smoke/query/smoke-run-details.query";

describe("smokeRunDetailsOptions", () => {
  it("does not poll because SSE invalidates changed run details", () => {
    expect(smokeRunDetailsOptions("run-1").refetchInterval).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the query test and verify failure**

```powershell
pnpm test -- __tests__/unit/feature/smoke/smoke-run-details.query.test.ts
```

Expected: fail because `refetchInterval` is still configured.

- [ ] **Step 3: Remove details polling**

Delete the `SMOKE_POLL_INTERVAL_MS` import and the complete `refetchInterval` property from `smokeRunDetailsOptions`. Preserve its query key, query function, response conversion, and `enabled` behavior.

- [ ] **Step 4: Mount live updates independently of page data**

Import the coordinator in `page.tsx`:

```ts
import { SmokeTestingLiveUpdates } from "@/feature/smoke/components/smoke-testing-live-updates";
```

Mount it inside `MainShell` before `Suspenser`:

```tsx
<SmokeTestingLiveUpdates />
<Suspenser promise={appsPromise} fallback={<SmokeTestingCardsSkeleton />}>
```

This is an insertion immediately before the existing `Suspenser`; keep its
existing render callback and closing tag unchanged.

Remove the `hasActiveRun` derivation, return property, and table prop. Do not change app selection, pagination, filters, or details-sheet rendering.

- [ ] **Step 5: Remove the table's enqueue-to-polling handoff**

In `smoke-testing-table.tsx`:

- delete the `useSmokeRunPolling` import;
- remove `hasActiveRun` from the props and prop type;
- remove the hook call;
- remove only `startAwaitingRun()` from the successful enqueue branch;
- preserve the request action and both toast paths.

- [ ] **Step 6: Delete polling-only source files**

Delete:

```text
nextjs/feature/smoke/hooks/use-smoke-run-polling.ts
nextjs/feature/smoke/config/smoke-polling.config.ts
```

Confirm no remaining references:

```powershell
rg -n "SMOKE_POLL|useSmokeRunPolling|hasActiveRun|startAwaitingRun|refetchInterval" app feature __tests__
```

Expected: no polling references; `refetchInterval` may appear only in the negative regression assertion.

- [ ] **Step 7: Run all focused Next.js Smoke tests**

```powershell
pnpm test -- __tests__/unit/feature/smoke __tests__/unit/services/smoke __tests__/unit/schema/smoke-test-runs.schema.test.ts __tests__/unit/app/api/smoke-runs/events/route.test.ts
```

Expected: all pass.

### Task 7: Update infrastructure documentation and verify the complete change

**Files:**
- Modify: `docs/containerized-infrastructure.md`
- Verify: all files listed above

- [ ] **Step 1: Correct the deploy proxy description**

Update the existing deployment references to match the Compose source of truth:

```md
- `docker/services/pgdog-postgres/compose.yml` — local and deploy app PostgreSQL plus PgDog
```

In the local/deploy comparison, identify PgDog for both environments rather than claiming the deploy entrypoint uses PgBouncer.

- [ ] **Step 2: Document the SSE infrastructure contract**

Add a concise section containing these facts:

```md
## Smoke Testing live updates

Smoke Testing uses PostgreSQL `LISTEN`/`NOTIFY` through PgDog to invalidate
database-backed UI state over a Next.js SSE route. PgDog pub/sub must remain
enabled with `pub_sub_channel_size = 4096`.

The SSE route sends a heartbeat every 20 seconds. A deployment proxy must pass
`text/event-stream` responses without buffering and must allow idle connections
longer than the heartbeat interval.
```

- [ ] **Step 3: Run Playwright verification**

From `playwright/`:

```powershell
pnpm test:unit
pnpm typecheck
```

Expected: all server unit tests and typecheck pass.

- [ ] **Step 4: Run Next.js verification**

From `nextjs/`:

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm lint
```

Expected: all tests, typecheck, and lint pass. If lint reports a pre-existing failure, record the exact file and rule and prove no new failure is introduced.

- [ ] **Step 5: Re-run the real PgDog integration check**

Repeat Task 1 Step 4 after all application changes. Expected: the notification crosses the same `DATABASE_URL` used by both applications.

- [ ] **Step 6: Perform final preservation and scope checks**

From the repository root:

```powershell
git diff --check
git status --short
git diff --name-only
git diff
```

Confirm:

- the approved design and this plan remain present;
- previous incremental-persistence behavior remains present;
- no E2E Testing implementation or database table changed;
- no migration was created;
- polling files are deleted and no fallback timer exists;
- PgDog is upgraded only if the pinned-version validation required it;
- all intentional changes remain uncommitted for Mode 3 review.

## Follow-up Amendment: Remove Page Refresh From SSE Reactions

The implementation follow-up moves Smoke cards and run history behind an
authenticated `/api/smoke-runs` route and a URL-keyed client TanStack Query.
The page retains only its authenticated server shell; a client content
coordinator renders the existing cards and table, revives serialized dates,
and keeps previous data during filter changes. The SSE hook invalidates the
page query key and the relevant run-details keys directly.

`router.refresh()` is not part of the final implementation. No browser reload,
polling timer, slow fallback, E2E Testing change, migration, or package change
was added.
