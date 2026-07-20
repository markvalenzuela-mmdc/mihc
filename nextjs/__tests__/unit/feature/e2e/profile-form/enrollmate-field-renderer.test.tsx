import {
  getEnrollmateFlowDefinition,
  type EnrollmateField,
  type EnrollmateFieldType,
} from "@mihc/enrollmate-contract";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import { EnrollmateFieldRenderer } from "@/feature/e2e/components/profile-form/enrollmate-field-renderer";
import { EnrollmateSection } from "@/feature/e2e/components/profile-form/enrollmate-section";
import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";
import type { E2eProfileFixture } from "@/feature/e2e/types/e2e-profile-form.types";

const bachelors = getEnrollmateFlowDefinition("bachelors");
const allFields = bachelors.steps.flatMap((step) =>
  step.sections.flatMap((section) => section.fields),
);
const fixtures: E2eProfileFixture[] = [
  {
    fixtureUri: "fixtures/first/doctor-report.pdf",
    filename: "doctor-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
  },
  {
    fixtureUri: "fixtures/second/doctor-report.pdf",
    filename: "doctor-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 4096,
  },
];

function getField(name: string) {
  const field = allFields.find((candidate) => candidate.name === name);
  if (!field) throw new Error(`Missing bachelors field: ${name}`);
  return field;
}

function getFieldByType(type: EnrollmateFieldType) {
  const field = allFields.find((candidate) => candidate.type === type);
  if (!field) throw new Error(`Missing bachelors field type: ${type}`);
  return field;
}

function getFieldByOptionSource(
  kind: NonNullable<EnrollmateField["optionSource"]>["kind"],
) {
  const field = allFields.find(
    (candidate) => candidate.optionSource?.kind === kind,
  );
  if (!field) throw new Error(`Missing bachelors option source: ${kind}`);
  return field;
}

function getVisibilityValues(field: EnrollmateField) {
  return field.conditionalOn
    ? { [field.conditionalOn.field]: field.conditionalOn.equalsAny[0] }
    : {};
}

type RendererHarnessProps = {
  definition: EnrollmateField;
  initialValue?: unknown;
  values?: Record<string, unknown>;
  validationError?: unknown;
};

function RendererHarness({
  definition,
  initialValue = "",
  values = {},
  validationError,
}: RendererHarnessProps) {
  const form = useAppForm({
    defaultValues: {
      enrollmate: { [definition.name]: initialValue },
    },
  });

  return (
    <form.AppForm>
      <form.AppField
        name={`enrollmate.${definition.name}`}
        validators={
          validationError !== undefined
            ? {
                onBlur: ({ value }) => (value ? undefined : validationError),
              }
            : undefined
        }
      >
        {(field) => (
          <>
            <EnrollmateFieldRenderer
              boundField={field}
              definition={definition}
              fixtures={fixtures}
              values={values}
            />
            <output data-testid="field-value">
              {JSON.stringify(field.state.value)}
            </output>
          </>
        )}
      </form.AppField>
    </form.AppForm>
  );
}

describe("EnrollmateFieldRenderer", () => {
  it.each([
    ["email", "email"],
    ["mobile", "tel"],
  ])("uses a semantic input type for %s", (fieldName, inputType) => {
    const definition = getField(fieldName);
    render(<RendererHarness definition={definition} />);

    expect(screen.getByLabelText(definition.label)).toHaveAttribute(
      "type",
      inputType,
    );
  });

  it("renders date fields with the Shadcn date picker", async () => {
    const definition = getField("birthdate");
    render(
      <RendererHarness
        definition={definition}
        initialValue="2000-01-02"
      />,
    );

    const datePicker = screen.getByRole("button", {
      name: definition.label,
    });
    expect(datePicker).toHaveTextContent("2000");
    expect(screen.queryByDisplayValue("2000-01-02")).not.toBeInTheDocument();

    fireEvent.click(datePicker);
    await waitFor(() =>
      expect(document.querySelector('[data-slot="calendar"]')).toBeInTheDocument(),
    );
  });

  it.each(["inline", "reusable"] as const)(
    "renders normalized %s options from the contract field",
    async (sourceKind) => {
      const definition = getFieldByOptionSource(sourceKind);
      render(<RendererHarness definition={definition} />);

      fireEvent.click(screen.getByRole("combobox", { name: definition.label }));

      expect(
        await screen.findByRole("option", {
          name: definition.options[0]!.label,
        }),
      ).toBeInTheDocument();
    },
  );

  it("changes dependent options with the parent value", async () => {
    const definition = getFieldByOptionSource("dependent");
    if (definition.optionSource?.kind !== "dependent") {
      throw new Error("Expected a dependent option source");
    }
    const dependencyField = definition.optionSource.field;
    const firstParent = Object.keys(definition.optionsByDependency)[0]!;
    const secondParent = Object.keys(definition.optionsByDependency)[1]!;
    render(
      <RendererHarness
        definition={definition}
        values={{ [dependencyField]: firstParent }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: definition.label }));
    expect(
      await screen.findByRole("option", {
        name: definition.optionsByDependency[firstParent]![0]!.label,
      }),
    ).toBeInTheDocument();

    cleanup();
    render(
      <RendererHarness
        definition={definition}
        values={{ [dependencyField]: secondParent }}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: definition.label }));

    expect(
      await screen.findByRole("option", {
        name: definition.optionsByDependency[secondParent]![0]!.label,
      }),
    ).toBeInTheDocument();
  });

  it("renders municipality and barangay options from their selected parents", async () => {
    const municipality = getField("curraddrCitymun");
    const barangay = getField("curraddrBarangay");

    render(
      <RendererHarness
        definition={municipality}
        values={{ curraddrCountry: "Philippines", curraddrProvince: "Rizal" }}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: municipality.label }));
    expect(
      await screen.findByRole("option", { name: "Antipolo City" }),
    ).toBeInTheDocument();

    cleanup();
    render(
      <RendererHarness
        definition={barangay}
        values={{ curraddrCountry: "Philippines", curraddrCitymun: "Tanay" }}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: barangay.label }));
    expect(
      await screen.findByRole("option", { name: "Sampaloc" }),
    ).toBeInTheDocument();
  });

  it("accepts free-entry strings for external option sources", async () => {
    const definition = getFieldByOptionSource("external");
    render(
      <RendererHarness
        definition={definition}
        values={getVisibilityValues(definition)}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: definition.label }), {
      target: { value: "Operator supplied value" },
    });

    await waitFor(() =>
      expect(screen.getByTestId("field-value")).toHaveTextContent(
        '"Operator supplied value"',
      ),
    );
  });

  it("stores checkbox state as a boolean", async () => {
    const definition = getFieldByType("checkbox");
    render(
      <RendererHarness definition={definition} initialValue={false} />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: definition.label }));

    expect(
      screen.getByRole("checkbox", { name: definition.label }),
    ).toHaveAttribute("data-slot", "checkbox");
    expect(
      screen.getByRole("checkbox", { name: definition.label }),
    ).toHaveClass("order-first");
    expect(screen.getByRole("group")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );

    await waitFor(() =>
      expect(screen.getByTestId("field-value")).toHaveTextContent("true"),
    );
  });

  it("selects duplicate fixture filenames by fixture URI identity", async () => {
    const definition = getFieldByType("file");
    render(
      <RendererHarness
        definition={definition}
        initialValue={undefined}
        values={{ withMedicalCondition: "Yes" }}
      />,
    );

    const input = screen.getByRole("combobox", { name: definition.label });
    const inputGroup = input.closest('[data-slot="input-group"]');
    if (!(inputGroup instanceof HTMLElement)) {
      throw new Error("Fixture combobox is missing its input group");
    }
    fireEvent.click(within(inputGroup).getByRole("button"));
    const duplicateOptions = await screen.findAllByRole("option", {
      name: fixtures[1]!.filename,
    });
    fireEvent.click(duplicateOptions[1]!);

    await waitFor(() =>
      expect(screen.getByTestId("field-value")).toHaveTextContent(
        JSON.stringify(fixtures[1]),
      ),
    );
  });

  it("does not render a conditional field when its condition is unmet", () => {
    const definition = getFieldByType("textarea");
    render(
      <RendererHarness
        definition={definition}
        values={{ withMedicalCondition: "No" }}
      />,
    );

    expect(screen.queryByLabelText(definition.label)).not.toBeInTheDocument();
  });

  it("keeps non-living parent fields visible and disables them", () => {
    const definition = getField("fthrGivenName");
    render(
      <RendererHarness
        definition={definition}
        initialValue="Existing Father"
        values={{ fthrDeceased: "Deceased" }}
      />,
    );

    expect(screen.getByLabelText(definition.label)).toBeDisabled();
    expect(screen.getByLabelText(definition.label)).toHaveValue(
      "Existing Father",
    );
  });

  it("keeps the known-school field visible and disables it when the school is not found", () => {
    const definition = getField("lastSchoolAttended");

    render(
      <RendererHarness
        definition={definition}
        initialValue=""
        values={{ schoolNotFound: true }}
      />,
    );

    expect(screen.getByLabelText(definition.label)).toBeDisabled();
  });

  it("associates labels and descriptions and announces field errors", async () => {
    const definition = getFieldByOptionSource("external");
    render(
      <RendererHarness
        definition={definition}
        validationError="This field is required"
      />,
    );

    const input = screen.getByLabelText(definition.label);
    expect(input).toHaveAccessibleDescription(definition.description);
    expect(input).toHaveAttribute("aria-required", "true");

    fireEvent.blur(input);

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(
      "This field is required",
    );
    expect(input).toHaveAttribute("aria-errormessage", error.id);
  });

  it.each([
    [
      "studentCompany",
      getVisibilityValues(getField("studentCompany")),
      "textbox",
    ],
    [
      "medicalDiagnosisDescription",
      { withMedicalCondition: "Yes" },
      "textbox",
    ],
    ["programFocus", {}, "combobox"],
  ])(
    "forwards description and required metadata to the %s registered control",
    (fieldName, values, role) => {
    const definition = getField(fieldName);
    render(
      <RendererHarness
        definition={definition}
        values={values}
      />,
    );

    const control = screen.getByRole(role, { name: definition.label });
    expect(control).toHaveAccessibleDescription(definition.description);
    expect(control).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("(required)")).toBeVisible();
    },
  );

  it.each([
    ["string", "String error"],
    ["message object", { message: "Object error" }],
    [
      "issue array",
      [{ message: "First issue" }, { message: "Second issue" }],
    ],
  ])("normalizes the %s TanStack error shape", async (_shape, validationError) => {
    const definition = getField("givenName");
    render(
      <RendererHarness
        definition={definition}
        validationError={validationError}
      />,
    );

    const input = screen.getByLabelText(definition.label);
    fireEvent.blur(input);

    const error = await screen.findByRole("alert");
    const expectedMessages =
      typeof validationError === "string"
        ? [validationError]
        : Array.isArray(validationError)
          ? validationError.map((issue) => issue.message)
          : [validationError.message];
    for (const message of expectedMessages) {
      expect(error).toHaveTextContent(message);
    }
    expect(input).toHaveAttribute("aria-errormessage", error.id);
  });

  it.each([
    "text",
    "textarea",
    "email",
    "tel",
    "date",
    "select",
    "combobox",
    "checkbox",
    "file",
  ] satisfies EnrollmateFieldType[])("renders the %s contract field type", (type) => {
    const definition = getFieldByType(type);
    const values = definition.conditionalOn
      ? { [definition.conditionalOn.field]: definition.conditionalOn.equalsAny[0] }
      : {};

    const { container } = render(
      <RendererHarness
        definition={definition}
        initialValue={
          type === "checkbox" ? false : type === "file" ? undefined : ""
        }
        values={values}
      />,
    );

    expect(container.querySelector('[data-slot="field"]')).toBeInTheDocument();
  });
});

describe("EnrollmateSection", () => {
  it("renders contract context and preserves field order", () => {
    const sections = serializeE2eProfileFormEditorSteps(bachelors).flatMap(
      (step) => step.sections,
    );
    const describedSection = sections.find((section) => section.description);
    const notedSection = sections.find((section) => section.notes);
    if (!describedSection || !notedSection) {
      throw new Error("Expected contract sections with descriptions and notes");
    }

    const { container } = render(
      <>
        {[describedSection, notedSection].map((section) => (
          <EnrollmateSection
            key={section.id}
            section={section}
            fixtures={fixtures}
            values={{}}
            renderField={({ definition }) => (
              <span data-field-name={definition.name}>{definition.label}</span>
            )}
          />
        ))}
      </>,
    );

    expect(
      screen.getByRole("heading", { name: describedSection.label }),
    ).toBeInTheDocument();
    expect(screen.getByText(describedSection.description!)).toBeInTheDocument();
    expect(screen.getByText(notedSection.notes!)).toBeInTheDocument();
    expect(
      [...container.querySelectorAll("[data-field-name]")].map((element) =>
        element.getAttribute("data-field-name"),
      ),
    ).toEqual(
      [describedSection, notedSection].flatMap((section) =>
        section.fields.map((field) => field.name),
      ),
    );
  });

  it("does not leave a layout child for a hidden conditional field", () => {
    const section = serializeE2eProfileFormEditorSteps(bachelors)
      .flatMap((step) => step.sections)
      .find((candidate) => candidate.fields.some((field) => field.conditionalOn));
    if (!section) throw new Error("Expected a section with a conditional field");

    const hiddenField = section.fields.find((field) => field.conditionalOn);
    if (!hiddenField?.conditionalOn) {
      throw new Error("Expected a conditional field");
    }

    const { container } = render(
      <EnrollmateSection
        section={section}
        fixtures={fixtures}
        values={{ [hiddenField.conditionalOn.field]: "unmatched" }}
        renderField={({ definition }) =>
          definition.id === hiddenField.id ? null : (
            <span data-field-name={definition.name}>{definition.label}</span>
          )
        }
      />,
    );

    expect(
      container.querySelector(`[data-field-name="${hiddenField.name}"]`),
    ).not.toBeInTheDocument();
    expect(
      [...container.querySelectorAll("[data-field-name]")].some(
        (element) => element.parentElement?.childElementCount === 0,
      ),
    ).toBe(false);
  });

  it("renders a real required checkbox group as a labelled fieldset", () => {
    const section = serializeE2eProfileFormEditorSteps(bachelors)
      .flatMap((step) => step.sections)
      .find(
        (candidate) =>
          candidate.type === "checkboxGroup" && candidate.required,
      );
    if (!section) throw new Error("Expected a required checkbox group section");

    const { container } = render(
      <EnrollmateSection
        section={section}
        fixtures={fixtures}
        values={{}}
        renderField={({ definition }) => <span>{definition.label}</span>}
      />,
    );

    const fieldset = screen.getByRole("group", {
      name: `${section.label} (required)`,
    });
    expect(fieldset.tagName).toBe("FIELDSET");
    expect(within(fieldset).getByText("(required)")).toBeVisible();
    expect(
      container.querySelector('[data-slot="checkbox-group"]'),
    ).toBeInTheDocument();
  });
});
