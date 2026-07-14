import { describe, expect, it } from "vitest";

import { getApprovedE2eProfileFixtures } from "@/feature/e2e/services/e2e-profile-fixtures.service";

describe("approved E2E profile fixtures", () => {
  it("returns serializable metadata without exposing filesystem paths", () => {
    const fixtures = getApprovedE2eProfileFixtures();

    for (const fixture of fixtures) {
      expect(fixture.fixtureUri).not.toContain("\\");
      expect(fixture.fixtureUri).not.toMatch(/[A-Za-z]:\\/);
      expect(fixture.filename).not.toContain("/");
      expect(fixture.filename).not.toContain("\\");
      expect(fixture.sizeBytes).toBeGreaterThanOrEqual(0);
    }
  });
});
