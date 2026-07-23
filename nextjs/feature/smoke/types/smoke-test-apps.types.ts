export const SmokeTestRunStatus = [
  "queued",
  "running",
  "success",
  "degraded",
  "failure",
] as const;

export type SmokeTestRunStatus = (typeof SmokeTestRunStatus)[number];

export type SmokeTestRunTrigger = "manual" | "scheduled";

export type SmokeTestRunResultsStatus =
  | "running"
  | "success"
  | "failure"
  | "skipped";

export type SmokeTestApp = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  smokeRuns: SmokeTestRun[];
};

export type SmokeTestRun = {
  id: string;
  status: SmokeTestRunStatus;
  createdAt: Date;
  runNumber: number;
  appId: string;
  trigger: SmokeTestRunTrigger;
  total: number;
  passed: number;
  failed: number;
  durationSeconds: number | null;
  startedBy: string | null;
  checkedAt: Date;
  completedAt: Date | null;
};

export type SmokeTestRunResults = {
  id: string;
  createdAt: Date;
  status: SmokeTestRunResultsStatus;
  runId: string;
  testName: string;
  testFile: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  errorStack: string | null;
  startedAt: Date;
  completedAt: Date | null;
};
