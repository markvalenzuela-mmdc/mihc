/**
 * E2E run persistence — split into two phases so the "running" row is created
 * before Playwright executes (locking the profile against concurrent runs in
 * the frontend), then updated with final status + step/test results after.
 *
 * createE2eRun   — inserts e2e_runs with status="running"; called before
 *                  spawning Playwright.
 * recordE2eCheck — persists one completed check and updates its step aggregate.
 * completeE2eRun — updates e2e_runs to final status after the suite finishes.
 */
import { and, eq, max, sql, type SQL } from "drizzle-orm";
import type { Logger } from "../logger";
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
  logger: Logger;
}

export interface RecordE2eCheckInput {
  runId: string;
  profileId: string;
  stepId: string;
  testName: string;
  status: "success" | "failure" | "skipped";
  durationMs: number | null;
  errorMessage: string | null;
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

/** Persist one completed check and publish the resulting run change. */
export async function recordE2eCheck(
  input: RecordE2eCheckInput,
  database: Db = db,
): Promise<void> {
  const {
    runId,
    profileId,
    stepId,
    testName,
    status,
    durationMs,
    errorMessage,
    logger,
  } = input;

  await database.transaction(async (tx) => {
    const [existingStep] = await tx
      .select({ id: e2eRunSteps.id })
      .from(e2eRunSteps)
      .where(and(eq(e2eRunSteps.runId, runId), eq(e2eRunSteps.stepId, stepId)));

    const runStepId = existingStep?.id ?? (
      await tx
        .insert(e2eRunSteps)
        .values({
          runId,
          stepId,
          status: "untested",
          durationSeconds: null,
          note: null,
        })
        .returning({ id: e2eRunSteps.id })
    )[0]?.id;

    if (!runStepId) {
      throw new Error(`E2E step ${runId}/${stepId} was not created`);
    }

    const [existingTest] = await tx
      .select({ id: e2eRunTests.id })
      .from(e2eRunTests)
      .where(and(eq(e2eRunTests.runStepId, runStepId), eq(e2eRunTests.testName, testName)));

    const values = { status, durationMs, errorMessage };

    if (existingTest) {
      await tx
        .update(e2eRunTests)
        .set(values)
        .where(eq(e2eRunTests.id, existingTest.id))
        .returning({ id: e2eRunTests.id });
    } else {
      await tx
        .insert(e2eRunTests)
        .values({ runStepId, testName, ...values })
        .returning({ id: e2eRunTests.id });
    }

    const tests = await tx
      .select({ status: e2eRunTests.status, durationMs: e2eRunTests.durationMs })
      .from(e2eRunTests)
      .where(eq(e2eRunTests.runStepId, runStepId));
    const durations = tests
      .map((test) => test.durationMs)
      .filter((duration): duration is number => duration !== null);
    const totalDurationMs = durations.reduce((sum, duration) => sum + duration, 0);

    await tx
      .update(e2eRunSteps)
      .set({
        status: tests.some((test) => test.status === "failure") ? "failure" : "success",
        durationSeconds: durations.length > 0 ? Math.round(totalDurationMs / 1000) : null,
      })
      .where(eq(e2eRunSteps.id, runStepId))
      .returning({ id: e2eRunSteps.id });

    await notifyE2eRunChanged(tx, { profileId, runId });
    logger.info("e2e_check_persisted", { runId, stepId, testName, status });
  });
}

/**
 * Phase 2: Finalise the run — set its status/completedAt after the reporter
 * has persisted each completed check.
 */
export async function completeE2eRun(
  input: CompleteE2eRunInput,
  database: Db = db,
): Promise<void> {
  const { runId, runStatus, logger } = input;

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
        logger.info("e2e_run_finalised", { runId, status: runStatus, durationS });
      }
    }

    if (updated) {
      await notifyE2eRunChanged(tx, {
        profileId: updated.profileId,
        runId,
      });
    }

    logger.info("e2e_run_completed", { runId, status: runStatus });
  });
}
