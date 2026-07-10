import { z } from "zod";

import type {
  EnrollmateConditionalRule,
  EnrollmateField,
  EnrollmateFlowDefinition,
  ProfileOperationalData,
} from "./types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function optionalWhen<T extends z.ZodType>(schema: T, required: boolean, hasCondition: boolean) {
  if (hasCondition) return schema.optional();
  return required ? schema : schema.optional();
}

function conditionMatches(value: unknown, rule: EnrollmateConditionalRule) {
  return (
    (typeof value === "string" || typeof value === "boolean") &&
    rule.equalsAny.includes(value)
  );
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
  const hasCondition = field.conditionalOn !== null;
  switch (field.type) {
    case "checkbox":
      return optionalWhen(z.boolean(), field.required, hasCondition);
    case "email":
      return optionalWhen(z.string().email(), field.required, hasCondition);
    case "date":
      return optionalWhen(z.string().regex(datePattern, "Expected an ISO date."), field.required, hasCondition);
    case "file":
      return optionalWhen(fileSchema(field), field.required, hasCondition);
    default:
      return optionalWhen(stringFieldSchema(field), field.required, hasCondition);
  }
}

function stringFieldSchema(field: EnrollmateField) {
  const validValues = field.options.map((option) => option.value);
  return validValues.length === 0
    ? z.string()
    : z.string().refine((value) => validValues.includes(value), {
      message: `${field.label} is not a captured option.`,
    });
}

function isEmptyValue(field: EnrollmateField, value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return field.type === "file" && typeof value !== "object";
}

function hasValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim() !== "";
  return value !== undefined && value !== null;
}

function validateConditionalField(
  field: EnrollmateField,
  data: Record<string, unknown>,
  context: z.RefinementCtx,
) {
  if (!field.conditionalOn) return;

  const parentValue = data[field.conditionalOn.field];
  const isVisible = conditionMatches(parentValue, field.conditionalOn);
  if (isVisible) {
    if (!(field.required || field.requiredWhenConditionMet) || !isEmptyValue(field, data[field.name])) return;
    context.addIssue({
      code: "custom",
      path: [field.name],
      message: `${field.label} is required when ${field.conditionalOn.field} is set to "${parentValue}".`,
    });
    return;
  }

  if (!hasValue(data[field.name])) return;
  context.addIssue({
    code: "custom",
    path: [field.name],
    message: `${field.label} is not available for the selected ${field.conditionalOn.field}.`,
  });
}

function getDependentOptions(field: EnrollmateField, data: Record<string, unknown>) {
  if (field.optionSource?.kind !== "dependent") return undefined;
  return field.optionsByDependency[data[field.optionSource.field] as string];
}

export function buildEnrollmateValidator(flow: EnrollmateFlowDefinition) {
  const fields = flow.steps.flatMap((step) => step.sections.flatMap((section) => section.fields));
  const schema = z.object(
    Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
  ).strict();

  return schema.superRefine((data, context) => {
    for (const field of fields) {
      const value = data[field.name];
      validateConditionalField(field, data, context);

      if (value === undefined || typeof value !== "string") continue;

      const dependentOptions = getDependentOptions(field, data);
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
