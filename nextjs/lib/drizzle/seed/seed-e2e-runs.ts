import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { e2eRuns, e2eRunSteps, e2eRunTests } from "../schema";
import type * as schema from "../schema";
import { getSeedUuid } from "./helpers";
import { currentOperator } from "./seed-operator";
import { profiles } from "./seed-profiles";
import { e2eStepDefinitions } from "./seed-e2e-steps";

const e2eRunHistoryConfig = [
  { profileIndex: 0, runNumbers: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2], dayStart: 19 },
  { profileIndex: 1, runNumbers: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8], dayStart: 18 },
  { profileIndex: 2, runNumbers: [13, 12, 11, 10, 9, 8, 7, 6, 5, 4], dayStart: 14 },
  { profileIndex: 3, runNumbers: [14, 13, 12, 11, 10, 9, 8, 7, 6, 5], dayStart: 18 },
];

type E2eRunStatus = typeof e2eRuns.$inferInsert.status;
type E2eRunStepStatus = typeof e2eRunSteps.$inferInsert.status;
type E2eRunTestStatus = typeof e2eRunTests.$inferInsert.status;

interface E2eRunTestFixture {
  id: string;
  testName: string;
  status: E2eRunTestStatus;
  durationMs: number;
  errorMessage: string | null;
}

interface E2eRunStepFixture {
  id: string;
  stepId: string;
  status: E2eRunStepStatus;
  durationSeconds: number | null;
  note: string;
  tests: E2eRunTestFixture[];
}

interface E2eRunFixture {
  id: string;
  runNumber: number;
  profileId: string;
  status: E2eRunStatus;
  startedBy: typeof currentOperator | null;
  startedAt: string;
  completedAt: string | null;
  steps: E2eRunStepFixture[];
}

function createE2eRunHistory({
  profileIndex,
  runNumbers,
  dayStart,
}: (typeof e2eRunHistoryConfig)[number]): E2eRunFixture[] {
  const profile = profiles[profileIndex];
  const profileToken = String(profileIndex + 1).padStart(4, "0");

  return runNumbers.map<E2eRunFixture>((runNumber, index) => {
    const hasFailure = index % 4 === 1;
    const isAborted = index % 7 === 3;
    const status: E2eRunStatus = isAborted ? "aborted" : "completed";
    const day = String(dayStart + index).padStart(2, "0");
    const hour = String(9 + (index % 6)).padStart(2, "0");

    return {
      id: `00000000-0000-4000-8000-${profileToken}${String(runNumber).padStart(8, "0")}`,
      runNumber,
      profileId: profile.id,
      status,
      startedBy: index % 3 === 0 ? currentOperator : null,
      startedAt: `2026-06-${day}T${hour}:05:00+08:00`,
      completedAt: `2026-06-${day}T${hour}:10:${String(20 + index).padStart(2, "0")}+08:00`,
      steps: e2eStepDefinitions.map<E2eRunStepFixture>((step, stepIndex) => {
        const didRunStep = !isAborted || stepIndex < 2;
        const didFailStep = hasFailure && stepIndex === 2;
        const stepStatus: E2eRunStepStatus = !didRunStep ? "queued" : didFailStep ? "failure" : "success";

        return {
          id: `history-${profileIndex + 1}-${runNumber}-${stepIndex + 1}`,
          stepId: step.id,
          status: stepStatus,
          durationSeconds: didRunStep ? 42 + stepIndex * 9 + index : null,
          note: !didRunStep
            ? "Run ended before this step started."
            : didFailStep
              ? `${step.label} produced a validation mismatch.`
              : `${step.label} completed against the seeded profile.`,
          tests: didRunStep
            ? [
                {
                  id: `history-${profileIndex + 1}-${runNumber}-${stepIndex + 1}-1`,
                  testName: didFailStep ? `${step.label} validation recovers` : `${step.label} assertions pass`,
                  status: didFailStep ? "failure" : "success",
                  durationMs: 2600 + stepIndex * 380 + index * 90,
                  errorMessage: didFailStep ? "Expected validation state did not clear before timeout." : null,
                },
              ]
            : [],
        };
      }),
    };
  });
}

const e2eRunFixtures = [
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f501",
    runNumber: 12,
    profileId: profiles[0].id,
    status: "completed",
    startedBy: currentOperator,
    startedAt: "2026-06-29T11:28:00+08:00",
    completedAt: "2026-06-29T11:32:41+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5001-${index}`, stepId: step.id, status: "success", durationSeconds: 48 + index * 11, note: `${step.label} completed against the configured profile.`, tests: [{ id: `ea5001-${index}-1`, testName: `${step.label} assertions pass`, status: "success", durationMs: 2800 + index * 420, errorMessage: null }] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f502",
    runNumber: 7,
    profileId: profiles[1].id,
    status: "completed",
    startedBy: null,
    startedAt: "2026-06-28T16:07:00+08:00",
    completedAt: "2026-06-28T16:12:19+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5002-${index}`, stepId: step.id, status: index === 2 ? "failure" : "success", durationSeconds: 52 + index * 8, note: index === 2 ? "Profile status validation did not resolve." : `${step.label} completed.`, tests: [{ id: `ea5002-${index}-1`, testName: index === 2 ? "Profile status validation clears" : `${step.label} assertions pass`, status: index === 2 ? "failure" : index === 3 ? "skipped" : "success", durationMs: index === 2 ? 10100 : 3100, errorMessage: index === 2 ? "Validation message remained visible after entering valid profile data." : null }] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f503",
    runNumber: 3,
    profileId: profiles[2].id,
    status: "aborted",
    startedBy: currentOperator,
    startedAt: "2026-06-24T09:40:00+08:00",
    completedAt: "2026-06-24T09:41:12+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5003-${index}`, stepId: step.id, status: index === 0 ? "success" : index === 1 ? "failure" : "queued", durationSeconds: index < 2 ? 34 : null, note: index === 1 ? "Required mobile number was missing from profile data." : index > 1 ? "Run aborted before this status step started." : `${step.label} completed.`, tests: index < 2 ? [{ id: `ea5003-${index}-1`, testName: index === 1 ? "Student mobile is populated" : `${step.label} status checks pass`, status: index === 1 ? "failure" : "success", durationMs: 2100, errorMessage: index === 1 ? "Profile mobile value is empty." : null }] : [] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f504",
    runNumber: 4,
    profileId: profiles[3].id,
    status: "running",
    startedBy: currentOperator,
    startedAt: "2026-06-29T14:18:00+08:00",
    completedAt: null,
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5004-${index}`, stepId: step.id, status: index === 0 ? "success" : index === 1 ? "running" : "queued", durationSeconds: index === 0 ? 38 : null, note: index === 0 ? `${step.label} completed.` : index === 1 ? "Running profile status checks." : "Waiting for the preceding status step.", tests: index === 0 ? [{ id: "ea5004-0-1", testName: `${step.label} status checks pass`, status: "success", durationMs: 2400, errorMessage: null }] : [] })),
  },
  ...e2eRunHistoryConfig.flatMap(createE2eRunHistory),
] satisfies E2eRunFixture[];

export async function seedE2eRuns(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

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

    messages.push(`Seeded E2E run: ${run.profileId} #${run.runNumber}`);
  }

  return messages;
}
