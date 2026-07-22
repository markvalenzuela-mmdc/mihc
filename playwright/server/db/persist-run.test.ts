import assert from "node:assert/strict";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Logger } from "../logger";
import {
  completeSmokeTestResult,
  createSmokeRun,
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

test("createSmokeRun commits a running row before execution", async () => {
  const fake = createFakeDb();
  const checkedAt = new Date("2026-07-22T08:00:00.000Z");

  const created = await createSmokeRun(
    {
      appId: "website",
      trigger: "manual",
      requestedBy: "11111111-1111-1111-1111-111111111111",
      checkedAt,
      logger,
    },
    fake.db as never,
  );

  assert.deepEqual(created, { runId: "run-1", runNumber: 3 });
  assert.equal(fake.inserts.length, 1);
  assert.deepEqual(fake.inserts[0], {
    table: smokeRuns,
    values: {
      runNumber: 3,
      appId: "website",
      status: "running",
      trigger: "manual",
      total: 0,
      passed: 0,
      failed: 0,
      durationSeconds: null,
      startedBy: "11111111-1111-1111-1111-111111111111",
      checkedAt,
      completedAt: null,
    },
  });
  assertSmokeNotification(fake.executions, "run-1");
});

test("startSmokeTestResult inserts only the observed test and increments total", async () => {
  const fake = createFakeDb();
  const startedAt = new Date("2026-07-22T08:00:01.000Z");

  const created = await startSmokeTestResult(
    {
      runId: "run-1",
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

test("completeSmokeTestResult updates the observed row and matching aggregate", async () => {
  const fake = createFakeDb();
  const completedAt = new Date("2026-07-22T08:00:03.000Z");

  await completeSmokeTestResult(
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

test("finalizeSmokeRun preserves completed rows and normalizes interrupted rows", async () => {
  const fake = createFakeDb(["success", "running", "skipped"]);
  const completedAt = new Date("2026-07-22T08:01:00.000Z");

  await finalizeSmokeRun(
    {
      runId: "run-1",
      status: "failure",
      durationSeconds: 60,
      completedAt,
      logger,
    },
    fake.db as never,
  );

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
