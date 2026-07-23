import { describe, expect, it } from "vitest";

import {
  createQueuedSmokeRun,
  failQueuedSmokeRun,
} from "@/feature/smoke/services/smoke-run-enqueue.service";

type Write = { table: unknown; values: Record<string, unknown> };

function createFakeDb(options: {
  uniqueViolations?: number;
  existingRun?: { id: string; runNumber: number };
  failureChanged?: boolean;
} = {}) {
  const inserts: Write[] = [];
  const updates: Write[] = [];
  const executions: unknown[] = [];
  let remainingUniqueViolations = options.uniqueViolations ?? 0;

  const tx = {
    select(shape: Record<string, unknown>) {
      return {
        from() {
          return {
            async where() {
              if ("value" in shape) return [{ value: 2 }];
              return [];
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: Record<string, unknown>) {
          inserts.push({ table, values });
          return {
            async returning() {
              if (remainingUniqueViolations > 0) {
                remainingUniqueViolations -= 1;
                throw Object.assign(new Error("duplicate key"), { code: "23505" });
              }
              return [{ id: "run-1" }];
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          updates.push({ table, values });
          return {
            where() {
              return {
                async returning() {
                  return options.failureChanged === false ? [] : [{ id: "run-1" }];
                },
              };
            },
          };
        },
      };
    },
    async execute(query: unknown) {
      executions.push(query);
      return [];
    },
  };

  return {
    db: {
      async transaction<T>(callback: (executor: typeof tx) => Promise<T>) {
        return callback(tx);
      },
      query: {
        smokeRuns: {
          async findFirst() {
            return options.existingRun ?? null;
          },
        },
      },
    },
    inserts,
    updates,
    executions,
  };
}

const queueInput = {
  appId: "website",
  trigger: "manual" as const,
  requestedBy: "11111111-1111-1111-1111-111111111111",
  correlationId: "22222222-2222-2222-2222-222222222222",
  checkedAt: new Date("2026-07-23T08:00:00.000Z"),
};

describe("createQueuedSmokeRun", () => {
  it("creates a visible queued run with the request correlation ID", async () => {
    const fake = createFakeDb();

    await expect(createQueuedSmokeRun(queueInput, fake.db as never)).resolves.toEqual({
      runId: "run-1",
      runNumber: 3,
    });

    expect(fake.inserts[0].values).toMatchObject({
      appId: "website",
      correlationId: queueInput.correlationId,
      status: "queued",
      total: 0,
      passed: 0,
      failed: 0,
      startedAt: null,
      completedAt: null,
    });
    expect(fake.executions).toHaveLength(1);
  });

  it("retries a run-number race and returns the existing correlation row", async () => {
    const fake = createFakeDb({
      uniqueViolations: 1,
      existingRun: { id: "run-existing", runNumber: 2 },
    });

    await expect(createQueuedSmokeRun(queueInput, fake.db as never)).resolves.toEqual({
      runId: "run-existing",
      runNumber: 2,
    });
  });
});

describe("failQueuedSmokeRun", () => {
  it("marks only a queued run as failed", async () => {
    const fake = createFakeDb();

    await expect(
      failQueuedSmokeRun(
        {
          runId: "run-1",
          completedAt: new Date("2026-07-23T08:00:01.000Z"),
        },
        fake.db as never,
      ),
    ).resolves.toBe(true);

    expect(fake.updates[0].values).toEqual({
      status: "failure",
      durationSeconds: null,
      completedAt: new Date("2026-07-23T08:00:01.000Z"),
    });
    expect(fake.executions).toHaveLength(1);
  });

  it("is a no-op when the run has already left the queue", async () => {
    const fake = createFakeDb({ failureChanged: false });

    await expect(
      failQueuedSmokeRun(
        { runId: "run-1", completedAt: new Date() },
        fake.db as never,
      ),
    ).resolves.toBe(false);

    expect(fake.executions).toHaveLength(0);
  });
});
