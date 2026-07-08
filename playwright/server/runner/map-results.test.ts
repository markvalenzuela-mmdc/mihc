import assert from "node:assert/strict";
import { test } from "node:test";
import { mapResults, type PlaywrightJsonReport } from "./map-results";

type Annotation = { type: string; description?: string };

/** Minimal report builder mirroring the real @playwright/test 1.61.1 JSON shape. */
function report(
  specs: Array<{
    title: string;
    file?: string;
    status?: string;
    duration?: number;
    error?: { message?: string; stack?: string };
    /** Test-level annotations (where runtime annotations normally land). */
    annotations?: Annotation[];
    /** Result-level annotations, to exercise the fallback path. */
    resultAnnotations?: Annotation[];
  }>,
  opts: { duration?: number; errors?: Array<{ message?: string }> } = {},
): PlaywrightJsonReport {
  const unexpected = specs.filter((s) => s.status && s.status !== "passed" && s.status !== "skipped").length;
  const skipped = specs.filter((s) => s.status === "skipped").length;
  return {
    suites: [
      {
        title: "smoke/landing.spec.ts",
        file: "smoke/landing.spec.ts",
        specs: specs.map((s) => ({
          title: s.title,
          file: s.file ?? "smoke/landing.spec.ts",
          tests: [
            {
              annotations: s.annotations,
              results: [
                {
                  status: (s.status ?? "passed") as never,
                  duration: s.duration ?? 100,
                  error: s.error,
                  errors: s.error ? [s.error] : [],
                  retry: 0,
                  annotations: s.resultAnnotations,
                },
              ],
            },
          ],
        })),
      },
    ],
    errors: opts.errors ?? [],
    stats: { duration: opts.duration ?? 1000, expected: specs.length - unexpected - skipped, unexpected, skipped, flaky: 0 },
  };
}

/** Build a `check` annotation as `lib/smoke.ts` serializes it. */
function check(name: string, status: "pass" | "fail"): Annotation {
  return { type: "check", description: JSON.stringify({ name, status }) };
}

test("all tests pass => success", () => {
  const r = mapResults(report([{ title: "a", status: "passed" }, { title: "b", status: "passed" }], { duration: 6356 }));
  assert.equal(r.status, "success");
  assert.equal(r.total, 2);
  assert.equal(r.passed, 2);
  assert.equal(r.failed, 0);
  assert.equal(r.durationSeconds, 6); // 6356ms rounded
  assert.equal(r.testResults[0].testFile, "smoke/landing.spec.ts");
});

test("suite ran with a failing test => degraded, clean message, no raw stack", () => {
  const r = mapResults(
    report([
      { title: "a", status: "passed" },
      {
        title: "b",
        status: "failed",
        error: { message: "visible=false\n\nexpect(received).toBeTruthy()", stack: "at b" },
        annotations: [
          { type: "url", description: "https://example.com/b" },
          check("key-content", "fail"),
        ],
      },
    ]),
  );
  assert.equal(r.status, "degraded");
  assert.equal(r.total, 2);
  assert.equal(r.passed, 1);
  assert.equal(r.failed, 1);
  const failing = r.testResults.find((t) => t.status === "failure");
  assert.equal(
    failing?.errorMessage,
    "1 check failed on https://example.com/b:\n• Expected page content did not render",
  );
  // Raw stack and `expect` internals are dropped, not persisted.
  assert.equal(failing?.errorStack, null);
  assert.equal(failing?.errorMessage?.includes("toBeTruthy"), false);
});

test("passing test carries no error message or stack", () => {
  const r = mapResults(report([{ title: "a", status: "passed" }]));
  assert.equal(r.testResults[0].errorMessage, null);
  assert.equal(r.testResults[0].errorStack, null);
});

test("result-level annotations are used when test-level are absent", () => {
  const r = mapResults(
    report([
      {
        title: "b",
        status: "failed",
        resultAnnotations: [
          { type: "url", description: "https://example.com/b" },
          check("page-loads", "fail"),
        ],
      },
    ]),
  );
  const failing = r.testResults.find((t) => t.status === "failure");
  assert.equal(
    failing?.errorMessage,
    "1 check failed on https://example.com/b:\n• Page did not return a successful response",
  );
});

test("timedOut and interrupted count as failure", () => {
  const r = mapResults(report([{ title: "a", status: "timedOut" }, { title: "b", status: "interrupted" }]));
  assert.equal(r.status, "degraded");
  assert.equal(r.failed, 2);
});

test("skipped test maps to skipped and is not passed/failed", () => {
  const r = mapResults(report([{ title: "a", status: "passed" }, { title: "b", status: "skipped" }]));
  assert.equal(r.status, "success"); // no failures
  assert.equal(r.total, 2);
  assert.equal(r.passed, 1);
  assert.equal(r.failed, 0);
  assert.equal(r.testResults.find((t) => t.testName === "b")?.status, "skipped");
});

test("null report (suite could not run) => failure with no rows", () => {
  const r = mapResults(null);
  assert.equal(r.status, "failure");
  assert.equal(r.total, 0);
  assert.equal(r.testResults.length, 0);
  assert.equal(r.durationSeconds, null);
});

test("parseable report with global errors and no specs => failure", () => {
  const r = mapResults({ suites: [], errors: [{ message: "config load failed" }], stats: { duration: 200 } });
  assert.equal(r.status, "failure");
  assert.equal(r.total, 0);
});

test("nested suites are walked recursively", () => {
  const r = mapResults({
    suites: [
      {
        title: "smoke/x.spec.ts",
        file: "smoke/x.spec.ts",
        suites: [
          {
            title: "describe block",
            specs: [{ title: "nested test", file: "smoke/x.spec.ts", tests: [{ results: [{ status: "passed", duration: 50 }] }] }],
          },
        ],
      },
    ],
    stats: { duration: 500 },
  });
  assert.equal(r.total, 1);
  assert.equal(r.passed, 1);
  assert.equal(r.testResults[0].testName, "nested test");
});
