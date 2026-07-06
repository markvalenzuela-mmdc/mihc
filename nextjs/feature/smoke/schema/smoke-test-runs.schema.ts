import { smokeRuns } from "@/lib/drizzle/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { SmokeTestRunStatus } from "../types/smoke-test-apps.types";

const smokeRunsSelectSchema = createSelectSchema(smokeRuns, {
  status: z.enum(SmokeTestRunStatus),
});

export const smokeRunsStatusSchema = smokeRunsSelectSchema.pick({
  status: true,
});

export type SmokeRunsStatusSchema = z.infer<typeof smokeRunsStatusSchema>;
