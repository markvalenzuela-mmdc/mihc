import { E2eRun, E2eRunHistoryItem } from "../types/e2e-testing.types";

type E2eRunBase = {
  id: string;
  runNumber: number;
  profileId: string;
  status: E2eRun["status"];
  startedByUser: E2eRun["startedBy"];
  startedAt: Date;
  completedAt: Date | null;
};

export function serializeE2eRunHistoryItem(
  run: E2eRunBase,
): E2eRunHistoryItem {
  return {
    id: run.id,
    runNumber: run.runNumber,
    profileId: run.profileId,
    status: run.status,
    startedBy: run.startedByUser,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

export function serializeE2eRun(
  run: E2eRunBase & { runSteps: E2eRun["steps"] },
): E2eRun {
  return {
    ...serializeE2eRunHistoryItem(run),
    steps: run.runSteps,
  };
}
