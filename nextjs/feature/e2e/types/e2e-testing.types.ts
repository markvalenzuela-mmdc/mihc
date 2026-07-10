import type { ProfileOperationalData } from "@mihc/enrollmate-contract";
import type { e2eRuns, e2eRunSteps, e2eRunTests, e2eSteps, profileForms, profiles, users } from "@/lib/drizzle/db";

type ProfileSelect = typeof profiles.$inferSelect;
type E2eRunSelect = typeof e2eRuns.$inferSelect;
type E2eRunStepSelect = typeof e2eRunSteps.$inferSelect;
type E2eRunTestSelect = typeof e2eRunTests.$inferSelect;

export type ProfileStatus = ProfileSelect["status"];
export type OperatorSummary = Pick<typeof users.$inferSelect, "id" | "name" | "email">;
export type E2eProfileLatestRun = Pick<E2eRunSelect, "id" | "runNumber" | "status">;
export interface E2eProfileSummary extends Pick<ProfileSelect, "id" | "name" | "email" | "flowType" | "status"> { latestRun: E2eProfileLatestRun | null; }
export type E2eProfileForm = typeof profileForms.$inferSelect & { isDeprecated: boolean };
export interface E2eProfileWorkspaceProfile extends E2eProfileSummary { middleName: string | null; operationalData: ProfileOperationalData; profileForms: E2eProfileForm[]; }
export type E2eStepDefinition = typeof e2eSteps.$inferSelect;
export type E2eRunTest = Pick<E2eRunTestSelect, "id" | "testName" | "status" | "durationMs" | "errorMessage">;
export interface E2eRunStep extends Pick<E2eRunStepSelect, "id" | "stepId" | "status" | "durationSeconds" | "note"> { e2eStep: E2eStepDefinition; tests: E2eRunTest[]; }
export interface E2eRun extends Pick<E2eRunSelect, "id" | "runNumber" | "profileId" | "status"> { startedBy: OperatorSummary | null; startedAt: string; completedAt: string | null; steps: E2eRunStep[]; }
export type E2eRunHistoryItem = Omit<E2eRun, "steps">;
export interface E2eSelectedRun extends E2eRun { summary: { includedSteps: number; totalSteps: number; passedSteps: number; failedSteps: number; durationSeconds: number | null; }; }
export interface E2eProfileWorkspaceData { profile: E2eProfileWorkspaceProfile; activeRun: E2eRun | null; stepDefinitions: E2eStepDefinition[]; }
export const currentE2eOperator: OperatorSummary = { id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3", name: "Jamie Villanueva", email: "jamie.villanueva@mmdc.mcl.edu.ph" };
