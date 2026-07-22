/**
 * Minimal, consumer-owned copy of the three tables this service reads/writes.
 *
 * CANONICAL SOURCE: nextjs/lib/drizzle/schema/apps.ts. DDL ownership and
 * migrations stay in `nextjs/` (drizzle-kit). This consumer never migrates — it
 * only needs table shapes to insert/read against the same app DB. Keep column
 * types in sync with the canonical schema when it changes.
 *
 * Cross-table foreign keys to tables NOT copied here (e.g. `users`) are omitted
 * from `.references()` on purpose — the reference metadata only feeds migrations,
 * and the DB itself still enforces the real FKs.
 */
import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const apps = pgTable("apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const smokeRuns = pgTable(
  "smoke_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runNumber: integer("run_number").notNull(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id),
    status: text("status").notNull().$type<"running" | "success" | "degraded" | "failure">(),
    trigger: text("trigger").notNull().$type<"scheduled" | "manual">(),
    total: integer("total").notNull().default(0),
    passed: integer("passed").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    startedBy: uuid("started_by"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.appId, table.runNumber),
    index("idx_smoke_runs_app_run").on(table.appId, table.runNumber.desc()),
  ],
);

export const smokeRunsTestResults = pgTable(
  "smoke_runs_test_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => smokeRuns.id),
    testName: text("test_name").notNull(),
    testFile: text("test_file"),
    status: text("status").notNull().$type<"running" | "success" | "failure" | "skipped">(),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_smoke_results_run_id").on(table.runId)],
);

// ── E2E tables ──────────────────────────────────────────────────────────────
// Canonical source: nextjs/lib/drizzle/schema/profiles.ts & profile-forms.ts

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  flowType: text("flow_type").notNull().$type<"bachelors" | "microcredentials">(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profileForms = pgTable("profile_forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull(),
  definitionHash: text("definition_hash").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const e2eSteps = pgTable("e2e_steps", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const e2eRuns = pgTable(
  "e2e_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runNumber: integer("run_number").notNull(),
    profileId: uuid("profile_id").notNull(),
    status: text("status").notNull().$type<"running" | "completed" | "aborted">(),
    startedBy: uuid("started_by"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.profileId, table.runNumber),
    uniqueIndex("unique_running_per_profile")
      .on(table.profileId)
      .where(sql`${table.status} = 'running'`),
  ],
);

export const e2eRunSteps = pgTable(
  "e2e_run_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull(),
    stepId: text("step_id").notNull(),
    status: text("status").notNull().$type<"success" | "failure" | "untested">(),
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
    runStepId: uuid("run_step_id").notNull(),
    testName: text("test_name").notNull(),
    status: text("status").notNull().$type<"success" | "failure" | "skipped">(),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_e2e_run_tests_step_id").on(table.runStepId)],
);
