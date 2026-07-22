import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import {
  completeSmokeTestResult,
  startSmokeTestResult,
  type CompleteSmokeTestResultInput,
  type StartSmokeTestResultInput,
  type StartSmokeTestResultResult,
} from "../db/persist-run";
import { createLogger } from "../logger";
import { formatFailure } from "../runner/format-failure";
import {
  formatSmokeTestFile,
  formatSmokeTestName,
} from "./smoke-result-labels";

export interface SmokeReporterPersistence {
  start(input: StartSmokeTestResultInput): Promise<StartSmokeTestResultResult>;
  complete(input: CompleteSmokeTestResultInput): Promise<void>;
}

const defaultPersistence: SmokeReporterPersistence = {
  start: startSmokeTestResult,
  complete: completeSmokeTestResult,
};

function mapStatus(status: TestResult["status"]): CompleteSmokeTestResultInput["status"] {
  if (status === "passed") return "success";
  if (status === "skipped") return "skipped";
  return "failure";
}

export class IncrementalSmokeReporter implements Reporter {
  private queue: Promise<void> = Promise.resolve();
  private persistenceError: unknown;
  private readonly resultIds = new WeakMap<TestResult, Promise<string>>();
  private readonly runId: string | undefined;
  private readonly logger;

  constructor(
    private readonly persistence: SmokeReporterPersistence = defaultPersistence,
    env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  ) {
    this.runId = env.SMOKE_RUN_ID;
    this.logger = createLogger(env.SMOKE_CORRELATION_ID ?? "unknown");
    if (!this.runId) {
      this.persistenceError = new Error("SMOKE_RUN_ID is required by the incremental Smoke reporter");
    }
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    if (!this.runId) return;

    const resultId = this.enqueue(async () => {
      const created = await this.persistence.start({
        runId: this.runId!,
        testName: formatSmokeTestName(test.title),
        testFile: formatSmokeTestFile(test.location.file),
        startedAt: result.startTime,
        logger: this.logger,
      });
      return created.resultId;
    });
    this.resultIds.set(result, resultId);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.runId) return;

    const resultId = this.resultIds.get(result);
    if (!resultId) {
      this.persistenceError ??= new Error(`Missing persisted start for ${test.title}`);
      return;
    }

    this.enqueue(async () => {
      const status = mapStatus(result.status);
      await this.persistence.complete({
        resultId: await resultId,
        runId: this.runId!,
        status,
        durationMs: result.duration ?? null,
        errorMessage:
          status === "failure"
            ? formatFailure({
                status: result.status,
                annotations: test.annotations,
                rawMessage: result.error?.message,
              })
            : null,
        completedAt: new Date(result.startTime.getTime() + result.duration),
        logger: this.logger,
      });
    });
  }

  async onEnd(_result: FullResult): Promise<{ status: "failed" } | undefined> {
    await this.queue;
    if (!this.persistenceError) return undefined;

    this.logger.error("smoke_reporter_persistence_failed", {
      message:
        this.persistenceError instanceof Error
          ? this.persistenceError.message
          : String(this.persistenceError),
    });
    return { status: "failed" };
  }

  printsToStdio(): boolean {
    return false;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.queue.then(operation);
    const tracked = pending.catch((error: unknown) => {
      this.persistenceError ??= error;
      throw error;
    });
    this.queue = tracked.then(
      () => undefined,
      () => undefined,
    );
    return tracked;
  }
}

export default class PlaywrightIncrementalSmokeReporter extends IncrementalSmokeReporter {
  constructor(
    _options: unknown = {},
    persistence: SmokeReporterPersistence = defaultPersistence,
    env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  ) {
    super(persistence, env);
  }
}
