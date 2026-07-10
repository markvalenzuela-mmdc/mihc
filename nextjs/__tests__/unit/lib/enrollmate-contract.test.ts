import {
  getEnrollmateFlowDefinition,
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
});
