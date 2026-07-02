import { smokeRuns } from "@/lib/drizzle/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const smokeRunsSelectSchema = createSelectSchema(smokeRuns);

export const smokeRunsStatusSchema = smokeRunsSelectSchema.pick({
  status: true,
});

export type SmokeRunsStatusSchema = z.infer<typeof smokeRunsStatusSchema>;
