import { describe, expect, it, vi } from "vitest";

import { paginateByQuery } from "@/lib/drizzle/pagination";

describe("paginateByQuery", () => {
  it("passes limit and offset to the page fetcher", async () => {
    const fetchPage = vi.fn().mockResolvedValue(["row"]);
    const fetchTotalCount = vi.fn().mockResolvedValue([{ total: 25 }]);

    const [data, meta] = await paginateByQuery({
      fetchPage,
      fetchTotalCount,
    }).withPages({ limit: 10, page: 3 });

    expect(fetchPage).toHaveBeenCalledWith({
      limit: 10,
      page: 3,
      offset: 20,
    });
    expect(data).toEqual(["row"]);
    expect(meta).toMatchObject({
      currentPage: 3,
      previousPage: 2,
      nextPage: null,
      isFirstPage: false,
      isLastPage: true,
      pageCount: 3,
      totalCount: 25,
    });
  });

  it("falls back to the first page and default limit for invalid inputs", async () => {
    const fetchPage = vi.fn().mockResolvedValue([]);
    const fetchTotalCount = vi.fn().mockResolvedValue([{ total: 0 }]);

    const [, meta] = await paginateByQuery({
      fetchPage,
      fetchTotalCount,
    }).withPages({ limit: 0, page: -4 });

    expect(fetchPage).toHaveBeenCalledWith({
      limit: 10,
      page: 1,
      offset: 0,
    });
    expect(meta).toMatchObject({
      currentPage: 1,
      previousPage: null,
      nextPage: null,
      isFirstPage: true,
      isLastPage: true,
      pageCount: 1,
      totalCount: 0,
    });
  });

  it("can omit pageCount from metadata", async () => {
    const fetchPage = vi.fn().mockResolvedValue([]);
    const fetchTotalCount = vi.fn().mockResolvedValue([{ total: 7 }]);

    const [, meta] = await paginateByQuery({
      fetchPage,
      fetchTotalCount,
    }).withPages({ limit: 5, page: 1, includePageCount: false });

    expect(meta).toEqual({
      currentPage: 1,
      previousPage: null,
      nextPage: 2,
      isFirstPage: true,
      isLastPage: false,
      totalCount: 7,
    });
  });
});
