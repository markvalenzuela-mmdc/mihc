"use client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Header } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fragment } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Inbox,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataState } from "@/components/data-state";

import {
  DataTablePaginationProps,
  DataTableProps,
  DataTableRowsSelectorProps,
  DataTableSearchProps,
  DataTableStateProps,
  DataTableTabFilterProps,
} from "./types";

// ============================================================================
// UTILITIES
// ============================================================================

// Just util functions for rendering page numbers
const parseRenderedPageNumbersStart = (current: number, max: number) => {
  if (current < 3) return 0;
  if (max <= 3) return 0;
  if (current >= max) return current - 4;
  if (current >= max - 1) return current - 3;
  return current - 2;
};

const parseRenderedPageNumbersEnd = (current: number) => {
  if (current < 3) return 3;
  return current + 1;
};

function getSortKey<TData, TValue>(
  header: Header<TData, TValue>,
): string | null {
  const sortMeta = header.column.columnDef.meta?.sort;
  if (sortMeta?.enabled === false) return null;
  if (sortMeta?.key) return sortMeta.key;

  const accessorKey = (header.column.columnDef as { accessorKey?: unknown })
    .accessorKey;
  if (typeof accessorKey === "string") return accessorKey;

  return null;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function DataTableContent<TData, TValue>({
  responsive = false,
  columns,
  pageCount,
  pageIndex = 0,
  pageSize = 10,
  sortable = false,
  sortBy,
  sortDirection,
  onSort,
  data,
  isLoading,
  error,
  emptyFallback,
  emptyFallbackMobile,
  loadingFallback,
  loadingFallbackMobile,
  errorFallback,
  errorFallbackMobile,
  className,
  classNames,
  style,
  styles,
}: DataTableProps<TData, TValue>) {
  const isMobile = useIsMobile();

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    columnResizeMode: "onChange",
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  });

  if (responsive && isMobile) {
    const EmptyFallback = emptyFallbackMobile ?? DataTableEmptyStateMobile;
    const LoadingFallback =
      loadingFallbackMobile ?? DataTableLoadingStateMobile;
    const ErrorFallback = errorFallbackMobile ?? DataTableErrorStateMobile;

    return (
      <div
        className={cn("rounded-md border overflow-hidden", className)}
        style={style}
      >
        <Table className={cn(classNames?.table)} style={styles?.table}>
          <TableBody className={cn(classNames?.body)} style={styles?.body}>
            <DataState
              data={table.getRowModel().rows}
              isLoading={isLoading}
              error={error}
              emptyFallback={<EmptyFallback columnCount={1} />}
              loadingFallback={<LoadingFallback columnCount={1} />}
              errorFallback={<ErrorFallback columnCount={1} />}
            >
              {(rows) =>
                rows.map((row) => {
                  const cells = row
                    .getVisibleCells()
                    .filter(
                      (cell) => !cell.column.columnDef.meta?.mobile?.hidden,
                    );

                  const left = cells.filter(
                    (cell) =>
                      cell.column.columnDef.meta?.mobile?.align === "left",
                  );

                  const right = cells.filter(
                    (cell) =>
                      cell.column.columnDef.meta?.mobile?.align === "right",
                  );

                  return (
                    <TableRow
                      key={row.id}
                      className={cn("hover:bg-muted/50", classNames?.row)}
                      style={styles?.row}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-0">
                          {/* LEFT COLUMN */}
                          <div className="flex flex-col">
                            {left.map((cell) => (
                              <Fragment key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </Fragment>
                            ))}
                          </div>

                          {/* RIGHT COLUMN */}
                          <div className="flex flex-col items-end text-right">
                            {right.map((cell) => (
                              <Fragment key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              }
            </DataState>
          </TableBody>
        </Table>
      </div>
    );
  }

  const EmptyFallback = emptyFallback ?? DataTableEmptyState;
  const LoadingFallback = loadingFallback ?? DataTableLoadingState;
  const ErrorFallback = errorFallback ?? DataTableErrorState;

  return (
    <div
      className={cn(
        "rounded-md border overflow-x-auto overflow-y-hidden [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
        className,
      )}
      style={style}
    >
      <Table
        className={cn("min-w-[760px]", classNames?.table)}
        style={{ tableLayout: "fixed", width: "100%", ...styles?.table }}
      >
        <TableHeader
          className={cn(classNames?.header, "bg-muted/50")}
          style={styles?.header}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="px-6 py-4"
                    style={{ width: `${header.getSize()}px` }}
                  >
                    {header.isPlaceholder ? null : (() => {
                      const renderedHeader = flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      );

                      const sortKey = getSortKey(header);
                      const isSortable = sortable && !!onSort && !!sortKey;

                      if (!isSortable || !sortKey) return renderedHeader;

                      const isActive = sortBy === sortKey;

                      return (
                        <button
                          type="button"
                          className="flex items-center cursor-pointer hover:text-foreground/80 transition-colors"
                          onClick={() => onSort(sortKey)}
                        >
                          {renderedHeader}
                          {!isActive && (
                            <ArrowUpDown className="inline size-3.5 ms-2" strokeWidth={1.5} />
                          )}
                          {isActive && sortDirection === "asc" && (
                            <ArrowUp className="inline size-3.5 ms-2 font-thin" strokeWidth={1.5} />
                          )}
                          {isActive && sortDirection === "desc" && (
                            <ArrowDown className="inline size-3.5 ms-2 font-thin" strokeWidth={1.5} />
                          )}
                        </button>
                      );
                    })()}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(classNames?.body)} style={styles?.body}>
          <DataState
            data={table.getRowModel().rows}
            isLoading={isLoading}
            error={error}
            emptyFallback={<EmptyFallback columnCount={columns.length} />}
            loadingFallback={<LoadingFallback columnCount={columns.length} />}
            errorFallback={<ErrorFallback columnCount={columns.length} />}
          >
            {(rows) =>
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn("hover:bg-muted/50", classNames?.row)}
                  style={styles?.row}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-6 py-4 overflow-hidden"
                      style={{ width: `${cell.column.getSize()}px` }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            }
          </DataState>
        </TableBody>
      </Table>
    </div>
  );
}

function DataTableEmptyState({ columnCount }: DataTableStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={columnCount} className="h-60 text-center">
        <Empty className="h-full border-0">
          <EmptyMedia variant="icon">
            <Inbox className="size-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No data found</EmptyTitle>
            <EmptyDescription>
              There are no items to display at this time.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

function DataTableLoadingState({ columnCount }: DataTableStateProps) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={columnCount} className="px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function DataTableErrorState({ columnCount }: DataTableStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={columnCount} className="h-60 text-center">
        <Empty className="h-full border-0">
          <EmptyMedia variant="icon">
            <AlertCircle className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Error loading data</EmptyTitle>
            <EmptyDescription>
              Something went wrong while loading the data. Please try again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

function DataTableEmptyStateMobile() {
  return (
    <TableRow>
      <TableCell className="h-60 text-center">
        <Empty className="h-full border-0">
          <EmptyMedia variant="icon">
            <Inbox className="size-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No data found</EmptyTitle>
            <EmptyDescription>There are no items to display.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

function DataTableLoadingStateMobile() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function DataTableErrorStateMobile() {
  return (
    <TableRow>
      <TableCell className="h-60 text-center">
        <Empty className="h-full border-0">
          <EmptyMedia variant="icon">
            <AlertCircle className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Error loading data</EmptyTitle>
            <EmptyDescription>
              Something went wrong. Please try again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

function DataTableTabFilter({
  tabs,
  value,
  defaultValue,
  onSelect,
  className,
  classNames,
}: DataTableTabFilterProps) {
  const handleSelect = (value: string) => {
    const firstTab = tabs && tabs.length > 0 ? tabs[0] : undefined;
    if (!firstTab) return;
    const tabValue = typeof firstTab === "object" ? firstTab.value : firstTab;

    if (onSelect && tabs) onSelect(value.length > 0 ? value : tabValue);
  };

  return (
    <ToggleGroup
      value={value ? [value] : undefined}
      defaultValue={defaultValue ? [defaultValue] : undefined}
      onValueChange={(val) => handleSelect(val[0] ?? "")}
      variant="outline"
      className={cn(className)}
    >
      {tabs &&
        tabs.map((tab) => {
          const value = typeof tab === "object" ? tab.value : tab;
          const label = typeof tab === "object" ? tab.label : tab;
          return (
            <ToggleGroupItem
              key={value}
              value={value}
              className={cn(
                "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                classNames?.item,
              )}
            >
              {label}
            </ToggleGroupItem>
          );
        })}
    </ToggleGroup>
  );
}

function DataTableSearch({
  inputValue,
  onSearchChange,
  onSearchSubmit,
  showFilter = false,
  onFilterClick,
  children,
  searchButtonLabel,
  className,
  classNames,
  ...props
}: DataTableSearchProps) {
  const value =
    typeof inputValue === "string" ? inputValue : String(inputValue ?? "");

  const handleChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
  };

  const handleEnterSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (onSearchSubmit) {
        onSearchSubmit(value);
      }
    }
  };

  const handleClear = () => {
    if (onSearchChange) onSearchChange("");
    if (onSearchSubmit) onSearchSubmit("");
  };

  const handleSearchClick = () => {
    if (onSearchSubmit) onSearchSubmit(value);
  };

  const hasControls = showFilter || !!searchButtonLabel;

  const searchInput = (
    <InputGroup className={cn("max-w-xs", className)}>
      <InputGroupInput
        className={cn(classNames?.input)}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleEnterSubmit}
        placeholder={props?.placeholder ?? "Search..."}
        {...props}
      />
      <InputGroupAddon align="inline-start">
        <SearchIcon />
      </InputGroupAddon>
      {value.length > 0 && (
        <InputGroupAddon align="inline-end">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={handleClear}
          >
            <XIcon />
          </Button>
        </InputGroupAddon>
      )}
    </InputGroup>
  );

  if (!hasControls) {
    if (!children) return searchInput;

    return (
      <div className="flex flex-col gap-2">
        {searchInput}
        {children}
      </div>
    );
  }

  const controls = (
    <ButtonGroup className={cn(className)}>
      <InputGroup className={cn("max-w-full md:max-w-xs")}>
        <InputGroupInput
          className={cn(classNames?.input)}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleEnterSubmit}
          placeholder={props?.placeholder ?? "Search..."}
          {...props}
        />
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
        {value.length > 0 && (
          <InputGroupAddon align="inline-end">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={handleClear}
            >
              <XIcon />
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>
      {showFilter && (
        <Button
          type="button"
          variant="outline"
          onClick={onFilterClick}
          className={cn(classNames?.filterButton)}
        >
          <Filter />
        </Button>
      )}
      {searchButtonLabel && (
        <Button
          type="button"
          variant="outline"
          onClick={handleSearchClick}
          className={cn(classNames?.searchButton)}
        >
          {searchButtonLabel}
        </Button>
      )}
    </ButtonGroup>
  );

  if (!children) return controls;

  return (
    <div className="flex flex-col gap-2">
      {controls}
      {children}
    </div>
  );
}

function DataTableRowsSelector({
  options,
  value,
  defaultValue,
  onSelect,
  className,
  classNames,
}: DataTableRowsSelectorProps) {
  const defaultFirstValue =
    (defaultValue?.toString() ?? options.length > 0)
      ? options[0].toString()
      : undefined;

  const handleSelect = (value: string) => {
    if (onSelect) onSelect(Number(value));
  };

  return (
    <Field orientation="horizontal" className={cn("w-fit", className)}>
      <FieldLabel
        htmlFor="select-rows-per-page"
        className={cn(classNames?.label)}
      >
        Rows per page
      </FieldLabel>
      <Select
        defaultValue={defaultFirstValue}
        value={value?.toString()}
        onValueChange={(val) => val !== null && handleSelect(val)}
      >
        <SelectTrigger
          id="select-rows-per-page"
          className={cn("w-20", classNames?.label)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option.toString()}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function DataTablePagination({
  totalPages,
  currentPage,
  onNextClick,
  onPrevClick,
  onPageClick,
  className,
  classNames,
}: DataTablePaginationProps) {
  const renderedPageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  )
    .slice(0, totalPages - 1)
    .slice(
      parseRenderedPageNumbersStart(currentPage, totalPages),
      parseRenderedPageNumbersEnd(currentPage),
    );

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrev = () => {
    if (!canPrev) return;
    if (onPrevClick) onPrevClick();
  };

  const handleNext = () => {
    if (!canNext) return;
    if (onNextClick) onNextClick();
  };

  const handlePage = (page: number) => {
    if (page === currentPage) return;
    if (onPageClick) onPageClick(page);
  };

  return (
    <Pagination className={cn("w-fit mx-0", className)}>
      <PaginationContent className={cn(classNames?.content)}>
        <PaginationItem>
          <PaginationPrevious
            className={cn(classNames?.previous, !canPrev && "pointer-events-none opacity-50")}
            text=""
            onClick={handlePrev}
            aria-disabled={!canPrev}
            tabIndex={!canPrev ? -1 : undefined}
          />
        </PaginationItem>
        {renderedPageNumbers.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              className={cn(classNames?.page)}
              isActive={page === currentPage}
              onClick={() => handlePage(page)}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        {totalPages > 3 && (
          <PaginationItem>
            <PaginationEllipsis className={cn(classNames?.ellipse)} />
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationLink
            className={cn(classNames?.page)}
            isActive={totalPages === currentPage}
            onClick={() => handlePage(totalPages)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            className={cn(classNames?.next, !canNext && "pointer-events-none opacity-50")}
            text=""
            onClick={handleNext}
            aria-disabled={!canNext}
            tabIndex={!canNext ? -1 : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export {
  DataTableContent,
  DataTableTabFilter,
  DataTableSearch,
  DataTableRowsSelector,
  DataTablePagination,
};
