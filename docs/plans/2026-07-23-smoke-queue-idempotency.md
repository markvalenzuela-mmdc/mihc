# Smoke Queue and Idempotency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Smoke requests as queued work, execute one suite and one test case at a time, and make every run/result state transition safe to replay.

**Architecture:** Next.js creates the queued run before publishing an event containing its `runId`. The Hono/Inngest consumer globally serializes Smoke work, conditionally claims queued runs, launches Playwright with one worker, and uses database constraints plus conditional updates to make reporter events idempotent.

**Tech Stack:** Next.js 16 server actions, Inngest 4, Playwright 1.61, Hono, PostgreSQL, Drizzle ORM, Vitest, Node test runner.

---

## File Map

### Next.js producer and database owner

- Modify `nextjs/lib/drizzle/schema/apps.ts` — add queue, request identity, start timestamp, test identity, retry attempt, and uniqueness definitions.
- Generate `nextjs/drizzle/0006_smoke_queue_idempotency.sql` — migrate existing rows safely and add database constraints.
- Generate `nextjs/drizzle/meta/0006_snapshot.json` and modify `nextjs/drizzle/meta/_journal.json` — keep Drizzle migration metadata current.
- Modify `nextjs/__tests__/integration/api-routes-and-db.test.ts` — prove PostgreSQL rejects duplicate request and result-attempt identities.
- Create `nextjs/feature/smoke/services/enqueue-smoke-run.service.ts` — create queued runs and terminalize rows whose Inngest publication fails.
- Create `nextjs/__tests__/unit/services/smoke/enqueue-smoke-run.service.test.ts` — verify queue persistence and publication-failure transitions.
- Modify `nextjs/feature/smoke/actions/request-smoke-test.action.ts` — persist first, publish second, and compensate failed publication.
- Modify `nextjs/__tests__/unit/feature/smoke/request-smoke-test.action.test.ts` — verify call order and the `runId` event contract.
- Modify `nextjs/lib/inngest/client.ts` — add `runId` to the producer event type.

### Playwright/Hono consumer

- Modify `playwright/server/inngest/events.ts` — validate `runId`.
- Modify `playwright/server/inngest/smoke-consumer.ts` — configure concurrency `1`, claim queued rows, and skip duplicate claims.
- Modify `playwright/server/inngest/smoke-consumer.test.ts` — verify concurrency configuration, claim behavior, and ordered workflow steps.
- Modify `playwright/server/runner/run-smoke.ts` — launch Smoke with one Playwright worker.
- Create `playwright/server/runner/run-smoke.test.ts` — verify the exact child-process arguments without launching a browser.
- Modify `playwright/server/reporter/incremental-smoke-reporter.ts` — persist Playwright test IDs and retry numbers.
- Modify `playwright/server/reporter/incremental-smoke-reporter.test.ts` — verify stable attempt identity.
- Modify `playwright/server/db/schema.ts` — mirror the canonical Smoke columns and constraints.
- Modify `playwright/server/db/persist-run.ts` — replace run creation with queue claiming and make starts, completions, and finalization conditional/idempotent.
- Modify `playwright/server/db/persist-run.test.ts` — cover duplicates, retries, conditional transitions, and aggregate stability.

### Queue visibility

- Modify `nextjs/feature/smoke/types/smoke-test-apps.types.ts` — expose `queued`.
- Modify `nextjs/feature/smoke/components/smoke-run-details.tsx` — render a queued empty state.
- Modify `nextjs/feature/smoke/components/smoke-testing-cards.tsx` — render queued history segments.
- Modify `nextjs/__tests__/unit/schema/smoke-test-runs.schema.test.ts` — accept `queued`.
- Modify `nextjs/__tests__/unit/feature/smoke/smoke-active-state.test.tsx` — verify queued UI behavior.

Mode 3 is active: implementation changes remain uncommitted for user review. The task checkpoints below replace per-task commits.

---

### Task 1: Add the canonical queue and attempt schema

**Files:**
- Modify: `nextjs/__tests__/unit/schema/smoke-test-runs.schema.test.ts`
- Modify: `nextjs/lib/drizzle/schema/apps.ts`
- Create: `nextjs/drizzle/0006_smoke_queue_idempotency.sql`
- Create: `nextjs/drizzle/meta/0006_snapshot.json`
- Modify: `nextjs/drizzle/meta/_journal.json`
- Modify: `playwright/server/db/schema.ts`

- [x] **Step 1: Make the status test require `queued`**

Change the accepted status cases:

```ts
it.each(["queued", "running", "success", "degraded", "failure"])(
  "accepts %s as a smoke run status",
  (status) => {
    expect(smokeRunsStatusSchema.parse({ status })).toEqual({ status });
  },
);
```

- [x] **Step 2: Run the status test and verify it fails**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/schema/smoke-test-runs.schema.test.ts
```

Expected: FAIL because `queued` is not in `SmokeTestRunStatus`.

- [x] **Step 3: Add canonical columns and constraints**

Update `nextjs/lib/drizzle/schema/apps.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  integer,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// smokeRuns additions
correlationId: uuid("correlation_id").defaultRandom().notNull().unique(),
status: text("status")
  .notNull()
  .$type<"queued" | "running" | "success" | "degraded" | "failure">(),
startedAt: timestamp("started_at", { withTimezone: true }),

// smokeRunsTestResults additions
testId: text("test_id")
  .default(sql`gen_random_uuid()::text`)
  .notNull(),
retryAttempt: integer("retry_attempt").default(0).notNull(),
```

Add the result uniqueness definition alongside the existing run index:

```ts
(table) => [
  unique().on(table.runId, table.testId, table.retryAttempt),
  index("idx_smoke_results_run_id").on(table.runId),
],
```

Mirror the same Smoke fields and constraints in
`playwright/server/db/schema.ts`. That file already imports `sql`.

- [x] **Step 4: Add `queued` to the application status contract**

Update `nextjs/feature/smoke/types/smoke-test-apps.types.ts`:

```ts
export const SmokeTestRunStatus = [
  "queued",
  "running",
  "success",
  "degraded",
  "failure",
] as const;
```

- [x] **Step 5: Generate the named migration**

Run:

```bash
cd nextjs
pnpm db:generate --name=smoke_queue_idempotency
```

Expected: create `drizzle/0006_smoke_queue_idempotency.sql`,
`drizzle/meta/0006_snapshot.json`, and append journal entry `idx: 6`.

Inspect the SQL and require these equivalent operations:

```sql
ALTER TABLE "smoke_runs"
  ADD COLUMN "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "smoke_runs"
  ADD COLUMN "started_at" timestamp with time zone;
ALTER TABLE "smoke_runs_test_results"
  ADD COLUMN "test_id" text DEFAULT gen_random_uuid()::text NOT NULL;
ALTER TABLE "smoke_runs_test_results"
  ADD COLUMN "retry_attempt" integer DEFAULT 0 NOT NULL;
ALTER TABLE "smoke_runs"
  ADD CONSTRAINT "smoke_runs_correlation_id_unique" UNIQUE("correlation_id");
ALTER TABLE "smoke_runs_test_results"
  ADD CONSTRAINT "smoke_runs_test_results_run_id_test_id_retry_attempt_unique"
  UNIQUE("run_id", "test_id", "retry_attempt");
```

- [x] **Step 6: Add database constraint integration tests**

Add two database integration cases to
`nextjs/__tests__/integration/api-routes-and-db.test.ts`:

```ts
it("enforces one Smoke run per correlation ID", async () => {
  const db = getDb();
  const firstRunId = randomUUID();
  const duplicateRunId = randomUUID();
  const correlationId = randomUUID();

  try {
    await db.insert(smokeRuns).values({
      id: firstRunId,
      runNumber: 90_003,
      appId: "website",
      correlationId,
      status: "queued",
      trigger: "manual",
      checkedAt: new Date("2026-07-23T08:00:00.000Z"),
    });

    await expect(
      db.insert(smokeRuns).values({
        id: duplicateRunId,
        runNumber: 90_004,
        appId: "website",
        correlationId,
        status: "queued",
        trigger: "manual",
        checkedAt: new Date("2026-07-23T08:00:01.000Z"),
      }),
    ).rejects.toThrow();
  } finally {
    await db.delete(smokeRuns).where(eq(smokeRuns.id, duplicateRunId));
    await db.delete(smokeRuns).where(eq(smokeRuns.id, firstRunId));
  }
});

it("enforces one Smoke result row per run test and retry", async () => {
  const db = getDb();
  const runId = randomUUID();
  const firstResultId = randomUUID();
  const duplicateResultId = randomUUID();

  try {
    await db.insert(smokeRuns).values({
      id: runId,
      runNumber: 90_005,
      appId: "website",
      status: "running",
      trigger: "manual",
      checkedAt: new Date("2026-07-23T08:01:00.000Z"),
    });

    const resultIdentity = {
      runId,
      testId: "smoke-landing",
      retryAttempt: 0,
      testName: "Landing page",
      status: "running" as const,
    };
    await db.insert(smokeRunsTestResults).values({
      id: firstResultId,
      ...resultIdentity,
    });

    await expect(
      db.insert(smokeRunsTestResults).values({
        id: duplicateResultId,
        ...resultIdentity,
      }),
    ).rejects.toThrow();
  } finally {
    await db
      .delete(smokeRunsTestResults)
      .where(eq(smokeRunsTestResults.runId, runId));
    await db.delete(smokeRuns).where(eq(smokeRuns.id, runId));
  }
});
```

- [x] **Step 7: Re-run schema tests and typechecks**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/schema/smoke-test-runs.schema.test.ts
pnpm exec tsc --noEmit
cd ../playwright
pnpm typecheck
```

Expected: PASS.

- [x] **Step 8: Review checkpoint**

Run `git diff --check` and inspect only the schema, migration, mirror schema,
status type, and test changes. Do not commit in Mode 3.

---

### Task 2: Persist queued runs before publication

**Files:**
- Create: `nextjs/feature/smoke/services/enqueue-smoke-run.service.ts`
- Create: `nextjs/__tests__/unit/services/smoke/enqueue-smoke-run.service.test.ts`

- [x] **Step 1: Write service tests for queue creation and failure**

Create tests with a transaction-capable fake database. The assertions must
cover the full inserted row and the conditional failure update:

```ts
it("creates a visible queued run with the request correlation ID", async () => {
  const queued = await createQueuedSmokeRun(
    {
      appId: "website",
      trigger: "manual",
      requestedBy: "11111111-1111-1111-1111-111111111111",
      correlationId: "22222222-2222-2222-2222-222222222222",
      checkedAt: new Date("2026-07-23T08:00:00.000Z"),
    },
    fake.db as never,
  );

  expect(queued).toEqual({ runId: "run-1", runNumber: 3 });
  expect(fake.inserts[0].values).toMatchObject({
    appId: "website",
    status: "queued",
    correlationId: "22222222-2222-2222-2222-222222222222",
    startedAt: null,
    completedAt: null,
  });
});

it("marks only a queued run failed when publication fails", async () => {
  const changed = await failQueuedSmokeRun(
    {
      runId: "run-1",
      completedAt: new Date("2026-07-23T08:00:01.000Z"),
    },
    fake.db as never,
  );

  expect(changed).toBe(true);
  expect(fake.failureWhereStatus).toBe("queued");
});
```

Also test that a run-number unique violation retries and that both successful
operations emit `pg_notify('smoke_run_changed', runId)`. Add a correlation
replay case:

```ts
it("returns the existing queued run for a repeated correlation ID", async () => {
  const fake = createFakeDb({
    uniqueViolation: true,
    existingRun: { id: "run-existing", runNumber: 2 },
  });

  await expect(
    createQueuedSmokeRun(queueInput, fake.db as never),
  ).resolves.toEqual({ runId: "run-existing", runNumber: 2 });
});
```

- [x] **Step 2: Run the new service tests and verify they fail**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/services/smoke/enqueue-smoke-run.service.test.ts
```

Expected: FAIL because the service does not exist.

- [x] **Step 3: Implement the queue persistence service**

Create `enqueue-smoke-run.service.ts` with these public contracts:

```ts
export interface CreateQueuedSmokeRunInput {
  appId: string;
  trigger: "manual" | "scheduled";
  requestedBy?: string | null;
  correlationId: string;
  checkedAt: Date;
}

export interface CreateQueuedSmokeRunResult {
  runId: string;
  runNumber: number;
}

export async function createQueuedSmokeRun(
  input: CreateQueuedSmokeRunInput,
  database = getDb(),
): Promise<CreateQueuedSmokeRunResult>;

export async function failQueuedSmokeRun(
  input: { runId: string; completedAt: Date },
  database = getDb(),
): Promise<boolean>;
```

Use the existing three-attempt run-number allocation pattern from
`playwright/server/db/persist-run.ts`. Insert:

```ts
{
  runNumber,
  appId,
  correlationId,
  status: "queued",
  trigger,
  total: 0,
  passed: 0,
  failed: 0,
  durationSeconds: null,
  startedBy: requestedBy ?? null,
  checkedAt,
  startedAt: null,
  completedAt: null,
}
```

On a PostgreSQL unique violation, first query `smoke_runs` by
`correlation_id`. Return that row when present; otherwise retry run-number
allocation until the existing three-attempt limit is exhausted:

```ts
const existing = await database.query.smokeRuns.findFirst({
  columns: { id: true, runNumber: true },
  where: (smokeRuns, { eq }) =>
    eq(smokeRuns.correlationId, correlationId),
});

if (existing) {
  return { runId: existing.id, runNumber: existing.runNumber };
}
```

`failQueuedSmokeRun` must use:

```ts
const changed = await database
  .update(smokeRuns)
  .set({
    status: "failure",
    durationSeconds: null,
    completedAt,
  })
  .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "queued")))
  .returning({ id: smokeRuns.id });

return changed.length === 1;
```

Notify `smoke_run_changed` inside the same transaction after a successful
insert or transition.

- [x] **Step 4: Run service tests**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/services/smoke/enqueue-smoke-run.service.test.ts
```

Expected: PASS.

- [x] **Step 5: Review checkpoint**

Run `git diff --check`. Confirm the service owns only queued-run persistence and
does not send Inngest events.

---

### Task 3: Publish the persisted run identity

**Files:**
- Modify: `nextjs/lib/inngest/client.ts`
- Modify: `playwright/server/inngest/events.ts`
- Modify: `nextjs/feature/smoke/actions/request-smoke-test.action.ts`
- Modify: `nextjs/__tests__/unit/feature/smoke/request-smoke-test.action.test.ts`

- [x] **Step 1: Extend action tests with persistence mocks**

Mock the new service:

```ts
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSmokeTestTarget: vi.fn(),
  createQueuedSmokeRun: vi.fn(),
  failQueuedSmokeRun: vi.fn(),
  inngestSend: vi.fn(),
}));

vi.mock("@/feature/smoke/services/enqueue-smoke-run.service", () => ({
  createQueuedSmokeRun: mocks.createQueuedSmokeRun,
  failQueuedSmokeRun: mocks.failQueuedSmokeRun,
}));
```

In the success test, return `{ runId: "run-1", runNumber: 7 }` and assert:

```ts
expect(mocks.createQueuedSmokeRun.mock.invocationCallOrder[0]).toBeLessThan(
  mocks.inngestSend.mock.invocationCallOrder[0],
);

expect(mocks.inngestSend).toHaveBeenCalledWith({
  name: "smoke-test/requested",
  data: expect.objectContaining({
    runId: "run-1",
    correlationId: expect.any(String),
  }),
});
```

Add publication-failure coverage:

```ts
it("terminalizes the queued run when event publication fails", async () => {
  mocks.createQueuedSmokeRun.mockResolvedValue({
    runId: "run-1",
    runNumber: 7,
  });
  mocks.inngestSend.mockRejectedValue(new Error("Inngest unavailable"));
  mocks.failQueuedSmokeRun.mockResolvedValue(true);

  await expect(requestSmokeTest("website")).resolves.toEqual({
    ok: false,
    error: "Failed to enqueue smoke test. Please try again.",
  });

  expect(mocks.failQueuedSmokeRun).toHaveBeenCalledWith({
    runId: "run-1",
    completedAt: expect.any(Date),
  });
});
```

- [x] **Step 2: Run action tests and verify they fail**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/feature/smoke/request-smoke-test.action.test.ts
```

Expected: FAIL because persistence is not called and the event has no `runId`.

- [x] **Step 3: Extend both event contracts**

Add to `SmokeTestRequestedData` and `smokeTestRequestedSchema`:

```ts
runId: string; // producer interface
runId: z.string().uuid(), // consumer runtime schema
```

- [x] **Step 4: Persist before sending and compensate send failure**

In `requestSmokeTest`, create the row before `inngest.send`:

```ts
const correlationId = crypto.randomUUID();
let queuedRun: Awaited<ReturnType<typeof createQueuedSmokeRun>> | undefined;

try {
  queuedRun = await createQueuedSmokeRun({
    appId: target.appId,
    trigger: "manual",
    requestedBy: user.id,
    correlationId,
    checkedAt: new Date(),
  });

  await inngest.send({
    name: SMOKE_TEST_REQUESTED,
    data: {
      runId: queuedRun.runId,
      appId: target.appId,
      suite: target.suite,
      trigger: "manual",
      correlationId,
      requestedBy: user.id,
      requestedAt: new Date().toISOString(),
    },
  });

  return ok({ correlationId });
} catch (error) {
  if (queuedRun) {
    try {
      await failQueuedSmokeRun({
        runId: queuedRun.runId,
        completedAt: new Date(),
      });
    } catch (markError) {
      console.error(
        JSON.stringify({
          event: "smoke_test_queue_failure_mark_failed",
          correlationId,
          message:
            markError instanceof Error ? markError.message : String(markError),
        }),
      );
    }
  }

  // Keep the existing structured error log and user-facing error.
  return err("Failed to enqueue smoke test. Please try again.");
}
```

Log a failure from `failQueuedSmokeRun` separately, but preserve the server
action's typed error result.

- [x] **Step 5: Run producer and consumer contract tests**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/feature/smoke/request-smoke-test.action.test.ts
cd ../playwright
pnpm test:unit
```

Expected: Next.js action tests PASS. Update the shared `data` fixture in
`smoke-consumer.test.ts` with a UUID `runId` if the Playwright suite reports a
contract fixture failure.

- [x] **Step 6: Review checkpoint**

Confirm the database insert precedes the event publication and every published
Smoke event contains the persisted UUID.

---

### Task 4: Serialize and claim Smoke suites

**Files:**
- Modify: `playwright/server/db/persist-run.ts`
- Modify: `playwright/server/db/persist-run.test.ts`
- Modify: `playwright/server/inngest/smoke-consumer.ts`
- Modify: `playwright/server/inngest/smoke-consumer.test.ts`

- [x] **Step 1: Replace run-creation tests with claim tests**

Add:

```ts
test("claimSmokeRun changes only a queued run to running", async () => {
  const claimed = await claimSmokeRun(
    {
      runId: "11111111-1111-1111-1111-111111111111",
      startedAt: new Date("2026-07-23T08:00:00.000Z"),
      logger,
    },
    fake.db as never,
  );

  assert.equal(claimed, true);
  assert.equal(fake.claimWhereStatus, "queued");
  assert.deepEqual(fake.updates[0].values, {
    status: "running",
    startedAt: new Date("2026-07-23T08:00:00.000Z"),
  });
});

test("claimSmokeRun returns false when the run is no longer queued", async () => {
  const fake = createFakeDb([], { claimResult: [] });
  assert.equal(
    await claimSmokeRun(
      {
        runId: "11111111-1111-1111-1111-111111111111",
        startedAt: new Date(),
        logger,
      },
      fake.db as never,
    ),
    false,
  );
});
```

- [x] **Step 2: Run persistence tests and verify they fail**

Run:

```bash
cd playwright
node --import tsx --test server/db/persist-run.test.ts
```

Expected: FAIL because `claimSmokeRun` does not exist.

- [x] **Step 3: Implement the conditional queue claim**

Replace the Playwright-owned `createSmokeRun` input/result and implementation
with:

```ts
export interface ClaimSmokeRunInput {
  runId: string;
  startedAt: Date;
  logger: Logger;
}

export async function claimSmokeRun(
  input: ClaimSmokeRunInput,
  database: Db = db,
): Promise<boolean> {
  const { runId, startedAt, logger } = input;

  return database.transaction(async (tx) => {
    const claimed = await tx
      .update(smokeRuns)
      .set({ status: "running", startedAt })
      .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "queued")))
      .returning({ id: smokeRuns.id });

    if (claimed.length === 0) return false;

    await notifySmokeRunChanged(tx, runId);
    logger.info("smoke_run_claimed", { runId });
    return true;
  });
}
```

- [x] **Step 4: Make the consumer claim before execution**

Export a testable config and use it in `createFunction`:

```ts
export const SMOKE_CONSUMER_CONFIG = {
  id: "website-smoke-consumer",
  concurrency: 1,
  idempotency: "event.data.correlationId",
  triggers: [{ event: SMOKE_TEST_REQUESTED }],
};
```

Change dependencies:

```ts
export interface SmokeRunDependencies {
  claim(input: ClaimSmokeRunInput): ReturnType<typeof claimSmokeRun>;
  run(options: RunSmokeOptions): Promise<RunSmokeResult>;
  finalize(input: FinalizeSmokeRunInput): ReturnType<typeof finalizeSmokeRun>;
}
```

Start execution with:

```ts
const claimed = await runStep("claim-smoke-run", () =>
  dependencies.claim({
    runId: data.runId,
    startedAt: new Date(),
    logger,
  }),
);

if (!claimed) {
  logger.info("smoke_run_already_claimed", { runId: data.runId });
  return { skipped: "already_claimed" as const, runId: data.runId };
}
```

Pass `data.runId` to the runner and finalizer. Remove run creation and run-number
return values from the consumer flow.

- [x] **Step 5: Update consumer tests**

Require:

```ts
assert.equal(SMOKE_CONSUMER_CONFIG.concurrency, 1);
assert.deepEqual(steps, [
  "claim-smoke-run",
  "run-suite",
  "finalize-smoke-run",
]);
assert.equal(runnerRunId, data.runId);
```

Add a duplicate-claim test whose `claim` dependency returns `false` and assert
that neither `run` nor `finalize` is called.

- [x] **Step 6: Run claim and consumer tests**

Run:

```bash
cd playwright
node --import tsx --test server/db/persist-run.test.ts
node --import tsx --test server/inngest/smoke-consumer.test.ts
```

Expected: PASS.

- [x] **Step 7: Review checkpoint**

Confirm the only queue wait is inside Inngest and that Hono holds no transaction
between `claim-smoke-run`, `run-suite`, and `finalize-smoke-run`.

---

### Task 5: Force one Playwright test case at a time

**Files:**
- Modify: `playwright/server/runner/run-smoke.ts`
- Create: `playwright/server/runner/run-smoke.test.ts`

- [x] **Step 1: Add a failing pure argument test**

Create:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSmokeArgs } from "./run-smoke";
import { SMOKE_TARGETS } from "./smoke-targets";

test("Smoke execution uses exactly one Playwright worker", () => {
  assert.deepEqual(buildSmokeArgs(SMOKE_TARGETS.website), [
    "test",
    SMOKE_TARGETS.website.testPath,
    `--project=${SMOKE_TARGETS.website.project}`,
    "--workers=1",
    "--reporter=./server/reporter/incremental-smoke-reporter.ts,json",
  ]);
});
```

- [x] **Step 2: Run the runner test and verify it fails**

Run:

```bash
cd playwright
node --import tsx --test server/runner/run-smoke.test.ts
```

Expected: FAIL because `buildSmokeArgs` does not exist.

- [x] **Step 3: Extract and use the argument builder**

Add:

```ts
export function buildSmokeArgs(target: SmokeTarget): string[] {
  return [
    "test",
    target.testPath,
    `--project=${target.project}`,
    "--workers=1",
    "--reporter=./server/reporter/incremental-smoke-reporter.ts,json",
  ];
}
```

Replace the inline child argument array with `buildSmokeArgs(target)`.

- [x] **Step 4: Run the runner test**

Run:

```bash
cd playwright
node --import tsx --test server/runner/run-smoke.test.ts
```

Expected: PASS.

- [x] **Step 5: Review checkpoint**

Confirm `run-e2e.ts` and the `enrollmate` Playwright project are unchanged.

---

### Task 6: Make result attempts idempotent

**Files:**
- Modify: `playwright/server/db/persist-run.ts`
- Modify: `playwright/server/db/persist-run.test.ts`
- Modify: `playwright/server/reporter/incremental-smoke-reporter.ts`
- Modify: `playwright/server/reporter/incremental-smoke-reporter.test.ts`

- [x] **Step 1: Require stable attempt identity from the reporter**

Update test fixtures with:

```ts
function testCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: "smoke-landing",
    title: "loads the landing page",
    // existing fixture fields
    ...overrides,
  } as TestCase;
}

function testResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    retry: 0,
    // existing fixture fields
    ...overrides,
  } as TestResult;
}
```

Assert the start call contains:

```ts
assert.equal(started.testId, "smoke-landing");
assert.equal(started.retryAttempt, 0);
```

Add a retry case with `retry: 1` and assert it emits `retryAttempt: 1`.

- [x] **Step 2: Add persistence tests for duplicate starts and completions**

Require these behaviors:

```ts
test("duplicate start returns the existing result without incrementing total", async () => {
  const fake = createFakeDb([], {
    insertedResult: [],
    existingResultId: "result-existing",
  });

  const result = await startSmokeTestResult(startInput, fake.db as never);

  assert.deepEqual(result, { resultId: "result-existing" });
  assert.equal(fake.runTotalUpdates, 0);
});

test("duplicate completion does not increment aggregates", async () => {
  const fake = createFakeDb([], { completedResult: [] });

  const changed = await completeSmokeTestResult(
    completeInput,
    fake.db as never,
  );

  assert.equal(changed, false);
  assert.equal(fake.runPassedUpdates, 0);
  assert.equal(fake.runFailedUpdates, 0);
});
```

Also test that retry attempts `0` and `1` produce two inserts with the same
`testId` and different `retryAttempt` values.

- [x] **Step 3: Run reporter and persistence tests and verify failures**

Run:

```bash
cd playwright
node --import tsx --test server/reporter/incremental-smoke-reporter.test.ts
node --import tsx --test server/db/persist-run.test.ts
```

Expected: FAIL because the inputs and persistence logic lack attempt identity
and unconditional updates still double-count.

- [x] **Step 4: Pass test identity from Playwright**

Extend `StartSmokeTestResultInput`:

```ts
testId: string;
retryAttempt: number;
```

Populate it in `onTestBegin`:

```ts
testId: test.id,
retryAttempt: result.retry,
```

- [x] **Step 5: Make start insert-or-select**

Insert the natural key and ignore conflicts:

```ts
const inserted = await tx
  .insert(smokeRunsTestResults)
  .values({
    runId,
    testId,
    retryAttempt,
    testName,
    testFile,
    status: "running",
    durationMs: null,
    errorMessage: null,
    errorStack: null,
    startedAt,
    completedAt: null,
  })
  .onConflictDoNothing({
    target: [
      smokeRunsTestResults.runId,
      smokeRunsTestResults.testId,
      smokeRunsTestResults.retryAttempt,
    ],
  })
  .returning({ id: smokeRunsTestResults.id });
```

If inserted, increment `total` only while the run is `running`. If not inserted,
select and return the existing ID by the same three-column key.

- [x] **Step 6: Make completion a one-time transition**

Change `completeSmokeTestResult` to return `Promise<boolean>`. Update only:

```ts
.where(
  and(
    eq(smokeRunsTestResults.id, resultId),
    eq(smokeRunsTestResults.runId, runId),
    eq(smokeRunsTestResults.status, "running"),
  ),
)
.returning({ id: smokeRunsTestResults.id });
```

Return `false` immediately when no row transitioned. Increment `passed` or
`failed`, notify, and return `true` only for the winning transition.

- [x] **Step 7: Make finalization conditional**

After interrupting running results and reconciling counts, change the run update
to:

```ts
const finalized = await tx
  .update(smokeRuns)
  .set({
    status,
    total: results.length,
    passed,
    failed,
    durationSeconds,
    completedAt,
  })
  .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "running")))
  .returning({ id: smokeRuns.id });

if (finalized.length === 0) return false;
await notifySmokeRunChanged(tx, runId);
return true;
```

Change the function return type to `Promise<boolean>` and test a repeated call
that returns `false` without a second notification.

- [x] **Step 8: Run focused tests**

Run:

```bash
cd playwright
node --import tsx --test server/reporter/incremental-smoke-reporter.test.ts
node --import tsx --test server/db/persist-run.test.ts
```

Expected: PASS.

- [x] **Step 9: Review checkpoint**

Confirm all duplicate protection is backed by the database constraint or a
conditional state transition, not only the reporter's in-memory queue.

---

### Task 7: Render persisted queued state

**Files:**
- Modify: `nextjs/feature/smoke/components/smoke-run-details.tsx`
- Modify: `nextjs/feature/smoke/components/smoke-testing-cards.tsx`
- Modify: `nextjs/__tests__/unit/feature/smoke/smoke-active-state.test.tsx`

- [x] **Step 1: Add queued UI tests**

Create a queued fixture:

```ts
const queuedRun: SmokeTestRun = {
  ...runningRun,
  status: "queued",
};
```

Require:

```ts
it("renders queued details without pretending execution started", () => {
  render(
    <SmokeRunDetails
      appName="Website"
      details={queuedRun}
      results={[]}
    />,
  );

  expect(screen.getByText("Queued")).toBeVisible();
  expect(screen.getByText("Waiting for an execution slot…")).toBeVisible();
  expect(screen.queryByText("Waiting for test results…")).not.toBeInTheDocument();
});

it("uses the queued color for a queued card history segment", () => {
  render(
    <SmokeTestingAppsCard
      apps={[{ ...appFixture, smokeRuns: [queuedRun] }]}
    />,
  );

  expect(screen.getByTitle("Run 7: queued")).toHaveClass("bg-slate-400");
});
```

- [x] **Step 2: Run the UI tests and verify they fail**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/feature/smoke/smoke-active-state.test.tsx
```

Expected: FAIL because queued detail text and history color are absent.

- [x] **Step 3: Render queue-specific details**

Use explicit duration text:

```tsx
value={
  details.status === "queued"
    ? "Queued"
    : details.status === "running"
      ? "In progress"
      : formatDurationSeconds(details.durationSeconds ?? 0)
}
```

Before the running empty state, add:

```tsx
{details.status === "queued" && results.length === 0 ? (
  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
    Waiting for an execution slot…
  </div>
) : null}
```

Add the card segment mapping:

```tsx
run.status === "queued" && "bg-slate-400",
```

- [x] **Step 4: Run queued and existing active-state tests**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/feature/smoke/smoke-active-state.test.tsx
```

Expected: PASS for queued, running, and terminal states.

- [x] **Step 5: Review checkpoint**

Confirm queued runs appear automatically in status filter tabs through
`SmokeTestRunStatus` and no E2E component changed.

---

### Task 8: Verify the complete implementation

**Files:**
- All files listed above

- [x] **Step 1: Run all Playwright server tests**

Run:

```bash
cd playwright
pnpm test:unit
```

Expected: all server tests PASS.

- [x] **Step 2: Typecheck Playwright**

Run:

```bash
cd playwright
pnpm typecheck
```

Expected: PASS.

- [x] **Step 3: Run all Next.js unit tests**

Run:

```bash
cd nextjs
pnpm test
```

Expected: all unit tests PASS.

Observed: the full suite later passed after the test database containers were
ready.

- [x] **Step 4: Lint Next.js**

Run:

```bash
cd nextjs
pnpm lint
```

Expected: PASS or only explicitly documented pre-existing failures.

- [x] **Step 5: Verify the migration against the test database**

With the test database environment configured, run:

```bash
cd nextjs
pnpm db:test:setup
pnpm test -- __tests__/integration/api-routes-and-db.test.ts
```

Expected: migration succeeds and integration tests PASS.

Observed: migrations, seeding, and the 15 database integration tests passed
after the local containers finished starting.

- [x] **Step 6: Check scope and repository cleanliness**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected:

- No whitespace errors.
- Only the planned Smoke, migration, test, and plan files are modified.
- `playwright/server/inngest/e2e-consumer.ts`,
  `playwright/server/runner/run-e2e.ts`, and E2E persistence files are unchanged.
- Implementation remains uncommitted for Mode 3 review.

- [x] **Step 7: Present the review handoff**

Summarize the queue lifecycle, idempotency keys, sequential execution controls,
test results, migration implications, and exact uncommitted files. Ask whether
the user wants the implementation committed; do not commit automatically.
