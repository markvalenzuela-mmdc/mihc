import { integer, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const apps = pgTable("apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const smokeRuns = pgTable(
  "smoke_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runNumber: integer("run_number").notNull(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id),
    status: text("status").notNull().$type<"success" | "degraded" | "failure">(),
    trigger: text("trigger").notNull().$type<"scheduled" | "manual">(),
    total: integer("total").notNull().default(0),
    passed: integer("passed").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    startedBy: uuid("started_by").references(() => users.id),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
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
    status: text("status").notNull().$type<"success" | "failure" | "skipped">(),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_smoke_results_run_id").on(table.runId)],
);
