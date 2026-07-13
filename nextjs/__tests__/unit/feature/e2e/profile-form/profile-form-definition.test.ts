import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";
import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";
import { describe, expect, it } from "vitest";

import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";
import {
  clearUnavailableE2eProfileFormValues,
  extractE2eProfileStepValues,
  getDefaultE2eProfileFormValues,
  getEnrollmateFieldOptions,
  isEnrollmateFieldVisible,
} from "@/feature/e2e/utils/e2e-profile-form.util";

const bachelors = getEnrollmateFlowDefinition("bachelors");

function getBachelorsField(fieldName: string) {
  const field = bachelors.steps
    .flatMap((step) => step.sections)
    .flatMap((section) => section.fields)
    .find((candidate) => candidate.name === fieldName);

  if (!field) throw new Error(`Missing bachelors field: ${fieldName}`);
  return field;
}

describe("E2E profile form definition adapters", () => {
  it("derives defaults from the EnrollMate contract", () => {
    expect(getDefaultE2eProfileFormValues(bachelors).programFocus).toBe("");
  });

  it("evaluates visibility and removes values that are no longer available", () => {
    const lastschOther = getBachelorsField("lastschOther");

    expect(
      isEnrollmateFieldVisible(lastschOther, { schoolNotFound: true }),
    ).toBe(true);
    expect(
      clearUnavailableE2eProfileFormValues(bachelors, {
        schoolNotFound: false,
        lastschOther: "Old school",
      }),
    ).not.toHaveProperty("lastschOther");
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

  it("extracts only values owned by the active step", () => {
    const values = {
      email: "student@example.com",
      fthrGivenName: "Parent",
    };

    expect(extractE2eProfileStepValues(bachelors.steps[0]!, values)).toEqual({
      email: "student@example.com",
    });
    expect(
      extractE2eProfileStepValues(bachelors.steps[0]!, values),
    ).not.toHaveProperty("fthrGivenName");
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
});
