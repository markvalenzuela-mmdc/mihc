import { describe, expect, it } from "vitest";

import { smokeRunsStatusSchema } from "@/feature/smoke/schema/smoke-test-runs.schema";

describe("smokeRunsStatusSchema", () => {
  it.each(["queued", "running", "success", "degraded", "failure"])(
    "accepts %s as a smoke run status",
    (status) => {
      expect(smokeRunsStatusSchema.parse({ status })).toEqual({ status });
    },
  );

  it.each(["unknown", "", null])(
    "rejects invalid smoke run status %s",
    (status) => {
      expect(() => smokeRunsStatusSchema.parse({ status })).toThrow();
    },
  );
});
