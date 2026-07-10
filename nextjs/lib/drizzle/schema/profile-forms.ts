import { text, timestamp, unique, uuid, jsonb, pgTable } from "drizzle-orm/pg-core";

import { e2eRuns, profiles } from "./profiles";

export const profileForms = pgTable(
  "profile_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id),
    flowType: text("flow_type").notNull().$type<"bachelors" | "microcredentials">(),
    definitionHash: text("definition_hash").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.profileId, table.flowType)],
);

export const profileE2eSnapshots = pgTable("profile_e2e_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileFormId: uuid("profile_form_id").notNull().references(() => profileForms.id),
  e2eRunId: uuid("e2e_run_id").references(() => e2eRuns.id),
  definitionHash: text("definition_hash").notNull(),
  payloadHash: text("payload_hash").notNull(),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
});
