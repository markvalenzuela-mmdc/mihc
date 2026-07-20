import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";
import { parseISO, isValid } from "date-fns";

function getEnrollmateFields(flow: EnrollmateFlowDefinition) {
  return flow.steps.flatMap((step) =>
    step.sections.flatMap((section) => section.fields),
  );
}

export function getEmptyEnrollmateFieldValue(field: EnrollmateField) {
  if (field.type === "checkbox") return false;
  if (field.type === "file") return undefined;
  return "";
}

function getParentStatusFieldName(fieldName: string) {
  if (
    fieldName.startsWith("fthr") ||
    fieldName.startsWith("copyfather") ||
    fieldName.startsWith("copyPermafather")
  ) {
    return "fthrDeceased";
  }
  if (
    fieldName.startsWith("mthr") ||
    fieldName.startsWith("copyMother") ||
    fieldName.startsWith("copyPermaMother")
  ) {
    return "mthrDeceased";
  }
  return undefined;
}

export function isEnrollmateParentField(field: EnrollmateField) {
  return getParentStatusFieldName(field.name) !== undefined;
}

export function isEnrollmateParentFieldDisabled(
  field: EnrollmateField,
  values: Record<string, unknown>,
) {
  const statusFieldName = getParentStatusFieldName(field.name);
  return (
    statusFieldName !== undefined &&
    field.name !== statusFieldName &&
    values[statusFieldName] !== "Living"
  );
}

export function isEnrollmateFieldDisabled(
  field: EnrollmateField,
  values: Record<string, unknown>,
) {
  return (
    isEnrollmateParentFieldDisabled(field, values) ||
    (field.name === "lastSchoolAttended" && values.schoolNotFound === true)
  );
}

export function getDefaultE2eProfileFormValues(
  flow: EnrollmateFlowDefinition,
): Record<string, unknown> {
  return Object.fromEntries(
    getEnrollmateFields(flow).map((field) => {
      if (field.defaultValue !== undefined) {
        return [field.name, field.defaultValue];
      }
      if (field.placeholderValue !== undefined) {
        return [field.name, field.placeholderValue];
      }
      if (field.type === "checkbox") return [field.name, false];
      if (field.type === "file") return [field.name, undefined];
      return [field.name, ""];
    }),
  );
}

export function isEnrollmateFieldVisible(
  field: EnrollmateField,
  values: Record<string, unknown>,
): boolean {
  const condition = field.conditionalOn;
  if (!condition) return true;

  return condition.equalsAny.some((value) => value === values[condition.field]);
}

export function isEnrollmateFieldRendered(
  field: EnrollmateField,
  values: Record<string, unknown>,
) {
  return (
    isEnrollmateParentField(field) ||
    field.name === "lastSchoolAttended" ||
    isEnrollmateFieldVisible(field, values)
  );
}

export function getEnrollmateFieldOptions(
  field: EnrollmateField,
  values: Record<string, unknown>,
): EnrollmateField["options"] {
  if (field.optionSource?.kind !== "dependent") return field.options;

  const dependencyValue = values[field.optionSource.field];
  if (typeof dependencyValue !== "string") return [];
  return field.optionsByDependency[dependencyValue] ?? [];
}

export function clearUnavailableE2eProfileFormValues(
  flow: EnrollmateFlowDefinition,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const availableValues = { ...values };
  const fields = getEnrollmateFields(flow);

  for (let pass = 0; pass < fields.length; pass += 1) {
    let changed = false;

    for (const field of fields) {
      if (!isEnrollmateFieldVisible(field, availableValues)) {
        if (isEnrollmateParentField(field)) {
          const emptyValue = getEmptyEnrollmateFieldValue(field);
          if (availableValues[field.name] !== emptyValue) {
            availableValues[field.name] = emptyValue;
            changed = true;
          }
          continue;
        }
        if (Object.hasOwn(availableValues, field.name)) {
          delete availableValues[field.name];
          changed = true;
        }
        continue;
      }

      if (field.optionSource?.kind !== "dependent") continue;
      const selectedValue = availableValues[field.name];
      if (selectedValue === undefined || selectedValue === "") continue;

      const isAvailable = getEnrollmateFieldOptions(
        field,
        availableValues,
      ).some((option) => option.value === selectedValue);
      if (!isAvailable) {
        delete availableValues[field.name];
        changed = true;
      }
    }

    if (!changed) break;
  }

  return availableValues;
}

export function parseDateValue(value: string) {
  if (!value) return undefined;

  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}
