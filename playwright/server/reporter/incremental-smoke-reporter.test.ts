import assert from "node:assert/strict";
import { test } from "node:test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import type {
  CompleteSmokeTestResultInput,
  StartSmokeTestResultInput,
} from "../db/persist-run";
import PlaywrightIncrementalSmokeReporter, {
  IncrementalSmokeReporter,
  type SmokeReporterPersistence,
} from "./incremental-smoke-reporter";

function testCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    title: "loads the landing page",
    location: { file: "tests/smoke/landing.spec.ts", line: 1, column: 1 },
    annotations: [],
    ...overrides,
  } as TestCase;
}

function testResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    status: "passed",
    duration: 250,
    startTime: new Date("2026-07-22T08:00:00.000Z"),
    errors: [],
    ...overrides,
  } as TestResult;
}

const env = {
  SMOKE_RUN_ID: "run-1",
  SMOKE_CORRELATION_ID: "correlation-1",
};

test("Playwright reporter options are not treated as the persistence adapter", async () => {
  const calls: string[] = [];
  const persistence: SmokeReporterPersistence = {
    async start() {
      calls.push("start");
      return { resultId: "result-1" };
    },
    async complete() {
      calls.push("complete");
    },
  };
  const reporter = new PlaywrightIncrementalSmokeReporter(
    { outputFile: "ignored-by-custom-reporter" },
    persistence,
    env,
  );
  const currentTest = testCase();
  const result = testResult();

  reporter.onTestBegin(currentTest, result);
  reporter.onTestEnd(currentTest, result);
  const outcome = await reporter.onEnd({} as FullResult);

  assert.equal(outcome, undefined);
  assert.deepEqual(calls, ["start", "complete"]);
});

test("queues a start before completing the same observed result", async () => {
  const calls: Array<{ operation: string; input: unknown }> = [];
  const persistence: SmokeReporterPersistence = {
    async start(input) {
      calls.push({ operation: "start", input });
      return { resultId: "result-1" };
    },
    async complete(input) {
      calls.push({ operation: "complete", input });
    },
  };
  const reporter = new IncrementalSmokeReporter(persistence, env);
  const currentTest = testCase({
    title: "smoke: landing page",
    location: {
      file: "C:\\repo\\playwright\\tests\\smoke\\landing.spec.ts",
      line: 1,
      column: 1,
    },
  });
  const result = testResult();

  reporter.onTestBegin(currentTest, result);
  reporter.onTestEnd(currentTest, result);
  const outcome = await reporter.onEnd({} as FullResult);

  assert.equal(outcome, undefined);
  assert.deepEqual(calls.map((call) => call.operation), ["start", "complete"]);
  const started = calls[0].input as StartSmokeTestResultInput;
  const completed = calls[1].input as CompleteSmokeTestResultInput;
  assert.equal(started.runId, "run-1");
  assert.equal(started.testName, "Landing page");
  assert.equal(started.testFile, "smoke/landing.spec.ts");
  assert.equal(completed.resultId, "result-1");
  assert.equal(completed.status, "success");
  assert.equal(completed.completedAt instanceof Date, true);
});

test("maps failed reporter results through the existing failure formatter", async () => {
  let completed: CompleteSmokeTestResultInput | undefined;
  const persistence: SmokeReporterPersistence = {
    async start() {
      return { resultId: "result-1" };
    },
    async complete(input) {
      completed = input;
    },
  };
  const reporter = new IncrementalSmokeReporter(persistence, env);
  const currentTest = testCase({
    annotations: [
      { type: "url", description: "https://example.com" },
      { type: "check", description: JSON.stringify({ name: "page-loads", status: "fail" }) },
    ],
  });
  const result = testResult({
    status: "failed",
    error: { message: "expect(received).toBeTruthy()" },
    errors: [{ message: "expect(received).toBeTruthy()" }],
  });

  reporter.onTestBegin(currentTest, result);
  reporter.onTestEnd(currentTest, result);
  await reporter.onEnd({} as FullResult);

  assert.equal(completed?.status, "failure");
  assert.equal(
    completed?.errorMessage,
    "1 check failed on https://example.com:\n• Page did not return a successful response",
  );
});

test("onEnd waits for pending writes and reports persistence failure", async () => {
  let releaseStart: (() => void) | undefined;
  const persistence: SmokeReporterPersistence = {
    start() {
      return new Promise((resolve) => {
        releaseStart = () => resolve({ resultId: "result-1" });
      });
    },
    async complete() {
      throw new Error("database unavailable");
    },
  };
  const reporter = new IncrementalSmokeReporter(persistence, env);
  const currentTest = testCase();
  const result = testResult();

  reporter.onTestBegin(currentTest, result);
  reporter.onTestEnd(currentTest, result);
  let settled = false;
  const ending = reporter.onEnd({} as FullResult).then((outcome) => {
    settled = true;
    return outcome;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  releaseStart?.();

  assert.deepEqual(await ending, { status: "failed" });
});
