import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SmokeTestingQueryKey,
  smokeTestingOptions,
} from "@/feature/smoke/query/smoke-testing.query";

describe("smokeTestingOptions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keys and fetches by the serialized URL search params", async () => {
    const searchParams = "app=website&page=2&limit=10&tab=success";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          appName: null,
          apps: [],
          smokeRuns: { data: [], meta: { pageCount: 1 } },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const options = smokeTestingOptions(searchParams);
    await options.queryFn!({} as never);

    expect(options.queryKey).toEqual([
      ...SmokeTestingQueryKey,
      searchParams,
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/smoke-runs?${searchParams}`,
    );
  });

  it("revives app and run timestamps, including nullable completion times", async () => {
    const appRun = {
      id: "run-1",
      status: "success",
      createdAt: "2026-07-22T01:00:00.000Z",
      runNumber: 1,
      appId: "website",
      trigger: "manual",
      total: 1,
      passed: 1,
      failed: 0,
      durationSeconds: 2,
      startedBy: null,
      checkedAt: "2026-07-22T01:01:00.000Z",
      completedAt: "2026-07-22T01:02:00.000Z",
    };
    const paginatedRun = { ...appRun, completedAt: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          appName: "Website",
          apps: [
            {
              id: "website",
              name: "Website",
              createdAt: "2026-07-21T01:00:00.000Z",
              updatedAt: "2026-07-22T01:00:00.000Z",
              description: null,
              createdBy: null,
              updatedBy: null,
              smokeRuns: [appRun],
            },
          ],
          smokeRuns: {
            data: [paginatedRun],
            meta: { pageCount: 1 },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await smokeTestingOptions("app=website").queryFn!(
      {} as never,
    );

    expect(result.apps[0].createdAt).toBeInstanceOf(Date);
    expect(result.apps[0].updatedAt).toBeInstanceOf(Date);
    expect(result.apps[0].smokeRuns[0].createdAt).toBeInstanceOf(Date);
    expect(result.apps[0].smokeRuns[0].checkedAt).toBeInstanceOf(Date);
    expect(result.apps[0].smokeRuns[0].completedAt).toBeInstanceOf(Date);
    expect(result.smokeRuns.data[0].checkedAt).toBeInstanceOf(Date);
    expect(result.smokeRuns.data[0].completedAt).toBeNull();
  });

  it("throws the API error payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: "Unauthorized" }),
      }),
    );

    await expect(
      smokeTestingOptions("").queryFn!({} as never),
    ).rejects.toThrow("Unauthorized");
  });
});
