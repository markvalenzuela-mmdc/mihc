"use client";
import { ComponentProps, Context, createContext, use, useEffect } from "react";
import {
  DataTableContent,
  DataTablePagination,
  DataTableRowsSelector,
  DataTableSearch,
  DataTableTabFilter,
} from "./data-table";
import { DataTableContextValue, DataTableProviderProps } from "./types";
import { useDebouncedCallback } from "use-debounce";

// ============================================================================
// CONTEXTS
// ============================================================================

const DataTableContext = createContext<DataTableContextValue | null>(null);

function DataTableProvider({
  children,
  state,
  actions,
  meta,
}: DataTableProviderProps) {
  return (
    <DataTableContext.Provider value={{ state, actions, meta }}>
      {children}
    </DataTableContext.Provider>
  );
}

interface UseGetContextOptions {
  errorMessage?: string;
}

type UseGetContextSecondParam = string | UseGetContextOptions;

function useGetContext<T>(
  context: Context<T | null>,
  option?: UseGetContextSecondParam,
): T {
  const ctx = use(context);

  const message =
    !option || (typeof option === "object" && !option.errorMessage)
      ? "Component must be used inside a Context Provider"
      : `${option} must be used inside its Provider`;

  if (ctx === null) throw new Error(message);

  return ctx;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function DataTableContentWithContext(
  props: Pick<
    ComponentProps<typeof DataTableContent>,
    | "responsive"
    | "sortable"
    | "isLoading"
    | "error"
    | "emptyFallback"
    | "emptyFallbackMobile"
    | "loadingFallback"
    | "loadingFallbackMobile"
    | "errorFallback"
    | "errorFallbackMobile"
    | "className"
    | "classNames"
    | "style"
    | "styles"
  >,
) {
  const context = useGetContext(DataTableContext, "DataTable.Table");

  const columns = context.state.table.columns;
  const data = context.state.table.data ?? [];
  const pageCount = context.state.pagination?.totalPages;
  const pageIndex = (context.state.pagination?.currentPage ?? 1) - 1;
  const pageSize = context.state.limit?.rowsPerPage ?? 10;
  const sortBy = context.state.sort?.sortBy;
  const sortDirection = context.state.sort?.sortDirection;
  const onSort = context.actions.sort?.onSort;

  return (
    <DataTableContent
      columns={columns}
      data={data}
      pageCount={pageCount}
      pageIndex={pageIndex}
      pageSize={pageSize}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={onSort}
      {...props}
    />
  );
}

function DataTableTabFilterWithContext({
  className,
  classNames,
}: Pick<
  ComponentProps<typeof DataTableTabFilter>,
  "className" | "classNames"
>) {
  const context = useGetContext(DataTableContext, "DataTable.TabFilter");

  const tabs = context.meta?.tabFilter?.tabs;
  const value = context.state.tabFilter?.tabValue;
  const defaultValue = context.state.tabFilter?.defaultTabValue;
  const onSelect = context.actions.tabFilter?.onSelect;

  if (!tabs) throw new Error("No tabs were provided");

  const handleSelect = (value: string) => {
    if (onSelect) onSelect(value);

    const pageClick = context.actions.pagination?.onPageClick;
    if (pageClick) pageClick(1);
  };

  return (
    <DataTableTabFilter
      tabs={tabs}
      value={value}
      defaultValue={defaultValue}
      onSelect={handleSelect}
      className={className}
      classNames={classNames}
    />
  );
}

function DataTableSearchWithContext({
  className,
  classNames,
  placeholder,
  showFilter,
  onFilterClick,
  searchButtonLabel,
  children,
  debounced = false,
  debounceDelay = 300,
}: Pick<
  ComponentProps<typeof DataTableSearch>,
  | "className"
  | "classNames"
  | "placeholder"
  | "showFilter"
  | "onFilterClick"
  | "searchButtonLabel"
  | "children"
> & {
  debounced?: boolean;
  debounceDelay?: number;
}) {
  const context = useGetContext(DataTableContext, "DataTable.SearchFilter");

  const inputValue = context.state.searchFilter?.inputValue;
  const onSearchChange = context.actions.searchFilter?.onSearchChange;
  const onSearchSubmit = context.actions.searchFilter?.onSearchSubmit;

  const handleSubmit = (value: string) => {
    if (onSearchSubmit) onSearchSubmit(value);

    const pageClick = context.actions.pagination?.onPageClick;
    if (pageClick) pageClick(1);
  };

  const debouncedSubmit = useDebouncedCallback((val: string) => {
    handleSubmit(val);
  }, debounceDelay);

  return (
    <DataTableSearch
      inputValue={inputValue}
      onSearchChange={(val) => {
        onSearchChange?.(val);
        if (debounced) {
          debouncedSubmit(val);
        }
      }}
      onSearchSubmit={handleSubmit}
      className={className}
      classNames={classNames}
      placeholder={placeholder}
      showFilter={showFilter}
      onFilterClick={onFilterClick}
      searchButtonLabel={searchButtonLabel}
      children={children}
    />
  );
}

function DataTableRowsSelectorWithContext({
  defaultValue,
  className,
  classNames,
}: Pick<
  ComponentProps<typeof DataTableRowsSelector>,
  "defaultValue" | "className" | "classNames"
>) {
  const context = useGetContext(DataTableContext, "DataTable.RowsSelector");

  const options = context.meta?.limit?.rowsPerPageOptions ?? [10, 25, 50, 100];
  const value = context.state.limit?.rowsPerPage;
  const onSelect = context.actions.limit?.onRowsPerPageChange;

  return (
    <DataTableRowsSelector
      options={options}
      value={value}
      defaultValue={defaultValue}
      onSelect={onSelect}
      className={className}
      classNames={classNames}
    />
  );
}

function DataTablePaginationWithContext({
  className,
  classNames,
}: Pick<
  ComponentProps<typeof DataTablePagination>,
  "className" | "classNames"
>) {
  const context = useGetContext(DataTableContext, "DataTable.Pagination");

  const totalPages = context.state.pagination?.totalPages ?? 1;
  const currentPage = context.state.pagination?.currentPage ?? 1;
  const onNextClick = context.actions.pagination?.onNextClick;
  const onPrevClick = context.actions.pagination?.onPrevClick;
  const onPageClick = context.actions.pagination?.onPageClick;
  const onReset = context.actions.pagination?.onReset;

  useEffect(() => {
    return () => {
      if (onReset) onReset();
    };
  }, []);

  return (
    <DataTablePagination
      totalPages={totalPages}
      currentPage={currentPage}
      onNextClick={onNextClick}
      onPrevClick={onPrevClick}
      onPageClick={onPageClick}
      className={className}
      classNames={classNames}
    />
  );
}

function DataTableDefault() {
  return <div></div>;
}

export const DataTable = Object.assign(DataTableDefault, {
  Provider: DataTableProvider,
  Table: DataTableContentWithContext,
  TabFilter: DataTableTabFilterWithContext,
  Search: DataTableSearchWithContext,
  Pagination: DataTablePaginationWithContext,
  RowsSelector: DataTableRowsSelectorWithContext,
});
