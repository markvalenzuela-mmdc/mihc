import { beforeEach, describe, expect, it, vi } from "vitest";

const drizzleMocks = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({
    type: "and",
    conditions,
  })),
  count: vi.fn(() => ({ type: "count" })),
  eq: vi.fn((left: unknown, right: unknown) => ({
    type: "eq",
    left,
    right,
  })),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();

  return {
    ...actual,
    and: drizzleMocks.and,
    count: drizzleMocks.count,
    eq: drizzleMocks.eq,
  };
});

import { getPaginatedSmokeTestRuns } from "@/feature/smoke/services/smoke-test-runs.service";

describe("getPaginatedSmokeTestRuns", () => {
  const findMany = vi.fn();
  const where = vi.fn().mockResolvedValue([{ total: 0 }]);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const db = {
    query: {
      smokeRuns: {
        findMany,
      },
    },
    select,
  };

  beforeEach(() => {
    drizzleMocks.and.mockClear();
    drizzleMocks.count.mockClear();
    drizzleMocks.eq.mockClear();
    findMany.mockReset();
    select.mockClear();
    from.mockClear();
    where.mockClear();
  });

  it("paginates smoke runs for an app", async () => {
    const runs = [{ id: "run-2", runNumber: 2 }];
    findMany.mockResolvedValue(runs);
    where.mockResolvedValue([{ total: 12 }]);

    const result = await getPaginatedSmokeTestRuns(
      { appId: "website", limit: 5, page: 2 },
      db as never,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: expect.any(Function),
      orderBy: expect.any(Function),
      limit: 5,
      offset: 5,
    });
    expect(drizzleMocks.eq).toHaveBeenCalledTimes(1);
    expect(drizzleMocks.and).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: runs,
      meta: {
        currentPage: 2,
        previousPage: 1,
        nextPage: 3,
        isFirstPage: false,
        isLastPage: false,
        pageCount: 3,
        totalCount: 12,
      },
    });
  });

  it("adds status filtering when a tab is selected", async () => {
    findMany.mockResolvedValue([]);
    where.mockResolvedValue([{ total: 1 }]);

    await getPaginatedSmokeTestRuns(
      { appId: "website", tab: "failure" },
      db as never,
    );

    expect(drizzleMocks.eq).toHaveBeenCalledTimes(2);
    expect(drizzleMocks.eq).toHaveBeenLastCalledWith(
      expect.anything(),
      "failure",
    );
    expect(drizzleMocks.and).toHaveBeenCalledTimes(1);
  });

  it("uses default pagination and reports zero-count metadata", async () => {
    findMany.mockResolvedValue([]);
    where.mockResolvedValue([{ total: 0 }]);

    const result = await getPaginatedSmokeTestRuns(
      { appId: "website" },
      db as never,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: expect.any(Function),
      orderBy: expect.any(Function),
      limit: 5,
      offset: 0,
    });
    expect(result).toEqual({
      data: [],
      meta: {
        currentPage: 1,
        previousPage: null,
        nextPage: null,
        isFirstPage: true,
        isLastPage: true,
        pageCount: 1,
        totalCount: 0,
      },
    });
  });

  it("propagates database errors from run lookup", async () => {
    findMany.mockRejectedValue(new Error("database unavailable"));
    where.mockResolvedValue([{ total: 0 }]);

    await expect(
      getPaginatedSmokeTestRuns({ appId: "website" }, db as never),
    ).rejects.toThrow("database unavailable");
  });
});
