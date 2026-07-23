/**
 * Incremental Smoke persistence. Each exported operation commits independently
 * so an active run and every observed result remain visible while Playwright is
 * still executing.
 */
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { Logger } from "../logger";
import type { RunStatus, TestResultStatus } from "../runner/map-results";
import { db, type Db } from "./client";
import { smokeRuns, smokeRunsTestResults } from "./schema";

const INTERRUPTED_ERROR = "Test execution was interrupted before completion";
const SMOKE_RUN_CHANGED_CHANNEL = "smoke_run_changed";

interface SqlExecutor {
  execute(query: SQL): Promise<unknown>;
}

async function notifySmokeRunChanged(executor: SqlExecutor, runId: string): Promise<void> {
  await executor.execute(sql`select pg_notify(${SMOKE_RUN_CHANGED_CHANNEL}, ${runId})`);
}

export interface ClaimSmokeRunInput {
  runId: string;
  startedAt: Date;
  logger: Logger;
}

export interface StartSmokeTestResultInput {
  runId: string;
  testId: string;
  retryAttempt: number;
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

export async function claimSmokeRun(
  input: ClaimSmokeRunInput,
  database: Db = db,
): Promise<boolean> {
  const { runId, startedAt, logger } = input;

  return database.transaction(async (tx) => {
    const claimed = await tx
      .update(smokeRuns)
      .set({ status: "running", startedAt })
      .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "queued")))
      .returning({ id: smokeRuns.id });

    if (claimed.length === 0) return false;

    await notifySmokeRunChanged(tx, runId);
    logger.info("smoke_run_claimed", { runId });
    return true;
  });
}

export async function startSmokeTestResult(
  input: StartSmokeTestResultInput,
  database: Db = db,
): Promise<StartSmokeTestResultResult> {
  const { runId, testId, retryAttempt, testName, testFile, startedAt, logger } = input;

  return database.transaction(async (tx) => {
    const inserted = await tx
      .insert(smokeRunsTestResults)
      .values({
        runId,
        testId,
        retryAttempt,
        testName,
        testFile,
        status: "running",
        durationMs: null,
        errorMessage: null,
        errorStack: null,
        startedAt,
        completedAt: null,
      })
      .onConflictDoNothing({
        target: [
          smokeRunsTestResults.runId,
          smokeRunsTestResults.testId,
          smokeRunsTestResults.retryAttempt,
        ],
      })
      .returning({ id: smokeRunsTestResults.id });

    const [existing] =
      inserted.length > 0
        ? inserted
        : await tx
            .select({ id: smokeRunsTestResults.id })
            .from(smokeRunsTestResults)
            .where(
              and(
                eq(smokeRunsTestResults.runId, runId),
                eq(smokeRunsTestResults.testId, testId),
                eq(smokeRunsTestResults.retryAttempt, retryAttempt),
              ),
            );

    if (!existing) {
      throw new Error(`Smoke result ${runId}/${testId}/${retryAttempt} was not found after insert conflict`);
    }

    if (inserted.length === 0) {
      logger.info("smoke_test_start_duplicate", { runId, resultId: existing.id, testId, retryAttempt });
      return { resultId: existing.id };
    }

    await tx
      .update(smokeRuns)
      .set({ total: sql`${smokeRuns.total} + 1` })
      .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "running")));

    await notifySmokeRunChanged(tx, runId);
    logger.info("smoke_test_started", { runId, resultId: existing.id, testName, testId, retryAttempt });
    return { resultId: existing.id };
  });
}

export async function completeSmokeTestResult(
  input: CompleteSmokeTestResultInput,
  database: Db = db,
): Promise<boolean> {
  const { resultId, runId, status, durationMs, errorMessage, completedAt, logger } = input;

  return database.transaction(async (tx) => {
    const completed = await tx
      .update(smokeRunsTestResults)
      .set({
        status,
        durationMs,
        errorMessage,
        errorStack: null,
        completedAt,
      })
      .where(
        and(
          eq(smokeRunsTestResults.id, resultId),
          eq(smokeRunsTestResults.runId, runId),
          eq(smokeRunsTestResults.status, "running"),
        ),
      )
      .returning({ id: smokeRunsTestResults.id });

    if (completed.length === 0) return false;

    if (status === "success") {
      await tx
        .update(smokeRuns)
        .set({ passed: sql`${smokeRuns.passed} + 1` })
        .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "running")));
    } else if (status === "failure") {
      await tx
        .update(smokeRuns)
        .set({ failed: sql`${smokeRuns.failed} + 1` })
        .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "running")));
    }

    await notifySmokeRunChanged(tx, runId);
    logger.info("smoke_test_completed", { runId, resultId, status });
    return true;
  });
}

export async function finalizeSmokeRun(
  input: FinalizeSmokeRunInput,
  database: Db = db,
): Promise<boolean> {
  const { runId, status, durationSeconds, completedAt, logger } = input;

  return database.transaction(async (tx) => {
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

    const finalized = await tx
      .update(smokeRuns)
      .set({
        status,
        total: results.length,
        passed,
        failed,
        durationSeconds,
        completedAt,
      })
      .where(and(eq(smokeRuns.id, runId), eq(smokeRuns.status, "running")))
      .returning({ id: smokeRuns.id });

    if (finalized.length === 0) return false;

    await notifySmokeRunChanged(tx, runId);
    logger.info("smoke_run_finalized", { runId, status, total: results.length, passed, failed });
    return true;
  });
}
