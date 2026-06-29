/**
 * Custom Playwright reporter: writes one timestamped JSON result file per test
 * run to playwright/results/. Never overwrites — history accumulates as files.
 *
 * Timing (startedAt/endedAt/runtime) is derived from Playwright's own per-test
 * data, so test bodies don't need a manual stopwatch.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Reporter,
  TestCase,
  TestResult as PlaywrightTestResult,
} from '@playwright/test/reporter';
import { buildResult } from '../lib/results';

const RESULTS_DIR = join(process.cwd(), 'results');

export default class ResultsReporter implements Reporter {
  onTestEnd(test: TestCase, result: PlaywrightTestResult): void {
    // On retries, only persist the final attempt to avoid duplicate records.
    if (result.status === 'failed' && result.retry < test.retries) return;

    const record = buildResult(test, result);
    mkdirSync(RESULTS_DIR, { recursive: true });

    const safeId = record.testId.replace(/[^a-z0-9-]/gi, '-');
    const stamp = record.startedAt.replace(/[:.]/g, '-');
    const file = join(RESULTS_DIR, `${safeId}-${stamp}.json`);
    writeFileSync(file, JSON.stringify(record, null, 2));
  }
}
