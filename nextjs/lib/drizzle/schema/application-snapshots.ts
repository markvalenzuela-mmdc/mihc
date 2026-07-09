import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { e2eRuns } from "./profiles";
import { profileFlows } from "./profile-applications";

export const applicationSnapshots = pgTable(
  "application_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileFlowId: uuid("profile_flow_id").notNull(),
    e2eRunId: uuid("e2e_run_id").references(() => e2eRuns.id),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    rawPayload: jsonb("raw_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileFlowId, table.catalogVersionId],
      foreignColumns: [profileFlows.id, profileFlows.catalogVersionId],
    }),
  ],
);
