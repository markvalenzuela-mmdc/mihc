/**
 * Pure mapping from Playwright's built-in `--reporter=json` output to the shape
 * persisted in `smoke_runs` + `smoke_runs_test_results`.
 *
 * Kept side-effect free so it is unit-testable without spawning a browser. The
 * consumer (`smoke-consumer.ts`) feeds it the parsed report (or `null` when the
 * suite could not run) and hands the result to `persist-run.ts`.
 *
 * Report shape verified against @playwright/test 1.61.1
 * (playwright/types/testReporter.d.ts → JSONReport). Only the fields we read are
 * typed here; the reporter emits more.
 */

/** Raw per-attempt status from the JSON reporter (`results[].status`). */
type PwResultStatus = "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

interface PwError {
  message?: string;
  stack?: string;
}

interface PwTestResult {
  status?: PwResultStatus;
  duration?: number;
  error?: PwError;
  errors?: PwError[];
  retry?: number;
}

interface PwTest {
  results?: PwTestResult[];
}

interface PwSpec {
  title: string;
  file?: string;
  tests?: PwTest[];
}

interface PwSuite {
  title?: string;
  file?: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}

export interface PlaywrightJsonReport {
  suites?: PwSuite[];
  errors?: PwError[];
  stats?: {
    duration?: number;
    expected?: number;
    unexpected?: number;
    skipped?: number;
    flaky?: number;
  };
}

export type RunStatus = "success" | "degraded" | "failure";
export type TestResultStatus = "success" | "failure" | "skipped";

export interface MappedTestResult {
  testName: string;
  testFile: string | null;
  status: TestResultStatus;
  durationMs: number | null;
  errorMessage: string | null;
  errorStack: string | null;
}

export interface MappedRun {
  status: RunStatus;
  total: number;
  passed: number;
  failed: number;
  durationSeconds: number | null;
  testResults: MappedTestResult[];
}

function mapTestStatus(status: PwResultStatus | undefined): TestResultStatus {
  switch (status) {
    case "passed":
      return "success";
    case "skipped":
      return "skipped";
    // failed / timedOut / interrupted / undefined all count as failure
    default:
      return "failure";
  }
}

/** Depth-first walk over nested suites, yielding every spec with its tests. */
function collectSpecs(suites: PwSuite[] | undefined, out: PwSpec[]): void {
  if (!suites) return;
  for (const suite of suites) {
    if (suite.specs) out.push(...suite.specs);
    if (suite.suites) collectSpecs(suite.suites, out);
  }
}

/**
 * Map a parsed Playwright JSON report to run + per-test rows.
 *
 * Pass `null` when the suite could not run (child process errored, no parseable
 * report) — that yields a `failure` run with no test rows. A parseable report
 * with global `errors` and no specs is likewise a `failure`. Otherwise the run
 * is `degraded` when any test failed and `success` when none did.
 */
export function mapResults(report: PlaywrightJsonReport | null): MappedRun {
  if (!report) {
    return { status: "failure", total: 0, passed: 0, failed: 0, durationSeconds: null, testResults: [] };
  }

  const specs: PwSpec[] = [];
  collectSpecs(report.suites, specs);

  const testResults: MappedTestResult[] = [];
  for (const spec of specs) {
    for (const test of spec.tests ?? []) {
      const attempts = test.results ?? [];
      // Last attempt is the final outcome (retries append; we persist the final).
      const last = attempts[attempts.length - 1];
      const status = mapTestStatus(last?.status);
      const error = last?.error ?? last?.errors?.[0];
      testResults.push({
        testName: spec.title,
        testFile: spec.file ?? null,
        status,
        durationMs: last?.duration ?? null,
        errorMessage: error?.message ?? null,
        errorStack: error?.stack ?? null,
      });
    }
  }

  const passed = testResults.filter((t) => t.status === "success").length;
  const failed = testResults.filter((t) => t.status === "failure").length;
  const total = testResults.length;

  const durationSeconds =
    typeof report.stats?.duration === "number" ? Math.round(report.stats.duration / 1000) : null;

  // No parseable test results => the suite did not actually run.
  const ranNothing = total === 0;
  const hasGlobalErrors = (report.errors?.length ?? 0) > 0;

  let status: RunStatus;
  if (ranNothing || (hasGlobalErrors && passed === 0 && failed === 0)) {
    status = "failure";
  } else if (failed > 0) {
    status = "degraded";
  } else {
    status = "success";
  }

  return { status, total, passed, failed, durationSeconds, testResults };
}
