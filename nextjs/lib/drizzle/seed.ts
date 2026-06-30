import "dotenv/config";

import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  currentOperator,
  e2eRuns as e2eRunFixtures,
  e2eStepDefinitions,
  profiles as profileFixtures,
  smokeApps,
  smokeRuns as smokeRunFixtures,
} from "@/lib/mock-testing-data";
import {
  apps,
  e2eRuns,
  e2eRunSteps,
  e2eRunTests,
  e2eSteps,
  profileEnrollmentData,
  profiles,
  smokeRuns,
  smokeRunsTestResults,
  users,
} from "./schema";
import * as schema from "./schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSeedUuid(value: string) {
  if (UUID_PATTERN.test(value)) return value;

  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hash[12] = "5";
  hash[16] = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20)].map((part) => part.join("")).join("-");
}

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database.");

  const seedDb = drizzle({
    connection: { connectionString: databaseUrl },
    schema,
  });

  try {
    await seedDb.transaction(async (tx) => {
      await tx
        .insert(users)
        .values(currentOperator)
        .onConflictDoUpdate({
          target: users.id,
          set: { name: currentOperator.name, email: currentOperator.email },
        });

      for (const app of smokeApps) {
        const values = {
          ...app,
          createdBy: currentOperator.id,
          updatedBy: currentOperator.id,
        };

        await tx.insert(apps).values(values).onConflictDoUpdate({
          target: apps.id,
          set: {
            name: values.name,
            description: values.description,
            createdBy: values.createdBy,
            updatedBy: values.updatedBy,
          },
        });
      }

      for (const run of smokeRunFixtures) {
        const values = {
          id: run.id,
          runNumber: run.runNumber,
          appId: run.appId,
          status: run.status,
          trigger: run.trigger,
          total: run.total,
          passed: run.passed,
          failed: run.failed,
          durationSeconds: run.durationSeconds,
          startedBy: run.startedBy?.id ?? null,
          checkedAt: new Date(run.checkedAt),
        };

        await tx.insert(smokeRuns).values(values).onConflictDoUpdate({
          target: smokeRuns.id,
          set: {
            runNumber: values.runNumber,
            appId: values.appId,
            status: values.status,
            trigger: values.trigger,
            total: values.total,
            passed: values.passed,
            failed: values.failed,
            durationSeconds: values.durationSeconds,
            startedBy: values.startedBy,
            checkedAt: values.checkedAt,
          },
        });

        for (const result of run.testResults) {
          const resultId = getSeedUuid(`smoke-result:${run.id}:${result.id}`);
          const resultValues = {
            ...result,
            id: resultId,
            runId: run.id,
          };

          await tx.insert(smokeRunsTestResults).values(resultValues).onConflictDoUpdate({
            target: smokeRunsTestResults.id,
            set: {
              runId: resultValues.runId,
              testName: resultValues.testName,
              testFile: resultValues.testFile,
              status: resultValues.status,
              durationMs: resultValues.durationMs,
              errorMessage: resultValues.errorMessage,
              errorStack: resultValues.errorStack,
            },
          });
        }
      }

      for (const profile of profileFixtures) {
        const profileValues = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          program: profile.program,
          cohort: profile.cohort,
          status: profile.status,
          createdBy: currentOperator.id,
          updatedBy: currentOperator.id,
        };

        await tx.insert(profiles).values(profileValues).onConflictDoUpdate({
          target: profiles.id,
          set: {
            name: profileValues.name,
            email: profileValues.email,
            program: profileValues.program,
            cohort: profileValues.cohort,
            status: profileValues.status,
            createdBy: profileValues.createdBy,
            updatedBy: profileValues.updatedBy,
          },
        });

        const enrollmentValues = {
          id: getSeedUuid(`profile-enrollment:${profile.id}`),
          profileId: profile.id,
          ...profile.enrollmentData,
        };

        await tx.insert(profileEnrollmentData).values(enrollmentValues).onConflictDoUpdate({
          target: profileEnrollmentData.profileId,
          set: enrollmentValues,
        });
      }

      for (const step of e2eStepDefinitions) {
        await tx.insert(e2eSteps).values(step).onConflictDoUpdate({
          target: e2eSteps.id,
          set: {
            label: step.label,
            description: step.description,
            sortOrder: step.sortOrder,
          },
        });
      }

      for (const run of e2eRunFixtures) {
        const runValues = {
          id: run.id,
          runNumber: run.runNumber,
          profileId: run.profileId,
          status: run.status,
          startedBy: run.startedBy?.id ?? null,
          startedAt: new Date(run.startedAt),
          completedAt: run.completedAt ? new Date(run.completedAt) : null,
        };

        await tx.insert(e2eRuns).values(runValues).onConflictDoUpdate({
          target: e2eRuns.id,
          set: {
            runNumber: runValues.runNumber,
            profileId: runValues.profileId,
            status: runValues.status,
            startedBy: runValues.startedBy,
            startedAt: runValues.startedAt,
            completedAt: runValues.completedAt,
          },
        });

        for (const step of run.steps) {
          const runStepId = getSeedUuid(`e2e-run-step:${run.id}:${step.id}`);
          const runStepValues = {
            id: runStepId,
            runId: run.id,
            stepId: step.stepId,
            status: step.status,
            durationSeconds: step.durationSeconds,
            note: step.note,
          };

          await tx.insert(e2eRunSteps).values(runStepValues).onConflictDoUpdate({
            target: e2eRunSteps.id,
            set: {
              runId: runStepValues.runId,
              stepId: runStepValues.stepId,
              status: runStepValues.status,
              durationSeconds: runStepValues.durationSeconds,
              note: runStepValues.note,
            },
          });

          for (const test of step.tests) {
            const testId = getSeedUuid(`e2e-run-test:${run.id}:${step.id}:${test.id}`);
            const testValues = {
              ...test,
              id: testId,
              runStepId,
            };

            await tx.insert(e2eRunTests).values(testValues).onConflictDoUpdate({
              target: e2eRunTests.id,
              set: {
                runStepId: testValues.runStepId,
                testName: testValues.testName,
                status: testValues.status,
                durationMs: testValues.durationMs,
                errorMessage: testValues.errorMessage,
              },
            });
          }
        }
      }
    });

    console.log("Database seed completed.");
  } finally {
    await seedDb.$client.end();
  }
}

seedDatabase().catch((error: unknown) => {
  console.error("Database seed failed.", error);
  process.exitCode = 1;
});
