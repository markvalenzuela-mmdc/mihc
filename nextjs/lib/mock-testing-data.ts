export type SmokeStatus = "operational" | "degraded" | "down";
export type RunResult = "success" | "failure";
export type RunTrigger = "scheduled" | "manual";
export type E2eStepStatus = "queued" | "running" | "success" | "failure";

export type SmokeApp = {
  id: string;
  name: string;
  description: string;
  status: SmokeStatus;
  uptime: string;
  lastChecked: string;
};

export type SmokeRun = {
  id: string;
  appId: string;
  result: RunResult;
  trigger: RunTrigger;
  duration: string;
  checkedAt: string;
  detail: string;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  program: string;
  cohort: string;
  status: "ready" | "needs review";
  lastRun: string;
};

export type Scenario = {
  id: string;
  label: string;
  description: string;
};

export type E2eRunStep = {
  scenarioId: string;
  status: E2eStepStatus;
  duration: string;
  note: string;
};

export const smokeApps: SmokeApp[] = [
  {
    id: "website",
    name: "Website",
    description: "Public marketing and admissions website",
    status: "operational",
    uptime: "99.98%",
    lastChecked: "2 min ago",
  },
  {
    id: "enrollmate",
    name: "Enrollmate",
    description: "Student enrollment workflow",
    status: "operational",
    uptime: "99.91%",
    lastChecked: "5 min ago",
  },
  {
    id: "enrollmate-clp",
    name: "Enrollmate CLP",
    description: "CLP enrollment support surface",
    status: "degraded",
    uptime: "98.74%",
    lastChecked: "8 min ago",
  },
  {
    id: "n8n",
    name: "Self-hosted n8n",
    description: "Automation workflow instance",
    status: "operational",
    uptime: "99.43%",
    lastChecked: "1 min ago",
  },
];

export const smokeRuns: SmokeRun[] = [
  { id: "run-001", appId: "website", result: "success", trigger: "scheduled", duration: "18s", checkedAt: "Today 14:10", detail: "Homepage, lead form, and core assets responded." },
  { id: "run-002", appId: "website", result: "success", trigger: "manual", duration: "21s", checkedAt: "Today 12:42", detail: "Manual verification completed." },
  { id: "run-003", appId: "enrollmate", result: "success", trigger: "scheduled", duration: "32s", checkedAt: "Today 14:05", detail: "Login and enrollment summary loaded." },
  { id: "run-004", appId: "enrollmate", result: "failure", trigger: "scheduled", duration: "45s", checkedAt: "Today 10:05", detail: "Payment status endpoint timed out." },
  { id: "run-005", appId: "enrollmate-clp", result: "failure", trigger: "scheduled", duration: "39s", checkedAt: "Today 13:58", detail: "CLP dashboard returned a 500 response." },
  { id: "run-006", appId: "enrollmate-clp", result: "success", trigger: "manual", duration: "34s", checkedAt: "Yesterday 18:22", detail: "Retry passed after deployment." },
  { id: "run-007", appId: "n8n", result: "success", trigger: "scheduled", duration: "16s", checkedAt: "Today 14:11", detail: "Webhook health and queue probe responded." },
  { id: "run-008", appId: "n8n", result: "failure", trigger: "scheduled", duration: "27s", checkedAt: "Yesterday 22:11", detail: "Worker heartbeat was stale." },
];

export const profiles: Profile[] = [
  { id: "profile-001", name: "Ari Santos", email: "ari.santos@example.edu", program: "BS IT", cohort: "2026-A", status: "ready", lastRun: "Today 11:32" },
  { id: "profile-002", name: "Mika Reyes", email: "mika.reyes@example.edu", program: "BSBA", cohort: "2026-A", status: "ready", lastRun: "Yesterday 16:12" },
  { id: "profile-003", name: "Noel Cruz", email: "noel.cruz@example.edu", program: "BS CS", cohort: "2025-B", status: "needs review", lastRun: "Jun 24, 09:41" },
  { id: "profile-004", name: "Sam Lim", email: "sam.lim@example.edu", program: "BSEd", cohort: "2025-B", status: "ready", lastRun: "Jun 23, 15:03" },
];

export const scenarios: Scenario[] = [
  { id: "stage-1", label: "Stage 1", description: "Authenticate and load the student dashboard." },
  { id: "stage-2", label: "Stage 2", description: "Complete profile and enrollment prerequisites." },
  { id: "stage-3", label: "Stage 3", description: "Validate course selection and document steps." },
  { id: "stage-4", label: "Stage 4", description: "Confirm submission and post-enrollment state." },
];

export const profileRuns: Record<string, E2eRunStep[]> = {
  "profile-001": [
    { scenarioId: "stage-1", status: "success", duration: "41s", note: "Dashboard loaded with active student state." },
    { scenarioId: "stage-2", status: "success", duration: "1m 12s", note: "Prerequisite checklist accepted mock values." },
    { scenarioId: "stage-3", status: "queued", duration: "-", note: "Awaiting selected run." },
    { scenarioId: "stage-4", status: "queued", duration: "-", note: "Awaiting selected run." },
  ],
};
