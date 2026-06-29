export type SmokeRunStatus = "success" | "degraded" | "failure";
export type TestResultStatus = "success" | "failure" | "skipped";
export type RunTrigger = "scheduled" | "manual";
export type ProfileStatus = "ready" | "needs review";
export type E2eRunStatus = "running" | "completed" | "aborted";
export type E2eStepStatus = "queued" | "running" | "success" | "failure";

export interface OperatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface SmokeAppView {
  id: string;
  name: string;
  description: string | null;
}

export interface SmokeTestResultView {
  id: string;
  testName: string;
  testFile: string | null;
  status: TestResultStatus;
  durationMs: number | null;
  errorMessage: string | null;
  errorStack: string | null;
}

export interface SmokeRunView {
  id: string;
  runNumber: number;
  appId: string;
  status: SmokeRunStatus;
  trigger: RunTrigger;
  total: number;
  passed: number;
  failed: number;
  durationSeconds: number | null;
  startedBy: OperatorSummary | null;
  checkedAt: string;
  testResults: SmokeTestResultView[];
}

export interface ProfileEnrollmentDataView {
  givenName: string | null;
  familyName: string | null;
  birthplace: string | null;
  birthdate: string | null;
  gender: string | null;
  nationality: string | null;
  civilStatus: string | null;
  monthlyIncome: string | null;
  mobile: string | null;
  preferredLearningHub: string | null;
  studentType: string | null;
  subStudentType: string | null;
  studentStatus: string | null;
  religion: string | null;
  strand: string | null;
  lastSchoolAttended: string | null;
  termApplied: string | null;
  programFocus: string | null;
  programApplied: string | null;
  currentAddressCountry: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentAddressProvince: string | null;
  currentAddressCity: string | null;
  currentAddressBarangay: string | null;
  currentAddressZipCode: string | null;
  permanentAddressCountry: string | null;
  permanentAddressLine1: string | null;
  permanentAddressLine2: string | null;
  permanentAddressProvince: string | null;
  permanentAddressCity: string | null;
  permanentAddressBarangay: string | null;
  permanentAddressZipCode: string | null;
  interestedInScholarship: string | null;
  withMedicalCondition: string | null;
  fatherStatus: string | null;
  motherStatus: string | null;
  guardianType: string | null;
  guardianGivenName: string | null;
  guardianFamilyName: string | null;
  guardianSuffix: string | null;
  guardianBirthdate: string | null;
  guardianMobile: string | null;
  guardianEmail: string | null;
  guardianOccupation: string | null;
  guardianRelationship: string | null;
  copyGuardianAddress: boolean;
  copyPermanentGuardianAddress: boolean;
}

export interface ProfileView {
  id: string;
  name: string;
  email: string;
  program: string;
  cohort: string;
  status: ProfileStatus;
  enrollmentData: ProfileEnrollmentDataView;
}

export interface E2eStepDefinitionView {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface E2eRunTestView {
  id: string;
  testName: string;
  status: TestResultStatus;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface E2eRunStepView {
  id: string;
  stepId: string;
  status: E2eStepStatus;
  durationSeconds: number | null;
  note: string | null;
  tests: E2eRunTestView[];
}

export interface E2eRunView {
  id: string;
  runNumber: number;
  profileId: string;
  status: E2eRunStatus;
  startedBy: OperatorSummary | null;
  startedAt: string;
  completedAt: string | null;
  steps: E2eRunStepView[];
}

export interface SmokeAppSummary {
  latestRun: SmokeRunView | null;
  recentRuns: SmokeRunView[];
}

export const currentOperator: OperatorSummary = {
  id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
  name: "Jamie Villanueva",
  email: "jamie.villanueva@mmdc.mcl.edu.ph",
};

export const smokeApps: SmokeAppView[] = [
  { id: "website", name: "Website", description: "Public marketing and admissions website" },
  { id: "enrollmate", name: "Enrollmate", description: "Student enrollment workflow" },
  { id: "enrollmate-clp", name: "Enrollmate CLP", description: "CLP enrollment support surface" },
  { id: "n8n", name: "Self-hosted n8n", description: "Automation workflow instance" },
];

export const smokeRuns: SmokeRunView[] = [
  {
    id: "a37acbf2-19c4-4fb1-b39f-d3abf5fd7121",
    runNumber: 18,
    appId: "website",
    status: "success",
    trigger: "scheduled",
    total: 4,
    passed: 4,
    failed: 0,
    durationSeconds: 18,
    startedBy: null,
    checkedAt: "2026-06-29T14:10:00+08:00",
    testResults: [
      { id: "4adfd0aa-1", testName: "Homepage loads", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4200, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-2", testName: "Admissions navigation resolves", testFile: "website/smoke.spec.ts", status: "success", durationMs: 3900, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-3", testName: "Lead form renders", testFile: "website/lead-form.spec.ts", status: "success", durationMs: 5100, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-4", testName: "Core assets respond", testFile: null, status: "success", durationMs: 3600, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "7a4020db-0e48-4651-a965-e6e212c10322",
    runNumber: 17,
    appId: "website",
    status: "degraded",
    trigger: "manual",
    total: 4,
    passed: 3,
    failed: 1,
    durationSeconds: 26,
    startedBy: currentOperator,
    checkedAt: "2026-06-29T12:42:00+08:00",
    testResults: [
      { id: "b3b0fd40-1", testName: "Homepage loads", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4100, errorMessage: null, errorStack: null },
      { id: "b3b0fd40-2", testName: "Admissions navigation resolves", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4200, errorMessage: null, errorStack: null },
      { id: "b3b0fd40-3", testName: "Lead form submits", testFile: "website/lead-form.spec.ts", status: "failure", durationMs: 12800, errorMessage: "Expected confirmation message was not visible.", errorStack: "TimeoutError: locator('[data-testid=lead-confirmation]') timed out after 10000ms" },
      { id: "b3b0fd40-4", testName: "Core assets respond", testFile: null, status: "skipped", durationMs: null, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "4fa1b723-d658-414a-9e50-05418a6d5298",
    runNumber: 31,
    appId: "enrollmate",
    status: "failure",
    trigger: "scheduled",
    total: 3,
    passed: 1,
    failed: 2,
    durationSeconds: 45,
    startedBy: null,
    checkedAt: "2026-06-29T14:05:00+08:00",
    testResults: [
      { id: "4cc97274-1", testName: "Login page loads", testFile: "enrollmate/smoke.spec.ts", status: "success", durationMs: 6200, errorMessage: null, errorStack: null },
      { id: "4cc97274-2", testName: "Enrollment summary responds", testFile: "enrollmate/smoke.spec.ts", status: "failure", durationMs: 20100, errorMessage: "Enrollment summary returned HTTP 503.", errorStack: "Error: expected response.ok() to be truthy" },
      { id: "4cc97274-3", testName: "Payment status responds", testFile: "enrollmate/smoke.spec.ts", status: "failure", durationMs: 18700, errorMessage: "Payment status request timed out.", errorStack: null },
    ],
  },
  {
    id: "ee4229a8-bd46-44c6-a6c3-67cc7dafee36",
    runNumber: 9,
    appId: "enrollmate-clp",
    status: "degraded",
    trigger: "scheduled",
    total: 4,
    passed: 3,
    failed: 1,
    durationSeconds: 39,
    startedBy: null,
    checkedAt: "2026-06-29T13:58:00+08:00",
    testResults: [
      { id: "6f324d35-1", testName: "CLP dashboard loads", testFile: "clp/smoke.spec.ts", status: "failure", durationMs: 16400, errorMessage: "Dashboard returned HTTP 500.", errorStack: null },
      { id: "6f324d35-2", testName: "Session endpoint responds", testFile: "clp/smoke.spec.ts", status: "success", durationMs: 5100, errorMessage: null, errorStack: null },
      { id: "6f324d35-3", testName: "Course list responds", testFile: "clp/smoke.spec.ts", status: "success", durationMs: 7300, errorMessage: null, errorStack: null },
      { id: "6f324d35-4", testName: "Support links resolve", testFile: null, status: "success", durationMs: 3600, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "d495a21e-a89d-4ab6-a191-812f785e482e",
    runNumber: 42,
    appId: "n8n",
    status: "success",
    trigger: "scheduled",
    total: 2,
    passed: 2,
    failed: 0,
    durationSeconds: 16,
    startedBy: null,
    checkedAt: "2026-06-29T14:11:00+08:00",
    testResults: [
      { id: "5aa5ccb2-1", testName: "Webhook health responds", testFile: "n8n/smoke.spec.ts", status: "success", durationMs: 6500, errorMessage: null, errorStack: null },
      { id: "5aa5ccb2-2", testName: "Worker heartbeat is fresh", testFile: "n8n/smoke.spec.ts", status: "success", durationMs: 7100, errorMessage: null, errorStack: null },
    ],
  },
];

const ariEnrollment: ProfileEnrollmentDataView = {
  givenName: "Ari", familyName: "Santos", birthplace: "Makati City", birthdate: "2007-03-14", gender: "Female", nationality: "Filipino", civilStatus: "Single", monthlyIncome: "Below PHP 20,000", mobile: "+63 917 555 0142", preferredLearningHub: "Makati", studentType: "Freshman", subStudentType: "Senior High School Graduate", studentStatus: "New", religion: "Catholic", strand: "STEM", lastSchoolAttended: "Makati Science High School", termApplied: "Term 1 AY 2026-2027", programFocus: "Technology", programApplied: "BS Information Technology", currentAddressCountry: "Philippines", currentAddressLine1: "1421 J. P. Rizal Avenue", currentAddressLine2: null, currentAddressProvince: "Metro Manila", currentAddressCity: "Makati City", currentAddressBarangay: "Poblacion", currentAddressZipCode: "1210", permanentAddressCountry: "Philippines", permanentAddressLine1: "1421 J. P. Rizal Avenue", permanentAddressLine2: null, permanentAddressProvince: "Metro Manila", permanentAddressCity: "Makati City", permanentAddressBarangay: "Poblacion", permanentAddressZipCode: "1210", interestedInScholarship: "Yes", withMedicalCondition: "No", fatherStatus: "Living", motherStatus: "Living", guardianType: "Mother", guardianGivenName: "Liza", guardianFamilyName: "Santos", guardianSuffix: null, guardianBirthdate: "1982-08-06", guardianMobile: "+63 917 555 0188", guardianEmail: "liza.santos@example.com", guardianOccupation: "Accountant", guardianRelationship: "Mother", copyGuardianAddress: true, copyPermanentGuardianAddress: true,
};

export const profiles: ProfileView[] = [
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40101", name: "Ari Santos", email: "ari.santos@example.edu", program: "BS Information Technology", cohort: "2026-A", status: "ready", enrollmentData: ariEnrollment },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40102", name: "Mika Reyes", email: "mika.reyes@example.edu", program: "BS Business Administration", cohort: "2026-A", status: "ready", enrollmentData: { ...ariEnrollment, givenName: "Mika", familyName: "Reyes", programApplied: "BS Business Administration", programFocus: "Business", strand: "ABM", guardianGivenName: "Paolo", guardianFamilyName: "Reyes" } },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40103", name: "Noel Cruz", email: "noel.cruz@example.edu", program: "BS Computer Science", cohort: "2025-B", status: "needs review", enrollmentData: { ...ariEnrollment, givenName: "Noel", familyName: "Cruz", programApplied: "BS Computer Science", mobile: null, currentAddressBarangay: null, guardianEmail: null, interestedInScholarship: null } },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40104", name: "Sam Lim", email: "sam.lim@example.edu", program: "Bachelor of Secondary Education", cohort: "2025-B", status: "ready", enrollmentData: { ...ariEnrollment, givenName: "Sam", familyName: "Lim", programApplied: "Bachelor of Secondary Education", programFocus: "Education", strand: "HUMSS" } },
];

export const e2eStepDefinitions: E2eStepDefinitionView[] = [
  { id: "stage-1", label: "Authenticate", description: "Sign in and load the student dashboard.", sortOrder: 1 },
  { id: "stage-2", label: "Student information", description: "Populate identity, address, and enrollment prerequisites.", sortOrder: 2 },
  { id: "stage-3", label: "Guardian information", description: "Validate parent or guardian details and consent fields.", sortOrder: 3 },
  { id: "stage-4", label: "Submission", description: "Confirm the application and resulting enrollment state.", sortOrder: 4 },
];

export const e2eRuns: E2eRunView[] = [
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f501",
    runNumber: 12,
    profileId: profiles[0].id,
    status: "completed",
    startedBy: currentOperator,
    startedAt: "2026-06-29T11:28:00+08:00",
    completedAt: "2026-06-29T11:32:41+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5001-${index}`, stepId: step.id, status: "success", durationSeconds: 48 + index * 11, note: `${step.label} completed against the configured profile.`, tests: [{ id: `ea5001-${index}-1`, testName: `${step.label} assertions pass`, status: "success", durationMs: 2800 + index * 420, errorMessage: null }] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f502",
    runNumber: 7,
    profileId: profiles[1].id,
    status: "completed",
    startedBy: null,
    startedAt: "2026-06-28T16:07:00+08:00",
    completedAt: "2026-06-28T16:12:19+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5002-${index}`, stepId: step.id, status: index === 2 ? "failure" : "success", durationSeconds: 52 + index * 8, note: index === 2 ? "Guardian email validation did not resolve." : `${step.label} completed.`, tests: [{ id: `ea5002-${index}-1`, testName: index === 2 ? "Guardian email validation clears" : `${step.label} assertions pass`, status: index === 2 ? "failure" : index === 3 ? "skipped" : "success", durationMs: index === 2 ? 10100 : 3100, errorMessage: index === 2 ? "Validation message remained visible after entering a valid email." : null }] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f503",
    runNumber: 3,
    profileId: profiles[2].id,
    status: "aborted",
    startedBy: currentOperator,
    startedAt: "2026-06-24T09:40:00+08:00",
    completedAt: "2026-06-24T09:41:12+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5003-${index}`, stepId: step.id, status: index === 0 ? "success" : index === 1 ? "failure" : "queued", durationSeconds: index < 2 ? 34 : null, note: index === 1 ? "Required mobile number was missing from profile data." : index > 1 ? "Run aborted before this step started." : "Authentication completed.", tests: index < 2 ? [{ id: `ea5003-${index}-1`, testName: index === 1 ? "Student mobile is populated" : "Student dashboard loads", status: index === 1 ? "failure" : "success", durationMs: 2100, errorMessage: index === 1 ? "Profile mobile value is empty." : null }] : [] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f504",
    runNumber: 4,
    profileId: profiles[3].id,
    status: "running",
    startedBy: currentOperator,
    startedAt: "2026-06-29T14:18:00+08:00",
    completedAt: null,
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5004-${index}`, stepId: step.id, status: index === 0 ? "success" : index === 1 ? "running" : "queued", durationSeconds: index === 0 ? 38 : null, note: index === 0 ? "Authentication completed." : index === 1 ? "Entering profile fields." : "Waiting for the preceding step.", tests: index === 0 ? [{ id: "ea5004-0-1", testName: "Student dashboard loads", status: "success", durationMs: 2400, errorMessage: null }] : [] })),
  },
];

export function getSmokeRunsForApp(appId: string, runs: SmokeRunView[]) {
  return runs
    .filter((run) => run.appId === appId)
    .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt));
}

export function getSmokeAppSummary(appId: string, runs: SmokeRunView[]): SmokeAppSummary {
  const appRuns = getSmokeRunsForApp(appId, runs);
  return { latestRun: appRuns[0] ?? null, recentRuns: appRuns.slice(0, 5) };
}

export function getNextSmokeRunNumber(appId: string, runs: SmokeRunView[]) {
  return Math.max(0, ...runs.filter((run) => run.appId === appId).map((run) => run.runNumber)) + 1;
}

export function getE2eRunsForProfile(profileId: string, runs: E2eRunView[]) {
  return runs
    .filter((run) => run.profileId === profileId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function getNextE2eRunNumber(profileId: string, runs: E2eRunView[]) {
  return Math.max(0, ...runs.filter((run) => run.profileId === profileId).map((run) => run.runNumber)) + 1;
}

export function formatTimestamp(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDurationSeconds(value: number | null) {
  if (value === null) return "Not available";
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  return `${minutes}m ${value % 60}s`;
}

export function formatDurationMs(value: number | null) {
  if (value === null) return "Not available";
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
}
