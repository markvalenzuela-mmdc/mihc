"use client";

import { useMemo, useState } from "react";
import {
  currentE2eOperator,
  E2eProfileWorkspaceData,
  E2eRun,
  E2eRunStep,
  E2eStepDefinition,
} from "../../types/e2e-testing.types";
import E2eRunDetails from "./e2e-profile-workspace-runs";
import ProfileWorkspaceInfo from "./e2e-profile-workspace-info";

export default function E2eProfileWorkspace({
  data,
}: {
  data: E2eProfileWorkspaceData;
}) {
  const { profile, stepDefinitions } = data;
  const [runs, setRuns] = useState(data.runs);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const orderedSteps = useMemo(
    () => [...stepDefinitions].sort((a, b) => a.sortOrder - b.sortOrder),
    [stepDefinitions],
  );

  const [selectedStepCount, setSelectedStepCount] = useState(() => {
    const activeRun = runs.find((run) => run.status === "running");
    return activeRun?.steps.length ?? orderedSteps.length;
  });

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;
  const activeRun = runs.find((run) => run.status === "running") ?? null;
  const effectiveStepCount =
    activeRun?.steps.length ?? Math.min(selectedStepCount, orderedSteps.length);
  const selectedSteps = orderedSteps.slice(0, effectiveStepCount);

  function createQueuedStep(step: E2eStepDefinition): E2eRunStep {
    return {
      id: crypto.randomUUID(),
      stepId: step.id,
      e2eStep: step,
      status: "queued",
      durationSeconds: null,
      note: "Waiting for the preceding step.",
      tests: [],
    };
  }

  function createCompletedStep(
    step: E2eStepDefinition,
    index: number,
    mode: "automated" | "manual" = "automated",
  ): E2eRunStep {
    return {
      id: crypto.randomUUID(),
      stepId: step.id,
      e2eStep: step,
      status: "success",
      durationSeconds: 38 + index * 9,
      note: `${step.label} completed through ${mode} local execution.`,
      tests: [
        {
          id: crypto.randomUUID(),
          testName: `${step.label} assertions pass`,
          status: "success",
          durationMs: 2200 + index * 380,
          errorMessage: null,
        },
      ],
    };
  }

  function getNextE2eRunNumber(profileId: string, runs: E2eRun[]) {
    return (
      Math.max(
        0,
        ...runs
          .filter((run) => run.profileId === profileId)
          .map((run) => run.runNumber),
      ) + 1
    );
  }

  function runAutomated() {
    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + 214_000);
    const run: E2eRun = {
      id: crypto.randomUUID(),
      runNumber: getNextE2eRunNumber(profile.id, runs),
      profileId: profile.id,
      status: "completed",
      startedBy: currentE2eOperator,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      steps: selectedSteps.map((step, index) =>
        createCompletedStep(step, index),
      ),
    };

    setRuns((current) => [run, ...current]);
    setSelectedRunId(run.id);
  }

  function runNextManualStep() {
    const activeRun = runs.find((run) => run.status === "running");

    if (!activeRun) {
      const newRun: E2eRun = {
        id: crypto.randomUUID(),
        runNumber: getNextE2eRunNumber(profile.id, runs),
        profileId: profile.id,
        status: selectedSteps.length <= 1 ? "completed" : "running",
        startedBy: currentE2eOperator,
        startedAt: new Date().toISOString(),
        completedAt:
          selectedSteps.length <= 1 ? new Date().toISOString() : null,
        steps: selectedSteps.map((step, index) =>
          index === 0
            ? createCompletedStep(step, index, "manual")
            : createQueuedStep(step),
        ),
      };

      setRuns((current) => [newRun, ...current]);
      setSelectedRunId(newRun.id);
      return;
    }

    const nextQueuedIndex = activeRun.steps.findIndex(
      (step) => step.status === "queued",
    );
    if (nextQueuedIndex < 0) return;

    const isLastStep = nextQueuedIndex === activeRun.steps.length - 1;
    const updatedRun: E2eRun = {
      ...activeRun,
      status: isLastStep ? "completed" : "running",
      completedAt: isLastStep ? new Date().toISOString() : null,
      steps: activeRun.steps.map((step, index) =>
        index === nextQueuedIndex
          ? createCompletedStep(
              orderedSteps.find((definition) => definition.id === step.stepId)!,
              index,
              "manual",
            )
          : step,
      ),
    };

    setRuns((current) =>
      current.map((run) => (run.id === updatedRun.id ? updatedRun : run)),
    );
    setSelectedRunId(updatedRun.id);
  }

  if (selectedRun) {
    return (
      <E2eRunDetails
        run={selectedRun}
        stepDefinitions={orderedSteps}
        onBack={() => setSelectedRunId(null)}
      />
    );
  }

  return (
    <ProfileWorkspaceInfo
      profile={profile}
      steps={orderedSteps}
      runs={runs}
      selectedStepCount={effectiveStepCount}
      selectionLocked={Boolean(activeRun)}
      onSelectedStepCountChange={setSelectedStepCount}
      onAutomated={runAutomated}
      onManual={runNextManualStep}
      onSelectRun={setSelectedRunId}
    />
  );
}
