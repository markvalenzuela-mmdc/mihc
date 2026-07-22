/**
 * Website Smoke consumer.
 *
 * The active run is committed before Playwright starts. The custom reporter
 * persists observed tests during execution, and a final step closes the run
 * without replacing those incremental rows.
 */
import {
  createSmokeRun,
  finalizeSmokeRun,
  type CreateSmokeRunInput,
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
  create(input: CreateSmokeRunInput): ReturnType<typeof createSmokeRun>;
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
  create: createSmokeRun,
  run: runSmoke,
  finalize: finalizeSmokeRun,
};

export async function executeSmokeRun(
  input: ExecuteSmokeRunInput,
  runStep: RunStep,
  dependencies: SmokeRunDependencies = defaultDependencies,
) {
  const { data, target, logger } = input;
  const created = await runStep("create-smoke-run", () =>
    dependencies.create({
      appId: data.appId,
      trigger: data.trigger,
      requestedBy: data.requestedBy ?? null,
      checkedAt: new Date(),
      logger,
    }),
  );

  const suite = await runStep("run-suite", async () => {
    const { report, exitCode } = await dependencies.run({
      correlationId: data.correlationId,
      runId: created.runId,
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
      runId: created.runId,
      status,
      durationSeconds: suite.mapped.durationSeconds,
      completedAt: new Date(),
      logger,
    }),
  );

  return { runId: created.runId, runNumber: created.runNumber, status };
}

export const smokeConsumer = inngest.createFunction(
  {
    id: "website-smoke-consumer",
    idempotency: "event.data.correlationId",
    triggers: [{ event: SMOKE_TEST_REQUESTED }],
  },
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
