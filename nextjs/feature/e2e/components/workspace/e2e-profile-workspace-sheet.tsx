"use client";

import { useQueryState, useQueryStates } from "nuqs";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  useQueryE2eProfileWorkspace,
  useQueryE2eRunDetails,
} from "../../query/e2e-profile-workspace.query";
import {
  profileParamKey,
  profileSearchParams,
  runParamKey,
  runSearchParams,
} from "../e2e-testing.query-state";
import E2eProfileWorkspace from "./e2e-profile-workspace";
import E2eProfileWorkspaceSheetSkeleton from "./e2e-profile-workspace-sheet-skeleton";
import { useTransition } from "react";

export default function E2eProfileWorkspaceSheet() {
  const [, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(
    {
      ...profileSearchParams,
      ...runSearchParams,
    },
    {
      shallow: false,
      history: "push",
      startTransition,
    },
  );
  const profileId = params[profileParamKey] ?? "";
  const runId = params[runParamKey] ?? "";
  
  const workspaceQuery = useQueryE2eProfileWorkspace(profileId);
  const runQuery = useQueryE2eRunDetails(profileId, runId);

  return (
    <Sheet
      open={profileId.length > 0}
      onOpenChange={(open) => {
        if (!open) {
          setParams({ [profileParamKey]: null, [runParamKey]: null });
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-3xl">
        <E2eProfileWorkspaceSheetContent
          runId={runId}
          workspaceQuery={workspaceQuery}
          runQuery={runQuery}
        />
      </SheetContent>
    </Sheet>
  );
}

function E2eProfileWorkspaceSheetContent({
  runId,
  workspaceQuery,
  runQuery,
}: {
  runId: string;
  workspaceQuery: ReturnType<typeof useQueryE2eProfileWorkspace>;
  runQuery: ReturnType<typeof useQueryE2eRunDetails>;
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
    return (
      <E2eProfileWorkspace
        key={workspaceQuery.data.profile.id}
        data={workspaceQuery.data}
        selectedRun={runQuery.data ?? null}
      />
    );
  }

  return null;
}
