import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { getDb, profileForms } from "@/lib/drizzle/db";
import { useIntegrationTestDatabase } from "./helpers/test-db";

const seededProfileId = "3591b2d2-886b-45c6-bcbd-3c8756b40101";

describe("profile flow cardinality", () => {
  useIntegrationTestDatabase();

  it("loads the profile form as a singular relation", async () => {
    const db = getDb();
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, seededProfileId),
      with: { profileForm: true },
    });

    expect(profile?.profileForm?.profileId).toBe(seededProfileId);
    expect(profile?.profileForm).not.toHaveProperty("flowType");
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
