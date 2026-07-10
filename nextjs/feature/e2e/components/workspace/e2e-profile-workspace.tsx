"use client";

import { useState } from "react";
import { useQueryState, useQueryStates } from "nuqs";
import { Paginated } from "@/lib/drizzle/pagination";
import {
  E2eProfileWorkspaceData,
  E2eRunHistoryItem,
  E2eSelectedRun,
} from "../../types/e2e-testing.types";
import {
  runPageParamKey,
  runPaginationSearchParams,
  runParamKey,
} from "../e2e-testing.query-state";
import E2eRunDetails from "./e2e-profile-workspace-runs";
import {
  ProfileWorkspaceControls,
  ProfileWorkspaceEnrollmentData,
  ProfileWorkspaceHeader,
  ProfileWorkspaceRunHistory,
} from "./e2e-profile-workspace-info";
import { Separator } from "@/components/ui/separator";

export default function E2eProfileWorkspace({
  data,
  runs,
  isRunHistoryLoading,
  isRunHistoryFetching,
  isRunHistoryError,
  selectedRun,
}: {
  data: E2eProfileWorkspaceData;
  runs: Paginated<E2eRunHistoryItem> | null;
  isRunHistoryLoading: boolean;
  isRunHistoryFetching: boolean;
  isRunHistoryError: boolean;
  selectedRun: E2eSelectedRun | null;
}) {
  const { profile, stepDefinitions, activeRun } = data;
  const [, setSelectedRunId] = useQueryState(runParamKey, {
    history: "push",
  });
  const [, setRunPagination] = useQueryStates(runPaginationSearchParams, {
    history: "push",
    shallow: true,
  });

  const [selectedStepCount, setSelectedStepCount] = useState(
    () => data.activeRun?.steps.length ?? stepDefinitions.length,
  );

  const effectiveStepCount =
    activeRun?.steps.length ??
    Math.min(selectedStepCount, stepDefinitions.length);

  function onAutomated() {}

  function onManual() {}

  function onSelectRun(run: E2eRunHistoryItem) {
    setSelectedRunId(run.id);
  }

  function onSelectRunPage(page: number) {
    setRunPagination({ [runPageParamKey]: page });
  }

  const runDetails = selectedRun;
  const selectionLocked = Boolean(activeRun);
  const canRun = profile.profileForms.some((form) => form.state === "active");
  const runPagination = runs?.meta ?? null;

  if (runDetails) {
    return (
      <E2eRunDetails
        run={runDetails}
        onBack={() => {
          setSelectedRunId(null);
        }}
      />
    );
  }

  return (
    <>
      <ProfileWorkspaceHeader profile={profile} />

      <div className="space-y-7 px-4 pb-6">
        <ProfileWorkspaceControls
          steps={stepDefinitions}
          activeRun={activeRun}
          selectedStepCount={effectiveStepCount}
          selectionLocked={selectionLocked}
          canRun={canRun}
          onSelectedStepCountChange={setSelectedStepCount}
          onAutomated={onAutomated}
          onManual={onManual}
        />

        <Separator />

        <ProfileWorkspaceRunHistory
          runs={runs?.data ?? []}
          runPagination={runPagination}
          isRunHistoryLoading={isRunHistoryLoading}
          isRunHistoryFetching={isRunHistoryFetching}
          isRunHistoryError={isRunHistoryError}
          onSelectRun={onSelectRun}
          onSelectRunPage={onSelectRunPage}
        />

        <Separator />

        <ProfileWorkspaceEnrollmentData profile={profile} />
      </div>
    </>
  );
}
