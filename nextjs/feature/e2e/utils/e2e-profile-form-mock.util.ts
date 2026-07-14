import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";

import type { E2eProfileCoreInput } from "@/feature/e2e/schema/e2e-profile-form.schema";
import type {
  E2eProfileFixture,
  E2eProfileFormValues,
} from "@/feature/e2e/types/e2e-profile-form.types";
import {
  getEnrollmateFieldOptions,
  isEnrollmateFieldRendered,
  isEnrollmateParentFieldDisabled,
} from "./e2e-profile-form.util";

export type E2eProfileStepMockValues = {
  core: Partial<E2eProfileCoreInput>;
  enrollmate: Record<string, unknown>;
};

function isEmptyMockValue(value: unknown) {
  return value === undefined || value === null || value === "";
}

function getMockTextValue(field: EnrollmateField) {
  const name = field.name.toLowerCase();

  if (field.type === "email") return "mock.student@example.com";
  if (field.type === "date") return "2000-01-01";
  if (field.type === "tel") return "09171234567";
  if (name.includes("zipcode")) return "1000";
  if (name.includes("addrline")) return "123 Mock Street";
  if (name.includes("givenname")) return "Alex";
  if (name.includes("familyname")) return "Tester";
  if (name.includes("birthplace")) return "Manila";
  if (name.includes("occupation")) return "Student";

  return `Mock ${field.label}`;
}

function getCompatibleFixture(
  field: EnrollmateField,
  fixtures: readonly E2eProfileFixture[],
) {
  return fixtures.find((fixture) => {
    const filename = fixture.filename.toLowerCase();
    const acceptsFilename = field.acceptedFormats.some((format) => {
      const normalizedFormat = format.startsWith(".") ? format : `.${format}`;
      return filename.endsWith(normalizedFormat.toLowerCase());
    });
    const isWithinSizeLimit =
      field.maxSizeBytes === null || fixture.sizeBytes <= field.maxSizeBytes;

    return acceptsFilename && isWithinSizeLimit;
  });
}

function getMockFieldValue(
  field: EnrollmateField,
  values: Record<string, unknown>,
  fields: readonly EnrollmateField[],
  fixtures: readonly E2eProfileFixture[],
) {
  if (field.type === "checkbox") return false;

  if (field.type === "file") {
    return getCompatibleFixture(field, fixtures);
  }

  if (field.type === "select" || field.type === "combobox") {
    if (
      field.optionSource?.kind === "cascade" ||
      field.optionSource?.kind === "external"
    ) {
      return getMockTextValue(field);
    }

    const options = getEnrollmateFieldOptions(field, values);
    for (const option of options) {
      const candidateValues = { ...values, [field.name]: option.value };
      const revealsUnfillableRequiredField = fields.some((candidate) => {
        if (candidate.conditionalOn?.field !== field.name) return false;
        if (!candidate.required && !candidate.requiredWhenConditionMet) {
          return false;
        }
        if (!isEnrollmateFieldRendered(candidate, candidateValues)) {
          return false;
        }
        if (!isEmptyMockValue(candidateValues[candidate.name])) return false;
        if (candidate.type !== "file") return false;

        return (
          getMockFieldValue(
            candidate,
            candidateValues,
            fields,
            fixtures,
          ) === undefined
        );
      });

      if (!revealsUnfillableRequiredField) return option.value;
    }

    return undefined;
  }

  return getMockTextValue(field);
}

export function getE2eProfileStepMockValues(
  flow: EnrollmateFlowDefinition,
  stepNumber: number,
  currentValues: E2eProfileFormValues,
  fixtures: readonly E2eProfileFixture[],
): E2eProfileStepMockValues {
  const result: E2eProfileStepMockValues = {
    core: {},
    enrollmate: {},
  };

  if (stepNumber === 1) {
    if (isEmptyMockValue(currentValues.core.name)) {
      result.core.name = "Mock Student";
    }
    if (isEmptyMockValue(currentValues.core.middleName)) {
      result.core.middleName = "M.";
    }
    if (isEmptyMockValue(currentValues.core.email)) {
      result.core.email = "mock.student@example.com";
    }
  }

  const step = flow.steps.find((candidate) => candidate.step === stepNumber);
  if (!step) return result;

  const fields = step.sections.flatMap((section) => section.fields);
  const workingValues = { ...currentValues.enrollmate };

  for (let pass = 0; pass < fields.length; pass += 1) {
    let changed = false;

    for (const field of fields) {
      if (!isEmptyMockValue(workingValues[field.name])) continue;
      if (!isEnrollmateFieldRendered(field, workingValues)) continue;
      if (isEnrollmateParentFieldDisabled(field, workingValues)) continue;

      const value = getMockFieldValue(
        field,
        workingValues,
        fields,
        fixtures,
      );
      if (value === undefined) continue;

      workingValues[field.name] = value;
      result.enrollmate[field.name] = value;
      changed = true;
    }

    if (!changed) break;
  }

  return result;
}
