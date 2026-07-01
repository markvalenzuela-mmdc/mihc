import { useQueryStates } from "nuqs";
import { TransitionStartFunction, useState } from "react";
import {
  limitSearchParams,
  pageParamKey,
  paginationSearchParams,
  searchFilterSearchParams,
  sortSearchParams,
  SortDirection,
  tabFilterSearchParams,
} from "./data-table-query-state";

interface UseDataTableTabFilterData {
  tabs: (string | { label: string; value: string })[];
}

export function useDataTableTabFilter(
  { tabs }: UseDataTableTabFilterData,
  startTransition?: TransitionStartFunction,
) {
  const defaultTabs = [
    typeof tabs[0] === "object" ? { label: "All", value: "all" } : "all",
    ...tabs,
  ];

  const [state, setState] = useQueryStates(tabFilterSearchParams, {
    shallow: false,
    startTransition,
  });

  const { tab: tabValue } = state;

  const onSelect = (val: string) => {
    setState({ tab: val });
  };

  return {
    state: {
      tabValue,
    },
    actions: {
      onSelect,
    },
    meta: {
      tabs: defaultTabs,
    },
  };
}

interface UseDataTableSearchFilterData {}

export function useDataTableSearchFilter(
  data?: UseDataTableSearchFilterData,
  startTransition?: TransitionStartFunction,
) {
  const [inputValue, setInputValue] = useState("");
  const [state, setState] = useQueryStates(searchFilterSearchParams, {
    shallow: false,
    startTransition,
  });

  const { search: searchValue } = state;

  const onSearchChange = (val: string) => {
    setInputValue(val);

    // Clear the ?search= params when input is cleared
    if (val.length === 0) setState({ search: "" });
  };

  const onSearchSubmit = (val: string) => {
    setState({ search: val });
  };

  return {
    state: {
      inputValue,
      searchValue,
    },
    actions: {
      onSearchChange,
      onSearchSubmit,
    },
  };
}

interface UseDataTablePaginationData {
  totalPages: number;
}

export function useDataTablePagination(
  { totalPages }: UseDataTablePaginationData,
  startTransition?: TransitionStartFunction,
) {
  const [state, setState] = useQueryStates(paginationSearchParams, {
    shallow: false,
    startTransition,
  });

  const { page: currentPage } = state;

  const onPageClick = (page: number) => {
    // Client-side validation of page bounds
    const validPage = Math.min(Math.max(1, page), totalPages);
    setState({ page: validPage });
  };

  const onNextClick = () => {
    setState((prev) => ({
      page: Math.min((prev[pageParamKey] ?? 1) + 1, totalPages),
    }));
  };

  const onPrevClick = () => {
    setState((prev) => ({ page: Math.max((prev[pageParamKey] ?? 1) - 1, 1) }));
  };

  const onReset = () => {
    setState(null);
  };

  return {
    state: {
      currentPage,
      totalPages,
    },
    actions: {
      onPageClick,
      onNextClick,
      onPrevClick,
      onReset,
    },
  };
}

interface UseDataTableLimitData {
  rowsPerPageOptions: number[];
}

export function useDataTableLimit(
  { rowsPerPageOptions }: UseDataTableLimitData,
  startTransition?: TransitionStartFunction,
) {
  const [state, setState] = useQueryStates(limitSearchParams, {
    shallow: false,
    startTransition,
  });

  const { limit } = state;

  const rowsPerPage =
    limit ?? (rowsPerPageOptions.length > 0 ? rowsPerPageOptions[0] : 10);

  const onRowsPerPageChange = (rows: number) => {
    setState({ limit: rows });
  };

  return {
    state: {
      rowsPerPage,
    },
    actions: {
      onRowsPerPageChange,
    },
    meta: {
      rowsPerPageOptions,
    },
  };
}

interface UseDataTableSortData<TSortBy extends string> {
  sortableColumns: readonly [TSortBy, ...TSortBy[]];
  defaultSortBy: TSortBy;
  defaultSortDirection?: SortDirection;
}

export function useDataTableSort<TSortBy extends string>(
  {
    sortableColumns,
    defaultSortBy,
    defaultSortDirection = "desc",
  }: UseDataTableSortData<TSortBy>,
  startTransition?: TransitionStartFunction,
) {
  const [state, setState] = useQueryStates(
    sortSearchParams(sortableColumns, defaultSortBy, defaultSortDirection),
    {
      shallow: false,
      startTransition,
    },
  );

  const { sortBy, sortDirection } = state;

  const onSort = (column: string) => {
    if (!sortableColumns.includes(column as TSortBy)) return;

    const sortableColumn = column as TSortBy;

    if (sortBy === sortableColumn) {
      setState({
        sortDirection: sortDirection === "asc" ? "desc" : "asc",
      });
      return;
    }

    setState({
      sortBy: sortableColumn,
      sortDirection: "asc",
    });
  };

  return {
    state: {
      sortBy,
      sortDirection,
    },
    actions: {
      onSort,
    },
  };
}
