/**
 * Incremental Smoke persistence. Each exported operation commits independently
 * so an active run and every observed result remain visible while Playwright is
 * still executing.
 */
import { and, eq, max, sql } from "drizzle-orm";
import type { Logger } from "../logger";
import type { RunStatus, TestResultStatus } from "../runner/map-results";
import { db, type Db } from "./client";
import { smokeRuns, smokeRunsTestResults } from "./schema";

const MAX_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";
const INTERRUPTED_ERROR = "Test execution was interrupted before completion";

export interface CreateSmokeRunInput {
  appId: string;
  trigger: "manual" | "scheduled";
  requestedBy?: string | null;
  checkedAt: Date;
  logger: Logger;
}

export interface CreateSmokeRunResult {
  runId: string;
  runNumber: number;
}

export interface StartSmokeTestResultInput {
  runId: string;
  testName: string;
  testFile: string | null;
  startedAt: Date;
  logger: Logger;
}

export interface StartSmokeTestResultResult {
  resultId: string;
}

export interface CompleteSmokeTestResultInput {
  resultId: string;
  runId: string;
  status: TestResultStatus;
  durationMs: number | null;
  errorMessage: string | null;
  completedAt: Date;
  logger: Logger;
}

export interface FinalizeSmokeRunInput {
  runId: string;
  status: RunStatus;
  durationSeconds: number | null;
  completedAt: Date;
  logger: Logger;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === UNIQUE_VIOLATION;
}

export async function createSmokeRun(
  input: CreateSmokeRunInput,
  database: Db = db,
): Promise<CreateSmokeRunResult> {
  const { appId, trigger, requestedBy, checkedAt, logger } = input;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
            status: "running",
            trigger,
            total: 0,
            passed: 0,
            failed: 0,
            durationSeconds: null,
            startedBy: requestedBy ?? null,
            checkedAt,
            completedAt: null,
          })
          .returning({ id: smokeRuns.id });

        logger.info("smoke_run_created", { runId: inserted.id, runNumber });
        return { runId: inserted.id, runNumber };
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS) {
        logger.warn("run_number_race_retry", { attempt, phase: "create" });
        continue;
      }
      throw err;
    }
  }

  throw new Error("createSmokeRun: exhausted retries");
}

export async function startSmokeTestResult(
  input: StartSmokeTestResultInput,
  database: Db = db,
): Promise<StartSmokeTestResultResult> {
  const { runId, testName, testFile, startedAt, logger } = input;

  return database.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(smokeRunsTestResults)
      .values({
        runId,
        testName,
        testFile,
        status: "running",
        durationMs: null,
        errorMessage: null,
        errorStack: null,
        startedAt,
        completedAt: null,
      })
      .returning({ id: smokeRunsTestResults.id });

    await tx
      .update(smokeRuns)
      .set({ total: sql`${smokeRuns.total} + 1` })
      .where(eq(smokeRuns.id, runId));

    logger.info("smoke_test_started", { runId, resultId: inserted.id, testName });
    return { resultId: inserted.id };
  });
}

export async function completeSmokeTestResult(
  input: CompleteSmokeTestResultInput,
  database: Db = db,
): Promise<void> {
  const { resultId, runId, status, durationMs, errorMessage, completedAt, logger } = input;

  await database.transaction(async (tx) => {
    await tx
      .update(smokeRunsTestResults)
      .set({
        status,
        durationMs,
        errorMessage,
        errorStack: null,
        completedAt,
      })
      .where(eq(smokeRunsTestResults.id, resultId));

    if (status === "success") {
      await tx
        .update(smokeRuns)
        .set({ passed: sql`${smokeRuns.passed} + 1` })
        .where(eq(smokeRuns.id, runId));
    } else if (status === "failure") {
      await tx
        .update(smokeRuns)
        .set({ failed: sql`${smokeRuns.failed} + 1` })
        .where(eq(smokeRuns.id, runId));
    }

    logger.info("smoke_test_completed", { runId, resultId, status });
  });
}

export async function finalizeSmokeRun(
  input: FinalizeSmokeRunInput,
  database: Db = db,
): Promise<void> {
  const { runId, status, durationSeconds, completedAt, logger } = input;

  await database.transaction(async (tx) => {
    await tx
      .update(smokeRunsTestResults)
      .set({
        status: "failure",
        errorMessage: INTERRUPTED_ERROR,
        errorStack: null,
        completedAt,
      })
      .where(
        and(
          eq(smokeRunsTestResults.runId, runId),
          eq(smokeRunsTestResults.status, "running"),
        ),
      );

    const results = await tx
      .select({ status: smokeRunsTestResults.status })
      .from(smokeRunsTestResults)
      .where(eq(smokeRunsTestResults.runId, runId));
    const passed = results.filter((result) => result.status === "success").length;
    const failed = results.filter((result) => result.status === "failure").length;

    await tx
      .update(smokeRuns)
      .set({
        status,
        total: results.length,
        passed,
        failed,
        durationSeconds,
        completedAt,
      })
      .where(eq(smokeRuns.id, runId));

    logger.info("smoke_run_finalized", { runId, status, total: results.length, passed, failed });
  });
}
