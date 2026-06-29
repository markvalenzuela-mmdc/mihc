import { relations } from "drizzle-orm";
import { apps, smokeRuns, smokeRunsTestResults } from "./apps";
import { users } from "./users";
import { authUser, authSession, authAccount, authVerification } from "./auth";
import {
  e2eRuns,
  e2eRunSteps,
  e2eRunTests,
  e2eSteps,
  profileEnrollmentData,
  profiles,
} from "./profiles";

export const usersRelations = relations(users, () => ({}));

export const authUserRelations = relations(authUser, ({ many }) => ({
  sessions: many(authSession),
  accounts: many(authAccount),
}));

export const authSessionRelations = relations(authSession, ({ one }) => ({
  user: one(authUser, {
    fields: [authSession.userId],
    references: [authUser.id],
  }),
}));

export const authAccountRelations = relations(authAccount, ({ one }) => ({
  user: one(authUser, {
    fields: [authAccount.userId],
    references: [authUser.id],
  }),
}));

export const authVerificationRelations = relations(authVerification, () => ({}));

export const appsRelations = relations(apps, ({ many }) => ({
  smokeRuns: many(smokeRuns),
}));

export const smokeRunsRelations = relations(smokeRuns, ({ one, many }) => ({
  app: one(apps, {
    fields: [smokeRuns.appId],
    references: [apps.id],
  }),
  startedByUser: one(users, {
    fields: [smokeRuns.startedBy],
    references: [users.id],
  }),
  testResults: many(smokeRunsTestResults),
}));

export const smokeRunsTestResultsRelations = relations(smokeRunsTestResults, ({ one }) => ({
  smokeRun: one(smokeRuns, {
    fields: [smokeRunsTestResults.runId],
    references: [smokeRuns.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  enrollmentData: one(profileEnrollmentData),
  e2eRuns: many(e2eRuns),
}));

export const profileEnrollmentDataRelations = relations(profileEnrollmentData, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileEnrollmentData.profileId],
    references: [profiles.id],
  }),
}));

export const e2eStepsRelations = relations(e2eSteps, ({ many }) => ({
  runSteps: many(e2eRunSteps),
}));

export const e2eRunsRelations = relations(e2eRuns, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [e2eRuns.profileId],
    references: [profiles.id],
  }),
  startedByUser: one(users, {
    fields: [e2eRuns.startedBy],
    references: [users.id],
  }),
  runSteps: many(e2eRunSteps),
}));

export const e2eRunStepsRelations = relations(e2eRunSteps, ({ one, many }) => ({
  e2eRun: one(e2eRuns, {
    fields: [e2eRunSteps.runId],
    references: [e2eRuns.id],
  }),
  e2eStep: one(e2eSteps, {
    fields: [e2eRunSteps.stepId],
    references: [e2eSteps.id],
  }),
  tests: many(e2eRunTests),
}));

export const e2eRunTestsRelations = relations(e2eRunTests, ({ one }) => ({
  runStep: one(e2eRunSteps, {
    fields: [e2eRunTests.runStepId],
    references: [e2eRunSteps.id],
  }),
}));
