import assert from "node:assert/strict";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Logger } from "../logger";
import {
  completeE2eRun,
  createE2eRun,
  ProfileBusyError,
  recordE2eCheck,
  type RecordE2eCheckInput,
} from "./persist-e2e-run";
import { e2eRunSteps, e2eRunTests, e2eRuns } from "./schema";

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

const dialect = new PgDialect();

interface CapturedWrite {
  table: unknown;
  values: unknown;
}

interface FakeE2eDbOptions {
  existingRunningRun?: boolean;
  updatedRun?: boolean;
  existingStepId?: string;
  existingTestId?: string;
  insertedStep?: boolean;
  testRows?: Array<{ status: string; durationMs: number | null }>;
}

function createFakeE2eDb(options: FakeE2eDbOptions = {}) {
  const inserts: CapturedWrite[] = [];
  const updates: CapturedWrite[] = [];
  const executions: SQL[] = [];
  const testRows = [...(options.testRows ?? [])];
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
    select(shape: Record<string, unknown>) {
      return {
        from(table: unknown) {
          return {
            async where() {
              if ("value" in shape) return [{ value: 2 }];
              if (table === e2eRunSteps) {
                return options.existingStepId ? [{ id: options.existingStepId }] : [];
              }
              if (table === e2eRunTests) {
                if ("status" in shape) return [...testRows];
                return options.existingTestId ? [{ id: options.existingTestId }] : [];
              }
              return [{ value: 2 }];
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: unknown) {
          inserts.push({ table, values });
          if (table === e2eRunTests) {
            const row = values as { status: string; durationMs: number | null };
            testRows.push({ status: row.status, durationMs: row.durationMs });
          }
          return {
            async returning() {
              if (table === e2eRuns) {
                return [{ id: "run-1", startedAt }];
              }
              if (table === e2eRunSteps) {
                return options.insertedStep === false
                  ? []
                  : [{ id: options.existingStepId ?? "step-run-1" }];
              }
              if (table === e2eRunTests) {
                return [{ id: options.existingTestId ?? "test-run-1" }];
              }
              return [];
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: unknown) {
          updates.push({ table, values });
          if (table === e2eRunTests) {
            const row = values as { status?: string; durationMs?: number | null };
            const existing = testRows[0];
            if (existing) {
              if (row.status !== undefined) existing.status = row.status;
              if (row.durationMs !== undefined) existing.durationMs = row.durationMs;
            }
          }
          return {
            where() {
              return {
                async returning() {
                  if (table === e2eRunSteps || table === e2eRunTests) {
                    return [{ id: "row-1" }];
                  }
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
    inserts,
    updates,
    executions,
  };
}

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

const checkInput: RecordE2eCheckInput = {
  runId: "run-1",
  profileId: "profile-1",
  stepId: "new",
  testName: "page-loads",
  status: "success",
  durationMs: 2_400,
  errorMessage: null,
  logger,
};

test("recordE2eCheck persists a check and publishes its run identity", async () => {
  const fake = createFakeE2eDb();

  await recordE2eCheck(checkInput, fake.db as never);

  assert.deepEqual(fake.inserts[0], {
    table: e2eRunSteps,
    values: {
      runId: "run-1",
      stepId: "new",
      status: "untested",
      durationSeconds: null,
      note: null,
    },
  });
  assert.deepEqual(fake.inserts[1], {
    table: e2eRunTests,
    values: {
      runStepId: "step-run-1",
      testName: "page-loads",
      status: "success",
      durationMs: 2_400,
      errorMessage: null,
    },
  });
  assert.deepEqual(fake.updates.at(-1), {
    table: e2eRunSteps,
    values: { status: "success", durationSeconds: 2 },
  });
  assertE2eNotification(fake.executions, "profile-1", "run-1");
});

test("recordE2eCheck aggregates a failed check onto an existing step", async () => {
  const fake = createFakeE2eDb({
    existingStepId: "step-run-1",
    testRows: [{ status: "success", durationMs: 3_700 }],
  });

  await recordE2eCheck(
    {
      ...checkInput,
      stepId: "validated",
      testName: "step-1 (Student Info): advanced",
      status: "failure",
      durationMs: 2_100,
      errorMessage: "Current Foreign Address is required.",
    },
    fake.db as never,
  );

  assert.equal(fake.inserts.some((write) => write.table === e2eRunSteps), false);
  assert.deepEqual(fake.updates.at(-1), {
    table: e2eRunSteps,
    values: { status: "failure", durationSeconds: 6 },
  });
  assertE2eNotification(fake.executions, "profile-1", "run-1");
});

test("recordE2eCheck updates an existing same-name test", async () => {
  const fake = createFakeE2eDb({
    existingStepId: "step-run-1",
    existingTestId: "test-run-1",
    testRows: [{ status: "success", durationMs: 1_000 }],
  });

  await recordE2eCheck(
    {
      ...checkInput,
      status: "failure",
      durationMs: 3_000,
      errorMessage: "failed again",
    },
    fake.db as never,
  );

  assert.equal(fake.inserts.some((write) => write.table === e2eRunTests), false);
  assert.deepEqual(fake.updates[0], {
    table: e2eRunTests,
    values: { status: "failure", durationMs: 3_000, errorMessage: "failed again" },
  });
  assertE2eNotification(fake.executions, "profile-1", "run-1");
});

test("recordE2eCheck does not publish when its transaction fails", async () => {
  const fake = createFakeE2eDb({ insertedStep: false });

  await assert.rejects(recordE2eCheck(checkInput, fake.db as never), /was not created/);
  assert.equal(fake.executions.length, 0);
});

test("completeE2eRun finalizes without inserting step or test rows", async () => {
  const fake = createFakeE2eDb();

  await completeE2eRun(
    {
      runId: "run-1",
      runStatus: "completed",
      logger,
    },
    fake.db as never,
  );

  assert.equal(fake.inserts.some((write) => write.table === e2eRunSteps), false);
  assert.equal(fake.inserts.some((write) => write.table === e2eRunTests), false);
  assertE2eNotification(fake.executions, "profile-1", "run-1");
});

test("completeE2eRun does not notify when no run was updated", async () => {
  const fake = createFakeE2eDb({ updatedRun: false });

  await completeE2eRun(
    {
      runId: "missing-run",
      runStatus: "aborted",
      logger,
    },
    fake.db as never,
  );

  assert.equal(fake.executions.length, 0);
});
