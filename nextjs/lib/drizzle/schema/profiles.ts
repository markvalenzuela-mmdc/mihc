import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { enrollmateCatalogVersions } from "./enrollmate-catalog";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    middleName: text("middle_name"),
    email: text("email").notNull().unique(),
    program: text("program"),
    cohort: text("cohort"),
    catalogVersionId: uuid("catalog_version_id").references(
      () => enrollmateCatalogVersions.id,
    ),
    status: text("status")
      .notNull()
      .default("new")
      .references(() => e2eSteps.id)
      .$type<
        | "new"
        | "guidance_needed"
        | "validated"
        | "verification"
        | "enrollment_confirmation"
        | "for_payment"
        | "payment_verification"
        | "completed"
      >(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.id, table.catalogVersionId)],
);

export const profilePaymentDetails = pgTable("profile_payment_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
  programFee: text("program_fee"),
  needOfficialReceipt: boolean("need_official_receipt").notNull().default(false),
  promoCode: text("promo_code"),
  tinNumber: text("tin_number"),
  discountedFee: text("discounted_fee"),
  businessName: text("business_name"),
  paymentMethod: text("payment_method"),
  businessTinNumber: text("business_tin_number"),
  proofOfPayment: text("proof_of_payment"),
  businessAddress: text("business_address"),
  isRenewalPayment: boolean("is_renewal_payment").notNull().default(false),
  businessBir2303GDriveLink: text("business_bir_2303_gdrive_link"),
  proofOfPaymentGDriveLink: text("proof_of_payment_gdrive_link"),
  businessBir2303SubmittedDate: date("business_bir_2303_submitted_date"),
  proofOfPaymentSubmittedDate: date("proof_of_payment_submitted_date"),
  proofOfPaymentAaRemarks: text("proof_of_payment_aa_remarks"),
  timestampInPaymentVerification: timestamp("timestamp_in_payment_verification", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const profileStudyBuddy = pgTable("profile_study_buddy", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
  sbNominator: text("sb_nominator"),
  sbNomineeName: text("sb_nominee_name"),
  sbPromoCode: text("sb_promo_code"),
  sbNomineeEmail: text("sb_nominee_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const profileAdditionalInfo = pgTable("profile_additional_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
  howDidYouFindOut: text("how_did_you_find_out"),
  courseraInviteSent: boolean("coursera_invite_sent").notNull().default(false),
  hasAppFormEdits: boolean("has_app_form_edits").notNull().default(false),
  courseraInviteSentDate: date("coursera_invite_sent_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const profileDisclosures = pgTable("profile_disclosures", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
  dataPrivacy1: boolean("data_privacy_1").notNull().default(false),
  marketingNotifConsent: boolean("marketing_notif_consent").notNull().default(false),
  dataPrivacy2: boolean("data_privacy_2").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const profileSystemInfo = pgTable("profile_system_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
  isSentToApi: boolean("is_sent_to_api").notNull().default(false),
  lastSentToApi: timestamp("last_sent_to_api", { withTimezone: true }),
  isApiError: boolean("is_api_error").notNull().default(false),
  apiErrorMessage: text("api_error_message"),
  changeRecordType: text("change_record_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const e2eSteps = pgTable("e2e_steps", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const e2eRuns = pgTable(
  "e2e_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runNumber: integer("run_number").notNull(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id),
    status: text("status").notNull().$type<"running" | "completed" | "aborted">(),
    startedBy: uuid("started_by").references(() => users.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.profileId, table.runNumber)],
);

export const e2eRunSteps = pgTable(
  "e2e_run_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull().references(() => e2eRuns.id),
    stepId: text("step_id").notNull().references(() => e2eSteps.id),
    status: text("status")
      .notNull()
      .$type<"queued" | "running" | "success" | "failure">(),
    durationSeconds: integer("duration_seconds"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_e2e_run_steps_run_id").on(table.runId)],
);

export const e2eRunTests = pgTable(
  "e2e_run_tests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runStepId: uuid("run_step_id").notNull().references(() => e2eRunSteps.id),
    testName: text("test_name").notNull(),
    status: text("status").notNull().$type<"success" | "failure" | "skipped">(),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_e2e_run_tests_step_id").on(table.runStepId)],
);
