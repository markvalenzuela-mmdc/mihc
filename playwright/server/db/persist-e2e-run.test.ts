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
import { e2eRunSteps, e2eRunTests, e2eRuns } from "./schema";

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

const dialect = new PgDialect();

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
    insert(table: unknown) {
      return {
        values() {
          return {
            async returning() {
              if (table === e2eRuns) {
                return [{ id: "run-1", startedAt }];
              }
              if (table === e2eRunSteps) {
                return [];
              }
              if (table === e2eRunTests) {
                return [];
              }
              return [];
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
