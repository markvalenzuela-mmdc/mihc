import { faker as defaultFaker, type Faker } from "@faker-js/faker";
import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";

import type { E2eProfileCoreInput } from "@/feature/e2e/schema/e2e-profile-form.schema";
import type {
  E2eProfileFixture,
  E2eProfileFormValues,
  E2eProfileMockMode,
} from "@/feature/e2e/types/e2e-profile-form.types";
import {
  getEmptyEnrollmateFieldValue,
  getEnrollmateFieldOptions,
  isEnrollmateFieldRendered,
  isEnrollmateParentFieldDisabled,
} from "./e2e-profile-form.util";

export type E2eProfileStepMockValues = {
  core: Partial<E2eProfileCoreInput>;
  enrollmate: Record<string, unknown>;
};

export type E2eProfileStepMockOptions = {
  fixtures: readonly E2eProfileFixture[];
  faker?: Faker;
};

type MockFieldContext = {
  field: EnrollmateField;
  section: EnrollmateFlowDefinition["steps"][number]["sections"][number];
};

type MockIdentity = {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  birthdate: string;
  mobile: string;
};

const UAT_NAME_MARKERS = ["SampleInternsTest", "Interns", "Intern"] as const;

function isEmptyMockValue(field: EnrollmateField, value: unknown) {
  if (value === undefined || value === null) return true;
  if (field.type === "checkbox") return value === false;
  if (field.type === "file") return typeof value !== "object";
  return typeof value !== "string" || value.trim() === "";
}

function isEmptyCoreValue(value: unknown) {
  return value === undefined || value === null || value === "";
}

function hasMeaningfulMockValue(field: EnrollmateField, value: unknown) {
  return !isEmptyMockValue(field, value);
}

function formatMockDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getUniqueMockEmail(firstName: string, lastName: string, faker: Faker) {
  const localPart = `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${localPart}.${faker.string.uuid()}@example.com`;
}

function getMockIdentity(faker: Faker): MockIdentity {
  const marker = faker.helpers.arrayElement(UAT_NAME_MARKERS);
  const firstName = `${marker} ${faker.person.firstName()}`;
  const lastName = faker.person.lastName();

  return {
    firstName,
    lastName,
    middleName: faker.person.firstName(),
    email: getUniqueMockEmail(firstName, lastName, faker),
    birthdate: formatMockDate(
      faker.date.birthdate({ min: 18, max: 35, mode: "age" }),
    ),
    mobile: `09${faker.string.numeric(9)}`,
  };
}

function getMockEmail(identity: MockIdentity, faker: Faker) {
  return getUniqueMockEmail(identity.firstName, identity.lastName, faker);
}

function getMockTextValue(
  field: EnrollmateField,
  identity: MockIdentity,
  faker: Faker,
) {
  const name = field.name.toLowerCase();

  if (field.type === "email") {
    return field.name === "email" ? identity.email : getMockEmail(identity, faker);
  }
  if (field.type === "date") return identity.birthdate;
  if (field.type === "tel") return identity.mobile;
  if (name.includes("givenname")) {
    return field.name === "givenName"
      ? identity.firstName
      : faker.person.firstName();
  }
  if (name.includes("familyname")) {
    return field.name === "familyName"
      ? identity.lastName
      : faker.person.lastName();
  }
  if (name === "middlename") return identity.middleName;
  if (name.includes("zipcode")) return faker.location.zipCode();
  if (name.includes("addrline")) return faker.location.streetAddress();
  if (name.includes("birthplace")) return faker.location.city();
  if (name.includes("occupation")) return faker.person.jobTitle();
  if (name.includes("description") || field.type === "textarea") {
    return faker.lorem.sentence({ min: 4, max: 9 });
  }

  return faker.lorem.words({ min: 2, max: 5 });
}

function getCompatibleFixture(
  field: EnrollmateField,
  fixtures: readonly E2eProfileFixture[],
) {
  return fixtures.find((fixture) => {
    const filename = fixture.filename.toLowerCase();
    const acceptsFilename =
      field.acceptedFormats.length === 0 ||
      field.acceptedFormats.some((format) => {
        const normalizedFormat = format.startsWith(".") ? format : `.${format}`;
        return filename.endsWith(normalizedFormat.toLowerCase());
      });
    const isWithinSizeLimit =
      field.maxSizeBytes === null || fixture.sizeBytes <= field.maxSizeBytes;

    return acceptsFilename && isWithinSizeLimit;
  });
}

function isCompatibleFileValue(field: EnrollmateField, value: unknown) {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<E2eProfileFixture>;
  const filename = file.filename?.toLowerCase();
  if (!filename) return false;

  return (
    (field.acceptedFormats.length === 0 ||
      field.acceptedFormats.some((format) => {
        const normalizedFormat = format.startsWith(".") ? format : `.${format}`;
        return filename.endsWith(normalizedFormat.toLowerCase());
      })) &&
    typeof file.sizeBytes === "number" &&
    (field.maxSizeBytes === null || file.sizeBytes <= field.maxSizeBytes)
  );
}

function isMockFieldValueValid(
  field: EnrollmateField,
  value: unknown,
  values: Record<string, unknown>,
) {
  if (isEmptyMockValue(field, value)) {
    return !field.required && !field.requiredWhenConditionMet;
  }

  if (field.type === "checkbox") return typeof value === "boolean";
  if (field.type === "file") return isCompatibleFileValue(field, value);
  if (typeof value !== "string" || value.trim() === "") return false;
  if (field.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (field.type === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (field.type === "select" || field.type === "combobox") {
    if (
      field.optionSource?.kind === "cascade" ||
      field.optionSource?.kind === "external"
    ) {
      return true;
    }

    return getEnrollmateFieldOptions(field, values).some(
      (option) => option.value === value,
    );
  }

  return true;
}

function canResolveRequiredFiles(
  fields: readonly EnrollmateField[],
  values: Record<string, unknown>,
  fixtures: readonly E2eProfileFixture[],
) {
  return fields.every((field) => {
    if (
      field.type !== "file" ||
      (!field.required && !field.requiredWhenConditionMet) ||
      !isEnrollmateFieldRendered(field, values) ||
      isEnrollmateParentFieldDisabled(field, values)
    ) {
      return true;
    }

    return (
      isCompatibleFileValue(field, values[field.name]) ||
      getCompatibleFixture(field, fixtures) !== undefined
    );
  });
}

function getMockOption(
  field: EnrollmateField,
  values: Record<string, unknown>,
  fields: readonly EnrollmateField[],
  fixtures: readonly E2eProfileFixture[],
  identity: MockIdentity,
  faker: Faker,
) {
  const options = getEnrollmateFieldOptions(field, values);
  if (options.length === 0) {
    return field.optionSource?.kind === "dependent"
      ? undefined
      : getMockTextValue(field, identity, faker);
  }

  const startIndex = faker.number.int({ min: 0, max: options.length - 1 });
  for (let offset = 0; offset < options.length; offset += 1) {
    const option = options[(startIndex + offset) % options.length]!;
    const candidateValues = { ...values, [field.name]: option.value };
    if (canResolveRequiredFiles(fields, candidateValues, fixtures)) {
      return option.value;
    }
  }

  return undefined;
}

function getMockFieldValue(
  field: EnrollmateField,
  values: Record<string, unknown>,
  fields: readonly EnrollmateField[],
  fixtures: readonly E2eProfileFixture[],
  identity: MockIdentity,
  faker: Faker,
) {
  if (field.type === "checkbox") {
    const preferredValue = faker.datatype.boolean();
    for (const value of [preferredValue, !preferredValue]) {
      if (
        canResolveRequiredFiles(
          fields,
          { ...values, [field.name]: value },
          fixtures,
        )
      ) {
        return value;
      }
    }
    return undefined;
  }

  if (field.type === "file") {
    return getCompatibleFixture(field, fixtures);
  }

  if (field.type === "select" || field.type === "combobox") {
    return getMockOption(field, values, fields, fixtures, identity, faker);
  }

  return getMockTextValue(field, identity, faker);
}

function setGeneratedValue(
  field: EnrollmateField,
  value: unknown,
  workingValues: Record<string, unknown>,
  result: E2eProfileStepMockValues,
) {
  if (Object.is(workingValues[field.name], value)) return false;

  workingValues[field.name] = value;
  result.enrollmate[field.name] = value;
  return true;
}

function getShouldGenerateField(
  context: MockFieldContext,
  mode: E2eProfileMockMode,
  isStepOne: boolean,
  workingValues: Record<string, unknown>,
  initiallyVisible: boolean,
  faker: Faker,
) {
  const { field } = context;
  const isVisible = isEnrollmateFieldRendered(field, workingValues);
  const isDisabled = isEnrollmateParentFieldDisabled(field, workingValues);

  if (!isVisible || isDisabled) {
    return hasMeaningfulMockValue(field, workingValues[field.name]);
  }

  if (mode === "full") return true;
  if (field.type === "checkbox") return true;
  if (isStepOne && field.name === "email") return true;
  if (!initiallyVisible) return true;
  if (!isMockFieldValueValid(field, workingValues[field.name], workingValues)) {
    return true;
  }

  return isEmptyMockValue(field, workingValues[field.name])
    ? faker.datatype.boolean()
    : false;
}

function enforceRequiredCheckboxGroups(
  contexts: readonly MockFieldContext[],
  workingValues: Record<string, unknown>,
  result: E2eProfileStepMockValues,
  fields: readonly EnrollmateField[],
  fixtures: readonly E2eProfileFixture[],
  faker: Faker,
) {
  let changed = false;
  const sections = new Set(
    contexts
      .filter(({ section }) => section.required && section.type === "checkboxGroup")
      .map(({ section }) => section),
  );

  for (const section of sections) {
    const checkboxFields = section.fields.filter(
      (field) => field.type === "checkbox",
    );
    if (
      checkboxFields.some((field) => workingValues[field.name] === true)
    ) {
      continue;
    }

    const candidates = checkboxFields.filter(
      (field) =>
        isEnrollmateFieldRendered(field, workingValues) &&
        !isEnrollmateParentFieldDisabled(field, workingValues) &&
        canResolveRequiredFiles(
          fields,
          { ...workingValues, [field.name]: true },
          fixtures,
        ),
    );
    const field = candidates[faker.number.int({ min: 0, max: candidates.length - 1 })];
    if (!field) continue;

    changed =
      setGeneratedValue(field, true, workingValues, result) || changed;
  }

  return changed;
}

export function getE2eProfileStepMockValues(
  flow: EnrollmateFlowDefinition,
  stepNumber: number,
  currentValues: E2eProfileFormValues,
  mode: E2eProfileMockMode,
  { fixtures, faker = defaultFaker }: E2eProfileStepMockOptions,
): E2eProfileStepMockValues {
  const result: E2eProfileStepMockValues = {
    core: {},
    enrollmate: {},
  };
  const identity = getMockIdentity(faker);

  if (stepNumber === 1) {
    if (mode === "full" || isEmptyCoreValue(currentValues.core.name)) {
      result.core.name = `${identity.firstName} ${identity.lastName}`;
    }
    if (
      mode === "full" ||
      isEmptyCoreValue(currentValues.core.middleName)
    ) {
      result.core.middleName = identity.middleName;
    }
    result.core.email = identity.email;
  }

  const step = flow.steps.find((candidate) => candidate.step === stepNumber);
  if (!step) return result;

  const contexts = step.sections.flatMap((section) =>
    section.fields.map((field) => ({ field, section })),
  );
  const fields = contexts.map(({ field }) => field);
  const workingValues = { ...currentValues.enrollmate };
  const initiallyVisible = new Map(
    fields.map((field) => [
      field.name,
      isEnrollmateFieldRendered(field, currentValues.enrollmate),
    ]),
  );

  for (let pass = 0; pass < Math.max(fields.length * 3, 1); pass += 1) {
    let changed = false;

    for (const context of contexts) {
      const { field } = context;
      const shouldGenerate = getShouldGenerateField(
        context,
        mode,
        stepNumber === 1,
        workingValues,
        initiallyVisible.get(field.name) ?? false,
        faker,
      );

      if (!shouldGenerate) continue;

      const isVisible = isEnrollmateFieldRendered(field, workingValues);
      const isDisabled = isEnrollmateParentFieldDisabled(field, workingValues);
      if (!isVisible || isDisabled) {
        changed =
          setGeneratedValue(
            field,
            getEmptyEnrollmateFieldValue(field),
            workingValues,
            result,
          ) || changed;
        continue;
      }

      const value = getMockFieldValue(
        field,
        workingValues,
        fields,
        fixtures,
        identity,
        faker,
      );
      if (value === undefined) continue;

      changed = setGeneratedValue(field, value, workingValues, result) || changed;
    }

    changed =
      enforceRequiredCheckboxGroups(
        contexts,
        workingValues,
        result,
        fields,
        fixtures,
        faker,
      ) || changed;

    if (!changed) break;
  }

  return result;
}
