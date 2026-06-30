import "dotenv/config";

import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
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
  profileAdditionalInfo,
  profileDisclosures,
  profileDocuments,
  profileEnrollmentData,
  profileLearnerReadiness,
  profilePaymentDetails,
  profiles,
  profileStudyBuddy,
  profileSystemInfo,
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

export async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database.");

  console.log("Seeding database...");

  const seedDb = drizzle({
    connection: { connectionString: databaseUrl },
    schema,
  });
  const successMessages: string[] = [];

  try {
    await seedDb.transaction(async (tx) => {
      await tx
        .insert(users)
        .values(currentOperator)
        .onConflictDoUpdate({
          target: users.id,
          set: { name: currentOperator.name, email: currentOperator.email },
        });
      successMessages.push(`Seeded operator: ${currentOperator.email}`);

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
        successMessages.push(`Seeded app: ${app.name}`);
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

        successMessages.push(`Seeded smoke run: ${run.appId} #${run.runNumber}`);
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

        if (profile.learnerReadiness) {
          const learnerReadinessValues = {
            id: getSeedUuid(`profile-learner-readiness:${profile.id}`),
            profileId: profile.id,
            ...profile.learnerReadiness,
          };

          await tx.insert(profileLearnerReadiness).values(learnerReadinessValues).onConflictDoUpdate({
            target: profileLearnerReadiness.profileId,
            set: learnerReadinessValues,
          });
        }

        if (profile.paymentDetails) {
          const paymentDetailsValues = {
            id: getSeedUuid(`profile-payment-details:${profile.id}`),
            profileId: profile.id,
            ...profile.paymentDetails,
            timestampInPaymentVerification: profile.paymentDetails.timestampInPaymentVerification
              ? new Date(profile.paymentDetails.timestampInPaymentVerification)
              : null,
          };

          await tx.insert(profilePaymentDetails).values(paymentDetailsValues).onConflictDoUpdate({
            target: profilePaymentDetails.profileId,
            set: paymentDetailsValues,
          });
        }

        if (profile.studyBuddy) {
          const studyBuddyValues = {
            id: getSeedUuid(`profile-study-buddy:${profile.id}`),
            profileId: profile.id,
            ...profile.studyBuddy,
          };

          await tx.insert(profileStudyBuddy).values(studyBuddyValues).onConflictDoUpdate({
            target: profileStudyBuddy.profileId,
            set: studyBuddyValues,
          });
        }

        if (profile.documents) {
          const documentValues = {
            id: getSeedUuid(`profile-documents:${profile.id}`),
            profileId: profile.id,
            ...profile.documents,
          };

          await tx.insert(profileDocuments).values(documentValues).onConflictDoUpdate({
            target: profileDocuments.profileId,
            set: documentValues,
          });
        }

        if (profile.additionalInfo) {
          const additionalInfoValues = {
            id: getSeedUuid(`profile-additional-info:${profile.id}`),
            profileId: profile.id,
            ...profile.additionalInfo,
          };

          await tx.insert(profileAdditionalInfo).values(additionalInfoValues).onConflictDoUpdate({
            target: profileAdditionalInfo.profileId,
            set: additionalInfoValues,
          });
        }

        if (profile.disclosures) {
          const disclosureValues = {
            id: getSeedUuid(`profile-disclosures:${profile.id}`),
            profileId: profile.id,
            ...profile.disclosures,
          };

          await tx.insert(profileDisclosures).values(disclosureValues).onConflictDoUpdate({
            target: profileDisclosures.profileId,
            set: disclosureValues,
          });
        }

        if (profile.systemInfo) {
          const systemInfoValues = {
            id: getSeedUuid(`profile-system-info:${profile.id}`),
            profileId: profile.id,
            ...profile.systemInfo,
            lastSentToApi: profile.systemInfo.lastSentToApi
              ? new Date(profile.systemInfo.lastSentToApi)
              : null,
          };

          await tx.insert(profileSystemInfo).values(systemInfoValues).onConflictDoUpdate({
            target: profileSystemInfo.profileId,
            set: systemInfoValues,
          });
        }

        successMessages.push(`Seeded profile: ${profile.email}`);
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
        successMessages.push(`Seeded E2E step: ${step.label}`);
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

        successMessages.push(`Seeded E2E run: ${run.profileId} #${run.runNumber}`);
      }
    });

    for (const message of successMessages) console.log(message);
    console.log("Database seed completed.");
  } finally {
    await seedDb.$client.end();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  seedDatabase().catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  });
}
