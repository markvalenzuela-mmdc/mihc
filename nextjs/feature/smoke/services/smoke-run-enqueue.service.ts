import { and, eq, max, sql } from "drizzle-orm";

import { getDb, smokeRuns } from "@/lib/drizzle/db";

const MAX_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";
const SMOKE_RUN_CHANGED_CHANNEL = "smoke_run_changed";

interface SqlExecutor {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
}

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

async function notifySmokeRunChanged(
  executor: SqlExecutor,
  runId: string,
): Promise<void> {
  await executor.execute(
    sql`select pg_notify(${SMOKE_RUN_CHANGED_CHANNEL}, ${runId})`,
  );
}

export async function createQueuedSmokeRun(
  input: CreateQueuedSmokeRunInput,
  database = getDb(),
): Promise<CreateQueuedSmokeRunResult> {
  const { appId, trigger, requestedBy, correlationId, checkedAt } = input;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await database.transaction(async (tx) => {
        const [{ value: currentMax }] = await tx
          .select({ value: max(smokeRuns.runNumber) })
          .from(smokeRuns)
          .where(eq(smokeRuns.appId, appId));

        const runNumber = (currentMax ?? 0) + 1;

        const [inserted] = await tx
          .insert(smokeRuns)
          .values({
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
          })
          .returning({ id: smokeRuns.id });

        await notifySmokeRunChanged(tx, inserted.id);
        return { runId: inserted.id, runNumber };
      });
    } catch (error) {
      const isRace =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as Record<string, unknown>).code === UNIQUE_VIOLATION;

      if (!isRace) throw error;

      const existing = await database.query.smokeRuns.findFirst({
        columns: { id: true, runNumber: true },
        where: (runs, { eq: equals }) =>
          equals(runs.correlationId, correlationId),
      });

      if (existing) {
        return { runId: existing.id, runNumber: existing.runNumber };
      }

      if (attempt === MAX_ATTEMPTS) throw error;
    }
  }

  throw new Error("createQueuedSmokeRun: exhausted retries");
}

export async function failQueuedSmokeRun(
  input: { runId: string; completedAt: Date },
  database = getDb(),
): Promise<boolean> {
  return database.transaction(async (tx) => {
    const updated = await tx
      .update(smokeRuns)
      .set({
        status: "failure",
        durationSeconds: null,
        completedAt: input.completedAt,
      })
      .where(and(eq(smokeRuns.id, input.runId), eq(smokeRuns.status, "queued")))
      .returning({ id: smokeRuns.id });

    if (updated.length === 0) return false;

    await notifySmokeRunChanged(tx, input.runId);

    return true;
  });
}
