"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import {
  currentE2eOperator,
  E2eProfileWorkspaceData,
  E2eRun,
  E2eSelectedRun,
  E2eRunStep,
  E2eStepDefinition,
} from "../../types/e2e-testing.types";
import { runParamKey } from "../e2e-testing.query-state";
import E2eRunDetails from "./e2e-profile-workspace-runs";
import ProfileWorkspaceInfo from "./e2e-profile-workspace-info";

export default function E2eProfileWorkspace({
  data,
  selectedRun,
}: {
  data: E2eProfileWorkspaceData;
  selectedRun: E2eSelectedRun | null;
}) {
  const { profile, stepDefinitions, runs, activeRun } = data;
  const [, setSelectedRunId] = useQueryState(runParamKey, {
    history: "push",
  });

  const [selectedStepCount, setSelectedStepCount] = useState(
    () => data.activeRun?.steps.length ?? stepDefinitions.length,
  );

  const effectiveStepCount =
    activeRun?.steps.length ??
    Math.min(selectedStepCount, stepDefinitions.length);

  function runAutomated() {}

  function runNextManualStep() {}

  function openRun(run: E2eRun) {
    setSelectedRunId(run.id);
  }

  const runDetails = selectedRun;

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
    <ProfileWorkspaceInfo
      profile={profile}
      steps={stepDefinitions}
      runs={runs}
      activeRun={activeRun}
      selectedStepCount={effectiveStepCount}
      selectionLocked={Boolean(activeRun)}
      onSelectedStepCountChange={setSelectedStepCount}
      onAutomated={runAutomated}
      onManual={runNextManualStep}
      onSelectRun={openRun}
    />
  );
}
