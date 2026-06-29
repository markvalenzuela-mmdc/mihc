import { boolean, date, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  program: text("program").notNull(),
  cohort: text("cohort").notNull(),
  status: text("status").notNull().default("ready").$type<"ready" | "needs review">(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const profileEnrollmentData = pgTable("profile_enrollment_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .unique()
    .references(() => profiles.id),

  givenName: text("given_name"),
  familyName: text("family_name"),
  birthplace: text("birthplace"),
  birthdate: date("birthdate"),
  gender: text("gender"),
  nationality: text("nationality"),
  civilStatus: text("civil_status"),
  monthlyIncome: text("monthly_income"),
  mobile: text("mobile"),
  preferredLearningHub: text("preferred_learning_hub"),
  studentType: text("student_type"),
  subStudentType: text("sub_student_type"),
  studentStatus: text("student_status"),
  religion: text("religion"),
  strand: text("strand"),
  lastSchoolAttended: text("last_school_attended"),
  termApplied: text("term_applied"),
  programFocus: text("program_focus"),
  programApplied: text("program_applied"),

  currentAddressCountry: text("current_address_country"),
  currentAddressLine1: text("current_address_line1"),
  currentAddressLine2: text("current_address_line2"),
  currentAddressProvince: text("current_address_province"),
  currentAddressCity: text("current_address_city"),
  currentAddressBarangay: text("current_address_barangay"),
  currentAddressZipCode: text("current_address_zip_code"),

  permanentAddressCountry: text("permanent_address_country"),
  permanentAddressLine1: text("permanent_address_line1"),
  permanentAddressLine2: text("permanent_address_line2"),
  permanentAddressProvince: text("permanent_address_province"),
  permanentAddressCity: text("permanent_address_city"),
  permanentAddressBarangay: text("permanent_address_barangay"),
  permanentAddressZipCode: text("permanent_address_zip_code"),

  interestedInScholarship: text("interested_in_scholarship"),
  withMedicalCondition: text("with_medical_condition"),

  fatherStatus: text("father_status"),
  motherStatus: text("mother_status"),
  guardianType: text("guardian_type"),
  guardianGivenName: text("guardian_given_name"),
  guardianFamilyName: text("guardian_family_name"),
  guardianSuffix: text("guardian_suffix"),
  guardianBirthdate: date("guardian_birthdate"),
  guardianMobile: text("guardian_mobile"),
  guardianEmail: text("guardian_email"),
  guardianOccupation: text("guardian_occupation"),
  guardianRelationship: text("guardian_relationship"),
  copyGuardianAddress: boolean("copy_guardian_address").default(false),
  copyPermanentGuardianAddress: boolean("copy_permanent_guardian_address").default(false),

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
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
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
    runId: uuid("run_id")
      .notNull()
      .references(() => e2eRuns.id),
    stepId: text("step_id")
      .notNull()
      .references(() => e2eSteps.id),
    status: text("status").notNull().$type<"queued" | "running" | "success" | "failure">(),
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
    runStepId: uuid("run_step_id")
      .notNull()
      .references(() => e2eRunSteps.id),
    testName: text("test_name").notNull(),
    status: text("status").notNull().$type<"success" | "failure" | "skipped">(),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_e2e_run_tests_step_id").on(table.runStepId)],
);
