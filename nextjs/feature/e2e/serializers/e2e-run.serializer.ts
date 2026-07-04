import { E2eRun } from "../types/e2e-testing.types";

export function serializeE2eRun(run: {
  id: string;
  runNumber: number;
  profileId: string;
  status: E2eRun["status"];
  startedByUser: E2eRun["startedBy"];
  startedAt: Date;
  completedAt: Date | null;
  runSteps: E2eRun["steps"];
}): E2eRun {
  return {
    id: run.id,
    runNumber: run.runNumber,
    profileId: run.profileId,
    status: run.status,
    startedBy: run.startedByUser,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    steps: run.runSteps,
  };
}
