export type SmokeTestRunStatus = "success" | "degraded" | "failure";

export type SmokeTestRunTrigger = "manual" | "scheduled";

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
};
