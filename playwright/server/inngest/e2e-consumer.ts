/**
 * The EnrollMate E2E consumer function.
 *
 * Flow: validate payload (zod) → step "fetch-profile" (DB read) → step
 * "create-run" (insert running row to lock profile) → step "run-suite"
 * (spawn Playwright, map report) → step "complete-run" (update status,
 * insert step/test results).
 *
 * The running row is created *before* the suite starts so the frontend
 * sees an active run and prevents concurrent submissions. startedAt is
 * captured when the running row is inserted; completedAt is set after
 * the suite finishes — giving accurate duration.
 *
 * Each step is memoized by Inngest, so a retry on "complete-run" does
 * not re-run the suite or re-create the running row.
 *
 * `idempotency` on the correlationId prevents duplicate deliveries.
 */
import { eq } from "drizzle-orm";
import { createLogger } from "../logger";
import { db } from "../db/client";
import { createE2eRun, completeE2eRun, ProfileBusyError } from "../db/persist-e2e-run";
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

    // Step 2: Create the running row BEFORE executing the suite. This
    // locks the profile so the frontend sees an active run and prevents
    // concurrent submissions. If a running row already exists for this
    // profile, we skip the suite entirely.
    const runData = await step.run("create-run", async () => {
      try {
        return await createE2eRun(profileId, requestedBy, logger);
      } catch (err) {
        if (err instanceof ProfileBusyError) {
          logger.warn("e2e_profile_busy", { profileId });
          return null;
        }
        throw err;
      }
    });

    if (!runData) {
      return { skipped: "already_running" as const };
    }

    const { runId, runNumber, startedAt } = runData;
    logger.info("e2e_run_created", { runId, runNumber, startedAt });

    // Step 3: Run the Playwright suite and map results
    const mapped = await step.run("run-suite", async () => {
      const { report, exitCode } = await runE2e({
        correlationId,
        flowType: profileData.flowType,
        profileFormData: profileData.formData,
        logger,
      });
      return mapE2eResults(report, exitCode, stepIds);
    });

    const totalTests = mapped.steps.reduce((sum, s) => sum + s.tests.length, 0);
    logger.info("e2e_suite_mapped", {
      status: mapped.status,
      stepCount: mapped.steps.length,
      totalTests,
      perStep: mapped.steps.map((s) => ({ stepId: s.stepId, tests: s.tests.length, status: s.status })),
    });

    // Step 4: Complete the run — update status, stamp completedAt via DB
    // NOW(), insert step and test results.
    await step.run("complete-run", async () =>
      completeE2eRun({
        runId,
        runStatus: mapped.status,
        steps: mapped.steps,
        logger,
      }),
    );

    return { runId, runNumber, status: mapped.status, stepCount: mapped.steps.length };
  },
);
