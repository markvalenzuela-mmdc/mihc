import { getEnrollmateValidator } from "@mihc/enrollmate-contract";
import { describe, expect, it } from "vitest";

import {
  createProfileFormData,
  profiles,
} from "@/lib/drizzle/seed/seed-profiles";

describe("profile seed form data", () => {
  it.each(profiles)(
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
