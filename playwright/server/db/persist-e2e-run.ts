/**
 * Persists an E2E run: computes run_number per profile, inserts the
 * `e2e_runs` row plus `e2e_run_steps` + `e2e_run_tests` children in a
 * single transaction. Retries on `(profileId, runNumber)` unique-violation
 * races, following the same pattern as persist-run.ts.
 */
import { eq, max } from "drizzle-orm";
import type { Logger } from "../logger";
import type { MappedE2eStep } from "../runner/map-e2e-results";
import { db } from "./client";
import { e2eRuns, e2eRunSteps, e2eRunTests } from "./schema";

const MAX_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";

export interface PersistE2eRunInput {
  profileId: string;
  stepIds: string[];
  requestedBy: string;
  startedAt: Date;
  completedAt: Date;
  runStatus: "completed" | "aborted";
  steps: MappedE2eStep[];
  logger: Logger;
}

export interface PersistE2eRunResult {
  runId: string;
  runNumber: number;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === UNIQUE_VIOLATION;
}

export async function persistE2eRun(input: PersistE2eRunInput): Promise<PersistE2eRunResult> {
  const { profileId, requestedBy, startedAt, completedAt, runStatus, steps, logger } = input;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
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
            status: runStatus,
            startedBy: requestedBy,
            startedAt,
            completedAt,
          })
          .returning({ id: e2eRuns.id });

        if (steps.length > 0) {
          // Insert e2e_run_steps and collect their ids for test insertion
          const insertedSteps = await tx
            .insert(e2eRunSteps)
            .values(
              steps.map((step) => ({
                runId: inserted.id,
                stepId: step.stepId,
                status: step.status,
                durationSeconds: step.durationSeconds,
              })),
            )
            .returning({ id: e2eRunSteps.id, stepId: e2eRunSteps.stepId });

          // Map stepId -> runStepId for test insertion
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

        logger.info("e2e_run_persisted", { runId: inserted.id, runNumber, status: runStatus, stepCount: steps.length });
        return { runId: inserted.id, runNumber };
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS) {
        logger.warn("e2e_run_number_race_retry", { attempt });
        continue;
      }
      throw err;
    }
  }

  throw new Error("persistE2eRun: exhausted retries");
}
