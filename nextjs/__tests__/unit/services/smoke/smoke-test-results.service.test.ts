import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSmokeTestResultsByRunId } from "@/feature/smoke/services/smoke-test-results.service";

describe("getSmokeTestResultsByRunId", () => {
  const findFirst = vi.fn();
  const db = {
    query: {
      smokeRuns: {
        findFirst,
      },
    },
  };

  beforeEach(() => {
    findFirst.mockReset();
  });

  it("requires a run id", async () => {
    await expect(getSmokeTestResultsByRunId("", db as never)).rejects.toThrow(
      "Run ID is required",
    );
  });

  it("returns aggregate run details with app, result, and operator relations", async () => {
    const run = {
      id: "run-1",
      app: { name: "Website" },
      testResults: [{ id: "result-1" }],
      startedByUser: { id: "user-1" },
    };
    findFirst.mockResolvedValue(run);

    await expect(
      getSmokeTestResultsByRunId("run-1", db as never),
    ).resolves.toBe(run);

    expect(findFirst).toHaveBeenCalledWith({
      with: {
        app: {
          columns: {
            name: true,
          },
        },
        testResults: true,
        startedByUser: true,
      },
      where: expect.any(Function),
      orderBy: expect.any(Function),
    });
  });

  it("returns null when the run does not exist", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      getSmokeTestResultsByRunId("missing-run", db as never),
    ).resolves.toBeNull();
  });

  it("propagates database errors", async () => {
    findFirst.mockRejectedValue(new Error("database unavailable"));

    await expect(
      getSmokeTestResultsByRunId("run-1", db as never),
    ).rejects.toThrow("database unavailable");
  });
});
