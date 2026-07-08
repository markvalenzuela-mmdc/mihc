import { ClassProps, StyleProps } from "@/types/generic.props";
import { ColumnDef } from "@tanstack/react-table";
import React, { CSSProperties } from "react";

interface DataTableState<TData = unknown, TValue = unknown> {
  table: {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
  };
  sort?: {
    sortBy: string;
    sortDirection: "asc" | "desc";
  };
  searchFilter?: {
    inputValue: string;
    searchValue: string;
  };
  tabFilter?: {
    tabValue: string;
    defaultTabValue?: string;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
  };
  limit?: {
    rowsPerPage: number;
  };
}

interface DataTableActions {
  sort?: {
    onSort: (value: string) => void;
  };
  searchFilter?: {
    onSearchChange: (value: string) => void;
    onSearchSubmit: (value: string) => void;
  };
  tabFilter?: {
    onSelect: (value: string) => void;
  };
  pagination?: {
    onPageClick?: (page: number) => void;
    onNextClick?: () => void;
    onPrevClick?: () => void;
    onReset?: () => void;
  };
  limit?: {
    onRowsPerPageChange?: (rows: number) => void;
  };
}

interface DataTableMeta {
  tabFilter?: {
    tabs: (string | { label: string; value: string })[];
  };
  limit?: {
    rowsPerPageOptions?: number[];
  };
}

interface DataTableContextValue {
  state: DataTableState;
  actions: DataTableActions;
  meta?: DataTableMeta;
}

interface DataTableProviderProps<TData = unknown, TValue = unknown> {
  children: React.ReactNode;
  state: DataTableState<TData, TValue>;
  actions: DataTableActions;
  meta?: DataTableMeta;
}

type DataTableElements<T> = {
  table: T;
  header: T;
  body: T;
  row: T;
};

interface DataTableProps<TData, TValue>
  extends
    ClassProps<DataTableElements<string>>,
    StyleProps<DataTableElements<CSSProperties>> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  sortable?: boolean;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (value: string) => void;
  responsive?: boolean;
  isLoading?: boolean;
  error?: Error | string | null;
  emptyFallback?: React.ComponentType<DataTableStateProps>;
  emptyFallbackMobile?: React.ComponentType<DataTableStateProps>;
  loadingFallback?: React.ComponentType<DataTableStateProps>;
  loadingFallbackMobile?: React.ComponentType<DataTableStateProps>;
  errorFallback?: React.ComponentType<DataTableStateProps>;
  errorFallbackMobile?: React.ComponentType<DataTableStateProps>;
}

interface DataTableStateProps {
  columnCount: number;
}

interface DataTableTabFilterProps {
  tabs: (string | { label: string; value: string })[];
  value?: string;
  defaultValue?: string;
  onSelect?: (value: string) => void;
  className?: string;
  classNames?: {
    item?: string;
  };
}

interface DataTableSearchProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onKeyDown" | "className"
> {
  inputValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (val: string) => void;
  showFilter?: boolean;
  onFilterClick?: () => void;
  children?: React.ReactNode;
  searchButtonLabel?: string;
  className?: string;
  classNames?: {
    input?: string;
    filterButton?: string;
    searchButton?: string;
  };
}

interface DataTableRowsSelectorProps {
  options: number[];
  value?: number;
  defaultValue?: number;
  onSelect?: (value: number) => void;
  className?: string;
  classNames?: {
    label?: string;
    select?: string;
  };
}

interface DataTablePaginationProps {
  totalPages: number;
  currentPage: number;
  onNextClick?: () => void;
  onPrevClick?: () => void;
  onPageClick?: (page: number) => void;
  className?: string;
  classNames?: {
    content?: string;
    previous?: string;
    next?: string;
    page?: string;
    ellipse?: string;
  };
}

export type {
  DataTableContextValue, DataTablePaginationProps, DataTableProps, DataTableProviderProps, DataTableRowsSelectorProps, DataTableSearchProps, DataTableStateProps,
  DataTableTabFilterProps
};

