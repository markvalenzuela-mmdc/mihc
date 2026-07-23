/**
 * Website Smoke consumer.
 *
 * The active run is committed before Playwright starts. The custom reporter
 * persists observed tests during execution, and a final step closes the run
 * without replacing those incremental rows.
 */
import {
  claimSmokeRun,
  finalizeSmokeRun,
  type ClaimSmokeRunInput,
  type FinalizeSmokeRunInput,
} from "../db/persist-run";
import type { Logger } from "../logger";
import { createLogger } from "../logger";
import { mapResults } from "../runner/map-results";
import { runSmoke, type RunSmokeOptions, type RunSmokeResult } from "../runner/run-smoke";
import { getSmokeTarget, type SmokeTarget } from "../runner/smoke-targets";
import { inngest } from "./client";
import {
  SMOKE_TEST_REQUESTED,
  SUPPORTED_SUITE,
  smokeTestRequestedSchema,
  type SmokeTestRequested,
} from "./events";

export interface SmokeRunDependencies {
  claim(input: ClaimSmokeRunInput): ReturnType<typeof claimSmokeRun>;
  run(options: RunSmokeOptions): Promise<RunSmokeResult>;
  finalize(input: FinalizeSmokeRunInput): ReturnType<typeof finalizeSmokeRun>;
}

interface ExecuteSmokeRunInput {
  data: SmokeTestRequested;
  target: SmokeTarget;
  logger: Logger;
}

export type RunStep = <T>(name: string, callback: () => Promise<T>) => Promise<T>;

const defaultDependencies: SmokeRunDependencies = {
  claim: claimSmokeRun,
  run: runSmoke,
  finalize: finalizeSmokeRun,
};

export const SMOKE_CONSUMER_CONFIG = {
  id: "website-smoke-consumer",
  concurrency: 1,
  idempotency: "event.data.correlationId",
  triggers: [{ event: SMOKE_TEST_REQUESTED }],
};

export async function executeSmokeRun(
  input: ExecuteSmokeRunInput,
  runStep: RunStep,
  dependencies: SmokeRunDependencies = defaultDependencies,
) {
  const { data, target, logger } = input;
  const claimed = await runStep("claim-smoke-run", () =>
    dependencies.claim({
      runId: data.runId,
      startedAt: new Date(),
      logger,
    }),
  );

  if (!claimed) {
    logger.info("smoke_run_already_claimed", { runId: data.runId });
    return { skipped: "already_claimed" as const, runId: data.runId };
  }

  const suite = await runStep("run-suite", async () => {
    const { report, exitCode } = await dependencies.run({
      correlationId: data.correlationId,
      runId: data.runId,
      target,
      logger,
    });
    return { mapped: mapResults(report), exitCode };
  });

  const status =
    suite.mapped.status === "success" && suite.exitCode !== 0
      ? "failure"
      : suite.mapped.status;

  await runStep("finalize-smoke-run", () =>
    dependencies.finalize({
      runId: data.runId,
      status,
      durationSeconds: suite.mapped.durationSeconds,
      completedAt: new Date(),
      logger,
    }),
  );

  return { runId: data.runId, status };
}

export const smokeConsumer = inngest.createFunction(
  SMOKE_CONSUMER_CONFIG,
  async ({ event, step }) => {
    const rawCorrelationId = (event.data as { correlationId?: unknown })?.correlationId;
    const parsed = smokeTestRequestedSchema.safeParse(event.data);
    const logger = createLogger(
      parsed.success
        ? parsed.data.correlationId
        : typeof rawCorrelationId === "string"
          ? rawCorrelationId
          : "unknown",
    );

    if (!parsed.success) {
      logger.warn("invalid_payload", { issues: parsed.error.issues });
      return { skipped: "invalid_payload" as const };
    }

    const data = parsed.data;
    logger.info("event_received", {
      appId: data.appId,
      suite: data.suite,
      trigger: data.trigger,
    });

    const target = getSmokeTarget(data.appId);
    if (!target || data.suite !== SUPPORTED_SUITE || data.suite !== target.suite) {
      logger.warn("unsupported_payload", { appId: data.appId, suite: data.suite });
      return { skipped: "unsupported_payload" as const };
    }

    const runStep = (<T>(name: string, callback: () => Promise<T>) =>
      step.run(name, callback) as unknown as Promise<T>) satisfies RunStep;

    return executeSmokeRun({ data, target, logger }, runStep);
  },
);
