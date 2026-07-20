import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
} from "@mihc/enrollmate-contract";
import { faker } from "@faker-js/faker";
import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";
import { describe, expect, it } from "vitest";

import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";
import type { E2eProfileFormValues } from "@/feature/e2e/types/e2e-profile-form.types";
import {
  clearUnavailableE2eProfileFormValues,
  getDefaultE2eProfileFormValues,
  getEnrollmateFieldOptions,
  isEnrollmateFieldDisabled,
  isEnrollmateFieldRendered,
  isEnrollmateParentFieldDisabled,
  isEnrollmateFieldVisible,
} from "@/feature/e2e/utils/e2e-profile-form.util";
import { getE2eProfileStepMockValues } from "@/feature/e2e/utils/e2e-profile-form-mock.util";

const bachelors = getEnrollmateFlowDefinition("bachelors");

function getBachelorsField(fieldName: string) {
  const field = bachelors.steps
    .flatMap((step) => step.sections)
    .flatMap((section) => section.fields)
    .find((candidate) => candidate.name === fieldName);

  if (!field) throw new Error(`Missing bachelors field: ${fieldName}`);
  return field;
}

function getFlowFields(flow: EnrollmateFlowDefinition) {
  return flow.steps.flatMap((step) =>
    step.sections.flatMap((section) => section.fields),
  );
}

function getEmptyFormValues(
  flowType: "bachelors" | "microcredentials",
): E2eProfileFormValues {
  const flow = getEnrollmateFlowDefinition(flowType);

  return {
    core: {
      name: "",
      middleName: "",
      email: "",
      flowType,
    },
    enrollmate: clearUnavailableE2eProfileFormValues(
      flow,
      getDefaultE2eProfileFormValues(flow),
    ),
  };
}

describe("E2E profile form definition adapters", () => {
  it("derives defaults from the EnrollMate contract", () => {
    expect(getDefaultE2eProfileFormValues(bachelors).programFocus).toBe("");
  });

  it("evaluates visibility and removes values that are no longer available", () => {
    const lastSchoolAttended = getBachelorsField("lastSchoolAttended");
    const lastschOther = getBachelorsField("lastschOther");

    expect(
      isEnrollmateFieldVisible(lastSchoolAttended, { schoolNotFound: false }),
    ).toBe(true);
    expect(
      isEnrollmateFieldVisible(lastSchoolAttended, { schoolNotFound: true }),
    ).toBe(false);
    expect(
      isEnrollmateFieldRendered(lastSchoolAttended, { schoolNotFound: true }),
    ).toBe(true);
    expect(
      isEnrollmateFieldDisabled(lastSchoolAttended, { schoolNotFound: true }),
    ).toBe(true);
    expect(
      isEnrollmateFieldDisabled(lastSchoolAttended, {
        schoolNotFound: false,
      }),
    ).toBe(false);
    expect(
      isEnrollmateFieldVisible(lastschOther, { schoolNotFound: true }),
    ).toBe(true);
    expect(
      clearUnavailableE2eProfileFormValues(bachelors, {
        schoolNotFound: false,
        lastschOther: "Old school",
      }),
    ).not.toHaveProperty("lastschOther");
    expect(
      clearUnavailableE2eProfileFormValues(bachelors, {
        schoolNotFound: true,
        lastSchoolAttended: "Mapua University-Makati",
      }),
    ).not.toHaveProperty("lastSchoolAttended");
  });

  it("keeps parent fields rendered and clears non-living parent values", () => {
    const fatherName = getBachelorsField("fthrGivenName");
    const values = {
      fthrDeceased: "Deceased",
      fthrGivenName: "Existing Father",
      fthrCurraddrCountry: "Philippines",
      copyPermafatherAddressCheckbox: true,
      mthrDeceased: "Living",
      mthrGivenName: "Existing Mother",
    };

    expect(isEnrollmateFieldRendered(fatherName, values)).toBe(true);
    expect(isEnrollmateParentFieldDisabled(fatherName, values)).toBe(true);
    expect(
      isEnrollmateParentFieldDisabled(fatherName, {
        ...values,
        fthrDeceased: "Living",
      }),
    ).toBe(false);

    expect(clearUnavailableE2eProfileFormValues(bachelors, values)).toEqual(
      expect.objectContaining({
        fthrGivenName: "",
        fthrCurraddrCountry: "",
        copyPermafatherAddressCheckbox: false,
        mthrGivenName: "Existing Mother",
      }),
    );
  });

  it("resolves dependent options from the current values", () => {
    const programApplied = getBachelorsField("programApplied");

    expect(
      getEnrollmateFieldOptions(programApplied, {
        programFocus: "BS Information Technology",
      }),
    ).toContainEqual(expect.objectContaining({ value: expect.any(String) }));
    expect(
      clearUnavailableE2eProfileFormValues(bachelors, {
        programFocus: "BS Business Administration",
        programApplied: "BS IT Data Analytics Specialization",
      }),
    ).not.toHaveProperty("programApplied");
  });

  it("prunes an out-of-order conditional and dependent chain", () => {
    function createField(
      name: string,
      overrides: Partial<EnrollmateField> = {},
    ): EnrollmateField {
      return {
        id: name,
        name,
        label: name,
        type: "text",
        required: false,
        options: [],
        optionsByDependency: {},
        conditionalOn: null,
        requiredWhenConditionMet: false,
        acceptedFormats: [],
        maxSizeBytes: null,
        ...overrides,
      };
    }

    const flow: EnrollmateFlowDefinition = {
      title: "Out-of-order test flow",
      endpoint: "/test",
      steps: [
        {
          step: 1,
          title: "Test step",
          sections: [
            {
              label: "Test section",
              fields: [
                createField("dependentChild", {
                  type: "select",
                  optionSource: {
                    kind: "dependent",
                    field: "conditionalParent",
                  },
                  optionsByDependency: {
                    available: [{ label: "Choice", value: "choice" }],
                  },
                }),
                createField("conditionalParent", {
                  conditionalOn: {
                    field: "showParent",
                    equalsAny: [true],
                  },
                }),
                createField("showParent", { type: "checkbox" }),
              ],
            },
          ],
        },
      ],
    };
    const values = {
      dependentChild: "choice",
      conditionalParent: "available",
      showParent: false,
    };

    expect(clearUnavailableE2eProfileFormValues(flow, values)).toEqual({
      showParent: false,
    });
    expect(values).toEqual({
      dependentChild: "choice",
      conditionalParent: "available",
      showParent: false,
    });
  });

  it("serializes ordered steps without copying contract field definitions", () => {
    const steps = serializeE2eProfileFormEditorSteps(bachelors);
    const sourceFirstSection = bachelors.steps[0]!.sections[0]!;
    const sourcePrefixedSection = bachelors.steps[0]!.sections.find(
      (section) => section.prefix === "curraddr",
    )!;
    const serializedPrefixedSection = steps[0]!.sections.find(
      (section) => section.id === "curraddr",
    )!;

    expect(steps.map((step) => step.step)).toEqual(
      bachelors.steps.map((step) => step.step),
    );
    expect(steps[0]!.sections[0]!.id).toBe("step-1-section-1");
    expect(serializedPrefixedSection.fields[0]).toBe(
      sourcePrefixedSection.fields[0],
    );
    expect(steps[0]!.sections[0]!.fields[0]).toBe(
      sourceFirstSection.fields[0],
    );
    expect(steps[0]!.sections[0]!.fields[0]!.options).toBe(
      sourceFirstSection.fields[0]!.options,
    );
  });

  it.each(["full", "partial"] as const)(
    "generates valid %s values for every step",
    (mode) => {
      for (const flowType of ["bachelors", "microcredentials"] as const) {
        faker.seed(42);
        const flow = getEnrollmateFlowDefinition(flowType);
        const current = getEmptyFormValues(flowType);

        for (const step of flow.steps) {
          const generated = getE2eProfileStepMockValues(
            flow,
            step.step,
            current,
            mode,
            { fixtures: [], faker },
          );
          const result = getEnrollmateStepValidator(
            flowType,
            step.step,
          ).safeParse(
            clearUnavailableE2eProfileFormValues(flow, {
              ...current.enrollmate,
              ...generated.enrollmate,
            }),
          );

          expect(result.success, `${flowType} ${mode} step ${step.step}`).toBe(
            true,
          );
        }
      }
    },
  );

  it("uses a fresh coherent email for each mock invocation", () => {
    const flow = getEnrollmateFlowDefinition("bachelors");
    const current = getEmptyFormValues("bachelors");

    faker.seed(42);
    const first = getE2eProfileStepMockValues(
      flow,
      1,
      current,
      "full",
      { fixtures: [], faker },
    );
    const second = getE2eProfileStepMockValues(
      flow,
      1,
      current,
      "partial",
      { fixtures: [], faker },
    );

    expect(first.core.email).toMatch(/@example\.com$/);
    expect(second.core.email).toMatch(/@example\.com$/);
    expect(first.core.email).not.toBe(second.core.email);
    expect(first.core.email).toBe(first.enrollmate.email);
    expect(second.core.email).toBe(second.enrollmate.email);
  });

  it("includes an accepted UAT marker in the generated first name", () => {
    const flow = getEnrollmateFlowDefinition("bachelors");
    const current = getEmptyFormValues("bachelors");
    const markers = ["SampleInternsTest", "Interns", "Intern"];

    faker.seed(42);
    const generated = getE2eProfileStepMockValues(
      flow,
      1,
      current,
      "full",
      { fixtures: [], faker },
    );

    expect(markers).toContain(generated.enrollmate.givenName);
    expect(generated.core.name).toMatch(
      /^(SampleInternsTest|Interns|Intern) \S+$/,
    );
  });

  it("keeps mocked Last School Attended branches mutually exclusive", () => {
    const flow = getEnrollmateFlowDefinition("bachelors");
    const current = getEmptyFormValues("bachelors");
    let sawCheckedBranch = false;
    let sawUncheckedBranch = false;

    for (let seed = 0; seed < 20; seed += 1) {
      faker.seed(seed);
      const generated = getE2eProfileStepMockValues(
        flow,
        1,
        current,
        "full",
        { fixtures: [], faker },
      );
      const values = clearUnavailableE2eProfileFormValues(flow, {
        ...current.enrollmate,
        ...generated.enrollmate,
      });

      if (values.schoolNotFound === true) {
        sawCheckedBranch = true;
        expect(values).not.toHaveProperty("lastSchoolAttended");
        expect(values.lastschOther).toEqual(expect.any(String));
        expect(values.lastschOther).not.toBe("");
      } else {
        sawUncheckedBranch = true;
        expect(values.lastSchoolAttended).toEqual(expect.any(String));
        expect(values.lastSchoolAttended).not.toBe("");
        expect(values).not.toHaveProperty("lastschOther");
      }
    }

    expect(sawCheckedBranch).toBe(true);
    expect(sawUncheckedBranch).toBe(true);
  });

  it("preserves valid non-checkbox values in partial mode", () => {
    const flow = getEnrollmateFlowDefinition("bachelors");
    const current = getEmptyFormValues("bachelors");
    current.core.name = "Existing Student";
    current.core.email = "existing.student@example.com";
    current.enrollmate.programFocus = "BS Information Technology";

    faker.seed(42);
    const generated = getE2eProfileStepMockValues(
      flow,
      1,
      current,
      "partial",
      { fixtures: [], faker },
    );

    expect(generated.core).not.toHaveProperty("name");
    expect(generated.core.email).toMatch(/@example\.com$/);
    expect(generated.enrollmate).not.toHaveProperty("programFocus");
    expect(generated.enrollmate.programApplied).toBeTruthy();
    expect(
      getEnrollmateFieldOptions(
        getBachelorsField("programApplied"),
        {
          ...current.enrollmate,
          ...generated.enrollmate,
        },
      ),
    ).toContainEqual(
      expect.objectContaining({ value: generated.enrollmate.programApplied }),
    );
  });

  it("overwrites existing values in full mode", () => {
    const flow = getEnrollmateFlowDefinition("bachelors");
    const current = getEmptyFormValues("bachelors");
    current.core.name = "Existing Student";
    current.core.email = "existing.student@example.com";
    current.enrollmate.programFocus = "BS Information Technology";

    faker.seed(42);
    const generated = getE2eProfileStepMockValues(
      flow,
      1,
      current,
      "full",
      { fixtures: [], faker },
    );

    expect(generated.core.name).not.toBe("Existing Student");
    expect(generated.core.email).not.toBe("existing.student@example.com");
    expect(generated.enrollmate.programFocus).toBeTruthy();
  });

  it("uses only contract-resolved options for generated choices", () => {
    const flow = getEnrollmateFlowDefinition("bachelors");
    const current = getEmptyFormValues("bachelors");

    for (const step of flow.steps) {
      const generated = getE2eProfileStepMockValues(
        flow,
        step.step,
        current,
        "partial",
        { fixtures: [], faker },
      );
      const values = { ...current.enrollmate, ...generated.enrollmate };

      for (const field of getFlowFields(flow).filter(
        (candidate) =>
          candidate.type === "select" || candidate.type === "combobox",
      )) {
        if (!Object.hasOwn(generated.enrollmate, field.name)) continue;
        if (
          field.optionSource?.kind === "cascade" ||
          field.optionSource?.kind === "external"
        ) {
          continue;
        }

        expect(
          getEnrollmateFieldOptions(field, values).map(
            (option) => option.value,
          ),
        ).toContain(values[field.name]);
      }
    }
  });

});
