import {
  getEnrollmateReusableOptionSets,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
import { describe, expect, it } from "vitest";

import {
  createProfileFormData,
} from "@/lib/drizzle/seed/seed-profiles";
import { profileFixtures } from "@/lib/drizzle/seed/profile/profile-fixtures";

describe("profile seed form data", () => {
  it("keeps only stable scenario metadata in profile fixtures", () => {
    for (const profile of profileFixtures) {
      expect(profile.id).toEqual(expect.any(String));
      expect(profile.flowType).toMatch(/^(bachelors|microcredentials)$/);
      expect(profile.status).toEqual(expect.any(String));
      expect(profile).not.toHaveProperty("name");
      expect(profile).not.toHaveProperty("email");
      expect(profile).not.toHaveProperty("formOverrides");
    }
  });

  it.each(profileFixtures)(
    "creates valid generated form data for $flowType",
    (profile) => {
      const email = "seed-test-" + profile.id + "@example.com";
      const data = createProfileFormData(profile.flowType, email);

      if (profile.flowType === "bachelors") {
        const schoolOptions =
          getEnrollmateReusableOptionSets().lastSchoolAttendedOptions.map(
            (option) => option.value,
          );

        expect(data.schoolNotFound).toBe(false);
        expect(schoolOptions).toContain(data.lastSchoolAttended);
        expect(data).not.toHaveProperty("lastschOther");
      }

      expect(getEnrollmateValidator(profile.flowType).safeParse(data).success)
        .toBe(true);
      expect(JSON.stringify(data)).not.toMatch(/seeded (conditional )?value/i);
      expect(data.email).toBe(email);
    },
  );
});
