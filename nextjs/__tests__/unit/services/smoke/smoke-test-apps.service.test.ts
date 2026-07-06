import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSmokeTestApps } from "@/feature/smoke/services/smoke-test-apps.service";

describe("getSmokeTestApps", () => {
  const findMany = vi.fn();
  const db = {
    query: {
      apps: {
        findMany,
      },
    },
  };

  beforeEach(() => {
    findMany.mockReset();
  });

  it("returns apps with their latest smoke runs", async () => {
    const apps = [
      {
        id: "website",
        name: "Website",
        smokeRuns: [{ id: "run-1", runNumber: 8 }],
      },
    ];
    findMany.mockResolvedValue(apps);

    await expect(getSmokeTestApps(db as never)).resolves.toBe(apps);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: expect.any(Function),
      with: {
        smokeRuns: {
          orderBy: expect.any(Function),
          limit: 10,
        },
      },
    });
  });

  it("returns an empty list when no apps are configured", async () => {
    findMany.mockResolvedValue([]);

    await expect(getSmokeTestApps(db as never)).resolves.toEqual([]);
  });

  it("propagates database errors", async () => {
    findMany.mockRejectedValue(new Error("database unavailable"));

    await expect(getSmokeTestApps(db as never)).rejects.toThrow(
      "database unavailable",
    );
  });
});
