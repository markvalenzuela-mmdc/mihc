# E2E Testing Server-Sent Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the E2E Testing profile workspace, run history, and selected run details from PostgreSQL when E2E run persistence changes, without polling or page reloads.

**Architecture:** Each successful E2E persistence transaction issues `pg_notify("e2e_run_changed", payload)` with `{ profileId, runId }`. A dedicated authenticated Next.js Node route forwards those notifications over SSE, and a page-mounted EventSource hook invalidates the matching existing React Query keys so the current APIs refetch authoritative PostgreSQL state.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL `LISTEN`/`NOTIFY`, PgDog, Next.js 16 App Router, React 19, native EventSource, TanStack Query 5, Node test runner, Vitest 4.

**Execution constraint:** Mode 3 is active. Create and use `feat/86d3u0drm` from `main`, implement and verify the plan, and leave all changes uncommitted for review. Do not add commit steps.

**Design:** `docs/brainstorm/2026-07-24-e2e-sse-live-updates.md`

---

## File Map

### Playwright notification producer

- Modify `playwright/server/db/persist-e2e-run.ts`: emit one transactional E2E change notification after run creation and after final status/results persistence.
- Create `playwright/server/db/persist-e2e-run.test.ts`: verify payloads, transaction placement, and no notification on unsuccessful mutations.

### Next.js event stream

- Create `nextjs/feature/e2e/services/e2e-run-events.service.ts`: own the PostgreSQL client, `LISTEN`, SSE framing, heartbeat, failure closure, and cleanup.
- Create `nextjs/__tests__/unit/feature/e2e/e2e-run-events.service.test.ts`: verify ready ordering, forwarding, heartbeat, cancellation, and listener failure.
- Create `nextjs/app/api/e2e-runs/events/route.ts`: authenticate the stream and return uncached SSE headers.
- Create `nextjs/__tests__/unit/app/api/e2e-runs/events/route.test.ts`: verify authentication and response configuration.

### Next.js browser integration

- Create `nextjs/feature/e2e/hooks/use-e2e-run-events.ts`: parse identifier-only events and invalidate existing E2E query keys.
- Create `nextjs/__tests__/unit/feature/e2e/use-e2e-run-events.test.tsx`: verify ready resynchronization, targeted invalidation, malformed payload handling, and cleanup.
- Create `nextjs/feature/e2e/components/e2e-testing-live-updates.tsx`: mount the hook without adding UI state.
- Modify `nextjs/app/e2e-testing/page.tsx`: keep the EventSource mounted for the page lifetime.

No migration, API response change, polling fallback, Smoke change, or generic event abstraction is required.

---

### Task 1: Emit transactional E2E run notifications

**Files:**
- Create: `playwright/server/db/persist-e2e-run.test.ts`
- Modify: `playwright/server/db/persist-e2e-run.ts`

- [ ] **Step 1: Add a focused fake transaction and failing notification tests**

Create `playwright/server/db/persist-e2e-run.test.ts`. Use a fake Drizzle transaction that records `execute`, insert, and update calls. The important assertions are:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Logger } from "../logger";
import {
  completeE2eRun,
  createE2eRun,
  ProfileBusyError,
} from "./persist-e2e-run";

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

const dialect = new PgDialect();

function assertE2eNotification(
  executions: SQL[],
  profileId: string,
  runId: string,
) {
  assert.equal(executions.length, 1);
  const query = dialect.sqlToQuery(executions[0]);
  assert.equal(query.sql, "select pg_notify($1, $2)");
  assert.deepEqual(query.params, [
    "e2e_run_changed",
    JSON.stringify({ profileId, runId }),
  ]);
}

test("createE2eRun notifies after inserting the running row", async () => {
  const fake = createFakeE2eDb();

  const result = await createE2eRun(
    "profile-1",
    "user-1",
    logger,
    fake.db as never,
  );

  assert.deepEqual(result, {
    runId: "run-1",
    runNumber: 3,
    startedAt: "2026-07-24T08:00:00.000Z",
  });
  assertE2eNotification(fake.executions, "profile-1", "run-1");
});

test("createE2eRun does not notify when the profile is busy", async () => {
  const fake = createFakeE2eDb({ existingRunningRun: true });

  await assert.rejects(
    createE2eRun("profile-1", "user-1", logger, fake.db as never),
    ProfileBusyError,
  );
  assert.equal(fake.executions.length, 0);
});

test("completeE2eRun notifies after final status and results persistence", async () => {
  const fake = createFakeE2eDb();

  await completeE2eRun(
    {
      runId: "run-1",
      runStatus: "completed",
      steps: [],
      logger,
    },
    fake.db as never,
  );

  assertE2eNotification(fake.executions, "profile-1", "run-1");
});

test("completeE2eRun does not notify when no run was updated", async () => {
  const fake = createFakeE2eDb({ updatedRun: false });

  await completeE2eRun(
    {
      runId: "missing-run",
      runStatus: "aborted",
      steps: [],
      logger,
    },
    fake.db as never,
  );

  assert.equal(fake.executions.length, 0);
});
```

Implement `createFakeE2eDb` in the same file with these exact observable values:

```ts
interface FakeE2eDbOptions {
  existingRunningRun?: boolean;
  updatedRun?: boolean;
}

function createFakeE2eDb(options: FakeE2eDbOptions = {}) {
  const executions: SQL[] = [];
  const startedAt = new Date("2026-07-24T08:00:00.000Z");
  const completedAt = new Date("2026-07-24T08:01:00.000Z");

  const tx = {
    query: {
      e2eRuns: {
        async findFirst() {
          return options.existingRunningRun ? { id: "existing-run" } : null;
        },
      },
    },
    async execute(query: SQL) {
      executions.push(query);
      return [];
    },
    select() {
      return {
        from() {
          return {
            async where() {
              return [{ value: 2 }];
            },
          };
        },
      };
    },
    insert() {
      return {
        values() {
          return {
            async returning() {
              return [{ id: "run-1", startedAt }];
            },
          };
        },
      };
    },
    update() {
      return {
        set() {
          return {
            where() {
              return {
                async returning() {
                  return options.updatedRun === false
                    ? []
                    : [{ profileId: "profile-1", startedAt, completedAt }];
                },
              };
            },
          };
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
    executions,
  };
}
```

If Drizzle's insert builder requires separate return shapes for run steps during
the full existing test suite, make `insert(table)` branch on `e2eRuns`,
`e2eRunSteps`, and `e2eRunTests`; keep the assertions and production interface
unchanged.

- [ ] **Step 2: Run the new test and verify the missing behavior**

Run:

```powershell
cd playwright
node --import tsx --test server/db/persist-e2e-run.test.ts
```

Expected: FAIL because the persistence functions do not accept the injected
database and do not execute `pg_notify`.

- [ ] **Step 3: Add the minimal notification helper and dependency injection**

In `playwright/server/db/persist-e2e-run.ts`, change the database import and add
the notification contract:

```ts
import { db, type Db } from "./client";

const E2E_RUN_CHANGED_CHANNEL = "e2e_run_changed";

interface SqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

interface E2eRunChangedPayload {
  profileId: string;
  runId: string;
}

async function notifyE2eRunChanged(
  executor: SqlExecutor,
  payload: E2eRunChangedPayload,
) {
  await executor.execute(
    sql`select pg_notify(${E2E_RUN_CHANGED_CHANNEL}, ${JSON.stringify(payload)})`,
  );
}
```

Add `database: Db = db` as the final parameter to both exported persistence
functions and replace their `db.transaction` calls with
`database.transaction`.

After the run insert succeeds:

```ts
await notifyE2eRunChanged(tx, {
  profileId,
  runId: inserted.id,
});
```

Include `profileId` in the completion update's returning shape:

```ts
.returning({
  profileId: e2eRuns.profileId,
  startedAt: e2eRuns.startedAt,
  completedAt: e2eRuns.completedAt,
});
```

After all final step/test writes and before the completion log:

```ts
if (updated) {
  await notifyE2eRunChanged(tx, {
    profileId: updated.profileId,
    runId,
  });
}
```

Do not notify when the busy guard triggers or no run row was updated.

- [ ] **Step 4: Run the persistence test and Playwright typecheck**

Run:

```powershell
cd playwright
node --import tsx --test server/db/persist-e2e-run.test.ts
pnpm typecheck
```

Expected: both commands pass.

---

### Task 2: Add the E2E PostgreSQL event stream service

**Files:**
- Create: `nextjs/__tests__/unit/feature/e2e/e2e-run-events.service.test.ts`
- Create: `nextjs/feature/e2e/services/e2e-run-events.service.ts`

- [ ] **Step 1: Write failing stream lifecycle tests**

Create the service test with the same fake-client boundary used by Smoke:

```ts
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createE2eRunEventStream,
  E2E_EVENT_HEARTBEAT_MS,
} from "@/feature/e2e/services/e2e-run-events.service";

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

describe("createE2eRunEventStream", () => {
  it("subscribes before ready and forwards matching notifications", async () => {
    const client = new FakeClient();
    const abort = new AbortController();
    const stream = createE2eRunEventStream(abort.signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();

    expect(decoder.decode((await reader.read()).value)).toBe(
      "event: ready\ndata:\n\n",
    );
    expect(client.queries).toEqual(["LISTEN e2e_run_changed"]);

    client.emit("notification", {
      channel: "e2e_run_changed",
      payload: JSON.stringify({ profileId: "profile-1", runId: "run-1" }),
      processId: 1,
    });

    expect(decoder.decode((await reader.read()).value)).toBe(
      `event: e2e-change\ndata: ${JSON.stringify({
        profileId: "profile-1",
        runId: "run-1",
      })}\n\n`,
    );

    abort.abort();
    await vi.waitFor(() => expect(client.ended).toBe(true));
  });

  it("emits heartbeats and releases resources on cancellation", async () => {
    const client = new FakeClient();
    let heartbeat: (() => void) | undefined;
    const clearInterval = vi.fn();
    const stream = createE2eRunEventStream(new AbortController().signal, {
      createClient: () => client,
      setInterval: (handler, timeout) => {
        expect(timeout).toBe(E2E_EVENT_HEARTBEAT_MS);
        heartbeat = handler;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval,
    });
    const reader = stream.getReader();
    await reader.read();

    heartbeat?.();
    expect(decoder.decode((await reader.read()).value)).toBe(
      ": heartbeat\n\n",
    );

    await reader.cancel();
    expect(clearInterval).toHaveBeenCalledTimes(1);
    expect(client.ended).toBe(true);
  });

  it("closes when the PostgreSQL listener fails", async () => {
    const client = new FakeClient();
    const stream = createE2eRunEventStream(new AbortController().signal, {
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

- [ ] **Step 2: Run the service test and verify it fails**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/feature/e2e/e2e-run-events.service.test.ts
```

Expected: FAIL because `e2e-run-events.service.ts` does not exist.

- [ ] **Step 3: Implement the focused E2E stream**

Create `nextjs/feature/e2e/services/e2e-run-events.service.ts` by preserving
Smoke's tested lifecycle and changing only domain names:

```ts
import { Client, type Notification } from "pg";
import { getDatabaseUrl } from "@/lib/drizzle/db";

export const E2E_RUN_CHANGED_CHANNEL = "e2e_run_changed";
export const E2E_EVENT_HEARTBEAT_MS = 20_000;

interface E2eEventClient {
  connect(): Promise<unknown>;
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

type E2eInterval = ReturnType<typeof globalThis.setInterval>;

interface E2eRunEventStreamDependencies {
  createClient: () => E2eEventClient;
  setInterval: (handler: () => void, timeout: number) => E2eInterval;
  clearInterval: (interval: E2eInterval) => void;
}

const encoder = new TextEncoder();

function encodeEvent(event: string, data: string) {
  return encoder.encode(`event: ${event}\ndata:${data ? ` ${data}` : ""}\n\n`);
}

const defaultDependencies: E2eRunEventStreamDependencies = {
  createClient: () =>
    new Client({
      connectionString: getDatabaseUrl(),
    }),
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

export function createE2eRunEventStream(
  signal: AbortSignal,
  dependencyOverrides: Partial<E2eRunEventStreamDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  let cleanup: (() => Promise<void>) | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const client = dependencies.createClient();
      let heartbeat: E2eInterval | undefined;
      let closed = false;

      const onNotification = (notification: Notification) => {
        if (
          closed ||
          notification.channel !== E2E_RUN_CHANGED_CHANNEL ||
          !notification.payload
        ) {
          return;
        }

        controller.enqueue(encodeEvent("e2e-change", notification.payload));
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
          await client.query(`LISTEN ${E2E_RUN_CHANGED_CHANNEL}`);
          if (closed) return;

          controller.enqueue(encodeEvent("ready", ""));
          heartbeat = dependencies.setInterval(() => {
            if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }, E2E_EVENT_HEARTBEAT_MS);
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

Do not extract shared helpers or add Vercel-specific retry logic.

- [ ] **Step 4: Run the service test and Next.js typecheck**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/feature/e2e/e2e-run-events.service.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands pass.

---

### Task 3: Add the authenticated E2E SSE route

**Files:**
- Create: `nextjs/__tests__/unit/app/api/e2e-runs/events/route.test.ts`
- Create: `nextjs/app/api/e2e-runs/events/route.ts`

- [ ] **Step 1: Write the failing route tests**

Create the route test:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createE2eRunEventStream: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/feature/e2e/services/e2e-run-events.service", () => ({
  createE2eRunEventStream: mocks.createE2eRunEventStream,
}));

import { GET } from "@/app/api/e2e-runs/events/route";

describe("GET /api/e2e-runs/events", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.createE2eRunEventStream.mockReset();
  });

  it("rejects unauthenticated requests before opening a stream", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/e2e-runs/events"),
    );

    expect(response.status).toBe(401);
    expect(mocks.createE2eRunEventStream).not.toHaveBeenCalled();
  });

  it("returns an authenticated uncached event stream", async () => {
    const stream = new ReadableStream<Uint8Array>();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.createE2eRunEventStream.mockReturnValue(stream);
    const request = new Request("http://localhost/api/e2e-runs/events");

    const response = await GET(request);

    expect(mocks.createE2eRunEventStream).toHaveBeenCalledWith(request.signal);
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

- [ ] **Step 2: Run the route test and verify it fails**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/app/api/e2e-runs/events/route.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the authenticated Node route**

Create `nextjs/app/api/e2e-runs/events/route.ts`:

```ts
import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { createE2eRunEventStream } from "@/feature/e2e/services/e2e-run-events.service";
import { err } from "@/utils/server-action-return";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json(err("Unauthorized"), { status: 401 });
  }

  return new Response(createE2eRunEventStream(request.signal), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

Do not set a plan-specific `maxDuration`: Vercel plan limits differ, native
EventSource reconnects, and `ready` resynchronization makes termination safe.

- [ ] **Step 4: Run the route and service tests**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/app/api/e2e-runs/events/route.test.ts __tests__/unit/feature/e2e/e2e-run-events.service.test.ts
```

Expected: both test files pass.

---

### Task 4: Invalidate targeted E2E React Query state

**Files:**
- Create: `nextjs/__tests__/unit/feature/e2e/use-e2e-run-events.test.tsx`
- Create: `nextjs/feature/e2e/hooks/use-e2e-run-events.ts`

- [ ] **Step 1: Write the failing hook tests**

Create a FakeEventSource test boundary matching the browser API:

```tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2eProfileRunsQueryKey,
  E2eProfileWorkspaceQueryKey,
  E2eRunDetailsQueryKey,
} from "@/feature/e2e/query/e2e-profile-workspace.query";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

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

import { useE2eRunEvents } from "@/feature/e2e/hooks/use-e2e-run-events";

describe("useE2eRunEvents", () => {
  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    mocks.invalidateQueries.mockReset();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("resynchronizes all E2E state when ready", () => {
    renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    act(() => source.emit("ready", new Event("ready")));

    expect(source.url).toBe("/api/e2e-runs/events");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: E2eProfileWorkspaceQueryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: E2eProfileRunsQueryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: E2eRunDetailsQueryKey,
    });
  });

  it("invalidates only the affected profile and run", () => {
    renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    act(() =>
      source.emit(
        "e2e-change",
        new MessageEvent("e2e-change", {
          data: JSON.stringify({ profileId: "profile-1", runId: "run-1" }),
        }),
      ),
    );

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...E2eProfileWorkspaceQueryKey, "profile-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...E2eProfileRunsQueryKey, "profile-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...E2eRunDetailsQueryKey, "profile-1", "run-1"],
    });
  });

  it("ignores malformed or incomplete events", () => {
    renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit(
        "e2e-change",
        new MessageEvent("e2e-change", { data: "not-json" }),
      );
      source.emit(
        "e2e-change",
        new MessageEvent("e2e-change", {
          data: JSON.stringify({ profileId: "profile-1" }),
        }),
      );
    });

    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it("closes the connection on unmount", () => {
    const { unmount } = renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    unmount();

    expect(source.closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the hook test and verify it fails**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/feature/e2e/use-e2e-run-events.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the E2E-specific EventSource hook**

Create `nextjs/feature/e2e/hooks/use-e2e-run-events.ts`:

```ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  E2eProfileRunsQueryKey,
  E2eProfileWorkspaceQueryKey,
  E2eRunDetailsQueryKey,
} from "../query/e2e-profile-workspace.query";

interface E2eRunChangedPayload {
  profileId: string;
  runId: string;
}

function parseE2eRunChangedPayload(data: string) {
  try {
    const payload = JSON.parse(data) as Partial<E2eRunChangedPayload>;
    return typeof payload.profileId === "string" &&
      payload.profileId.length > 0 &&
      typeof payload.runId === "string" &&
      payload.runId.length > 0
      ? (payload as E2eRunChangedPayload)
      : null;
  } catch {
    return null;
  }
}

export function useE2eRunEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/e2e-runs/events");

    const handleReady = () => {
      void queryClient.invalidateQueries({
        queryKey: E2eProfileWorkspaceQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: E2eProfileRunsQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: E2eRunDetailsQueryKey,
      });
    };

    const handleE2eChange = (event: MessageEvent<string>) => {
      const payload = parseE2eRunChangedPayload(event.data);
      if (!payload) return;

      void queryClient.invalidateQueries({
        queryKey: [...E2eProfileWorkspaceQueryKey, payload.profileId],
      });
      void queryClient.invalidateQueries({
        queryKey: [...E2eProfileRunsQueryKey, payload.profileId],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...E2eRunDetailsQueryKey,
          payload.profileId,
          payload.runId,
        ],
      });
    };

    source.addEventListener("ready", handleReady);
    source.addEventListener("e2e-change", handleE2eChange as EventListener);

    return () => {
      source.removeEventListener("ready", handleReady);
      source.removeEventListener(
        "e2e-change",
        handleE2eChange as EventListener,
      );
      source.close();
    };
  }, [queryClient]);
}
```

Do not add `onerror`, component state, retry timers, or polling.

- [ ] **Step 4: Run the hook test and typecheck**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/feature/e2e/use-e2e-run-events.test.tsx
pnpm exec tsc --noEmit
```

Expected: both commands pass.

---

### Task 5: Mount live updates and verify the complete change

**Files:**
- Create: `nextjs/feature/e2e/components/e2e-testing-live-updates.tsx`
- Modify: `nextjs/app/e2e-testing/page.tsx`
- Verify: all files listed above

- [ ] **Step 1: Add the page-level coordinator**

Create `nextjs/feature/e2e/components/e2e-testing-live-updates.tsx`:

```tsx
"use client";

import { useE2eRunEvents } from "../hooks/use-e2e-run-events";

export function E2eTestingLiveUpdates() {
  useE2eRunEvents();
  return null;
}
```

- [ ] **Step 2: Mount it independently of selected profile state**

Add this import to `nextjs/app/e2e-testing/page.tsx`:

```ts
import { E2eTestingLiveUpdates } from "@/feature/e2e/components/e2e-testing-live-updates";
```

Mount it inside `MainShell` immediately before the existing `Suspenser`:

```tsx
<E2eTestingLiveUpdates />
<Suspenser
  promise={dataPromise}
  fallback={<E2eTestingProfilesSkeleton />}
>
```

Do not change profile selection, pagination, sheet rendering, or enqueue
behavior.

- [ ] **Step 3: Run focused E2E live-update tests**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/feature/e2e/use-e2e-run-events.test.tsx __tests__/unit/feature/e2e/e2e-run-events.service.test.ts __tests__/unit/app/api/e2e-runs/events/route.test.ts
```

Expected: all focused event tests pass.

- [ ] **Step 4: Run existing Next.js E2E feature tests**

Run:

```powershell
cd nextjs
pnpm test -- __tests__/unit/feature/e2e
```

Expected: existing E2E feature behavior remains green.

- [ ] **Step 5: Run Playwright server verification**

Run:

```powershell
cd playwright
pnpm test:unit
pnpm typecheck
```

Expected: all server tests and the Playwright typecheck pass.

- [ ] **Step 6: Run Next.js verification**

Run:

```powershell
cd nextjs
pnpm test
pnpm exec tsc --noEmit
pnpm lint
```

Expected: all tests, typecheck, and lint pass. If a pre-existing failure is
encountered, record the exact file and rule and prove the new focused tests
still pass.

- [ ] **Step 7: Perform final preservation and scope checks**

From the repository root:

```powershell
git diff --check
git status --short
git diff --name-only
git diff
```

Confirm:

- the approved brainstorm and this plan remain present;
- notifications occur only inside successful E2E persistence transactions;
- SSE payloads contain identifiers only;
- PostgreSQL-backed APIs remain authoritative;
- no polling, migration, Smoke change, generic event abstraction, or unrelated
  edit was introduced;
- all mode-3 changes remain uncommitted on `feat/86d3u0drm`.
