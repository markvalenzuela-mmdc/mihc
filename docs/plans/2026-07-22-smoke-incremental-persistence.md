# Incremental Smoke Run Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Smoke runs and observed test progress while Playwright is still executing, then expose that database-backed progress through removable two-second frontend polling.

**Architecture:** The Inngest consumer creates a committed `running` run before spawning Playwright. A Smoke-only reporter queues short direct PostgreSQL writes from Playwright lifecycle callbacks and flushes them in awaited `onEnd`; the parent then finalizes the run and normalizes interrupted observed tests. Next.js renders the same PostgreSQL state and confines temporary polling to one hook, one interval constant, and the details query callback.

**Tech Stack:** TypeScript, Playwright 1.61 reporter API, Hono/Inngest, Drizzle ORM, PostgreSQL, Next.js 16 App Router, React 19, TanStack Query 5, Vitest, Node test runner.

**Execution constraint:** Mode 3 is active. Implement and verify all tasks, but leave implementation and plan changes uncommitted for review.

**Design:** `docs/brainstorm/2026-07-22-smoke-incremental-persistence.md`

---

## File Map

### Canonical database model

- Modify `nextjs/lib/drizzle/schema/apps.ts`: add active statuses and lifecycle timestamps.
- Create a generated migration under `nextjs/drizzle/` and update `nextjs/drizzle/meta/`: apply timestamp columns without changing E2E tables.
- Modify `playwright/server/db/schema.ts`: mirror only the Smoke table changes.

### Playwright/Hono persistence

- Rewrite `playwright/server/db/persist-run.ts`: expose create-run, start-result, complete-result, and finalize-run operations with injectable database executors.
- Create `playwright/server/db/persist-run.test.ts`: verify operation sequencing, aggregate updates, and interrupted-result normalization.
- Create `playwright/server/reporter/incremental-smoke-reporter.ts`: translate Playwright lifecycle callbacks into queued persistence operations.
- Create `playwright/server/reporter/incremental-smoke-reporter.test.ts`: verify event mapping, write ordering, failure formatting, and queue flushing.
- Modify `playwright/server/runner/run-smoke.ts`: pass run context to the child and enable the incremental reporter alongside JSON.
- Modify `playwright/server/inngest/smoke-consumer.ts`: split create, run, and finalize steps.
- Create `playwright/server/inngest/smoke-consumer.test.ts`: verify create/run/finalize ordering through injected dependencies.

### Next.js active state and removable polling

- Modify `nextjs/feature/smoke/types/smoke-test-apps.types.ts`: include `running` and lifecycle timestamps.
- Modify `nextjs/feature/smoke/schema/smoke-test-runs.schema.ts` and its test: accept active runs.
- Create `nextjs/feature/smoke/config/smoke-polling.config.ts`: own the two-second interval and 60-second start timeout.
- Create `nextjs/feature/smoke/hooks/use-smoke-run-polling.ts`: own temporary `router.refresh()` polling.
- Create `nextjs/__tests__/unit/feature/smoke/use-smoke-run-polling.test.tsx`: verify start, stop, timeout, and reload behavior.
- Modify `nextjs/app/smoke-testing/page.tsx`: derive and pass database-backed active state.
- Modify `nextjs/feature/smoke/components/smoke-testing-table.tsx`: start the temporary waiting phase after enqueue.
- Modify `nextjs/feature/smoke/components/smoke-testing-cards.tsx`: show running state consistently.
- Modify `nextjs/feature/smoke/components/smoke-run-details.tsx`: render active durations as `In progress`.
- Modify `nextjs/feature/smoke/query/smoke-run-details.query.ts`: poll only active details.
- Add focused tests for the details query polling callback and active rendering.

---

### Task 1: Extend the Smoke lifecycle schema

**Files:**
- Modify: `nextjs/lib/drizzle/schema/apps.ts`
- Modify: `playwright/server/db/schema.ts`
- Modify: `nextjs/feature/smoke/types/smoke-test-apps.types.ts`
- Modify: `nextjs/feature/smoke/schema/smoke-test-runs.schema.ts`
- Test: `nextjs/__tests__/unit/schema/smoke-test-runs.schema.test.ts`
- Generate: `nextjs/drizzle/0005_smoke_incremental_persistence.sql`
- Modify: `nextjs/drizzle/meta/0005_snapshot.json`
- Modify: `nextjs/drizzle/meta/_journal.json`

- [ ] **Step 1: Make the status-schema test require active runs**

Update the accepted status table to include `running` and remove it from rejected values:

```ts
it.each(["running", "success", "degraded", "failure"])(
  "accepts %s as a smoke run status",
  (status) => {
    expect(smokeRunsStatusSchema.parse({ status })).toEqual({ status });
  },
);
```

- [ ] **Step 2: Run the focused test and verify the current type fails it**

Run: `pnpm test -- __tests__/unit/schema/smoke-test-runs.schema.test.ts` from `nextjs/`.

Expected: failure because `running` is not part of `SmokeTestRunStatus`.

- [ ] **Step 3: Add lifecycle columns to the canonical schema**

Use these field contracts in `nextjs/lib/drizzle/schema/apps.ts`:

```ts
status: text("status")
  .notNull()
  .$type<"running" | "success" | "degraded" | "failure">(),
completedAt: timestamp("completed_at", { withTimezone: true }),
```

For result rows:

```ts
status: text("status")
  .notNull()
  .$type<"running" | "success" | "failure" | "skipped">(),
startedAt: timestamp("started_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
completedAt: timestamp("completed_at", { withTimezone: true }),
```

Mirror the same Smoke fields in `playwright/server/db/schema.ts`. Do not touch E2E definitions.

- [ ] **Step 4: Update application types**

Extend run/result status unions and add `completedAt`, `startedAt`, and result `completedAt` fields while retaining all existing fields.

- [ ] **Step 5: Generate and inspect the migration**

Run: `pnpm db:generate --name smoke_incremental_persistence` from `nextjs/`.

Expected: one migration adding `smoke_runs.completed_at`, `smoke_runs_test_results.started_at`, and `smoke_runs_test_results.completed_at`; no E2E DDL.

- [ ] **Step 6: Run schema tests and both package typechecks**

Run:

```text
nextjs: pnpm test -- __tests__/unit/schema/smoke-test-runs.schema.test.ts
nextjs: pnpm exec tsc --noEmit
playwright: pnpm typecheck
```

Expected: all pass after downstream compile errors exposed by the new required type fields are corrected in fixtures.

### Task 2: Split Smoke persistence into short operations

**Files:**
- Modify: `playwright/server/db/persist-run.ts`
- Create: `playwright/server/db/persist-run.test.ts`

- [ ] **Step 1: Write tests for the four persistence operations**

Cover these public contracts:

```ts
createSmokeRun({ appId, trigger, requestedBy, checkedAt, logger }, db)
startSmokeTestResult({ runId, testName, testFile, startedAt, logger }, db)
completeSmokeTestResult({ resultId, runId, status, durationMs, errorMessage, completedAt, logger }, db)
finalizeSmokeRun({ runId, status, durationSeconds, completedAt, logger }, db)
```

Assertions must prove:

- creation inserts `running` with zero counters;
- start inserts only the observed row and increments total;
- completion updates that row and increments passed or failed exactly once;
- finalization changes remaining running rows to failure, preserves terminal rows, recomputes totals, and updates the run terminal fields.

- [ ] **Step 2: Run the persistence test and verify the missing exports fail**

Run: `pnpm test:unit -- server/db/persist-run.test.ts` from `playwright/`.

Expected: test compilation fails because the split persistence functions do not exist.

- [ ] **Step 3: Implement run creation**

Retain the existing three-attempt `(app_id, run_number)` race retry. Insert and commit the run independently:

```ts
const [inserted] = await tx
  .insert(smokeRuns)
  .values({
    runNumber,
    appId,
    status: "running",
    trigger,
    total: 0,
    passed: 0,
    failed: 0,
    durationSeconds: null,
    startedBy: requestedBy ?? null,
    checkedAt,
    completedAt: null,
  })
  .returning({ id: smokeRuns.id });
```

- [ ] **Step 4: Implement observed-result start and completion**

Each function uses one short transaction. Start inserts the result and increments `smoke_runs.total`. Completion updates by database result ID and increments only the matching terminal counter using SQL arithmetic. Skipped results increment neither passed nor failed.

- [ ] **Step 5: Implement terminal finalization**

Within one transaction:

1. update rows still `running` to `failure` with `Test execution was interrupted before completion`;
2. read every persisted result status for the run;
3. recompute total, passed, and failed;
4. update run status, duration, completion time, and counters.

- [ ] **Step 6: Run the persistence tests**

Run: `pnpm test:unit -- server/db/persist-run.test.ts` from `playwright/`.

Expected: all persistence tests pass.

### Task 3: Add the queued incremental reporter

**Files:**
- Create: `playwright/server/reporter/incremental-smoke-reporter.ts`
- Create: `playwright/server/reporter/incremental-smoke-reporter.test.ts`

- [ ] **Step 1: Write reporter lifecycle tests using a fake persistence adapter**

The adapter has this interface:

```ts
export interface SmokeReporterPersistence {
  start(input: StartSmokeTestResultInput): Promise<{ resultId: string }>;
  complete(input: CompleteSmokeTestResultInput): Promise<void>;
}
```

Tests instantiate the reporter directly, call `onTestBegin`, call `onTestEnd`, then await `onEnd`. Assert start precedes completion, the same result ID is used, statuses map correctly, failure details use `formatFailure`, and `onEnd` waits for delayed writes.

- [ ] **Step 2: Run the reporter test and verify it fails before implementation**

Run: `pnpm test:unit -- server/reporter/incremental-smoke-reporter.test.ts` from `playwright/`.

Expected: failure because the reporter module does not exist.

- [ ] **Step 3: Implement a non-blocking callback queue with an awaited flush**

Playwright 1.61 declares `onTestBegin` and `onTestEnd` as `void`, so callbacks enqueue promises. `onEnd` is awaited by Playwright and flushes the queue:

```ts
private queue: Promise<void> = Promise.resolve();
private persistenceError: unknown;
private readonly resultIds = new WeakMap<TestResult, Promise<string>>();

private enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const pending = this.queue.then(operation);
  const tracked = pending.catch((error) => {
    this.persistenceError ??= error;
    throw error;
  });
  this.queue = tracked.then(() => undefined, () => undefined);
  return tracked;
}
```

`onTestBegin` stores the pending result ID in the `WeakMap`. `onTestEnd` queues a completion that awaits that ID. `onEnd` awaits the settled queue and returns `{ status: "failed" }` if persistence failed.

- [ ] **Step 4: Map Playwright fields without adding expected tests**

Use `test.title`, `test.location.file`, `result.startTime`, `result.duration`, `result.status`, `test.annotations`, and `result.error`. Map `passed` to `success`, `skipped` to `skipped`, and all other terminal statuses to `failure`.

- [ ] **Step 5: Run reporter and formatter tests**

Run: `pnpm test:unit -- server/reporter/incremental-smoke-reporter.test.ts server/runner/format-failure.test.ts`.

Expected: all pass.

### Task 4: Wire create/run/finalize through Inngest

**Files:**
- Modify: `playwright/server/runner/run-smoke.ts`
- Modify: `playwright/server/inngest/smoke-consumer.ts`
- Create: `playwright/server/inngest/smoke-consumer.test.ts`

- [ ] **Step 1: Write a flow-order test**

Export the validated execution body behind injected create, runner, and finalize dependencies. Test it directly and assert this order:

```text
create-smoke-run -> run-suite(runId) -> finalize-smoke-run(runId)
```

Assert creation failure prevents the runner call, and a null report still calls finalization with `failure`.

- [ ] **Step 2: Pass reporter context into the child**

Add `runId` to `RunSmokeOptions`. Set these child environment values:

```ts
SMOKE_RUN_ID: runId,
SMOKE_CORRELATION_ID: correlationId,
```

Run both reporters for this spawned Smoke suite:

```ts
`--reporter=./server/reporter/incremental-smoke-reporter.ts,json`
```

Keep `PLAYWRIGHT_JSON_OUTPUT_FILE` and the existing report cleanup.

- [ ] **Step 3: Split the consumer steps**

Create the run before `run-suite`, return mapped terminal data from `run-suite`, then finalize in a third step. Return the created run ID/number and final status to Inngest.

- [ ] **Step 4: Run all Playwright server unit tests and typecheck**

Run:

```text
pnpm test:unit
pnpm typecheck
```

Expected: all tests and typecheck pass.

### Task 5: Render active Smoke state

**Files:**
- Modify: `nextjs/feature/smoke/components/smoke-testing-cards.tsx`
- Modify: `nextjs/feature/smoke/components/smoke-run-details.tsx`
- Modify: `nextjs/app/smoke-testing/page.tsx`
- Add focused component tests under `nextjs/__tests__/unit/feature/smoke/`.

- [ ] **Step 1: Write active-state rendering tests**

Assert a running card receives its active color/status and running details display `In progress` instead of `0s`.

- [ ] **Step 2: Run focused tests and verify the current UI fails them**

Run: `pnpm test -- __tests__/unit/feature/smoke/smoke-active-state.test.tsx` from `nextjs/`.

Expected: running data is rejected or rendered without the active treatment.

- [ ] **Step 3: Add active rendering**

Use the existing `StatusBadge` support for `running`. Add a blue card-history segment for active runs and branch duration text on `details.status === "running"`.

- [ ] **Step 4: Derive server-backed active state**

In the Smoke page data result, derive:

```ts
const hasActiveRun = apps.some((app) =>
  app.smokeRuns.some((run) => run.status === "running"),
);
```

Pass this boolean to the run-history client component. It is derived from PostgreSQL-backed server data, so reloads reconstruct polling state.

- [ ] **Step 5: Run active-state tests**

Expected: all focused component tests pass.

### Task 6: Add disposable two-second polling

**Files:**
- Create: `nextjs/feature/smoke/config/smoke-polling.config.ts`
- Create: `nextjs/feature/smoke/hooks/use-smoke-run-polling.ts`
- Create: `nextjs/__tests__/unit/feature/smoke/use-smoke-run-polling.test.tsx`
- Modify: `nextjs/feature/smoke/components/smoke-testing-table.tsx`
- Modify: `nextjs/feature/smoke/query/smoke-run-details.query.ts`
- Create: `nextjs/__tests__/unit/feature/smoke/smoke-run-details.query.test.ts`

- [ ] **Step 1: Write fake-timer tests for the page polling hook**

Mock `next/navigation` and verify:

- `hasActiveRun = true` calls `router.refresh()` every 2,000 ms;
- `hasActiveRun = false` does not poll until `startAwaitingRun()` is called;
- seeing an active run clears the awaiting-start phase while active polling continues;
- terminal state stops polling;
- no observed run stops the awaiting phase after 60,000 ms.

- [ ] **Step 2: Implement polling-only constants**

```ts
export const SMOKE_POLL_INTERVAL_MS = 2_000;
export const SMOKE_RUN_START_TIMEOUT_MS = 60_000;
```

- [ ] **Step 3: Implement the isolated page hook**

The hook owns only timer state and `router.refresh()`. It returns `startAwaitingRun`, which the manual action calls after a successful enqueue. Use one effect for the refresh interval and one effect for the bounded awaiting phase; clean up every timer.

- [ ] **Step 4: Add details-query polling tests and callback**

Set `refetchInterval` to `SMOKE_POLL_INTERVAL_MS` only when `query.state.data?.details.status === "running"`; otherwise return `false`.

- [ ] **Step 5: Connect the hook to the run-history component**

Pass `hasActiveRun` into `SmokeTestingTable`, invoke the hook once, and call `startAwaitingRun()` only after `requestSmokeTest` succeeds. Do not alter API payloads or persistence contracts.

- [ ] **Step 6: Run focused polling tests**

Run:

```text
pnpm test -- __tests__/unit/feature/smoke/use-smoke-run-polling.test.tsx __tests__/unit/feature/smoke/smoke-run-details.query.test.ts
```

Expected: all pass with fake timers restored after each test.

### Task 7: Full verification and scope audit

**Files:**
- Review all changed files.
- Do not modify E2E implementation files.

- [ ] **Step 1: Run the Playwright checks**

From `playwright/`:

```text
pnpm test:unit
pnpm typecheck
```

- [ ] **Step 2: Run the Next.js checks**

From `nextjs/`:

```text
pnpm test
pnpm lint
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Validate migration and whitespace**

From repository root:

```text
git diff --check
git status --short
```

Inspect the generated migration and confirm it contains only the three approved Smoke timestamp columns.

- [ ] **Step 4: Audit scope and acceptance criteria**

Confirm:

- the run row is committed before the child starts;
- observed starts and completions persist incrementally;
- completed rows survive later failure;
- running rows normalize on interruption;
- polling starts at enqueue/reload and stops at terminal state;
- polling code is confined to the documented disposable boundary;
- no E2E implementation files changed;
- no stable IDs, uniqueness constraints, or idempotent upserts were added.

- [ ] **Step 5: Stop at the Mode 3 review gate**

Leave all implementation and plan changes uncommitted. Report changed files, verification results, residual risks, and the exact diff ready for user review.
