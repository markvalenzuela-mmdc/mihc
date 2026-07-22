import { describe, expect, it } from "vitest";
import { smokeRunDetailsOptions } from "@/feature/smoke/query/smoke-run-details.query";

describe("smokeRunDetailsOptions", () => {
  it("does not poll because SSE invalidates changed run details", () => {
    expect(smokeRunDetailsOptions("run-1").refetchInterval).toBeUndefined();
  });
});
