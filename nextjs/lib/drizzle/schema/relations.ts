import { relations } from "drizzle-orm";

import { apps, smokeRuns, smokeRunsTestResults } from "./apps";
import { applicationSnapshots } from "./application-snapshots";
import { authAccount, authSession, authUser, authVerification } from "./auth";
import {
  enrollmateCatalogVersions,
  enrollmateOptionDependencies,
  enrollmateOptions,
  enrollmateOptionSets,
} from "./enrollmate-catalog";
import {
  profileBachelorData,
  profileDiscoveryChannels,
  profileDocuments,
  profileEnrollmentData,
  profileFlows,
  profileLearnerReadiness,
  profileMicrocredentialData,
  profileStudyReasons,
} from "./profile-applications";
import {
  profileRelatedPeople,
  profileRelatedPersonAddresses,
} from "./profile-relatives";
import {
  e2eRuns,
  e2eRunSteps,
  e2eRunTests,
  e2eSteps,
  profileAdditionalInfo,
  profileDisclosures,
  profilePaymentDetails,
  profiles,
  profileStudyBuddy,
  profileSystemInfo,
} from "./profiles";
import { users } from "./users";

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

export const smokeRunsTestResultsRelations = relations(
  smokeRunsTestResults,
  ({ one }) => ({
    smokeRun: one(smokeRuns, {
      fields: [smokeRunsTestResults.runId],
      references: [smokeRuns.id],
    }),
  }),
);

export const enrollmateCatalogVersionsRelations = relations(
  enrollmateCatalogVersions,
  ({ many }) => ({
    optionSets: many(enrollmateOptionSets),
    options: many(enrollmateOptions),
    dependencies: many(enrollmateOptionDependencies),
    profiles: many(profiles),
  }),
);

export const enrollmateOptionSetsRelations = relations(
  enrollmateOptionSets,
  ({ one, many }) => ({
    catalogVersion: one(enrollmateCatalogVersions, {
      fields: [enrollmateOptionSets.catalogVersionId],
      references: [enrollmateCatalogVersions.id],
    }),
    options: many(enrollmateOptions),
  }),
);

export const enrollmateOptionsRelations = relations(
  enrollmateOptions,
  ({ one, many }) => ({
    catalogVersion: one(enrollmateCatalogVersions, {
      fields: [enrollmateOptions.catalogVersionId],
      references: [enrollmateCatalogVersions.id],
    }),
    optionSet: one(enrollmateOptionSets, {
      fields: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.optionSetKey,
      ],
      references: [
        enrollmateOptionSets.catalogVersionId,
        enrollmateOptionSets.key,
      ],
    }),
    parentDependencies: many(enrollmateOptionDependencies, {
      relationName: "enrollmateDependencyParent",
    }),
    childDependencies: many(enrollmateOptionDependencies, {
      relationName: "enrollmateDependencyChild",
    }),
  }),
);

export const enrollmateOptionDependenciesRelations = relations(
  enrollmateOptionDependencies,
  ({ one }) => ({
    catalogVersion: one(enrollmateCatalogVersions, {
      fields: [enrollmateOptionDependencies.catalogVersionId],
      references: [enrollmateCatalogVersions.id],
    }),
    parentOption: one(enrollmateOptions, {
      fields: [
        enrollmateOptionDependencies.catalogVersionId,
        enrollmateOptionDependencies.parentOptionId,
      ],
      references: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.id,
      ],
      relationName: "enrollmateDependencyParent",
    }),
    childOption: one(enrollmateOptions, {
      fields: [
        enrollmateOptionDependencies.catalogVersionId,
        enrollmateOptionDependencies.childOptionId,
      ],
      references: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.id,
      ],
      relationName: "enrollmateDependencyChild",
    }),
  }),
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  catalogVersion: one(enrollmateCatalogVersions, {
    fields: [profiles.catalogVersionId],
    references: [enrollmateCatalogVersions.id],
  }),
  enrollmentData: one(profileEnrollmentData),
  learnerReadiness: one(profileLearnerReadiness),
  paymentDetails: one(profilePaymentDetails),
  studyBuddy: one(profileStudyBuddy),
  documents: one(profileDocuments),
  additionalInfo: one(profileAdditionalInfo),
  disclosures: one(profileDisclosures),
  systemInfo: one(profileSystemInfo),
  e2eRuns: many(e2eRuns),
  flows: many(profileFlows),
}));

export const profileFlowsRelations = relations(
  profileFlows,
  ({ one, many }) => ({
    profile: one(profiles, {
      fields: [profileFlows.profileId],
      references: [profiles.id],
    }),
    bachelorData: one(profileBachelorData),
    microcredentialData: one(profileMicrocredentialData),
    discoveryChannels: many(profileDiscoveryChannels),
    snapshots: many(applicationSnapshots),
  }),
);

export const profileBachelorDataRelations = relations(
  profileBachelorData,
  ({ one, many }) => ({
    profileFlow: one(profileFlows, {
      fields: [profileBachelorData.profileFlowId],
      references: [profileFlows.id],
    }),
    relatedPeople: many(profileRelatedPeople),
    studyReasons: many(profileStudyReasons),
    documents: one(profileDocuments),
  }),
);

export const profileMicrocredentialDataRelations = relations(
  profileMicrocredentialData,
  ({ one }) => ({
    profileFlow: one(profileFlows, {
      fields: [profileMicrocredentialData.profileFlowId],
      references: [profileFlows.id],
    }),
    learnerReadiness: one(profileLearnerReadiness),
  }),
);

export const profileDiscoveryChannelsRelations = relations(
  profileDiscoveryChannels,
  ({ one }) => ({
    profileFlow: one(profileFlows, {
      fields: [profileDiscoveryChannels.profileFlowId],
      references: [profileFlows.id],
    }),
    option: one(enrollmateOptions, {
      fields: [
        profileDiscoveryChannels.catalogVersionId,
        profileDiscoveryChannels.optionSetKey,
        profileDiscoveryChannels.optionId,
      ],
      references: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.optionSetKey,
        enrollmateOptions.id,
      ],
    }),
  }),
);

export const profileStudyReasonsRelations = relations(
  profileStudyReasons,
  ({ one }) => ({
    bachelorData: one(profileBachelorData, {
      fields: [profileStudyReasons.bachelorDataId],
      references: [profileBachelorData.id],
    }),
    option: one(enrollmateOptions, {
      fields: [
        profileStudyReasons.catalogVersionId,
        profileStudyReasons.optionSetKey,
        profileStudyReasons.optionId,
      ],
      references: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.optionSetKey,
        enrollmateOptions.id,
      ],
    }),
  }),
);

export const profileRelatedPeopleRelations = relations(
  profileRelatedPeople,
  ({ one, many }) => ({
    bachelorData: one(profileBachelorData, {
      fields: [profileRelatedPeople.bachelorDataId],
      references: [profileBachelorData.id],
    }),
    addresses: many(profileRelatedPersonAddresses),
  }),
);

export const profileRelatedPersonAddressesRelations = relations(
  profileRelatedPersonAddresses,
  ({ one }) => ({
    relatedPerson: one(profileRelatedPeople, {
      fields: [profileRelatedPersonAddresses.relatedPersonId],
      references: [profileRelatedPeople.id],
    }),
  }),
);

export const applicationSnapshotsRelations = relations(
  applicationSnapshots,
  ({ one }) => ({
    profileFlow: one(profileFlows, {
      fields: [applicationSnapshots.profileFlowId],
      references: [profileFlows.id],
    }),
    e2eRun: one(e2eRuns, {
      fields: [applicationSnapshots.e2eRunId],
      references: [e2eRuns.id],
    }),
  }),
);

export const profileEnrollmentDataRelations = relations(
  profileEnrollmentData,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileEnrollmentData.profileId],
      references: [profiles.id],
    }),
  }),
);

export const profileLearnerReadinessRelations = relations(
  profileLearnerReadiness,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileLearnerReadiness.profileId],
      references: [profiles.id],
    }),
    microcredentialData: one(profileMicrocredentialData, {
      fields: [profileLearnerReadiness.microcredentialDataId],
      references: [profileMicrocredentialData.id],
    }),
  }),
);

export const profilePaymentDetailsRelations = relations(
  profilePaymentDetails,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profilePaymentDetails.profileId],
      references: [profiles.id],
    }),
  }),
);

export const profileStudyBuddyRelations = relations(
  profileStudyBuddy,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileStudyBuddy.profileId],
      references: [profiles.id],
    }),
  }),
);

export const profileDocumentsRelations = relations(
  profileDocuments,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileDocuments.profileId],
      references: [profiles.id],
    }),
    bachelorData: one(profileBachelorData, {
      fields: [profileDocuments.bachelorDataId],
      references: [profileBachelorData.id],
    }),
  }),
);

export const profileAdditionalInfoRelations = relations(
  profileAdditionalInfo,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileAdditionalInfo.profileId],
      references: [profiles.id],
    }),
  }),
);

export const profileDisclosuresRelations = relations(
  profileDisclosures,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileDisclosures.profileId],
      references: [profiles.id],
    }),
  }),
);

export const profileSystemInfoRelations = relations(
  profileSystemInfo,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileSystemInfo.profileId],
      references: [profiles.id],
    }),
  }),
);

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
  applicationSnapshots: many(applicationSnapshots),
}));

export const e2eRunStepsRelations = relations(
  e2eRunSteps,
  ({ one, many }) => ({
    e2eRun: one(e2eRuns, {
      fields: [e2eRunSteps.runId],
      references: [e2eRuns.id],
    }),
    e2eStep: one(e2eSteps, {
      fields: [e2eRunSteps.stepId],
      references: [e2eSteps.id],
    }),
    tests: many(e2eRunTests),
  }),
);

export const e2eRunTestsRelations = relations(e2eRunTests, ({ one }) => ({
  runStep: one(e2eRunSteps, {
    fields: [e2eRunTests.runStepId],
    references: [e2eRunSteps.id],
  }),
}));
