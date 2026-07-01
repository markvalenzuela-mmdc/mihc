/**
 * Shared result schema for the testing layer.
 *
 * The same shape serves smoke (MMDC website) and the future EnrollMate e2e work:
 * e2e specs set `type: 'e2e'` and `target: 'enrollmate'`, and `details.checks`
 * generalizes to e2e step results — so no schema rework is needed later.
 */
import type {
  TestCase,
  TestResult as PlaywrightTestResult,
} from '@playwright/test/reporter';

export interface CheckResult {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
}

export interface TestResult {
  testId: string;
  type: 'smoke' | 'e2e';
  mode: 'manual' | 'automated';
  /** Which site/app is under test, e.g. 'mmdc-website' (future: 'enrollmate'). */
  target: string;
  /** Who/what initiated the run: 'ci' for automated, a username for manual. */
  triggeredBy: string;
  startedAt: string;
  endedAt: string;
  /** Milliseconds, derived = endedAt - startedAt. */
  runtime: number;
  result: 'pass' | 'fail';
  details: {
    url: string;
    checks: CheckResult[];
    failures: string[];
  };
}

/**
 * Invocation context, read from env so a single test reports how it was run:
 * - Automated (CI/scheduled): defaults below.
 * - Manual (frontend): `TEST_MODE=manual TRIGGERED_BY=<user> npx playwright test`.
 */
export function getMode(): 'manual' | 'automated' {
  return process.env.TEST_MODE === 'manual' ? 'manual' : 'automated';
}

export function getTriggeredBy(): string {
  if (process.env.TRIGGERED_BY) return process.env.TRIGGERED_BY;
  return getMode() === 'manual' ? 'unknown' : 'ci';
}

export function getTarget(): string {
  return process.env.TEST_TARGET ?? 'mmdc-website';
}

function annotation(test: TestCase, type: string): string | undefined {
  return test.annotations.find((a) => a.type === type)?.description ?? undefined;
}

/** Build a serializable TestResult from Playwright's per-test reporting data. */
export function buildResult(
  test: TestCase,
  result: PlaywrightTestResult,
): TestResult {
  const checks: CheckResult[] = test.annotations
    .filter((a) => a.type === 'check' && a.description)
    .map((a) => JSON.parse(a.description as string) as CheckResult);
  const failures = checks.filter((c) => c.status === 'fail').map((c) => c.name);

  const startedAt = result.startTime.toISOString();
  const runtime = result.duration;
  const endedAt = new Date(result.startTime.getTime() + runtime).toISOString();

  // A test passes only if Playwright passed it AND no individual check failed.
  const passed = result.status === 'passed' && failures.length === 0;

  return {
    testId: annotation(test, 'testId') ?? test.title,
    type: (annotation(test, 'testType') as 'smoke' | 'e2e') ?? 'smoke',
    mode: getMode(),
    target: getTarget(),
    triggeredBy: getTriggeredBy(),
    startedAt,
    endedAt,
    runtime,
    result: passed ? 'pass' : 'fail',
    details: {
      url: annotation(test, 'url') ?? '',
      checks,
      failures,
    },
  };
}
