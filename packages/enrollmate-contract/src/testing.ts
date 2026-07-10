import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
} from "./registry";
import type { EnrollmateField, EnrollmateFlowType } from "./types";

export type EnrollmateFixtureOptions = {
  overrides?: Record<string, unknown>;
  resolveField?: (field: EnrollmateField) => unknown;
};

function conditionMatches(
  field: EnrollmateField,
  data: Record<string, unknown>,
) {
  if (!field.conditionalOn) return true;

  const value = data[field.conditionalOn.field];
  return (
    (typeof value === "string" || typeof value === "boolean") &&
    field.conditionalOn.equalsAny.includes(value)
  );
}

function getMechanicalValue(
  field: EnrollmateField,
  data: Record<string, unknown>,
) {
  if (field.type === "checkbox") return false;
  if (field.type === "file") {
    return {
      fixtureUri: `fixtures/${field.name}.pdf`,
      filename: `${field.name}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1,
    };
  }
  if (field.options.length > 0) return field.options[0]!.value;
  if (field.optionSource?.kind === "dependent") {
    const parentValue = data[field.optionSource.field];
    if (typeof parentValue !== "string") return undefined;
    return field.optionsByDependency[parentValue]?.[0]?.value;
  }
  return undefined;
}

export function createEnrollmateFixture(
  flowType: EnrollmateFlowType,
  { overrides = {}, resolveField }: EnrollmateFixtureOptions = {},
) {
  const data: Record<string, unknown> = { ...overrides };
  const fields = getEnrollmateFlowDefinition(flowType).steps.flatMap((step) =>
    step.sections.flatMap((section) => section.fields),
  );

  function setField(field: EnrollmateField) {
    if (data[field.name] !== undefined) return false;

    const resolved = resolveField?.(field);
    const value = resolved ?? getMechanicalValue(field, data);
    if (value === undefined) {
      throw new Error(`Missing fixture value for required field: ${field.name}`);
    }

    data[field.name] = value;
    return true;
  }

  for (const field of fields) {
    if (field.required && !field.conditionalOn) setField(field);
  }

  for (let pass = 0; pass < fields.length; pass += 1) {
    let changed = false;

    for (const field of fields) {
      if (
        field.conditionalOn &&
        (field.required || field.requiredWhenConditionMet) &&
        conditionMatches(field, data)
      ) {
        changed = setField(field) || changed;
      }
    }

    if (!changed) break;
  }

  return getEnrollmateValidator(flowType).parse(data);
}
