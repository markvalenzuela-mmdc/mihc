/**
 * Shared check/annotation primitives for browser test targets (smoke + e2e).
 *
 * These record named pass/fail results into the test's annotations (read later
 * by the results reporter) AND drive the test status via a soft assertion — so a
 * single test runs all its checks and still ends "failed" if any check failed.
 *
 * Kept separate from the smoke-specific page helpers in `smoke.ts` because both
 * targets depend on these, while only the smoke suite uses the page/CTA checks.
 */
import { expect, type TestInfo } from '@playwright/test';

/** Stamp test-level metadata used by the reporter to build the result. */
export function initSmoke(
  testInfo: TestInfo,
  opts: { testId: string; url: string; type?: 'smoke' | 'e2e' },
): void {
  testInfo.annotations.push({ type: 'testId', description: opts.testId });
  testInfo.annotations.push({ type: 'testType', description: opts.type ?? 'smoke' });
  testInfo.annotations.push({ type: 'url', description: opts.url });
}

/** Record a single named check and propagate its result to the test status. */
export function assertCheck(
  testInfo: TestInfo,
  name: string,
  condition: boolean,
  message?: string,
  durationMs?: number,
): void {
  testInfo.annotations.push({
    type: 'check',
    description: JSON.stringify({
      name,
      status: condition ? 'pass' : 'fail',
      ...(condition ? {} : { message }),
      ...(durationMs !== undefined ? { durationMs } : {}),
    }),
  });
  expect.soft(condition, message ?? name).toBeTruthy();
}
