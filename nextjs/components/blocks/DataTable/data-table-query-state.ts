import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const tabFilterParamKey = "tab" as const;

export const tabFilterSearchParams = {
  [tabFilterParamKey]: parseAsString.withDefault("all"),
};

export const searchFilterParamKey = "search" as const;

export const searchFilterSearchParams = {
  [searchFilterParamKey]: parseAsString.withDefault(""),
};

export const pageParamKey = "page" as const;

export const paginationSearchParams = {
  [pageParamKey]: parseAsInteger.withDefault(1),
};

export const limitParamKey = "limit" as const;

export const limitSearchParams = {
  [limitParamKey]: parseAsInteger,
};

const sortDirectionOptions = ["asc", "desc"] as const;

export type SortDirection = (typeof sortDirectionOptions)[number];

export const sortByParamKey = "sortBy" as const;
export const sortDirectionParamKey = "sortDirection" as const;

export const sortSearchParams = <TSortBy extends string>(
  sortableColumns: readonly [TSortBy, ...TSortBy[]],
  defaultSortBy: TSortBy,
  defaultSortDirection: SortDirection = "desc",
) => ({
  [sortByParamKey]: parseAsStringLiteral(sortableColumns).withDefault(
    defaultSortBy,
  ),
  [sortDirectionParamKey]: parseAsStringLiteral(sortDirectionOptions).withDefault(
    defaultSortDirection,
  ),
});

// Loaders
export const loadTabFilterSearchParams = createLoader(tabFilterSearchParams);
export const loadSearchFilterSearchParams = createLoader(
  searchFilterSearchParams,
);
export const loadPaginationSearchParams = createLoader(paginationSearchParams);
export const loadLimitSearchParams = createLoader(limitSearchParams);
