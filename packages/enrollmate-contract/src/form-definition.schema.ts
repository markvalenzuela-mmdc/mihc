import { z } from "zod";

import type {
  EnrollmateDefinition,
  EnrollmateField,
  EnrollmateFieldType,
  EnrollmateFlowDefinition,
  EnrollmateFlowType,
  EnrollmateOption,
  EnrollmateSection,
  EnrollmateStep,
} from "./types";

const actionableFieldTypes = new Set<EnrollmateFieldType>([
  "text",
  "textarea",
  "email",
  "tel",
  "date",
  "select",
  "combobox",
  "checkbox",
  "file",
]);

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const rawFieldSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    label: z.string().optional(),
    type: z.string(),
    required: z.boolean().optional(),
    options: z.array(optionSchema).optional(),
    options_ref: z.string().optional(),
    options_by_dependency: z.record(z.string(), z.array(optionSchema)).optional(),
    conditional_on: z
      .object({ field: z.string(), values: z.array(z.string()) })
      .optional(),
    accepted_formats: z.union([z.array(z.string()), z.string()]).optional(),
    max_size: z.union([z.number().int().positive(), z.string()]).optional(),
  })
  .passthrough();

const rawSectionSchema = z.object({
  section: z.string().optional(),
  title: z.string().optional(),
  fields: z.array(rawFieldSchema),
});

const rawFlowSchema = z.object({
  steps: z.array(
    z.object({
      step: z.number().int().positive(),
      title: z.string(),
      sections: z.array(rawSectionSchema).optional().default([]),
    }),
  ),
});

const rawDefinitionSchema = z.object({
  application_types: z.object({
    bachelors: z.object({ title: z.string(), endpoint: z.string() }),
    microcredentials: z.object({ title: z.string(), endpoint: z.string() }),
  }),
  bachelors: rawFlowSchema,
  microcredentials: rawFlowSchema,
  reusable_option_sets: z
    .record(z.string(), z.union([z.array(optionSchema), z.object({}).passthrough()]))
    .optional(),
});

type RawDefinition = z.infer<typeof rawDefinitionSchema>;

function resolveOptions(field: z.infer<typeof rawFieldSchema>, source: RawDefinition) {
  if (field.options) return field.options;
  if (!field.options_ref) return [];

  const referenceKey = Object.keys(source.reusable_option_sets ?? {}).find(
    (key) => field.options_ref?.includes(key),
  );
  const optionSet = referenceKey
    ? source.reusable_option_sets?.[referenceKey]
    : undefined;
  if (!optionSet || !Array.isArray(optionSet)) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["reusable_option_sets", field.options_ref],
        message: `Missing options_ref target: ${field.options_ref}`,
      },
    ]);
  }

  return optionSet;
}

function normalizeField(
  field: z.infer<typeof rawFieldSchema>,
  source: RawDefinition,
): EnrollmateField | null {
  if (field.type === "button" || field.name.includes("{prefix}")) return null;
  if (!actionableFieldTypes.has(field.type as EnrollmateFieldType)) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["fields", field.name],
        message: `Unsupported EnrollMate field type: ${field.type}`,
      },
    ]);
  }
  if (!field.id) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["fields", field.name],
        message: `Actionable field is missing an id: ${field.name}`,
      },
    ]);
  }

  return {
    id: field.id,
    name: field.name,
    label: field.label ?? field.name,
    type: field.type as EnrollmateFieldType,
    required: field.required ?? false,
    options: resolveOptions(field, source),
    optionsByDependency: field.options_by_dependency ?? {},
    conditionalOn: field.conditional_on ?? null,
    acceptedFormats: normalizeAcceptedFormats(field.accepted_formats),
    maxSizeBytes: normalizeMaxSize(field.max_size),
  };
}

function normalizeSection(
  section: z.infer<typeof rawSectionSchema>,
  source: RawDefinition,
): EnrollmateSection {
  return {
    label: section.section ?? section.title ?? "Enrollment details",
    fields: section.fields
      .map((field) => normalizeField(field, source))
      .filter((field): field is EnrollmateField => field !== null),
  };
}

function normalizeFlow(
  flow: z.infer<typeof rawFlowSchema>,
  metadata: { title: string; endpoint: string },
  source: RawDefinition,
): EnrollmateFlowDefinition {
  const steps: EnrollmateStep[] = flow.steps.map((step) => ({
    step: step.step,
    title: step.title,
    sections: step.sections.map((section) => normalizeSection(section, source)),
  }));
  const fieldNames = new Set(steps.flatMap((step) => step.sections.flatMap((section) => section.fields.map((field) => field.name))));

  for (const field of steps.flatMap((step) => step.sections.flatMap((section) => section.fields))) {
    if (field.conditionalOn && !fieldNames.has(field.conditionalOn.field)) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["fields", field.name, "conditional_on"],
          message: `Unknown conditional parent: ${field.conditionalOn.field}`,
        },
      ]);
    }
  }

  return { title: metadata.title, endpoint: metadata.endpoint, steps };
}

function normalizeAcceptedFormats(
  acceptedFormats: string[] | string | undefined,
) {
  if (!acceptedFormats) return [];
  if (Array.isArray(acceptedFormats)) return acceptedFormats;

  return acceptedFormats
    .split(",")
    .map((format) => format.trim())
    .filter(Boolean);
}

function normalizeMaxSize(maxSize: number | string | undefined) {
  if (maxSize === undefined) return null;
  if (typeof maxSize === "number") return maxSize;

  const match = /^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i.exec(maxSize.trim());
  if (!match) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["max_size"],
        message: `Unsupported file size: ${maxSize}`,
      },
    ]);
  }

  const units = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
  return Math.round(Number(match[1]) * units[match[2].toUpperCase() as keyof typeof units]);
}

export function parseEnrollmateDefinition(input: unknown): EnrollmateDefinition {
  const source = rawDefinitionSchema.parse(input);

  return {
    bachelors: normalizeFlow(
      source.bachelors,
      source.application_types.bachelors,
      source,
    ),
    microcredentials: normalizeFlow(
      source.microcredentials,
      source.application_types.microcredentials,
      source,
    ),
  };
}

export const enrollmateFlowTypes: readonly EnrollmateFlowType[] = [
  "bachelors",
  "microcredentials",
];
