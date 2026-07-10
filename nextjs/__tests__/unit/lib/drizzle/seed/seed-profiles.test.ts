import { getEnrollmateValidator } from "@mihc/enrollmate-contract";
import { describe, expect, it } from "vitest";

import {
  createProfileFormData,
} from "@/lib/drizzle/seed/seed-profiles";
import { profileFixtures } from "@/lib/drizzle/seed/profile/profile-fixtures";

describe("profile seed form data", () => {
  it("defines one parent flow and no form-level flow override per profile", () => {
    for (const profile of profileFixtures) {
      expect(profile.flowType).toBeDefined();
      expect(profile.formOverrides).not.toHaveProperty("flowType");
    }
  });

  it.each(profileFixtures)(
    "creates realistic, valid form data for $name",
    (profile) => {
      const data = createProfileFormData(
        profile.flowType,
        profile.email,
        profile.formOverrides,
      );

      expect(getEnrollmateValidator(profile.flowType).safeParse(data).success)
        .toBe(true);
      expect(JSON.stringify(data)).not.toMatch(/seeded (conditional )?value/i);
      expect(data).toMatchObject(profile.formOverrides);
    },
  );
});
