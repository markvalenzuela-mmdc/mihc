"use client";
import { StatusBadge } from "@/components/status-badge";
import {
  formatDurationSeconds,
  formatTimestamp,
} from "@/lib/mock-testing-data";
import { PlayIcon, ChevronRightIcon } from "lucide-react";
import {
  SmokeTestRun,
  SmokeTestRunStatus,
} from "../types/smoke-test-apps.types";
import { DataTable } from "@/components/blocks/DataTable/data-table-context";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useDataTableLimit,
  useDataTablePagination,
  useDataTableTabFilter,
} from "@/components/blocks/DataTable/use-data-table";
import { useCallback, useMemo, useTransition } from "react";
import { Paginated } from "@/lib/drizzle/pagination";
import { Button } from "@/components/ui/button";
import { useQueryState } from "nuqs";
import { runParamKey } from "./smoke-testing.query-state";
import { requestSmokeTest } from "../actions/request-smoke-test.action";
import { toast } from "sonner";

const columnHelper = createColumnHelper<SmokeTestRun>();

function createColumns(openRun: (runId: string) => void) {
  return [
    columnHelper.accessor("runNumber", {
      header: "Run",
      size: 80,
      cell: ({ row, getValue }) => (
        <>
          <button
            type="button"
            aria-label={`Open run ${row.original.runNumber}`}
            className="absolute inset-0 z-10 block text-left cursor-pointer"
            onClick={() => openRun(row.original.id)}
          />

          <span className="font-medium tabular-nums">#{getValue()}</span>
        </>
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
}

export function SmokeTestingTable({
  appName,
  smokeRuns,
}: {
  appName: string | null;
  smokeRuns: Paginated<SmokeTestRun>;
}) {
  const [, startTransition] = useTransition();
  const [, setSelectedRunId] = useQueryState(runParamKey);

  const { meta, data: runs } = smokeRuns;

  const tableData = runs || [];

  const limit = useDataTableLimit(
    { rowsPerPageOptions: [5, 10, 20] },
    startTransition,
  );

  const pagination = useDataTablePagination(
    { totalPages: meta.pageCount },
    startTransition,
  );

  const tabs = useDataTableTabFilter(
    {
      tabs: [
        ...SmokeTestRunStatus.map((status) => ({
          label: status[0].toUpperCase() + status.slice(1),
          value: status,
        })),
      ],
    },
    startTransition,
  );

  const openRun = useCallback(
    (runId: string) => {
      setSelectedRunId(runId);
    },
    [setSelectedRunId],
  );

  const columns = useMemo(() => createColumns(openRun), [openRun]);

  function runManualSmokeTest() {
    startTransition(async () => {
      const result = await requestSmokeTest();
      if (result.ok) {
        toast.success("Smoke test enqueued", {
          description:
            "The website smoke run was requested. Results are recorded by the test runner.",
        });
      } else {
        toast.error("Could not start smoke test", {
          description: result.error,
        });
      }
    });
  }

  if (!appName) {
    return null;
  }

  return (
    <section className="space-y-3" aria-labelledby="run-history-title">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 id="run-history-title" className="text-lg font-medium">
            {appName} run history
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
          tabFilter: tabs.state,
          limit: limit.state,
          pagination: pagination.state,
        }}
        actions={{
          limit: limit.actions,
          pagination: pagination.actions,
          tabFilter: tabs.actions,
        }}
        meta={{ limit: limit.meta, tabFilter: tabs.meta }}
      >
        <div className="flex items-center justify-between">
          <DataTable.TabFilter />
          <Button onClick={runManualSmokeTest}>
            <PlayIcon className="size-4" />
            Run smoke test
          </Button>
        </div>

        <DataTable.Table
          responsive
          classNames={{
            row: "relative cursor-pointer",
          }}
        />

        <div className="flex justify-between">
          <DataTable.RowsSelector />
          <DataTable.Pagination />
        </div>
      </DataTable.Provider>
    </section>
  );
}
