import { describe, expect, it } from "vitest";
import { SMOKE_POLL_INTERVAL_MS } from "@/feature/smoke/config/smoke-polling.config";
import { smokeRunDetailsOptions } from "@/feature/smoke/query/smoke-run-details.query";

describe("smokeRunDetailsOptions", () => {
  it("polls only while the selected run is active", () => {
    const refetchInterval = smokeRunDetailsOptions("run-1").refetchInterval as unknown as (
      query: { state: { data?: { details: { status: string } } } },
    ) => number | false;

    expect(
      refetchInterval({ state: { data: { details: { status: "running" } } } }),
    ).toBe(SMOKE_POLL_INTERVAL_MS);
    expect(
      refetchInterval({ state: { data: { details: { status: "success" } } } }),
    ).toBe(false);
    expect(refetchInterval({ state: {} })).toBe(false);
  });
});
