import { z } from "zod";

import type { EnrollmateField, EnrollmateFlowDefinition, ProfileOperationalData } from "./types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function optionalWhen<T extends z.ZodType>(schema: T, required: boolean) {
  return required ? schema : schema.optional();
}

function fileSchema(field: EnrollmateField) {
  return z
    .object({
      fixtureUri: z.string().min(1),
      filename: z.string().min(1),
      mimeType: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
    })
    .superRefine((file, context) => {
      const filename = file.filename.toLowerCase();
      if (
        field.acceptedFormats.length > 0 &&
        !field.acceptedFormats.some((format) => filename.endsWith(format.toLowerCase()))
      ) {
        context.addIssue({
          code: "custom",
          path: ["filename"],
          message: `${field.label} has an unsupported file extension.`,
        });
      }
      if (field.maxSizeBytes !== null && file.sizeBytes > field.maxSizeBytes) {
        context.addIssue({
          code: "custom",
          path: ["sizeBytes"],
          message: `${field.label} exceeds the captured upload limit.`,
        });
      }
    });
}

function fieldSchema(field: EnrollmateField) {
  if (field.type === "checkbox") {
    return optionalWhen(z.boolean(), field.required);
  }
  if (field.type === "email") {
    return optionalWhen(z.string().email(), field.required);
  }
  if (field.type === "date") {
    return optionalWhen(z.string().regex(datePattern, "Expected an ISO date."), field.required);
  }
  if (field.type === "file") {
    return optionalWhen(fileSchema(field), field.required);
  }

  const validValues = field.options.map((option) => option.value);
  const scalar = validValues.length === 0
    ? z.string()
    : z.string().refine((value) => validValues.includes(value), {
      message: `${field.label} is not a captured option.`,
    });

  return optionalWhen(scalar, field.required);
}

export function buildEnrollmateValidator(flow: EnrollmateFlowDefinition) {
  const fields = flow.steps.flatMap((step) => step.sections.flatMap((section) => section.fields));
  const schema = z.object(
    Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
  ).strict();

  return schema.superRefine((data, context) => {
    for (const field of fields) {
      const value = data[field.name];
      if (value === undefined || typeof value !== "string") continue;

      if (field.conditionalOn) {
        const parentValue = data[field.conditionalOn.field];
        if (
          typeof parentValue === "string" &&
          !field.conditionalOn.values.includes(parentValue)
        ) {
          context.addIssue({
            code: "custom",
            path: [field.name],
            message: `${field.label} is not available for the selected ${field.conditionalOn.field}.`,
          });
        }
      }

      const dependentOptions = field.optionsByDependency[data.programFocus as string];
      if (dependentOptions && !dependentOptions.some((option) => option.value === value)) {
        context.addIssue({
          code: "custom",
          path: [field.name],
          message: `${field.label} is not valid for the selected major.`,
        });
      }
    }
  });
}

export const profileOperationalDataSchema: z.ZodType<ProfileOperationalData> = z
  .object({
    payment: z.record(z.string(), z.unknown()).optional(),
    studyBuddy: z.record(z.string(), z.unknown()).optional(),
    additionalInfo: z.record(z.string(), z.unknown()).optional(),
    disclosures: z.record(z.string(), z.unknown()).optional(),
    systemInfo: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
