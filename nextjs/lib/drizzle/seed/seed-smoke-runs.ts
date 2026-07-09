import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { smokeRuns, smokeRunsTestResults } from "../schema";
import type * as schema from "../schema";
import { getSeedUuid } from "./helpers";
import { currentOperator } from "./seed-operator";

const smokeRunBackfillConfig = {
  website: {
    runNumbers: [16, 15, 14, 13, 12, 11, 10, 9],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 21,
    testFile: "website/smoke.spec.ts",
    testNames: ["Homepage loads", "Admissions navigation resolves", "Lead form renders", "Core assets respond"],
  },
  enrollmate: {
    runNumbers: [30, 29, 28, 27, 26, 25, 24, 23, 22],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 42,
    testFile: "enrollmate/smoke.spec.ts",
    testNames: ["Login page loads", "Enrollment summary responds", "Payment status responds"],
  },
  "enrollmate-clp": {
    runNumbers: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 36,
    testFile: "clp/smoke.spec.ts",
    testNames: ["CLP dashboard loads", "Session endpoint responds", "Course list responds", "Support links resolve"],
  },
  n8n: {
    runNumbers: [41, 40, 39, 38, 37, 36, 35, 34, 33],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 17,
    testFile: "n8n/smoke.spec.ts",
    testNames: ["Webhook health responds", "Worker heartbeat is fresh"],
  },
};

function createSmokeRunHistory(appId: keyof typeof smokeRunBackfillConfig) {
  const config = smokeRunBackfillConfig[appId];

  return config.runNumbers.map((runNumber, index) => {
    const hasFailure = index % 4 === 1;
    const hasSkipped = index % 5 === 2;
    const status: "success" | "degraded" | "failure" = hasFailure ? "degraded" : "success";
    const passed = hasFailure ? config.testNames.length - 1 : config.testNames.length;
    const failed = hasFailure ? 1 : 0;

    return {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(8, "0")}${String(runNumber).padStart(4, "0")}`,
      runNumber,
      appId,
      status,
      trigger: (index % 3 === 0 ? "manual" : "scheduled") as "scheduled" | "manual",
      total: config.testNames.length,
      passed,
      failed,
      durationSeconds: config.durationSeconds + index * 2,
      startedBy: index % 3 === 0 ? currentOperator : null,
      checkedAt: `${config.checkedAtBase}${String(13 - index).padStart(2, "0")}:10:00+08:00`,
      testResults: config.testNames.map((testName, testIndex) => ({
        id: `${appId}-${runNumber}-${testIndex + 1}`,
        testName,
        testFile: testIndex === config.testNames.length - 1 ? null : config.testFile,
        status: (() => {
          if (hasFailure && testIndex === 1) return "failure" as const;
          if (hasSkipped && testIndex === config.testNames.length - 1) return "skipped" as const;
          return "success" as const;
        })(),
        durationMs: (() => {
          if (hasSkipped && testIndex === config.testNames.length - 1) return null;
          return 3200 + testIndex * 850 + index * 120;
        })(),
        errorMessage: hasFailure && testIndex === 1
          ? "1 check failed on https://mmdc.mcl.edu.ph/certifications/meta-front-end-developer:\n• Expected page content did not render"
          : null,
        errorStack: null,
      })),
    };
  });
}

const smokeRunFixtures = [
  {
    id: "a37acbf2-19c4-4fb1-b39f-d3abf5fd7121",
    runNumber: 18,
    appId: "website",
    status: "success",
    trigger: "scheduled",
    total: 4,
    passed: 4,
    failed: 0,
    durationSeconds: 18,
    startedBy: null,
    checkedAt: "2026-06-29T14:10:00+08:00",
    testResults: [
      { id: "4adfd0aa-1", testName: "Homepage loads", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4200, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-2", testName: "Admissions navigation resolves", testFile: "website/smoke.spec.ts", status: "success", durationMs: 3900, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-3", testName: "Lead form renders", testFile: "website/lead-form.spec.ts", status: "success", durationMs: 5100, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-4", testName: "Core assets respond", testFile: null, status: "success", durationMs: 3600, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "7a4020db-0e48-4651-a965-e6e212c10322",
    runNumber: 17,
    appId: "website",
    status: "degraded",
    trigger: "manual",
    total: 4,
    passed: 3,
    failed: 1,
    durationSeconds: 26,
    startedBy: currentOperator,
    checkedAt: "2026-06-29T12:42:00+08:00",
    testResults: [
      { id: "b3b0fd40-1", testName: "Homepage loads", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4100, errorMessage: null, errorStack: null },
      { id: "b3b0fd40-2", testName: "Admissions navigation resolves", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4200, errorMessage: null, errorStack: null },
      { id: "b3b0fd40-3", testName: "Lead form submits", testFile: "website/lead-form.spec.ts", status: "failure", durationMs: 12800, errorMessage: "Expected confirmation message was not visible.", errorStack: "TimeoutError: locator('[data-testid=lead-confirmation]') timed out after 10000ms" },
      { id: "b3b0fd40-4", testName: "Core assets respond", testFile: null, status: "skipped", durationMs: null, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "4fa1b723-d658-414a-9e50-05418a6d5298",
    runNumber: 31,
    appId: "enrollmate",
    status: "failure",
    trigger: "scheduled",
    total: 3,
    passed: 1,
    failed: 2,
    durationSeconds: 45,
    startedBy: null,
    checkedAt: "2026-06-29T14:05:00+08:00",
    testResults: [
      { id: "4cc97274-1", testName: "Login page loads", testFile: "enrollmate/smoke.spec.ts", status: "success", durationMs: 6200, errorMessage: null, errorStack: null },
      { id: "4cc97274-2", testName: "Enrollment summary responds", testFile: "enrollmate/smoke.spec.ts", status: "failure", durationMs: 20100, errorMessage: "Enrollment summary returned HTTP 503.", errorStack: "Error: expected response.ok() to be truthy" },
      { id: "4cc97274-3", testName: "Payment status responds", testFile: "enrollmate/smoke.spec.ts", status: "failure", durationMs: 18700, errorMessage: "Payment status request timed out.", errorStack: null },
    ],
  },
  {
    id: "ee4229a8-bd46-44c6-a6c3-67cc7dafee36",
    runNumber: 10,
    appId: "enrollmate-clp",
    status: "degraded",
    trigger: "scheduled",
    total: 4,
    passed: 3,
    failed: 1,
    durationSeconds: 39,
    startedBy: null,
    checkedAt: "2026-06-29T13:58:00+08:00",
    testResults: [
      { id: "6f324d35-1", testName: "CLP dashboard loads", testFile: "clp/smoke.spec.ts", status: "failure", durationMs: 16400, errorMessage: "Dashboard returned HTTP 500.", errorStack: null },
      { id: "6f324d35-2", testName: "Session endpoint responds", testFile: "clp/smoke.spec.ts", status: "success", durationMs: 5100, errorMessage: null, errorStack: null },
      { id: "6f324d35-3", testName: "Course list responds", testFile: "clp/smoke.spec.ts", status: "success", durationMs: 7300, errorMessage: null, errorStack: null },
      { id: "6f324d35-4", testName: "Support links resolve", testFile: null, status: "success", durationMs: 3600, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "d495a21e-a89d-4ab6-a191-812f785e482e",
    runNumber: 42,
    appId: "n8n",
    status: "success",
    trigger: "scheduled",
    total: 2,
    passed: 2,
    failed: 0,
    durationSeconds: 16,
    startedBy: null,
    checkedAt: "2026-06-29T14:11:00+08:00",
    testResults: [
      { id: "5aa5ccb2-1", testName: "Webhook health responds", testFile: "n8n/smoke.spec.ts", status: "success", durationMs: 6500, errorMessage: null, errorStack: null },
      { id: "5aa5ccb2-2", testName: "Worker heartbeat is fresh", testFile: "n8n/smoke.spec.ts", status: "success", durationMs: 7100, errorMessage: null, errorStack: null },
    ],
  },
  ...createSmokeRunHistory("website"),
  ...createSmokeRunHistory("enrollmate"),
  ...createSmokeRunHistory("enrollmate-clp"),
  ...createSmokeRunHistory("n8n"),
];

export async function seedSmokeRuns(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

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

    messages.push(`Seeded smoke run: ${run.appId} #${run.runNumber}`);
  }

  return messages;
}
