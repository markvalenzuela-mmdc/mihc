"use server";

import {
  inngest,
  SMOKE_TEST_REQUESTED,
  type SmokeTestRequestedData,
} from "@/lib/inngest/client";
import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { err, ok } from "@/utils/server-action-return";
import { getSmokeTestTarget } from "../config/smoke-test-targets.config";

export type RequestSmokeTestResult =
  | ReturnType<typeof ok<{ correlationId: string }>>
  | ReturnType<typeof err<string>>;

/**
 * Enqueues a manual smoke-test request. Publishes `smoke-test/requested`
 * to Inngest with a fresh correlationId; the Playwright consumer runs the suite
 * and persists results. This action only enqueues — it does not wait for or read
 * the run.
 *
 * v1: website suite only, with the authenticated operator attached when present.
 */
export async function requestSmokeTest(appId: string): Promise<RequestSmokeTestResult> {
  const user = await getCurrentUser();
  if (!user) return err("forbidden");

  const target = getSmokeTestTarget(appId);
  if (!target) {
    return err("Smoke tests are not configured for this app yet.");
  }

  const correlationId = crypto.randomUUID();
  const data: SmokeTestRequestedData = {
    appId: target.appId,
    suite: target.suite,
    trigger: "manual",
    correlationId,
    requestedBy: user.id,
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
