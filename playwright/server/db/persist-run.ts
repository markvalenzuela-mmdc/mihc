/**
 * Persists one mapped smoke run: computes the next `run_number` for the app and
 * inserts the `smoke_runs` row plus its `smoke_runs_test_results` children in a
 * single transaction. On the rare `(app_id, run_number)` unique-violation race,
 * it recomputes and retries.
 */
import { eq, max } from "drizzle-orm";
import type { Logger } from "../logger";
import type { MappedRun } from "../runner/map-results";
import { db } from "./client";
import { smokeRuns, smokeRunsTestResults } from "./schema";

const MAX_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";

export interface PersistRunInput {
  appId: string;
  trigger: "manual" | "scheduled";
  /** Operator user id; resolved-or-nulled into `started_by` (null in v1). */
  requestedBy?: string | null;
  checkedAt: Date;
  run: MappedRun;
  logger: Logger;
}

export interface PersistRunResult {
  runId: string;
  runNumber: number;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === UNIQUE_VIOLATION;
}

export async function persistRun(input: PersistRunInput): Promise<PersistRunResult> {
  const { appId, trigger, requestedBy, checkedAt, run, logger } = input;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
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
            status: run.status,
            trigger,
            total: run.total,
            passed: run.passed,
            failed: run.failed,
            durationSeconds: run.durationSeconds,
            // v1: always null. requestedBy is plumbed so real attribution is additive.
            startedBy: requestedBy ?? null,
            checkedAt,
          })
          .returning({ id: smokeRuns.id });

        if (run.testResults.length > 0) {
          await tx.insert(smokeRunsTestResults).values(
            run.testResults.map((t) => ({
              runId: inserted.id,
              testName: t.testName,
              testFile: t.testFile,
              status: t.status,
              durationMs: t.durationMs,
              errorMessage: t.errorMessage,
              errorStack: t.errorStack,
            })),
          );
        }

        logger.info("run_persisted", { runId: inserted.id, runNumber, status: run.status });
        return { runId: inserted.id, runNumber };
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS) {
        logger.warn("run_number_race_retry", { attempt });
        continue;
      }
      throw err;
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error("persistRun: exhausted retries");
}
