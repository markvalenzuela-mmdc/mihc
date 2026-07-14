import { z } from "zod";

export const e2eProfileCoreSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  middleName: z.string().trim().optional(),
  email: z.email("Enter a valid email address."),
  flowType: z.enum(["bachelors", "microcredentials"]),
});

export type E2eProfileCoreInput = z.infer<typeof e2eProfileCoreSchema>;

const e2eProfileStepDataSchema = z.record(z.string(), z.unknown());

export const saveE2eProfileDraftSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    core: e2eProfileCoreSchema,
    stepNumber: z.number().int().positive(),
    stepData: e2eProfileStepDataSchema,
  }),
  z.object({
    mode: z.literal("edit"),
    profileId: z.uuid(),
    core: e2eProfileCoreSchema,
    stepNumber: z.number().int().positive(),
    stepData: e2eProfileStepDataSchema,
  }),
]);

export const finalizeE2eProfileFormSchema = z.object({
  profileId: z.uuid(),
  core: e2eProfileCoreSchema,
  enrollmateData: e2eProfileStepDataSchema,
});
