import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getEnrollmateFlowDefinition,
  getEnrollmateReusableOptionSets,
  getEnrollmateStepValidator,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";

function createFixture(
  flowType: "bachelors" | "microcredentials",
  overrides: Record<string, unknown> = {},
) {
  return createEnrollmateFixture(flowType, {
    overrides,
    resolveField: (field) => {
      if (field.type === "email") return "applicant@example.edu";
      if (field.type === "date") return "2000-01-01";
      if (field.type === "tel") return "09170000000";
      if (field.options.length > 0) return field.options[0]!.value;
      if (["text", "textarea", "combobox"].includes(field.type)) {
        return "Example value";
      }
      if (
        field.type === "select" &&
        field.options.length === 0 &&
        field.optionSource?.kind !== "dependent"
      ) {
        return "Example value";
      }
      return undefined;
    },
  });
}

function getConditionalFieldCase() {
  const flow = getEnrollmateFlowDefinition("bachelors");

  for (const step of flow.steps) {
    const fields = step.sections.flatMap((section) => section.fields);

    for (const field of fields) {
      const condition = field.conditionalOn;
      if (!condition || !field.requiredWhenConditionMet) continue;

      const controller = fields.find(
        (candidate) => candidate.name === condition.field,
      );
      const visibleValue = condition.equalsAny[0];
      const hiddenValue = controller?.options.find(
        (option) => !condition.equalsAny.includes(option.value),
      )?.value;
      const populatedValue = field.options[0]?.value;

      if (
        controller &&
        visibleValue !== undefined &&
        hiddenValue !== undefined &&
        populatedValue !== undefined
      ) {
        return {
          field,
          controller,
          hiddenValue,
          populatedValue,
          step,
          visibleValue,
        };
      }
    }
  }

  assert.fail("Expected a normalized required conditional field case.");
}

test("Playwright can consume shared EnrollMate reusable options", () => {
  const optionSets = getEnrollmateReusableOptionSets();

  assert.ok(optionSets.countryOptions.length > 0);
  assert.deepEqual(optionSets.countryOptions[0], {
    label: "Afghanistan",
    value: "Afghanistan",
  });
});

test("Playwright can consume the shared EnrollMate fixture builder", () => {
  const data = createEnrollmateFixture("microcredentials", {
    resolveField: (field) => {
      if (field.type === "email") return "applicant@example.edu";
      if (field.type === "date") return "2000-01-01";
      if (field.type === "tel") return "09170000000";
      if (field.options.length > 0) return field.options[0]!.value;
      if (field.type === "text" || field.type === "textarea") {
        return "Example value";
      }
      if (field.name.toLowerCase().includes("citymun")) return "Tanay";
      if (field.name.toLowerCase().includes("barangay")) return "Sampaloc";
      return undefined;
    },
  });

  assert.equal(data.email, "applicant@example.edu");
});

test("validates only the selected EnrollMate step", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps[0]!;
  const fixture = createFixture("bachelors");
  const activeNames = new Set(
    step.sections.flatMap((section) =>
      section.fields.map((field) => field.name),
    ),
  );
  const partial = Object.fromEntries(
    Object.entries(fixture).filter(([name]) => activeNames.has(name)),
  );

  assert.equal(
    getEnrollmateStepValidator("bachelors", step.step).safeParse(partial)
      .success,
    true,
  );
});

test("accepts untouched empty UI defaults for optional captured choices", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps[0]!;
  const suffix = step.sections
    .flatMap((section) => section.fields)
    .find((field) => field.name === "suffix")!;
  const values = {
    ...createFixture("bachelors"),
    [suffix.name]: suffix.placeholderValue,
  };

  assert.equal(suffix.required, false);
  assert.equal(suffix.placeholderValue, "");
  assert.equal(getEnrollmateValidator("bachelors").safeParse(values).success, true);
  assert.equal(
    getEnrollmateStepValidator("bachelors", step.step).safeParse(values).success,
    true,
  );
});

test("accepts empty UI defaults for hidden conditional email and date fields", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps[1]!;
  const fields = step.sections.flatMap((section) => section.fields);
  const fatherStatus = fields.find((field) => field.name === "fthrDeceased")!;
  const fatherEmail = fields.find((field) => field.name === "fthrEmail")!;
  const fatherBirthdate = fields.find((field) => field.name === "fthrBirthdate")!;
  const values = {
    ...createFixture("bachelors", { [fatherStatus.name]: "Deceased" }),
    [fatherEmail.name]: "",
    [fatherBirthdate.name]: "",
  };

  assert.equal(fatherEmail.type, "email");
  assert.equal(fatherBirthdate.type, "date");
  assert.equal(getEnrollmateValidator("bachelors").safeParse(values).success, true);
  assert.equal(
    getEnrollmateStepValidator("bachelors", step.step).safeParse(values).success,
    true,
  );
});

test("still rejects empty required visible strings and invalid checkbox or file values", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps[0]!;
  const fields = step.sections.flatMap((section) => section.fields);
  const programFocus = fields.find((field) => field.name === "programFocus")!;
  const schoolNotFound = fields.find((field) => field.name === "schoolNotFound")!;
  const permanentId = fields.find((field) => field.name === "PID")!;
  const fixture = createFixture("bachelors");

  for (const [fieldName, value] of [
    [programFocus.name, ""],
    [schoolNotFound.name, ""],
    [permanentId.name, ""],
  ] as const) {
    assert.equal(
      getEnrollmateStepValidator("bachelors", step.step).safeParse({
        ...fixture,
        [fieldName]: value,
      }).success,
      false,
    );
  }
});

test("rejects an invalid captured option on the selected step", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps[0]!;
  const field = step.sections
    .flatMap((section) => section.fields)
    .find((candidate) => candidate.options.length > 0)!;
  const result = getEnrollmateStepValidator("bachelors", step.step).safeParse({
    ...createFixture("bachelors"),
    [field.name]: "not-a-captured-option",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0]?.path, [field.name]);
  }
});

test("uses dependency values when validating the selected step", () => {
  const flow = getEnrollmateFlowDefinition("bachelors");
  const step = flow.steps.find((candidate) =>
    candidate.sections.some((section) =>
      section.fields.some((field) => field.optionSource?.kind === "dependent"),
    ),
  )!;
  const field = step.sections
    .flatMap((section) => section.fields)
    .find((candidate) => candidate.optionSource?.kind === "dependent")!;
  const fixture = createFixture("bachelors");
  if (field.optionSource?.kind !== "dependent") {
    assert.fail("Expected a dependent field in the selected step.");
  }
  const dependencyName = field.optionSource.field;
  const dependencyValue = fixture[dependencyName] as string;
  const selectedOptions = field.optionsByDependency[dependencyValue] ?? [];
  const invalidValue = `not-valid-for-${dependencyValue}`;

  assert.equal(
    selectedOptions.some((option) => option.value === invalidValue),
    false,
  );

  const result = getEnrollmateStepValidator("bachelors", step.step).safeParse({
    ...fixture,
    [field.name]: invalidValue,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.length === 1 && issue.path[0] === field.name,
      ),
    );
  }
});

test("rejects a missing conditional field when its controller makes it visible", () => {
  const { controller, field, step, visibleValue } = getConditionalFieldCase();
  const values = createFixture("bachelors", {
    [controller.name]: visibleValue,
  });
  delete values[field.name];

  const result = getEnrollmateStepValidator("bachelors", step.step).safeParse(
    values,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.length === 1 && issue.path[0] === field.name,
      ),
    );
  }
});

test("rejects a populated conditional field when its controller hides it", () => {
  const { controller, field, hiddenValue, populatedValue, step } =
    getConditionalFieldCase();
  const values = createFixture("bachelors", {
    [controller.name]: hiddenValue,
  });

  const result = getEnrollmateStepValidator("bachelors", step.step).safeParse({
    ...values,
    [field.name]: populatedValue,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.length === 1 && issue.path[0] === field.name,
      ),
    );
  }
});

test("honors a conditional controller in the current value context", () => {
  const { controller, step, visibleValue } = getConditionalFieldCase();
  const values = createFixture("bachelors", {
    [controller.name]: visibleValue,
  });
  const activeNames = new Set(
    step.sections.flatMap((section) =>
      section.fields.map((field) => field.name),
    ),
  );
  const activeValues = Object.fromEntries(
    Object.entries(values).filter(([name]) => activeNames.has(name)),
  );

  assert.equal(
    getEnrollmateStepValidator("bachelors", step.step).safeParse(activeValues)
      .success,
    true,
  );
});

test("rejects an unknown EnrollMate step", () => {
  assert.throws(
    () => getEnrollmateStepValidator("bachelors", 99),
    /Unknown bachelors step: 99/,
  );
});
