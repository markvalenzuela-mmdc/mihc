import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { getDb, profileE2eSnapshots, profileForms } from "@/lib/drizzle/db";
import { useIntegrationTestDatabase } from "./helpers/test-db";

const seededProfileId = "3591b2d2-886b-45c6-bcbd-3c8756b40101";

describe("profile flow cardinality", () => {
  useIntegrationTestDatabase();

  it("loads the profile form as a singular relation without a child flow", async () => {
    const db = getDb();
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, seededProfileId),
      with: { profileForm: true },
    });

    const form = profile?.profileForm;

    expect(form?.profileId).toBe(seededProfileId);
    expect(form).not.toHaveProperty("flowType");
  });

  it("keeps the form id available for snapshot references", async () => {
    const db = getDb();
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, seededProfileId),
      with: { profileForm: true },
    });
    const form = profile?.profileForm;

    expect(form).toBeDefined();
    if (!form) {
      throw new Error("Seeded profile form is required for snapshot coverage");
    }

    const [snapshot] = await db
      .insert(profileE2eSnapshots)
      .values({
        profileFormId: form.id,
        definitionHash: getEnrollmateDefinitionHash(),
        payloadHash: "profile-flow-cardinality-snapshot",
        rawPayload: {},
      })
      .returning();

    expect(snapshot?.profileFormId).toBe(form.id);
  });

  it("rejects a second form for the same profile", async () => {
    const db = getDb();

    await expect(
      db.insert(profileForms).values({
        id: randomUUID(),
        profileId: seededProfileId,
        definitionHash: getEnrollmateDefinitionHash(),
        data: {},
      }),
    ).rejects.toThrow();
  });
});
