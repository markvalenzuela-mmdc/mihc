"use server";

import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import {
  E2E_TEST_REQUESTED,
  inngest,
  type E2eTestRequestedData,
} from "@/lib/inngest/client";
import { err, ok } from "@/utils/server-action-return";

export type RequestE2eTestResult =
  | ReturnType<typeof ok<{ correlationId: string }>>
  | ReturnType<typeof err<string>>;

const E2E_TEST_ENQUEUE_ERROR = "Failed to enqueue E2E test. Please try again.";

export async function requestE2eTest({
  profileId,
  stepIds,
}: {
  profileId: string;
  stepIds: string[];
}): Promise<RequestE2eTestResult> {
  const user = await getCurrentUser();
  if (!user) return err("forbidden");

  if (
    !profileId.trim() ||
    stepIds.length === 0 ||
    stepIds.some((stepId) => !stepId.trim())
  ) {
    return err("A profile and at least one E2E step are required.");
  }

  const correlationId = crypto.randomUUID();
  const data: E2eTestRequestedData = {
    profileId,
    stepIds,
    requestedBy: user.id,
    correlationId,
    requestedAt: new Date().toISOString(),
  };

  try {
    await inngest.send({ name: E2E_TEST_REQUESTED, data });
    return ok({ correlationId });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "e2e_test_enqueue_failed",
        correlationId,
        profileId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return err(E2E_TEST_ENQUEUE_ERROR);
  }
}
