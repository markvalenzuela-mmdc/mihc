import assert from "node:assert/strict";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Logger } from "../logger";
import {
  completeSmokeTestResult,
  claimSmokeRun,
  finalizeSmokeRun,
  startSmokeTestResult,
} from "./persist-run";
import { smokeRuns, smokeRunsTestResults } from "./schema";

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

interface CapturedWrite {
  table: unknown;
  values: Record<string, unknown> | Record<string, unknown>[];
}

const dialect = new PgDialect();

interface FakeDbOptions {
  claimedRun?: boolean;
  insertedResult?: boolean;
  existingResultId?: string;
  completedResult?: boolean;
  finalizedRun?: boolean;
}

function createFakeDb(initialStatuses: string[] = [], options: FakeDbOptions = {}) {
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
              if ("id" in shape) {
                return options.existingResultId ? [{ id: options.existingResultId }] : [];
              }
              return statuses.map((status) => ({ status }));
            },
          };
        },
      };
    },
    insert(table: unknown) {
      const returning = async () => {
        if (table === smokeRunsTestResults && options.insertedResult === false) return [];
        return [{ id: table === smokeRuns ? "run-1" : "result-1" }];
      };
      return {
        values(values: Record<string, unknown> | Record<string, unknown>[]) {
          inserts.push({ table, values });
          return {
            onConflictDoNothing() {
              return { returning };
            },
            returning,
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
          return {
            where() {
              return {
                async returning() {
                  if (table === smokeRuns && options.claimedRun === false) return [];
                  if (table === smokeRunsTestResults && options.completedResult === false) return [];
                  if (table === smokeRuns && options.finalizedRun === false) return [];
                  return [{ id: "run-1" }];
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

test("claimSmokeRun changes a queued row to running before execution", async () => {
  const fake = createFakeDb();
  const startedAt = new Date("2026-07-22T08:00:00.000Z");

  const claimed = await claimSmokeRun(
    {
      runId: "run-1",
      startedAt,
      logger,
    },
    fake.db as never,
  );

  assert.equal(claimed, true);
  assert.deepEqual(fake.updates[0], {
    table: smokeRuns,
    values: { status: "running", startedAt },
  });
  assertSmokeNotification(fake.executions, "run-1");
});

test("claimSmokeRun ignores a run that is no longer queued", async () => {
  const fake = createFakeDb([], { claimedRun: false });

  const claimed = await claimSmokeRun(
    {
      runId: "run-1",
      startedAt: new Date("2026-07-22T08:00:00.000Z"),
      logger,
    },
    fake.db as never,
  );

  assert.equal(claimed, false);
  assert.equal(fake.executions.length, 0);
});

test("startSmokeTestResult inserts only the observed test and increments total", async () => {
  const fake = createFakeDb();
  const startedAt = new Date("2026-07-22T08:00:01.000Z");

  const created = await startSmokeTestResult(
    {
      runId: "run-1",
      testId: "landing-check",
      retryAttempt: 0,
      testName: "loads the landing page",
      testFile: "tests/smoke/landing.spec.ts",
      startedAt,
      logger,
    },
    fake.db as never,
  );

  assert.deepEqual(created, { resultId: "result-1" });
  assert.deepEqual(fake.inserts[0], {
    table: smokeRunsTestResults,
    values: {
      runId: "run-1",
      testId: "landing-check",
      retryAttempt: 0,
      testName: "loads the landing page",
      testFile: "tests/smoke/landing.spec.ts",
      status: "running",
      durationMs: null,
      errorMessage: null,
      errorStack: null,
      startedAt,
      completedAt: null,
    },
  });
  assert.equal(fake.updates.at(-1)?.table, smokeRuns);
  assert.ok("total" in (fake.updates.at(-1)?.values ?? {}));
  assertSmokeNotification(fake.executions, "run-1");
});

test("startSmokeTestResult replays the existing row for a duplicate attempt", async () => {
  const fake = createFakeDb([], { insertedResult: false, existingResultId: "result-existing" });

  const replayed = await startSmokeTestResult(
    {
      runId: "run-1",
      testId: "landing-check",
      retryAttempt: 1,
      testName: "loads the landing page",
      testFile: "tests/smoke/landing.spec.ts",
      startedAt: new Date("2026-07-22T08:00:01.000Z"),
      logger,
    },
    fake.db as never,
  );

  assert.deepEqual(replayed, { resultId: "result-existing" });
  assert.equal(fake.updates.length, 0);
  assert.equal(fake.executions.length, 0);
});

test("startSmokeTestResult keeps separate rows for separate retries", async () => {
  const fake = createFakeDb();
  const baseInput = {
    runId: "run-1",
    testId: "landing-check",
    testName: "loads the landing page",
    testFile: "tests/smoke/landing.spec.ts",
    startedAt: new Date("2026-07-22T08:00:01.000Z"),
    logger,
  };

  await startSmokeTestResult({ ...baseInput, retryAttempt: 0 }, fake.db as never);
  await startSmokeTestResult({ ...baseInput, retryAttempt: 1 }, fake.db as never);

  assert.equal(fake.inserts.length, 2);
  assert.equal((fake.inserts[0].values as Record<string, unknown>).retryAttempt, 0);
  assert.equal((fake.inserts[1].values as Record<string, unknown>).retryAttempt, 1);
});

test("completeSmokeTestResult updates the observed row and matching aggregate", async () => {
  const fake = createFakeDb();
  const completedAt = new Date("2026-07-22T08:00:03.000Z");

  const completed = await completeSmokeTestResult(
    {
      resultId: "result-1",
      runId: "run-1",
      status: "failure",
      durationMs: 2_000,
      errorMessage: "Page did not return a successful response",
      completedAt,
      logger,
    },
    fake.db as never,
  );

  assert.equal(completed, true);
  assert.deepEqual(fake.updates[0], {
    table: smokeRunsTestResults,
    values: {
      status: "failure",
      durationMs: 2_000,
      errorMessage: "Page did not return a successful response",
      errorStack: null,
      completedAt,
    },
  });
  assert.equal(fake.updates[1].table, smokeRuns);
  assert.ok("failed" in fake.updates[1].values);
  assert.equal("passed" in fake.updates[1].values, false);
  assertSmokeNotification(fake.executions, "run-1");
});

test("completeSmokeTestResult ignores a duplicate terminal write", async () => {
  const fake = createFakeDb([], { completedResult: false });

  const completed = await completeSmokeTestResult(
    {
      resultId: "result-1",
      runId: "run-1",
      status: "success",
      durationMs: 100,
      errorMessage: null,
      completedAt: new Date("2026-07-22T08:00:03.000Z"),
      logger,
    },
    fake.db as never,
  );

  assert.equal(completed, false);
  assert.equal(fake.updates.length, 1);
  assert.equal(fake.executions.length, 0);
});

test("finalizeSmokeRun preserves completed rows and normalizes interrupted rows", async () => {
  const fake = createFakeDb(["success", "running", "skipped"]);
  const completedAt = new Date("2026-07-22T08:01:00.000Z");

  const finalized = await finalizeSmokeRun(
    {
      runId: "run-1",
      status: "failure",
      durationSeconds: 60,
      completedAt,
      logger,
    },
    fake.db as never,
  );

  assert.equal(finalized, true);
  assert.deepEqual(fake.updates[0], {
    table: smokeRunsTestResults,
    values: {
      status: "failure",
      errorMessage: "Test execution was interrupted before completion",
      errorStack: null,
      completedAt,
    },
  });
  assert.deepEqual(fake.updates[1], {
    table: smokeRuns,
    values: {
      status: "failure",
      total: 3,
      passed: 1,
      failed: 1,
      durationSeconds: 60,
      completedAt,
    },
  });
  assertSmokeNotification(fake.executions, "run-1");
});

test("finalizeSmokeRun ignores a repeated finalization", async () => {
  const fake = createFakeDb(["success"], { finalizedRun: false });

  const finalized = await finalizeSmokeRun(
    {
      runId: "run-1",
      status: "success",
      durationSeconds: 1,
      completedAt: new Date("2026-07-22T08:01:00.000Z"),
      logger,
    },
    fake.db as never,
  );

  assert.equal(finalized, false);
  assert.equal(fake.executions.length, 0);
});
