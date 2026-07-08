"use client";

import { useMemo, useTransition } from "react";
import { ChevronRightIcon } from "lucide-react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useQueryStates } from "nuqs";

import { DataTable } from "@/components/blocks/DataTable/data-table-context";
import {
  useDataTableLimit,
  useDataTablePagination,
} from "@/components/blocks/DataTable/use-data-table";
import { StatusBadge } from "@/components/status-badge";
import { Paginated } from "@/lib/drizzle/pagination";
import { E2eProfileSummary } from "../../types/e2e-testing.types";
import {
  profileParamKey,
  profileSearchParams,
  runPageParamKey,
  runPaginationSearchParams,
  runParamKey,
  runSearchParams,
} from "../e2e-testing.query-state";

const columnHelper = createColumnHelper<E2eProfileSummary>();

function createColumns(openProfile: (profileId: string) => void) {
  return [
    columnHelper.accessor("name", {
      header: "Profile",
      size: 260,
      cell: ({ row, getValue }) => (
        <>
          <button
            type="button"
            aria-label={`Open profile ${getValue()}`}
            className="absolute inset-0 z-10 block text-left"
            onClick={() => openProfile(row.original.id)}
          />
          <div>
            <p className="font-medium">{getValue()}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.email}
            </p>
          </div>
        </>
      ),
      meta: {
        mobile: { align: "left" },
        sort: { enabled: false },
      },
    }),

    columnHelper.accessor("program", {
      header: "Program",
      size: 180,
      meta: {
        mobile: { align: "right" },
        sort: { enabled: false },
      },
    }),

    columnHelper.accessor("cohort", {
      header: "Cohort",
      size: 160,
      meta: {
        mobile: { align: "right", hidden: true },
        sort: { enabled: false },
      },
    }),

    columnHelper.accessor("status", {
      header: "Step",
      size: 180,
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      meta: {
        mobile: { align: "left" },
        sort: { enabled: false },
      },
    }),

    columnHelper.display({
      id: "latestRun",
      header: "Latest run",
      size: 180,
      cell: ({ row }) =>
        row.original.latestRun ? (
          <div className="flex items-center gap-2">
            <span className="font-medium tabular-nums">
              #{row.original.latestRun.runNumber}
            </span>
            <StatusBadge status={row.original.latestRun.status} />
          </div>
        ) : (
          <span className="text-muted-foreground">No runs</span>
        ),
      meta: {
        mobile: { align: "right" },
        sort: { enabled: false },
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

export function E2eTestingProfilesTable({
  profiles,
}: {
  profiles: Paginated<E2eProfileSummary>;
}) {
  const [, startTransition] = useTransition();
  const [, setSelectedProfile] = useQueryStates(
    {
      ...profileSearchParams,
      ...runSearchParams,
      ...runPaginationSearchParams,
    },
    {
      shallow: false,
      history: "push",
      startTransition,
    },
  );

  const limit = useDataTableLimit(
    { rowsPerPageOptions: [5, 10, 20] },
    startTransition,
  );

  const pagination = useDataTablePagination(
    { totalPages: profiles.meta.pageCount },
    startTransition,
  );

  const columns = useMemo(
    () =>
      createColumns((profileId) => {
        setSelectedProfile({
          [profileParamKey]: profileId,
          [runParamKey]: null,
          [runPageParamKey]: 1,
        });
      }),
    [setSelectedProfile],
  ) as ColumnDef<E2eProfileSummary>[];

  return (
    <section className="space-y-3" aria-labelledby="profiles-title">
      <div>
        <h2 id="profiles-title" className="text-lg font-medium">
          Test profiles
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a profile to review enrollment data and run history.
        </p>
      </div>

      <DataTable.Provider
        state={{
          table: {
            data: profiles.data,
            columns
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
