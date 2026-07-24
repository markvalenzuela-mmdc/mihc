/**
 * E2E run persistence — split into two phases so the "running" row is created
 * before Playwright executes (locking the profile against concurrent runs in
 * the frontend), then updated with final status + step/test results after.
 *
 * createE2eRun   — inserts e2e_runs with status="running"; called before
 *                  spawning Playwright.
 * completeE2eRun — updates e2e_runs to final status + inserts run_steps and
 *                  run_tests; called after the suite finishes.
 */
import { eq, max, sql, type SQL } from "drizzle-orm";
import type { Logger } from "../logger";
import type { MappedE2eStep } from "../runner/map-e2e-results";
import { db, type Db } from "./client";
import { e2eRuns, e2eRunSteps, e2eRunTests } from "./schema";

const MAX_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";
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
): Promise<void> {
  await executor.execute(
    sql`select pg_notify(${E2E_RUN_CHANGED_CHANNEL}, ${JSON.stringify(payload)})`,
  );
}

export class ProfileBusyError extends Error {
  constructor(profileId: string) {
    super(`Profile ${profileId} already has a running e2e run`);
    this.name = "ProfileBusyError";
  }
}

export interface CreateE2eRunResult {
  runId: string;
  runNumber: number;
  /** ISO-8601 string; Inngest memoization serializes Dates through JSON. */
  startedAt: string;
}

export interface CompleteE2eRunInput {
  runId: string;
  runStatus: "completed" | "aborted";
  steps: MappedE2eStep[];
  logger: Logger;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === UNIQUE_VIOLATION;
}

/**
 * Phase 1: Create the e2e_runs row with status="running" and no completedAt.
 * This locks the profile so the frontend sees an active run and prevents
 * concurrent submissions.
 */
export async function createE2eRun(
  profileId: string,
  requestedBy: string,
  logger: Logger,
  database: Db = db,
): Promise<CreateE2eRunResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await database.transaction(async (tx) => {
        // Fail-fast if a running row already exists for this profile.
        const existing = await tx.query.e2eRuns.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.profileId, profileId), eq(t.status, "running" as const)),
        });
        if (existing) {
          throw new ProfileBusyError(profileId);
        }

        const [{ value: currentMax }] = await tx
          .select({ value: max(e2eRuns.runNumber) })
          .from(e2eRuns)
          .where(eq(e2eRuns.profileId, profileId));
        const runNumber = (currentMax ?? 0) + 1;

        const [inserted] = await tx
          .insert(e2eRuns)
          .values({
            runNumber,
            profileId,
            status: "running" as const,
            startedBy: requestedBy,
            startedAt: sql`NOW()`,
          })
          .returning({ id: e2eRuns.id, startedAt: e2eRuns.startedAt });

        await notifyE2eRunChanged(tx, {
          profileId,
          runId: inserted.id,
        });

        const startedAt = inserted.startedAt as unknown as Date;
        logger.info("e2e_run_created", { runId: inserted.id, runNumber });
        return { runId: inserted.id, runNumber, startedAt: startedAt.toISOString() };
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS) {
        logger.warn("e2e_run_number_race_retry", { attempt, phase: "create" });
        continue;
      }
      throw err;
    }
  }

  throw new Error("createE2eRun: exhausted retries");
}

/**
 * Phase 2: Finalise the run — set its status/completedAt and insert
 * e2e_run_steps + e2e_run_tests in a single transaction.
 *
 * Called only after the Playwright suite has finished, so all results are
 * available. completedAt is set via DB NOW() so both timestamps come from
 * the same clock source. The `createdAt` on each step/test row is the DB
 * default.
 */
export async function completeE2eRun(
  input: CompleteE2eRunInput,
  database: Db = db,
): Promise<void> {
  const { runId, runStatus, steps, logger } = input;

  await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(e2eRuns)
      .set({ status: runStatus, completedAt: sql`NOW()` })
      .where(eq(e2eRuns.id, runId))
      .returning({
        profileId: e2eRuns.profileId,
        startedAt: e2eRuns.startedAt,
        completedAt: e2eRuns.completedAt,
      });

    if (updated) {
      const startedAt = updated.startedAt as unknown as Date;
      const completedAt = updated.completedAt as unknown as Date;
      if (completedAt) {
        const durationS = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
        logger.info("e2e_run_finalised", { runId, status: runStatus, durationS, stepCount: steps.length });
      }
    }

    if (steps.length > 0) {
      const insertedSteps = await tx
        .insert(e2eRunSteps)
        .values(
          steps.map((step) => ({
            runId,
            stepId: step.stepId,
            status: step.status,
            durationSeconds: step.durationSeconds,
            note: step.note ?? null,
          })),
        )
        .returning({ id: e2eRunSteps.id, stepId: e2eRunSteps.stepId });

      const stepIdMap = new Map<string, string>();
      for (const s of insertedSteps) {
        stepIdMap.set(s.stepId, s.id);
      }

      const allTests: {
        runStepId: string;
        testName: string;
        status: "success" | "failure" | "skipped";
        durationMs: number | null;
        errorMessage: string | null;
      }[] = [];

      for (const step of steps) {
        const runStepId = stepIdMap.get(step.stepId);
        if (!runStepId) continue;
        for (const test of step.tests) {
          allTests.push({
            runStepId,
            testName: test.testName,
            status: test.status,
            durationMs: test.durationMs,
            errorMessage: test.errorMessage,
          });
        }
      }

      if (allTests.length > 0) {
        await tx.insert(e2eRunTests).values(allTests);
      }
    }

    if (updated) {
      await notifyE2eRunChanged(tx, {
        profileId: updated.profileId,
        runId,
      });
    }

    logger.info("e2e_run_completed", { runId, status: runStatus, stepCount: steps.length });
  });
}
