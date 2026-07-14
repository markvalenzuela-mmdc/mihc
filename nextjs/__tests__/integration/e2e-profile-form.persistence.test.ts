import { type EnrollmateFlowType } from "@mihc/enrollmate-contract";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { authUser, getDb, profileForms, profiles } from "@/lib/drizzle/db";
import { E2eProfileFormErrorCode } from "@/feature/e2e/errors/e2e-profile-form.error";
import { finalizeE2eProfileForm } from "@/feature/e2e/services/e2e-profile-form-finalization.service";
import { createProfileFormData } from "@/lib/drizzle/seed/seed-profiles";
import { useIntegrationTestDatabase } from "./helpers/test-db";

const userId = "8f0c506c-b865-42fc-992d-6eaeea7bf4c3";

describe("E2E profile form persistence", () => {
  useIntegrationTestDatabase();

  it("creates a validated profile atomically after confirmation", async () => {
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
    const email = `confirmed-${randomUUID()}@example.com`;
    const fullData = createProfileFormData(flowType, email);
    const core = {
      name: "Confirmed Student",
      middleName: "",
      email,
      flowType,
    } as const;

    const [beforeConfirmation] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email));
    expect(beforeConfirmation).toBeUndefined();

    const result = await finalizeE2eProfileForm(
      {
        core,
        enrollmateData: fullData,
        userId,
      },
      db,
    );

    expect(result.profileId).toBeTruthy();

    const [profile] = await db
      .select({ status: profiles.status })
      .from(profiles)
      .where(eq(profiles.id, result.profileId));
    const [profileForm] = await db
      .select({ data: profileForms.data })
      .from(profileForms)
      .where(eq(profileForms.profileId, result.profileId));

    expect(profile?.status).toBe("validated");
    expect(profileForm?.data).toMatchObject(fullData);
  });

  it("does not persist an invalid complete profile", async () => {
    const db = getDb();
    const email = `invalid-${randomUUID()}@example.com`;

    await expect(
      finalizeE2eProfileForm(
        {
          core: {
            name: "Invalid Student",
            middleName: "",
            email,
            flowType: "bachelors",
          },
          enrollmateData: {},
          userId,
        },
        db,
      ),
    ).rejects.toMatchObject({
      code: E2eProfileFormErrorCode.UNEXPECTED,
      fieldErrors: expect.any(Object),
    });

    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email));
    expect(profile).toBeUndefined();
  });

  it("maps duplicate profile emails to a domain conflict", async () => {
    await expect(
      finalizeE2eProfileForm(
        {
          core: {
            name: "Duplicate",
            middleName: "",
            email: "ari.santos@example.edu",
            flowType: "bachelors",
          },
          enrollmateData: createProfileFormData(
            "bachelors",
            "ari.santos@example.edu",
          ),
          userId,
        },
        getDb(),
      ),
    ).rejects.toMatchObject({ code: E2eProfileFormErrorCode.EMAIL_CONFLICT });
  });
});
