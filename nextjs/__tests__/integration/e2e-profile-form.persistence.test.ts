import {
  getEnrollmateFlowDefinition,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { authUser, getDb, profileForms, profiles } from "@/lib/drizzle/db";
import { E2eProfileFormError, E2eProfileFormErrorCode } from "@/feature/e2e/errors/e2e-profile-form.error";
import { finalizeE2eProfileForm } from "@/feature/e2e/services/e2e-profile-form-finalization.service";
import { getE2eProfileFormEditorData } from "@/feature/e2e/services/e2e-profile-form-editor.service";
import { saveE2eProfileDraft } from "@/feature/e2e/services/e2e-profile-draft.service";
import { extractE2eProfileStepValues } from "@/feature/e2e/utils/e2e-profile-form.util";
import { useIntegrationTestDatabase } from "./helpers/test-db";
import { createProfileFormData } from "@/lib/drizzle/seed/seed-profiles";

const userId = "8f0c506c-b865-42fc-992d-6eaeea7bf4c3";

describe("E2E profile form persistence", () => {
  useIntegrationTestDatabase();

  it("creates atomically, preserves prior steps, resumes, and finalizes", async () => {
    const db = getDb();
    const [seededUser] = await db
      .select({ id: authUser.id, email: authUser.email })
      .from(authUser)
      .where(eq(authUser.id, userId));
    expect(seededUser).toEqual({
      id: userId,
      email: "jamie.villanueva@mmdc.mcl.edu.ph",
    });

    const flowType: EnrollmateFlowType = "bachelors";
    const flow = getEnrollmateFlowDefinition(flowType);
    const email = `phase2-${randomUUID()}@example.com`;
    const fullData = createProfileFormData(flowType, email);
    const core = {
      name: "Phase Two Student",
      middleName: "",
      email,
      flowType,
    } as const;

    const firstStep = flow.steps[0]!;
    const created = await saveE2eProfileDraft(
      {
        mode: "create",
        core,
        stepNumber: firstStep.step,
        stepData: extractE2eProfileStepValues(firstStep, fullData),
        userId,
      },
      db,
    );

    expect(created.nextStep).toBe(firstStep.step + 1);

    for (const step of flow.steps.slice(1)) {
      await saveE2eProfileDraft(
        {
          mode: "edit",
          profileId: created.profileId,
          core,
          stepNumber: step.step,
          stepData: extractE2eProfileStepValues(step, fullData),
          userId,
        },
        db,
      );
    }

    const editor = await getE2eProfileFormEditorData(created.profileId, db);
    expect(editor.profileId).toBe(created.profileId);
    expect(editor.core.email).toBe(email);
    expect(editor.validatedSteps).toHaveLength(flow.steps.length);

    await expect(
      finalizeE2eProfileForm(
        {
          profileId: created.profileId,
          core,
          enrollmateData: {},
          userId,
        },
        db,
      ),
    ).resolves.toEqual({ profileId: created.profileId });

    await expect(
      saveE2eProfileDraft(
        {
          mode: "edit",
          profileId: created.profileId,
          core,
          stepNumber: firstStep.step,
          stepData: extractE2eProfileStepValues(firstStep, fullData),
          userId,
        },
        db,
      ),
    ).rejects.toMatchObject({ code: E2eProfileFormErrorCode.LOCKED });

    const [profile] = await db
      .select({ status: profiles.status })
      .from(profiles)
      .where(eq(profiles.id, created.profileId));
    const [profileForm] = await db
      .select({ data: profileForms.data })
      .from(profileForms)
      .where(eq(profileForms.profileId, created.profileId));

    expect(profile?.status).toBe("validated");
    expect(profileForm?.data).toMatchObject(fullData);
  });

  it("maps duplicate profile emails to a domain conflict", async () => {
    await expect(
      saveE2eProfileDraft(
        {
          mode: "create",
          core: {
            name: "Duplicate",
            middleName: "",
            email: "ari.santos@example.edu",
            flowType: "bachelors",
          },
          stepNumber: 1,
          stepData: {},
          userId,
        },
        getDb(),
      ),
    ).rejects.toMatchObject({ code: E2eProfileFormErrorCode.EMAIL_CONFLICT });
  });

  it("does not leak an invalid or missing editor profile", async () => {
    await expect(
      getE2eProfileFormEditorData("00000000-0000-4000-8000-000000000000", getDb()),
    ).rejects.toMatchObject({
      code: E2eProfileFormErrorCode.NOT_FOUND,
    });
  });

  it("keeps the domain error as the only expected service failure type", () => {
    expect(new E2eProfileFormError(E2eProfileFormErrorCode.NOT_FOUND)).toBeInstanceOf(
      E2eProfileFormError,
    );
  });
});
