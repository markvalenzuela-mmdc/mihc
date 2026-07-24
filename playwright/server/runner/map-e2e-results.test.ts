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

function check(name: string, status: "pass" | "fail", durationMs?: number) {
  const payload: Record<string, unknown> = { name, status };
  if (durationMs !== undefined) payload.durationMs = durationMs;
  return {
    type: "check",
    description: JSON.stringify(payload),
  };
}

interface TestConfig {
  duration: number;
  annotations: { type: string; description?: string }[];
}

interface SpecConfig {
  title: string;
  tests: TestConfig[];
}

function reportFromSpecs(specs: SpecConfig[]): PlaywrightJsonReport {
  return {
    errors: [],
    suites: [{
      specs: specs.map((spec) => ({
        title: spec.title,
        tests: spec.tests.map((tc) => ({
          results: [{
            status: "passed" as const,
            duration: tc.duration,
            annotations: tc.annotations,
          }],
        })),
      })),
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

test("multi-step test distributes duration to all steps", () => {
  const report = reportFromSpecs([{
    title: "enrollmate flow",
    tests: [{
      duration: 45000,
      annotations: [
        check("page-loads", "pass"),
        check("step-1 (Personal Information): filled", "pass"),
        check("submit", "pass"),
      ],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "validated", "verification"]);

  assert.equal(result.steps[0].stepId, "new");
  assert.equal(result.steps[0].durationSeconds, 45);
  assert.equal(result.steps[1].stepId, "validated");
  assert.equal(result.steps[1].durationSeconds, 45);
  assert.equal(result.steps[2].stepId, "verification");
  assert.equal(result.steps[2].durationSeconds, 45);
});

test("single-step test credits only its step", () => {
  const report = reportFromSpecs([{
    title: "single check",
    tests: [{
      duration: 30000,
      annotations: [check("page-loads", "pass")],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "validated", "verification"]);

  assert.equal(result.steps[0].stepId, "new");
  assert.equal(result.steps[0].durationSeconds, 30);
  assert.equal(result.steps[1].durationSeconds, null);
  assert.equal(result.steps[2].durationSeconds, null);
});

test("mixed outcomes produce distinct statuses", () => {
  const report = reportFromSpecs([{
    title: "mixed checks",
    tests: [{
      duration: 20000,
      annotations: [
        check("page-loads", "pass"),
        check("submit", "fail"),
      ],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "verification"]);

  assert.equal(result.steps[0].stepId, "new");
  assert.equal(result.steps[0].status, "success");
  assert.equal(result.steps[1].stepId, "verification");
  assert.equal(result.steps[1].status, "failure");
});

test("untested steps have no duration and untested status", () => {
  const report = reportFromSpecs([{
    title: "only page-loads",
    tests: [{
      duration: 15000,
      annotations: [check("page-loads", "pass")],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "guidance_needed", "validated"]);

  assert.equal(result.steps[0].stepId, "new");
  assert.equal(result.steps[0].status, "success");
  assert.equal(result.steps[0].durationSeconds, 15);
  assert.equal(result.steps[1].stepId, "guidance_needed");
  assert.equal(result.steps[1].status, "untested");
  assert.equal(result.steps[1].durationSeconds, null);
  assert.equal(result.steps[1].tests.length, 0);
  assert.equal(result.steps[2].stepId, "validated");
  assert.equal(result.steps[2].status, "untested");
  assert.equal(result.steps[2].durationSeconds, null);
  assert.equal(result.steps[2].tests.length, 0);
});

test("multiple tests map to the same step and aggregate duration", () => {
  const report = reportFromSpecs([
    {
      title: "first attempt",
      tests: [{ duration: 30000, annotations: [check("page-loads", "pass")] }],
    },
    {
      title: "second attempt",
      tests: [{ duration: 20000, annotations: [check("page-loads", "pass")] }],
    },
  ]);

  const result = mapE2eResults(report, 0, ["new"]);

  assert.equal(result.steps[0].stepId, "new");
  assert.equal(result.steps[0].durationSeconds, 50);
  assert.equal(result.steps[0].tests.length, 2);
});

test("individual test results get proportional durationMs", () => {
  const report = reportFromSpecs([{
    title: "enrollmate flow",
    tests: [{
      duration: 42400,
      annotations: [
        check("page-loads", "pass"),
        check("step-1 (Personal Information): filled", "pass"),
        check("step-1 (Personal Information): advanced", "pass"),
        check("submit", "pass"),
        check("submission-confirmed", "pass"),
      ],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "validated", "verification", "enrollment_confirmation"]);

  const perCheck = Math.round(42400 / 5);

  for (const step of result.steps) {
    for (const t of step.tests) {
      assert.equal(t.durationMs, perCheck);
    }
  }
});

test("individual test results have null durationMs when test duration is absent", () => {
  const checkAnnotation = check("page-loads", "pass");

  const report: PlaywrightJsonReport = {
    errors: [],
    suites: [{
      specs: [{
        title: "no duration",
        tests: [{
          results: [{
            status: "passed" as const,
            annotations: [checkAnnotation],
          }],
        }],
      }],
    }],
  };

  const result = mapE2eResults(report, 0, ["new"]);

  assert.equal(result.steps[0].tests[0].durationMs, null);
});

test("explicit per-check durationMs overrides proportional fallback", () => {
  const report = reportFromSpecs([{
    title: "instrumented flow",
    tests: [{
      duration: 45000,
      annotations: [
        check("page-loads", "pass", 3200),
        check("submit", "pass", 12000),
        check("submission-confirmed", "pass", 5800),
      ],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "verification", "enrollment_confirmation"]);

  assert.equal(result.steps[0].tests[0].durationMs, 3200);
  assert.equal(result.steps[1].tests[0].durationMs, 12000);
  assert.equal(result.steps[2].tests[0].durationMs, 5800);
});

test("mixed explicit and missing durationMs uses fallback for missing", () => {
  const report = reportFromSpecs([{
    title: "partially instrumented",
    tests: [{
      duration: 30000,
      annotations: [
        check("page-loads", "pass", 2100),
        check("submit", "pass"),
      ],
    }],
  }]);

  const result = mapE2eResults(report, 0, ["new", "verification"]);

  assert.equal(result.steps[0].tests[0].durationMs, 2100);
  // Second check has no explicit durationMs, falls back to proportional
  assert.equal(result.steps[1].tests[0].durationMs, Math.round(30000 / 2));
});
