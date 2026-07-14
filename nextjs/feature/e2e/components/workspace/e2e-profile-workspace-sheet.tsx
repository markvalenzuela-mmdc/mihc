"use client";

import { useQueryStates } from "nuqs";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  useQueryE2eProfileRuns,
  useQueryE2eProfileWorkspace,
  useQueryE2eRunDetails,
} from "../../query/e2e-profile-workspace.query";
import {
  profileParamKey,
  profileSearchParams,
  runLimitParamKey,
  runLimitSearchParams,
  runPageParamKey,
  runPaginationSearchParams,
  runParamKey,
  runSearchParams,
} from "../e2e-testing.query-state";
import { Paginated } from "@/lib/drizzle/pagination";
import {
  E2eProfileWorkspaceData,
  E2eRunHistoryItem,
} from "../../types/e2e-testing.types";
import E2eProfileWorkspace from "./e2e-profile-workspace";
import E2eProfileWorkspaceSheetSkeleton from "./e2e-profile-workspace-sheet-skeleton";
import { useTransition } from "react";

export default function E2eProfileWorkspaceSheet() {
  const [, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(
    {
      ...profileSearchParams,
      ...runSearchParams,
      ...runPaginationSearchParams,
      ...runLimitSearchParams,
    },
    {
      shallow: true,
      history: "push",
      startTransition,
    },
  );
  const profileId = params[profileParamKey] ?? "";
  const runId = params[runParamKey] ?? "";
  const runPage = params[runPageParamKey] ?? 1;
  const runLimit = Math.max(params[runLimitParamKey] ?? 5, 5);

  const workspaceQuery = useQueryE2eProfileWorkspace(profileId);
  const runsQuery = useQueryE2eProfileRuns({
    profileId,
    page: runPage,
    limit: runLimit,
  });
  const runQuery = useQueryE2eRunDetails(profileId, runId);
  const runs = runsQuery.data ?? null;

  return (
    <Sheet
      open={profileId.length > 0}
      onOpenChange={(open) => {
        if (!open) {
          setParams({
            [profileParamKey]: null,
            [runParamKey]: null,
            [runPageParamKey]: null,
          });
        }
      }}
    >
      <SheetContent className="w-full data-[side=right]:sm:max-w-3xl">
        <E2eProfileWorkspaceSheetContent
          runId={runId}
          workspaceQuery={workspaceQuery}
          runQuery={runQuery}
        >
          {(workspaceQueryData) => (
            <E2eProfileWorkspace
              key={workspaceQueryData.profile.id}
              data={workspaceQueryData}
              runs={runs}
              isRunHistoryLoading={runsQuery.isLoading}
              isRunHistoryFetching={runsQuery.isFetching}
              isRunHistoryError={runsQuery.isError}
              selectedRun={runQuery.data ?? null}
            />
          )}
        </E2eProfileWorkspaceSheetContent>
      </SheetContent>
    </Sheet>
  );
}

function E2eProfileWorkspaceSheetContent({
  runId,
  workspaceQuery,
  runQuery,
  children,
}: {
  runId: string;
  workspaceQuery: ReturnType<typeof useQueryE2eProfileWorkspace>;
  runQuery: ReturnType<typeof useQueryE2eRunDetails>;
  children: (workspaceQueryData: E2eProfileWorkspaceData) => React.ReactNode;
}) {
  if (workspaceQuery.isLoading || (runId && runQuery.isLoading)) {
    return <E2eProfileWorkspaceSheetSkeleton />;
  }

  if (workspaceQuery.isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Could not load e2e profile workspace.
      </div>
    );
  }

  if (runId && runQuery.isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Could not load e2e run details.
      </div>
    );
  }

  if (workspaceQuery.data) {
    return children(workspaceQuery.data);
  }

  return null;
}
