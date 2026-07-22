import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSmokeTestApps: vi.fn(),
  getPaginatedSmokeTestRuns: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/feature/smoke/services/smoke-test-apps.service", () => ({
  getSmokeTestApps: mocks.getSmokeTestApps,
}));

vi.mock("@/feature/smoke/services/smoke-test-runs.service", () => ({
  getPaginatedSmokeTestRuns: mocks.getPaginatedSmokeTestRuns,
}));

import { GET } from "@/app/api/smoke-runs/route";

describe("GET /api/smoke-runs", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getSmokeTestApps.mockReset();
    mocks.getPaginatedSmokeTestRuns.mockReset();
  });

  it("rejects an unauthenticated request before reading Smoke data", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/smoke-runs"));

    expect(response.status).toBe(401);
    expect(mocks.getSmokeTestApps).not.toHaveBeenCalled();
    expect(mocks.getPaginatedSmokeTestRuns).not.toHaveBeenCalled();
  });

  it("forwards URL filters and clamps the page size", async () => {
    const apps = [{ id: "website", name: "Website" }];
    const smokeRuns = { data: [], meta: { pageCount: 1 } };
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getSmokeTestApps.mockResolvedValue(apps);
    mocks.getPaginatedSmokeTestRuns.mockResolvedValue(smokeRuns);

    const response = await GET(
      new Request(
        "http://localhost/api/smoke-runs?app=website&page=3&limit=500&tab=failure",
      ),
    );

    expect(mocks.getPaginatedSmokeTestRuns).toHaveBeenCalledWith({
      appId: "website",
      page: 3,
      limit: 100,
      tab: "failure",
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { appName: "Website", apps, smokeRuns },
    });
  });

  it("normalizes non-positive pagination and ignores an invalid tab", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getSmokeTestApps.mockResolvedValue([]);
    mocks.getPaginatedSmokeTestRuns.mockResolvedValue({
      data: [],
      meta: { pageCount: 1 },
    });

    await GET(
      new Request(
        "http://localhost/api/smoke-runs?app=website&page=0&limit=0&tab=all",
      ),
    );

    expect(mocks.getPaginatedSmokeTestRuns).toHaveBeenCalledWith({
      appId: "website",
      page: 1,
      limit: 1,
      tab: undefined,
    });
  });
});
