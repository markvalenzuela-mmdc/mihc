import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { ProfileOperationalData } from "@mihc/enrollmate-contract";

import { users } from "./users";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    middleName: text("middle_name"),
    email: text("email").notNull().unique(),
    program: text("program"),
    cohort: text("cohort"),
    operationalData: jsonb("operational_data")
      .$type<ProfileOperationalData>()
      .notNull()
      .default({}),
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
);

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
