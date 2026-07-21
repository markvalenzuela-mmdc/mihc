import assert from "node:assert/strict";
import { test } from "node:test";
import { mapE2eResults } from "./map-e2e-results";
import type { PlaywrightJsonReport } from "./map-results";

interface TestResult {
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  error?: { message?: string };
  errors?: { message?: string }[];
  annotations?: { type: string; description?: string }[];
}

function reportWith(
  result: TestResult,
  errors: { message?: string }[] = [],
): PlaywrightJsonReport {
  return {
    errors,
    suites: [{
      specs: [{
        title: "aborted E2E flow",
        tests: [{ results: [result] }],
      }],
    }],
  };
}

test("aborted run captures the final attempt's singular error", () => {
  const report = reportWith({
    status: "timedOut",
    error: { message: "page.goto: Timeout exceeded" },
  });

  const result = mapE2eResults(report, 1, ["new"]);

  assert.equal(result.status, "aborted");
  assert.equal(result.steps[0].note, "page.goto: Timeout exceeded");
});

test("aborted run captures the final attempt's errors array", () => {
  const report = reportWith({
    status: "failed",
    errors: [
      { message: "browser closed" },
      { message: "context unavailable" },
    ],
  });

  const result = mapE2eResults(report, 1, ["new"]);

  assert.equal(result.steps[0].note, "browser closed\ncontext unavailable");
});

test("aborted run deduplicates report and final-attempt errors", () => {
  const report = reportWith(
    {
      status: "failed",
      errors: [
        { message: "browser closed" },
        { message: "context unavailable" },
      ],
    },
    [{ message: "browser closed" }],
  );

  const result = mapE2eResults(report, 1, ["new"]);

  assert.equal(result.steps[0].note, "browser closed\ncontext unavailable");
});

test("completed run does not attach Playwright errors to a step note", () => {
  const check = {
    type: "check",
    description: JSON.stringify({ name: "page-loads", status: "pass" }),
  };
  const report = reportWith(
    { status: "passed", annotations: [check] },
    [{ message: "unrelated report diagnostic" }],
  );

  const result = mapE2eResults(report, 0, ["new"]);

  assert.equal(result.status, "completed");
  assert.equal(result.steps[0].note, undefined);
});
