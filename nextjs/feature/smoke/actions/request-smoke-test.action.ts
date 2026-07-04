"use server";

import {
  inngest,
  SMOKE_TEST_REQUESTED,
  type SmokeTestRequestedData,
} from "@/lib/inngest/client";
import { err, ok } from "@/utils/server-action-return";

export type RequestSmokeTestResult =
  | ReturnType<typeof ok<{ correlationId: string }>>
  | ReturnType<typeof err<string>>;

/**
 * Enqueues a manual website smoke-test request. Publishes `smoke-test/requested`
 * to Inngest with a fresh correlationId; the Playwright consumer runs the suite
 * and persists results. This action only enqueues — it does not wait for or read
 * the run.
 *
 * v1: website suite only, `requestedBy` is null (operator attribution deferred).
 */
export async function requestSmokeTest(): Promise<RequestSmokeTestResult> {
  const correlationId = crypto.randomUUID();
  const data: SmokeTestRequestedData = {
    appId: "website",
    suite: "smoke",
    trigger: "manual",
    correlationId,
    requestedBy: null,
    requestedAt: new Date().toISOString(),
  };

  try {
    await inngest.send({ name: SMOKE_TEST_REQUESTED, data });
    return ok({ correlationId });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "smoke_test_enqueue_failed",
        correlationId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return err("Failed to enqueue smoke test. Please try again.");
  }
}
