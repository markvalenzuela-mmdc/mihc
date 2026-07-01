import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Pagination,
} from "@/components/ui/pagination";

interface DataTableRowSkeletonProps {
  columnCount?: number;
  cellHeight?: string;
  className?: string;
}

function DataTableRowSkeleton({
  columnCount = 3,
  cellHeight = "h-auto",
  className,
}: DataTableRowSkeletonProps) {
  return (
    <TableRow className={cn(className, cellHeight)}>
      <TableCell colSpan={columnCount} className="p-4">
        <div className="flex items-center gap-4">
          {Array.from({ length: columnCount }).map((_, j) => (
            <Skeleton key={j} className={cn("w-full h-4")} />
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface DataTableRowCardSkeletonProps {
  cellHeight?: string;
  className?: string;
}

function DataTableRowCardSkeleton({
  cellHeight = "h-4",
  className,
}: DataTableRowCardSkeletonProps) {
  return (
    <TableRow className={cn(className)}>
      <TableCell className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className={cn("w-full", cellHeight)} />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface DataTableTabFilterSkeletonProps {
  variant?: "default" | "skeleton";
  items?: { label: string; value: string }[];
  skeletonCount?: number;
  className?: string;
}

function DataTableTabFilterSkeleton({
  variant = "default",
  items = [],
  skeletonCount = 3,
  className,
}: DataTableTabFilterSkeletonProps) {
  if (variant === "default" && items.length > 0) {
    return (
      <ToggleGroup
        variant="outline"
        disabled
        className={cn("justify-start", className)}
      >
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  return (
    <div className={cn("flex gap-1", className)}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-md" />
      ))}
    </div>
  );
}

interface DataTableSearchSkeletonProps {
  variant?: "default" | "skeleton";
  className?: string;
}

function DataTableSearchSkeleton({
  variant = "default",
  className,
}: DataTableSearchSkeletonProps) {
  if (variant === "default") {
    return (
      <InputGroup className={cn("max-w-xs", className)}>
        <InputGroupInput disabled placeholder="Search..." />
        <InputGroupAddon align="inline-start">
          <SearchIcon className="text-muted-foreground opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    );
  }

  return <Skeleton className={cn("h-10 w-full max-w-xs", className)} />;
}

interface DataTableRowsSelectorSkeletonProps {
  variant?: "default" | "skeleton";
  className?: string;
}

function DataTableRowsSelectorSkeleton({
  variant = "default",
  className,
}: DataTableRowsSelectorSkeletonProps) {
  if (variant === "default") {
    return (
      <Field orientation="horizontal" className={cn("w-fit gap-2", className)}>
        <FieldLabel className="text-muted-foreground whitespace-nowrap">
          {"Rows per page"}
        </FieldLabel>
        <Skeleton className="h-9 w-16" />
      </Field>
    );
  }

  return <Skeleton className={cn("h-10 w-32", className)} />;
}

interface DataTablePaginationSkeletonProps {
  variant?: "default" | "skeleton";
  pageCount?: number;
  className?: string;
}

function DataTablePaginationSkeleton({
  variant = "default",
  pageCount = 3,
  className,
}: DataTablePaginationSkeletonProps) {
  if (variant === "default") {
    return (
      <Pagination className={cn("w-fit mx-0", className)}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text=""
              className="pointer-events-none opacity-50 aria-disabled:opacity-50"
              aria-disabled
              tabIndex={-1}
            />
          </PaginationItem>
          {Array.from({ length: pageCount }).map((_, i) => (
            <PaginationItem key={i}>
              <Skeleton className="h-9 w-9" />
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              text=""
              className="pointer-events-none opacity-50 aria-disabled:opacity-50"
              aria-disabled
              tabIndex={-1}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  return <Skeleton className={cn("h-10 w-64", className)} />;
}

export const DataTableSkeleton = {
  Row: DataTableRowSkeleton,
  Card: DataTableRowCardSkeleton,
  TabFilter: DataTableTabFilterSkeleton,
  Search: DataTableSearchSkeleton,
  RowsSelector: DataTableRowsSelectorSkeleton,
  Pagination: DataTablePaginationSkeleton,
};
