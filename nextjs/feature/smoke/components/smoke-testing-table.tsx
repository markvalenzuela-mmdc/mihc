"use client";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  formatDurationSeconds,
  formatTimestamp,
  SmokeRunView,
} from "@/lib/mock-testing-data";
import { Button } from "@base-ui/react";
import { Table } from "drizzle-orm";
import { PlayIcon, ChevronRightIcon, TestTube2Icon } from "lucide-react";
import { SmokeTestApp, SmokeTestRun } from "../types/smoke-test-apps.types";
import {
  appParamKey,
  appSearchParams,
} from "../query/smoke-testing.query-state";
import { useQueryStates } from "nuqs";
import { DataTable } from "@/components/blocks/DataTable/data-table-context";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useDataTableLimit,
  useDataTablePagination,
  useDataTableSort,
} from "@/components/blocks/DataTable/use-data-table";
import { useTransition } from "react";
import { Paginated } from "@/lib/drizzle/pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const columnHelper = createColumnHelper<SmokeTestRun>();

const columns = [
  columnHelper.accessor("runNumber", {
    header: "Run",
    size: 80,
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">#{getValue()}</span>
    ),
    meta: {
      mobile: { align: "left" },
      sort: { key: "runNumber" },
    },
  }),

  columnHelper.accessor("status", {
    header: "Status",
    size: 140,
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    meta: {
      mobile: { align: "left" },
      sort: { key: "status" },
    },
  }),

  columnHelper.accessor("trigger", {
    header: "Trigger",
    size: 120,
    cell: ({ getValue }) => <span className="capitalize">{getValue()}</span>,
    meta: {
      mobile: { align: "right", hidden: true },
      sort: { key: "trigger" },
    },
  }),

  columnHelper.display({
    id: "tests",
    header: "Tests",
    size: 180,
    cell: ({ row }) => (
      <span className="tabular-nums">
        <span className="text-emerald-300">{row.original.passed} passed</span>
        <span className="text-muted-foreground"> · </span>
        <span
          className={
            row.original.failed ? "text-red-300" : "text-muted-foreground"
          }
        >
          {row.original.failed} failed
        </span>
      </span>
    ),
    meta: {
      mobile: { align: "left" },
      sort: { enabled: false },
    },
  }),

  columnHelper.accessor("durationSeconds", {
    header: "Duration",
    size: 120,
    cell: ({ getValue }) => formatDurationSeconds(getValue()),
    meta: {
      mobile: { align: "right" },
      sort: { key: "durationSeconds" },
    },
  }),

  columnHelper.accessor("checkedAt", {
    header: "Checked",
    size: 180,
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatTimestamp(getValue().toISOString())}
      </span>
    ),
    meta: {
      mobile: { align: "right" },
      sort: { key: "checkedAt" },
    },
  }),

  columnHelper.accessor("startedBy", {
    header: "Started by",
    size: 180,
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap">
        {getValue() ?? "System schedule"}
      </span>
    ),
    meta: {
      mobile: { align: "right", hidden: true },
      sort: { key: "startedBy" },
    },
  }),

  columnHelper.display({
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    size: 56,
    cell: () => (
      <ChevronRightIcon
        className="size-4 text-muted-foreground"
        aria-hidden="true"
      />
    ),
    meta: {
      mobile: { align: "right", hidden: true },
      sort: { enabled: false },
    },
  }),
];

export function SmokeTestingTable({
  smokeRuns,
}: {
  smokeRuns: Paginated<SmokeTestRun>;
}) {
  const [params, _] = useQueryStates(appSearchParams);
  const [, startTransition] = useTransition();

  const { meta, data: runs } = smokeRuns;

  const selectedApp = params[appParamKey];
  const tableData = runs || [];

  const limit = useDataTableLimit(
    { rowsPerPageOptions: [5, 10, 20] },
    startTransition,
  );

  const pagination = useDataTablePagination(
    { totalPages: meta.pageCount },
    startTransition,
  );

  return (
    <section className="space-y-3" aria-labelledby="run-history-title">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 id="run-history-title" className="text-lg font-medium">
            {selectedApp} run history
          </h2>
          <p className="text-sm text-muted-foreground">
            Select a run to inspect its test-level results.
          </p>
        </div>
      </div>

      <DataTable.Provider
        state={{
          table: {
            data: tableData,
            columns,
          },
          limit: limit.state,
          pagination: pagination.state,
        }}
        actions={{
          limit: limit.actions,
          pagination: pagination.actions,
        }}
        meta={{ limit: limit.meta }}
      >
        <DataTable.Table responsive />
        <div className="flex justify-between">
          <DataTable.RowsSelector />
          <DataTable.Pagination />
        </div>
      </DataTable.Provider>
    </section>
  );
}
