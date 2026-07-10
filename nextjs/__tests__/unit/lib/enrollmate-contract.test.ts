import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";

describe("EnrollMate contract", () => {
  it("loads both scraped flows and exposes a stable hash", () => {
    expect(getEnrollmateFlowDefinition("bachelors").steps).not.toHaveLength(0);
    expect(
      getEnrollmateFlowDefinition("microcredentials").steps,
    ).not.toHaveLength(0);
    expect(getEnrollmateDefinitionHash()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects values outside captured select options", () => {
    const result = getEnrollmateValidator("bachelors").safeParse({
      gender: "Not a captured option",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown operational sections", () => {
    expect(profileOperationalDataSchema.safeParse({ other: {} }).success).toBe(false);
  });
});
