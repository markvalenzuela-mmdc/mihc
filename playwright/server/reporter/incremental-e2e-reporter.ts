import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import {
  recordE2eCheck,
  type RecordE2eCheckInput,
} from "../db/persist-e2e-run";
import { createLogger } from "../logger";
import { formatE2eCheckError } from "../runner/format-failure";
import { resolveE2eStepId } from "../runner/map-e2e-results";

export interface E2eReporterPersistence {
  record(input: RecordE2eCheckInput): Promise<void>;
}

const defaultPersistence: E2eReporterPersistence = {
  record: recordE2eCheck,
};

interface CheckAnnotation {
  name?: unknown;
  status?: unknown;
  message?: unknown;
  durationMs?: unknown;
}

function parseCheckAnnotation(annotation: { type: string; description?: string }): CheckAnnotation | null {
  if (annotation.type !== "check" || !annotation.description) return null;
  try {
    const parsed = JSON.parse(annotation.description) as CheckAnnotation;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parseSelectedStepIds(value: string | undefined): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((stepId) => typeof stepId === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function findCheckAnnotation(test: TestCase, result: TestResult): CheckAnnotation | null {
  for (const annotation of [...result.annotations, ...test.annotations]) {
    const check = parseCheckAnnotation(annotation);
    if (typeof check?.name === "string" && (check.status === "pass" || check.status === "fail")) {
      return check;
    }
  }
  return null;
}

export class IncrementalE2eReporter implements Reporter {
  private queue: Promise<void> = Promise.resolve();
  private persistenceError: unknown;
  private readonly runId: string | undefined;
  private readonly profileId: string | undefined;
  private readonly selectedStepIds: string[];
  private readonly logger;

  constructor(
    private readonly persistence: E2eReporterPersistence = defaultPersistence,
    env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  ) {
    this.runId = env.E2E_RUN_ID;
    this.profileId = env.E2E_PROFILE_ID;
    this.selectedStepIds = parseSelectedStepIds(env.E2E_SELECTED_STEP_IDS) ?? [];
    this.logger = createLogger(env.E2E_CORRELATION_ID ?? "unknown");

    if (!this.runId) {
      this.persistenceError = new Error("E2E_RUN_ID is required by the incremental E2E reporter");
    } else if (!this.profileId) {
      this.persistenceError = new Error("E2E_PROFILE_ID is required by the incremental E2E reporter");
    } else if (!parseSelectedStepIds(env.E2E_SELECTED_STEP_IDS)) {
      this.persistenceError = new Error("E2E_SELECTED_STEP_IDS must be a JSON array");
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.runId || !this.profileId || this.persistenceError) return;

    const check = findCheckAnnotation(test, result);
    if (!check) return;

    const status: RecordE2eCheckInput["status"] =
      result.status === "skipped" ? "skipped" : check.status === "pass" ? "success" : "failure";
    const durationMs =
      typeof check.durationMs === "number" && Number.isFinite(check.durationMs)
        ? check.durationMs
        : result.duration ?? null;
    const testName = check.name as string;

    this.enqueue(async () => {
      await this.persistence.record({
        runId: this.runId!,
        profileId: this.profileId!,
        stepId: resolveE2eStepId(testName, this.selectedStepIds),
        testName,
        status,
        durationMs,
        errorMessage:
          status === "failure"
            ? formatE2eCheckError(testName, typeof check.message === "string" ? check.message : undefined)
            : null,
        logger: this.logger,
      });
    });
  }

  async onEnd(_result: FullResult): Promise<{ status: "failed" } | undefined> {
    await this.queue;
    if (!this.persistenceError) return undefined;

    this.logger.error("e2e_reporter_persistence_failed", {
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

  private enqueue(operation: () => Promise<void>): void {
    const pending = this.queue.then(operation);
    const tracked = pending.catch((error: unknown) => {
      this.persistenceError ??= error;
      throw error;
    });
    this.queue = tracked.then(
      () => undefined,
      () => undefined,
    );
  }
}

export default class PlaywrightIncrementalE2eReporter extends IncrementalE2eReporter {
  constructor(
    _options: unknown = {},
    persistence: E2eReporterPersistence = defaultPersistence,
    env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  ) {
    super(persistence, env);
  }
}
