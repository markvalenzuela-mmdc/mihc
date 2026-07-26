import assert from "node:assert/strict";
import { test } from "node:test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import type { RecordE2eCheckInput } from "../db/persist-e2e-run";
import PlaywrightIncrementalE2eReporter, {
  IncrementalE2eReporter,
  type E2eReporterPersistence,
} from "./incremental-e2e-reporter";

function testCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: "e2e-page-loads",
    title: "page-loads",
    location: { file: "tests/e2e/enrollmate/apply-now.spec.ts", line: 1, column: 1 },
    annotations: [],
    ...overrides,
  } as TestCase;
}

function testResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    status: "passed",
    retry: 0,
    duration: 250,
    startTime: new Date("2026-07-25T08:00:00.000Z"),
    errors: [],
    annotations: [],
    ...overrides,
  } as TestResult;
}

function check(
  name: string,
  status: "pass" | "fail",
  message?: string,
  durationMs?: number,
) {
  return {
    type: "check",
    description: JSON.stringify({
      name,
      status,
      ...(message ? { message } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
    }),
  };
}

const env = {
  E2E_RUN_ID: "run-1",
  E2E_PROFILE_ID: "profile-1",
  E2E_SELECTED_STEP_IDS: JSON.stringify(["new", "validated", "verification"]),
  E2E_CORRELATION_ID: "correlation-1",
};

test("Playwright reporter options are not treated as the persistence adapter", async () => {
  const calls: string[] = [];
  const persistence: E2eReporterPersistence = {
    async record() {
      calls.push("record");
    },
  };
  const reporter = new PlaywrightIncrementalE2eReporter(
    { outputFile: "ignored-by-custom-reporter" },
    persistence,
    env,
  );

  reporter.onTestEnd(testCase({ annotations: [check("page-loads", "pass")] }), testResult());
  const outcome = await reporter.onEnd({} as FullResult);

  assert.equal(outcome, undefined);
  assert.deepEqual(calls, ["record"]);
});

test("persists a passed page-load check in its mapped step", async () => {
  let recorded: RecordE2eCheckInput | undefined;
  const persistence: E2eReporterPersistence = {
    async record(input) {
      recorded = input;
    },
  };
  const reporter = new IncrementalE2eReporter(persistence, env);

  reporter.onTestEnd(
    testCase({ annotations: [check("page-loads", "pass")] }),
    testResult({ duration: 900 }),
  );
  await reporter.onEnd({} as FullResult);

  assert.equal(recorded?.profileId, "profile-1");
  assert.equal(recorded?.stepId, "new");
  assert.equal(recorded?.testName, "page-loads");
  assert.equal(recorded?.status, "success");
  assert.equal(recorded?.durationMs, 900);
  assert.equal(recorded?.errorMessage, null);
});

test("formats a failed step check and prefers its annotation duration", async () => {
  let recorded: RecordE2eCheckInput | undefined;
  const persistence: E2eReporterPersistence = {
    async record(input) {
      recorded = input;
    },
  };
  const reporter = new IncrementalE2eReporter(persistence, env);

  reporter.onTestEnd(
    testCase({
      annotations: [
        check(
          "step-1 (Student Info): advanced",
          "fail",
          "Error: Current Foreign Address is required.",
          2_100,
        ),
      ],
    }),
    testResult({ status: "failed", duration: 9_000, error: { message: "internal assertion" } }),
  );
  await reporter.onEnd({} as FullResult);

  assert.equal(recorded?.stepId, "validated");
  assert.equal(recorded?.status, "failure");
  assert.equal(recorded?.durationMs, 2_100);
  assert.equal(
    recorded?.errorMessage,
    'Step 1 "Student Info" did not advance — Current Foreign Address is required.',
  );
});

test("queues check writes in test completion order", async () => {
  const order: string[] = [];
  const persistence: E2eReporterPersistence = {
    async record(input) {
      order.push(`start:${input.testName}`);
      await new Promise((resolve) => setTimeout(resolve, input.testName === "first" ? 5 : 0));
      order.push(`end:${input.testName}`);
    },
  };
  const reporter = new IncrementalE2eReporter(persistence, env);

  reporter.onTestEnd(testCase({ annotations: [check("first", "pass")] }), testResult());
  reporter.onTestEnd(testCase({ annotations: [check("second", "pass")] }), testResult());
  await reporter.onEnd({} as FullResult);

  assert.deepEqual(order, ["start:first", "end:first", "start:second", "end:second"]);
});

test("ignores tests without a check annotation", async () => {
  let count = 0;
  const persistence: E2eReporterPersistence = {
    async record() {
      count++;
    },
  };
  const reporter = new IncrementalE2eReporter(persistence, env);

  reporter.onTestEnd(testCase({ annotations: [{ type: "url", description: "https://example.com" }] }), testResult());
  await reporter.onEnd({} as FullResult);

  assert.equal(count, 0);
});

test("reads a check annotation from the result when needed", async () => {
  let recorded: RecordE2eCheckInput | undefined;
  const persistence: E2eReporterPersistence = {
    async record(input) {
      recorded = input;
    },
  };
  const reporter = new IncrementalE2eReporter(persistence, env);

  reporter.onTestEnd(testCase(), testResult({ annotations: [check("submit", "pass")] }));
  await reporter.onEnd({} as FullResult);

  assert.equal(recorded?.stepId, "verification");
});

test("onEnd reports persistence failures after queued writes settle", async () => {
  const persistence: E2eReporterPersistence = {
    async record() {
      throw new Error("database unavailable");
    },
  };
  const reporter = new IncrementalE2eReporter(persistence, env);

  reporter.onTestEnd(testCase({ annotations: [check("page-loads", "pass")] }), testResult());

  assert.deepEqual(await reporter.onEnd({} as FullResult), { status: "failed" });
});
