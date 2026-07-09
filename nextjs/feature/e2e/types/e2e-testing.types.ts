import type {
  e2eRuns,
  e2eRunSteps,
  e2eRunTests,
  e2eSteps,
  enrollmateOptions,
  profileAdditionalInfo,
  profileBachelorData,
  profileDisclosures,
  profileDiscoveryChannels,
  profileDocuments,
  profileEnrollmentData,
  profileFlows,
  profileLearnerReadiness,
  profileMicrocredentialData,
  profilePaymentDetails,
  profileRelatedPeople,
  profileRelatedPersonAddresses,
  profileStudyBuddy,
  profileStudyReasons,
  profileSystemInfo,
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
export type E2eProfileCatalogOption = Pick<
  typeof enrollmateOptions.$inferSelect,
  "id" | "label" | "submittedValue"
>;

export type E2eProfileWorkspaceRelatedPerson =
  typeof profileRelatedPeople.$inferSelect & {
    addresses: (typeof profileRelatedPersonAddresses.$inferSelect)[];
  };

export type E2eProfileWorkspaceBachelorData =
  typeof profileBachelorData.$inferSelect & {
    relatedPeople: E2eProfileWorkspaceRelatedPerson[];
    studyReasons: (typeof profileStudyReasons.$inferSelect & {
      option: E2eProfileCatalogOption | null;
    })[];
    documents: typeof profileDocuments.$inferSelect | null;
  };

export type E2eProfileWorkspaceMicrocredentialData =
  typeof profileMicrocredentialData.$inferSelect & {
    learnerReadiness: typeof profileLearnerReadiness.$inferSelect | null;
  };

export type E2eProfileWorkspaceFlow = typeof profileFlows.$inferSelect & {
  bachelorData: E2eProfileWorkspaceBachelorData | null;
  microcredentialData: E2eProfileWorkspaceMicrocredentialData | null;
  discoveryChannels: (typeof profileDiscoveryChannels.$inferSelect & {
    option: E2eProfileCatalogOption | null;
  })[];
};

export interface E2eProfileWorkspaceProfile extends E2eProfileSummary {
  middleName: string | null;
  catalogOptions: E2eProfileCatalogOption[];
  enrollmentData: E2eProfileEnrollmentData;
  learnerReadiness: typeof profileLearnerReadiness.$inferSelect | null;
  paymentDetails: typeof profilePaymentDetails.$inferSelect | null;
  studyBuddy: typeof profileStudyBuddy.$inferSelect | null;
  documents: typeof profileDocuments.$inferSelect | null;
  additionalInfo: typeof profileAdditionalInfo.$inferSelect | null;
  disclosures: typeof profileDisclosures.$inferSelect | null;
  systemInfo: typeof profileSystemInfo.$inferSelect | null;
  flows: E2eProfileWorkspaceFlow[];
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

export type E2eRunHistoryItem = Omit<E2eRun, "steps">;

export interface E2eRunSummary {
  includedSteps: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationSeconds: number | null;
}

export interface E2eSelectedRun extends E2eRun {
  summary: E2eRunSummary;
}

export interface E2eProfileWorkspaceData {
  profile: E2eProfileWorkspaceProfile;
  activeRun: E2eRun | null;
  stepDefinitions: E2eStepDefinition[];
}

export const currentE2eOperator: OperatorSummary = {
  id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
  name: "Jamie Villanueva",
  email: "jamie.villanueva@mmdc.mcl.edu.ph",
};
