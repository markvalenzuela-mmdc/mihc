import {
  count,
  getTableColumns,
  type AnyColumn,
  type InferSelectModel,
  type SQL,
} from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { DbExecutor } from "@/types/db-transaction";

const DEFAULT_PAGE_SIZE = 10;

export interface PageNumberPaginationOptions {
  limit: number;
  page: number;
  includePageCount?: boolean;
}

export interface PageNumberPagination {
  isFirstPage: boolean;
  isLastPage: boolean;
  currentPage: number;
  previousPage: number | null;
  nextPage: number | null;
}

export interface PageNumberCounters {
  pageCount: number;
  totalCount: number;
}

export type PageNumberPaginationMeta = PageNumberPagination &
  PageNumberCounters;

export type Paginate<T = {}> = T & Partial<PageNumberPaginationOptions>;

export interface Paginated<T> {
  meta: PageNumberPaginationMeta;
  data: T[];
}

export const SortOrder = {
  asc: "asc",
  desc: "desc",
} as const;
export type SortOrder = "asc" | "desc";

type TotalCountRow = { total: number | string | bigint | null | undefined };

type OrderByClause = AnyColumn | SQL<unknown>;
type OrderByInput = OrderByClause | OrderByClause[];

export interface WithPagesOptions<TIncludePageCount extends boolean = true> {
  limit?: number | null;
  page?: number;
  includePageCount?: TIncludePageCount;
}

export type WithPagesMeta<TIncludePageCount extends boolean = true> =
  PageNumberPagination &
    (TIncludePageCount extends true
      ? {
          pageCount: number;
          totalCount: number;
        }
      : {
          totalCount: number;
        });

interface PageParams {
  limit: number;
  page: number;
  offset: number;
}

interface QueryPaginatorOptions<TData> {
  fetchPage: (params: PageParams) => Promise<TData[]>;
  fetchTotalCount: () => Promise<TotalCountRow[]>;
}

function createPageParams(options?: {
  limit?: number | null;
  page?: number;
}): PageParams {
  const limit =
    typeof options?.limit === "number" && options.limit > 0
      ? options.limit
      : DEFAULT_PAGE_SIZE;
  const page =
    typeof options?.page === "number" && options.page > 0 ? options.page : 1;

  return {
    limit,
    page,
    offset: Math.max(0, (page - 1) * limit),
  };
}

function buildPageMeta<TIncludePageCount extends boolean = true>(
  page: number,
  limit: number,
  totalCount: number,
  includePageCount?: TIncludePageCount,
): WithPagesMeta<TIncludePageCount> {
  const pageCount = Math.max(1, Math.ceil(totalCount / limit));
  const base: PageNumberPagination = {
    isFirstPage: page <= 1,
    isLastPage: page >= pageCount,
    currentPage: page,
    previousPage: page > 1 ? page - 1 : null,
    nextPage: page < pageCount ? page + 1 : null,
  };

  if (includePageCount === false) {
    return {
      ...base,
      totalCount,
    } as unknown as WithPagesMeta<TIncludePageCount>;
  }

  return {
    ...base,
    pageCount,
    totalCount,
  } as unknown as WithPagesMeta<TIncludePageCount>;
}

export function paginateByQuery<TData>(options: QueryPaginatorOptions<TData>) {
  return {
    async withPages<TIncludePageCount extends boolean = true>(
      withPagesOptions?: WithPagesOptions<TIncludePageCount>,
    ): Promise<[TData[], WithPagesMeta<TIncludePageCount>]> {
      const params = createPageParams(withPagesOptions);

      const [data, totalResult] = await Promise.all([
        options.fetchPage(params),
        options.fetchTotalCount(),
      ]);

      const totalCount = Number(totalResult[0]?.total ?? 0);
      const meta = buildPageMeta(
        params.page,
        params.limit,
        totalCount,
        withPagesOptions?.includePageCount,
      );

      return [data, meta];
    },
  };
}

type TableColumns<TTable extends AnyPgTable> = TTable["_"]["columns"];

export type PaginateTableSelect<TTable extends AnyPgTable> = Partial<
  Record<keyof TableColumns<TTable>, true>
>;

type TrueKeys<T> = {
  [K in keyof T]-?: T[K] extends true ? K : never;
}[keyof T];

export type PaginateTableResult<
  TTable extends AnyPgTable,
  TSelect extends PaginateTableSelect<TTable>,
> = Pick<
  InferSelectModel<TTable>,
  Extract<TrueKeys<TSelect>, keyof InferSelectModel<TTable>>
>;

function resolveTableSelect<
  TTable extends AnyPgTable,
  TSelect extends PaginateTableSelect<TTable>,
>(table: TTable, select: TSelect) {
  const tableColumns = getTableColumns(table) as TableColumns<TTable>;

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, isSelected]) => isSelected === true)
      .map(([key]) => [key, tableColumns[key as keyof TableColumns<TTable>]]),
  );
}

export interface PaginateTableQuery<
  TTable extends AnyPgTable,
  TSelect extends PaginateTableSelect<TTable>,
> {
  select: TSelect;
  where?: SQL<unknown>;
  orderBy?: OrderByInput;
}

export function paginateTable<TTable extends AnyPgTable>(
  tx: DbExecutor,
  table: TTable,
) {
  return {
    paginate<TSelect extends PaginateTableSelect<TTable>>(
      query: PaginateTableQuery<TTable, TSelect>,
    ) {
      return paginateByQuery<PaginateTableResult<TTable, TSelect>>({
        fetchPage: async ({ limit, offset }) => {
          const orderByColumns = query.orderBy
            ? Array.isArray(query.orderBy)
              ? query.orderBy
              : [query.orderBy]
            : [];

          const resolvedSelect = resolveTableSelect(table, query.select);

          let dataQuery: any = tx
            .select(resolvedSelect as any)
            .from(table as any);

          if (query.where) {
            dataQuery = dataQuery.where(query.where);
          }

          if (orderByColumns.length > 0) {
            dataQuery = dataQuery.orderBy(...orderByColumns);
          }

          return dataQuery.limit(limit).offset(offset);
        },
        fetchTotalCount: () => {
          let totalQuery: any = tx
            .select({ total: count() })
            .from(table as any);

          if (query.where) {
            totalQuery = totalQuery.where(query.where);
          }

          return totalQuery;
        },
      });
    },
  };
}
