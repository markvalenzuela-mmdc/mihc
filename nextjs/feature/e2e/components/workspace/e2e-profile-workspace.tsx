"use client";

import { useState, useTransition } from "react";
import { useQueryState, useQueryStates } from "nuqs";
import { Paginated } from "@/lib/drizzle/pagination";
import { requestE2eTest } from "../../actions/request-e2e-test.action";
import { toast } from "sonner";
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
  const [isAutomatedPending, startTransition] = useTransition();

  const [selectedStepCount, setSelectedStepCount] = useState(
    () => data.activeRun?.steps.length ?? 1,
  );

  const effectiveStepCount =
    activeRun?.steps.length ??
    Math.min(selectedStepCount, stepDefinitions.length);

  function onAutomated(stepIds: string[]) {
    startTransition(async () => {
      const result = await requestE2eTest({
        profileId: profile.id,
        stepIds,
      });

      if (result.ok) {
        toast.success("E2E test enqueued", {
          description:
            "The selected E2E steps were sent to the test runner.",
        });
      } else {
        toast.error("Could not start E2E test", {
          description:
            result.error === "forbidden"
              ? "You must be signed in to start an E2E test."
              : result.error,
        });
      }
    });
  }

  function onManual() {}

  function onSelectRun(run: E2eRunHistoryItem) {
    setSelectedRunId(run.id);
  }

  function onSelectRunPage(page: number) {
    setRunPagination({ [runPageParamKey]: page });
  }

  const runDetails = selectedRun;
  const selectionLocked = Boolean(activeRun);
  const canRun = profile.profileForm.state === "active";
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
          isAutomatedPending={isAutomatedPending}
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
