import { z } from "zod";

export const e2eProfileCoreSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  middleName: z.string().trim().optional(),
  email: z.email("Enter a valid email address."),
  flowType: z.enum(["bachelors", "microcredentials"]),
});

export type E2eProfileCoreInput = z.infer<typeof e2eProfileCoreSchema>;
