/**
 * The website smoke-test consumer function.
 *
 * Flow: validate payload (zod) → step "run-suite" (spawn Playwright, map report)
 * → step "persist-run" (transactional insert). Persistence is the final step, so
 * the run is acknowledged only after it is recorded; on a persist-only retry the
 * memoized suite step is not re-run.
 *
 * `idempotency` on the correlationId makes Inngest drop duplicate deliveries of
 * the same request within its window, so no duplicate `smoke_runs` row appears.
 */
import { createLogger } from "../logger";
import { mapResults } from "../runner/map-results";
import { runSmoke } from "../runner/run-smoke";
import { persistRun } from "../db/persist-run";
import { inngest } from "./client";
import { SMOKE_TEST_REQUESTED, SUPPORTED_APP_ID, SUPPORTED_SUITE, smokeTestRequestedSchema } from "./events";

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
      parsed.success ? parsed.data.correlationId : typeof rawCorrelationId === "string" ? rawCorrelationId : "unknown",
    );

    if (!parsed.success) {
      logger.warn("invalid_payload", { issues: parsed.error.issues });
      return { skipped: "invalid_payload" as const };
    }

    const data = parsed.data;
    logger.info("event_received", { appId: data.appId, suite: data.suite, trigger: data.trigger });

    if (data.appId !== SUPPORTED_APP_ID || data.suite !== SUPPORTED_SUITE) {
      logger.warn("unsupported_payload", { appId: data.appId, suite: data.suite });
      return { skipped: "unsupported_payload" as const };
    }

    // Expensive step: run the suite and reduce to a persistable shape. Its return
    // value is memoized by Inngest, so a persist retry does not re-run the suite.
    const run = await step.run("run-suite", async () => {
      const { report } = await runSmoke({
        correlationId: data.correlationId,
        trigger: data.trigger,
        requestedBy: data.requestedBy ?? null,
        logger,
      });
      return mapResults(report);
    });

    const persisted = await step.run("persist-run", async () =>
      persistRun({
        appId: data.appId,
        trigger: data.trigger,
        requestedBy: data.requestedBy ?? null,
        checkedAt: new Date(),
        run,
        logger,
      }),
    );

    return { runId: persisted.runId, runNumber: persisted.runNumber, status: run.status };
  },
);
