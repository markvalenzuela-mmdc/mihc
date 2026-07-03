import type {
  e2eRuns,
  e2eRunSteps,
  e2eRunTests,
  e2eSteps,
  profileEnrollmentData,
  profiles,
  users,
} from "@/lib/drizzle/db";

type ProfileSelect = typeof profiles.$inferSelect;
type UserSelect = typeof users.$inferSelect;
type E2eRunSelect = typeof e2eRuns.$inferSelect;
type E2eRunStepSelect = typeof e2eRunSteps.$inferSelect;
type E2eRunTestSelect = typeof e2eRunTests.$inferSelect;

export type ProfileStatus = ProfileSelect["status"];
export type E2eRunStatus = E2eRunSelect["status"];
export type E2eRunStepStatus = E2eRunStepSelect["status"];
export type E2eRunTestStatus = E2eRunTestSelect["status"];

export type OperatorSummary = Pick<UserSelect, "id" | "name" | "email">;

export type E2eProfileLatestRun = Pick<
  E2eRunSelect,
  "id" | "runNumber" | "status"
>;

export interface E2eProfileSummary
  extends Pick<
    ProfileSelect,
    "id" | "name" | "email" | "program" | "cohort" | "status"
  > {
  latestRun: E2eProfileLatestRun | null;
}

export type E2eProfileEnrollmentData = typeof profileEnrollmentData.$inferSelect;

export interface E2eProfileWorkspaceProfile extends E2eProfileSummary {
  middleName: string | null;
  enrollmentData: E2eProfileEnrollmentData;
}

export type E2eStepDefinition = typeof e2eSteps.$inferSelect;

export type E2eRunTest = Pick<
  E2eRunTestSelect,
  "id" | "testName" | "status" | "durationMs" | "errorMessage"
>;

export interface E2eRunStep
  extends Pick<
    E2eRunStepSelect,
    "id" | "stepId" | "status" | "durationSeconds" | "note"
  > {
  e2eStep: E2eStepDefinition;
  tests: E2eRunTest[];
}

export interface E2eRun {
  id: string;
  runNumber: number;
  profileId: string;
  status: E2eRunStatus;
  startedBy: OperatorSummary | null;
  startedAt: string;
  completedAt: string | null;
  steps: E2eRunStep[];
}

export interface E2eProfileWorkspaceData {
  profile: E2eProfileWorkspaceProfile;
  runs: E2eRun[];
  stepDefinitions: E2eStepDefinition[];
}

export const currentE2eOperator: OperatorSummary = {
  id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
  name: "Jamie Villanueva",
  email: "jamie.villanueva@mmdc.mcl.edu.ph",
};
