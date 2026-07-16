/**
 * The EnrollMate E2E consumer function.
 *
 * Flow: validate payload (zod) → step "fetch-profile" (DB read) → step
 * "run-suite" (spawn Playwright, map report) → step "persist-run"
 * (transactional insert). Each step is memoized by Inngest, so a retry on
 * persist does not re-run the suite or re-fetch the profile.
 *
 * `idempotency` on the correlationId prevents duplicate deliveries.
 */
import { eq } from "drizzle-orm";
import { createLogger } from "../logger";
import { db } from "../db/client";
import { persistE2eRun } from "../db/persist-e2e-run";
import { profiles, profileForms } from "../db/schema";
import { mapE2eResults } from "../runner/map-e2e-results";
import { runE2e } from "../runner/run-e2e";
import { inngest } from "./client";
import { E2E_TEST_REQUESTED, e2eTestRequestedSchema } from "./events";

export const e2eConsumer = inngest.createFunction(
  {
    id: "enrollmate-e2e-consumer",
    idempotency: "event.data.correlationId",
    triggers: [{ event: E2E_TEST_REQUESTED }],
  },
  async ({ event, step }) => {
    const rawCorrelationId = (event.data as { correlationId?: unknown })?.correlationId;
    const parsed = e2eTestRequestedSchema.safeParse(event.data);
    const logger = createLogger(
      parsed.success ? parsed.data.correlationId : typeof rawCorrelationId === "string" ? rawCorrelationId : "unknown",
    );

    if (!parsed.success) {
      logger.warn("invalid_e2e_payload", { issues: parsed.error.issues });
      return { skipped: "invalid_payload" as const };
    }

    const { profileId, stepIds, requestedBy, correlationId } = parsed.data;
    logger.info("e2e_event_received", { profileId, stepCount: stepIds.length });

    // Step 1: Fetch profile + profile form data from the shared DB
    const profileData = await step.run("fetch-profile", async () => {
      const profile = await db.query.profiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.id, profileId),
      });

      if (!profile) {
        logger.warn("profile_not_found", { profileId });
        return null;
      }

      const form = await db.query.profileForms.findFirst({
        where: (profileForms, { eq }) => eq(profileForms.profileId, profileId),
      });

      if (!form) {
        logger.warn("profile_form_not_found", { profileId });
        return null;
      }

      return {
        flowType: profile.flowType as "bachelors" | "microcredentials",
        formData: form.data as Record<string, unknown>,
      };
    });

    if (!profileData) {
      return { skipped: "profile_or_form_not_found" as const };
    }

    logger.info("profile_fetched", {
      profileId,
      flowType: profileData.flowType,
      formFieldCount: Object.keys(profileData.formData).length,
    });

    // Step 2: Run the Playwright suite and map results
    const mapped = await step.run("run-suite", async () => {
      const { report } = await runE2e({
        correlationId,
        flowType: profileData.flowType,
        profileFormData: profileData.formData,
        logger,
      });
      return mapE2eResults(report, stepIds);
    });

    const totalTests = mapped.steps.reduce((sum, s) => sum + s.tests.length, 0);
    logger.info("e2e_suite_mapped", {
      status: mapped.status,
      stepCount: mapped.steps.length,
      totalTests,
      perStep: mapped.steps.map((s) => ({ stepId: s.stepId, tests: s.tests.length, status: s.status })),
    });

    // Step 3: Persist the run with its steps and test results
    const now = new Date();
    const persisted = await step.run("persist-run", async () =>
      persistE2eRun({
        profileId,
        stepIds,
        requestedBy,
        startedAt: now,
        completedAt: now,
        runStatus: mapped.status,
        steps: mapped.steps,
        logger,
      }),
    );

    return {
      runId: persisted.runId,
      runNumber: persisted.runNumber,
      status: mapped.status,
      stepCount: mapped.steps.length,
    };
  },
);
