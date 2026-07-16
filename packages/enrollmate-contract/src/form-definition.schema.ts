import { z } from "zod";

import type {
  EnrollmateDefinition,
  EnrollmateField,
  EnrollmateFieldType,
  EnrollmateFlowDefinition,
  EnrollmateFlowType,
  EnrollmateSection,
  EnrollmateStep,
} from "./types";

const conditionValueSchema = z.union([z.string(), z.boolean()]);

const optionSchema = z.object({
  label: z.string().min(1),
  value: z.string(),
}).strict();

const visibleWhenSchema = z.object({
  field: z.string().min(1),
  equalsAny: z.array(conditionValueSchema).min(1),
}).strict();

const cascadeSchema = z.object({
  dependsOn: z.string().min(1).optional(),
  triggers: z.array(z.string().min(1)).min(1).optional(),
}).strict().refine((cascade) => cascade.dependsOn !== undefined || cascade.triggers !== undefined, {
  message: "A cascade must declare dependsOn or triggers.",
});

const automationSchema = z.object({
  isCascadeParent: z.boolean().optional(),
  triggers: z.array(z.string().min(1)).min(1).optional(),
  exampleOptionsByParent: z.record(z.string(), z.array(z.string().min(1)).min(1)).optional(),
}).strict();

const inlineOptionSourceSchema = z.object({
  kind: z.literal("inline"),
  options: z.array(optionSchema).min(1),
}).strict();

const reusableOptionSourceSchema = z.object({
  kind: z.literal("reusable"),
  optionSet: z.string().min(1),
}).strict();

const dependentOptionSourceSchema = z.object({
  kind: z.literal("dependent"),
  field: z.string().min(1),
  optionsByValue: z.record(z.string(), z.array(optionSchema).min(1)),
}).strict();

const dependentReusableOptionSourceSchema = z.object({
  kind: z.literal("dependentReusable"),
  field: z.string().min(1),
  optionSet: z.string().min(1),
}).strict();

const cascadeOptionSourceSchema = z.object({ kind: z.literal("cascade") }).strict();
const externalOptionSourceSchema = z.object({ kind: z.literal("external") }).strict();

const optionSourceSchema = z.discriminatedUnion("kind", [
  inlineOptionSourceSchema,
  reusableOptionSourceSchema,
  dependentOptionSourceSchema,
  dependentReusableOptionSourceSchema,
  cascadeOptionSourceSchema,
  externalOptionSourceSchema,
]);

const dependentOptionSetSchema = z.record(
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
);

const commonFieldShape = {
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  description: z.string().min(1).optional(),
  htmlInputType: z.string().min(1).optional(),
  placeholder: z.string().optional(),
  placeholderValue: z.string().optional(),
  defaultValue: conditionValueSchema.optional(),
  visibleWhen: visibleWhenSchema.optional(),
  requiredWhenVisible: z.boolean().optional(),
  cascade: cascadeSchema.optional(),
  automation: automationSchema.optional(),
};

const textFieldSchema = z.object({
  ...commonFieldShape,
  type: z.enum(["text", "textarea", "email", "tel", "date"]),
}).strict();

const choiceFieldSchema = z.object({
  ...commonFieldShape,
  type: z.enum(["select", "combobox"]),
  optionSource: optionSourceSchema,
}).strict().superRefine((field, context) => {
  if (field.optionSource.kind === "cascade" && !field.cascade?.dependsOn) {
    context.addIssue({
      code: "custom",
      path: ["cascade"],
      message: "A cascade option source requires cascade.dependsOn.",
    });
  }
});

const checkboxFieldSchema = z.object({
  ...commonFieldShape,
  type: z.literal("checkbox"),
}).strict();

const fileFieldSchema = z.object({
  ...commonFieldShape,
  type: z.literal("file"),
  upload: z.object({
    acceptedFormats: z.array(z.string().min(1)).min(1),
    maxSizeBytes: z.number().int().positive(),
  }).strict(),
}).strict();

const fieldSchema = z.discriminatedUnion("type", [
  textFieldSchema,
  choiceFieldSchema,
  checkboxFieldSchema,
  fileFieldSchema,
]);

const sectionSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
  prefix: z.string().min(1).optional(),
  type: z.literal("checkboxGroup").optional(),
  required: z.boolean().optional(),
  fields: z.array(fieldSchema),
}).strict();

const flowSchema = z.object({
  steps: z.array(z.object({
    step: z.number().int().positive(),
    title: z.string().min(1),
    sections: z.array(sectionSchema),
  }).strict()).min(1),
}).strict();

const addressFieldTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["text", "select"]),
  required: z.boolean(),
  label: z.string().min(1).optional(),
  defaultValue: z.string().optional(),
  cascade: cascadeSchema.optional(),
}).strict();

const definitionSourceSchema = z.object({
  $schema: z.literal("./enrollmate-form-definition.schema.json"),
  schemaVersion: z.literal(1),
  metadata: z.object({
    application: z.string().min(1),
    version: z.string().min(1),
    referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.string().min(1),
    sourceNotes: z.array(z.string().min(1)),
  }).strict(),
  applicationTypes: z.object({
    bachelors: z.object({ title: z.string().min(1), endpoint: z.string().min(1), totalSteps: z.number().int().positive() }).strict(),
    microcredentials: z.object({ title: z.string().min(1), endpoint: z.string().min(1), totalSteps: z.number().int().positive() }).strict(),
  }).strict(),
  reusableOptionSets: z.record(
    z.string().min(1),
    z.array(optionSchema).min(1),
  ).refine(
    (optionSets) => Object.keys(optionSets).length > 0,
    "At least one reusable option set is required.",
  ),
  reusableDependentOptionSets: z.record(
    z.string().min(1),
    dependentOptionSetSchema,
  ).refine(
    (optionSets) => Object.keys(optionSets).length > 0,
    "At least one reusable dependent option set is required.",
  ),
  templates: z.object({
    addressFieldsPattern: z.object({
      description: z.string().min(1),
      fields: z.array(addressFieldTemplateSchema).min(1),
    }).strict(),
  }).strict(),
  flows: z.object({
    bachelors: flowSchema,
    microcredentials: flowSchema,
  }).strict(),
}).strict();

export type EnrollmateDefinitionSource = z.infer<typeof definitionSourceSchema>;

function normalizeOptionSource(
  optionSource: z.infer<typeof optionSourceSchema>,
  source: EnrollmateDefinitionSource,
): Pick<EnrollmateField, "options" | "optionsByDependency" | "optionSource"> {
  switch (optionSource.kind) {
    case "inline":
      return { options: optionSource.options, optionsByDependency: {}, optionSource: { kind: "inline" } };
    case "reusable": {
      const options = source.reusableOptionSets[optionSource.optionSet];
      if (!options) {
        throw new z.ZodError([{
          code: "custom",
          path: ["reusableOptionSets", optionSource.optionSet],
          message: `Missing reusable option set: ${optionSource.optionSet}`,
        }]);
      }
      return {
        options,
        optionsByDependency: {},
        optionSource: { kind: "reusable", optionSet: optionSource.optionSet },
      };
    }
    case "dependent":
      return {
        options: [],
        optionsByDependency: optionSource.optionsByValue,
        optionSource: { kind: "dependent", field: optionSource.field },
      };
    case "dependentReusable": {
      const valuesByDependency = source.reusableDependentOptionSets[optionSource.optionSet];
      if (!valuesByDependency) {
        throw new z.ZodError([{
          code: "custom",
          path: ["reusableDependentOptionSets", optionSource.optionSet],
          message: `Missing reusable dependent option set: ${optionSource.optionSet}`,
        }]);
      }
      const optionsByDependency = Object.fromEntries(
        Object.entries(valuesByDependency).map(([dependency, values]) => [
          dependency,
          values.map((value) => ({ label: value, value })),
        ]),
      );
      return {
        options: [],
        optionsByDependency,
        optionSource: { kind: "dependent", field: optionSource.field },
      };
    }
    case "cascade":
    case "external":
      return { options: [], optionsByDependency: {}, optionSource: { kind: optionSource.kind } };
  }
}

function normalizeField(
  field: z.infer<typeof fieldSchema>,
  source: EnrollmateDefinitionSource,
): EnrollmateField {
  const optionDetails = "optionSource" in field
    ? normalizeOptionSource(field.optionSource, source)
    : { options: [], optionsByDependency: {}, optionSource: undefined };
  const upload = "upload" in field ? field.upload : undefined;

  return {
    id: field.id,
    name: field.name,
    label: field.label,
    type: field.type as EnrollmateFieldType,
    required: field.required,
    description: field.description,
    htmlInputType: field.htmlInputType,
    placeholder: field.placeholder,
    placeholderValue: field.placeholderValue,
    defaultValue: field.defaultValue,
    ...optionDetails,
    conditionalOn: field.visibleWhen ?? null,
    requiredWhenConditionMet: field.requiredWhenVisible ?? false,
    cascade: field.cascade,
    automation: field.automation,
    acceptedFormats: upload?.acceptedFormats ?? [],
    maxSizeBytes: upload?.maxSizeBytes ?? null,
  };
}

function normalizeSection(
  section: z.infer<typeof sectionSchema>,
  source: EnrollmateDefinitionSource,
): EnrollmateSection {
  return {
    label: section.label,
    description: section.description,
    notes: section.notes,
    prefix: section.prefix,
    type: section.type,
    required: section.required,
    fields: section.fields.map((field) => normalizeField(field, source)),
  };
}

function getFieldReferences(field: EnrollmateField) {
  return [
    field.conditionalOn?.field,
    field.cascade?.dependsOn,
    ...(field.cascade?.triggers ?? []),
    field.optionSource?.kind === "dependent" ? field.optionSource.field : undefined,
  ].filter((reference): reference is string => reference !== undefined);
}

function assertKnownFieldReference(
  field: EnrollmateField,
  reference: string,
  fieldsByName: Map<string, EnrollmateField>,
) {
  if (reference !== field.name && fieldsByName.has(reference)) return;
  throw new z.ZodError([{
    code: "custom",
    path: ["fields", field.name],
    message: `Unknown field reference: ${reference}`,
  }]);
}

function validateDependentOptions(
  field: EnrollmateField,
  fieldsByName: Map<string, EnrollmateField>,
) {
  if (field.optionSource?.kind !== "dependent") return;

  const parent = fieldsByName.get(field.optionSource.field)!;
  const parentOptions = new Set([
    ...parent.options,
    ...Object.values(parent.optionsByDependency).flat(),
  ].map((option) => option.value));
  for (const value of Object.keys(field.optionsByDependency)) {
    if (parentOptions.has(value)) continue;
    throw new z.ZodError([{
      code: "custom",
      path: ["fields", field.name, "optionSource"],
      message: `Unknown dependent option value: ${value}`,
    }]);
  }
}

function validateFieldReferences(flow: EnrollmateFlowDefinition) {
  const fields = flow.steps.flatMap((step) => step.sections.flatMap((section) => section.fields));
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));

  for (const field of fields) {
    for (const reference of getFieldReferences(field)) {
      assertKnownFieldReference(field, reference, fieldsByName);
    }
    validateDependentOptions(field, fieldsByName);
  }
}

function normalizeFlow(
  flow: z.infer<typeof flowSchema>,
  metadata: { title: string; endpoint: string },
  source: EnrollmateDefinitionSource,
): EnrollmateFlowDefinition {
  const steps: EnrollmateStep[] = flow.steps.map((step) => ({
    step: step.step,
    title: step.title,
    sections: step.sections.map((section) => normalizeSection(section, source)),
  }));
  const normalized = { title: metadata.title, endpoint: metadata.endpoint, steps };
  validateFieldReferences(normalized);
  return normalized;
}

export function parseEnrollmateDefinitionSource(input: unknown): EnrollmateDefinitionSource {
  return definitionSourceSchema.parse(input);
}

export function parseEnrollmateDefinition(input: unknown): EnrollmateDefinition {
  const source = parseEnrollmateDefinitionSource(input);

  return {
    bachelors: normalizeFlow(source.flows.bachelors, source.applicationTypes.bachelors, source),
    microcredentials: normalizeFlow(source.flows.microcredentials, source.applicationTypes.microcredentials, source),
  };
}

export const enrollmateFlowTypes: readonly EnrollmateFlowType[] = [
  "bachelors",
  "microcredentials",
];
