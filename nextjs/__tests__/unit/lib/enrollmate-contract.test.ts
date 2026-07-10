import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
  parseEnrollmateDefinition,
  parseEnrollmateDefinitionSource,
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import source from "../../../../packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json";

function createValidBachelorData() {
  const data: Record<string, unknown> = { email: "applicant@example.edu" };
  const fields = getEnrollmateFlowDefinition("bachelors").steps.flatMap((step) =>
    step.sections.flatMap((section) => section.fields),
  );

  function setField(field: (typeof fields)[number]) {
    if (data[field.name] !== undefined) return;
    if (field.type === "checkbox") data[field.name] = false;
    else if (field.type === "file") {
      data[field.name] = {
        fixtureUri: `fixtures/${field.name}.pdf`,
        filename: `${field.name}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1,
      };
    } else if (field.type === "email") data[field.name] = "applicant@example.edu";
    else if (field.type === "date") data[field.name] = "2000-01-01";
    else if (field.options.length) data[field.name] = field.options[0]!.value;
    else if (Object.keys(field.optionsByDependency).length) {
      data[field.name] = Object.values(field.optionsByDependency)[0]![0]!.value;
    } else data[field.name] = "Seeded value";
  }

  for (const field of fields) {
    if (field.required && !field.conditionalOn) setField(field);
  }
  for (const field of fields) {
    if (data[field.name] !== undefined || !field.conditionalOn) continue;
    const parentValue = data[field.conditionalOn.field];
    if (
      (typeof parentValue === "string" || typeof parentValue === "boolean") &&
      field.conditionalOn.equalsAny.includes(parentValue) &&
      (field.required || field.requiredWhenConditionMet)
    ) {
      setField(field);
    }
  }

  return data;
}

describe("EnrollMate contract", () => {
  it("loads both scraped flows and exposes a stable hash", () => {
    expect(getEnrollmateFlowDefinition("bachelors").steps).not.toHaveLength(0);
    expect(
      getEnrollmateFlowDefinition("microcredentials").steps,
    ).not.toHaveLength(0);
    expect(getEnrollmateDefinitionHash()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("enforces the versioned source contract without dropping section metadata", () => {
    const parsedSource = parseEnrollmateDefinitionSource(source);
    const definition = parseEnrollmateDefinition(parsedSource);
    const fields = definition.bachelors.steps.flatMap((step) =>
      step.sections.flatMap((section) => section.fields),
    );

    expect(parsedSource.schemaVersion).toBe(1);
    expect(
      definition.bachelors.steps[1]?.sections.find((section) => section.label === "Guardian Information"),
    ).toMatchObject({ prefix: "grdn", description: expect.any(String) });
    expect(fields).toContainEqual(expect.objectContaining({
      name: "lastschOther",
      conditionalOn: { field: "schoolNotFound", equalsAny: [true] },
    }));
  });

  it("rejects undocumented source properties", () => {
    const invalid = JSON.parse(JSON.stringify(source));
    invalid.flows.bachelors.steps[0].sections[0].fields[0].unknown = true;

    expect(() => parseEnrollmateDefinitionSource(invalid)).toThrow();
  });

  it("supports declared reusable option sets without hard-coded keys", () => {
    const dynamic = JSON.parse(JSON.stringify(source));
    dynamic.reusableOptionSets.deliveryOptions = [{ label: "Online", value: "online" }];
    dynamic.flows.bachelors.steps[0].sections[0].fields[1].optionSource = {
      kind: "reusable",
      optionSet: "deliveryOptions",
    };

    expect(parseEnrollmateDefinition(dynamic).bachelors.steps[0]?.sections[0]?.fields[1]?.options)
      .toEqual([{ label: "Online", value: "online" }]);

    dynamic.flows.bachelors.steps[0].sections[0].fields[1].optionSource.optionSet = "missingOptions";
    expect(() => parseEnrollmateDefinition(dynamic)).toThrow();
  });

  it("evaluates boolean conditional fields from the shared definition", () => {
    const validator = getEnrollmateValidator("bachelors");
    const hiddenValue = validator.safeParse({
      ...createValidBachelorData(),
      schoolNotFound: false,
      lastschOther: "Example Academy",
    });
    const missingVisibleValue = validator.safeParse({
      ...createValidBachelorData(),
      schoolNotFound: true,
    });

    expect(hiddenValue.success).toBe(false);
    expect(hiddenValue.error?.issues).toContainEqual(expect.objectContaining({
      path: ["lastschOther"],
      message: expect.stringContaining("not available"),
    }));
    expect(missingVisibleValue.success).toBe(false);
    expect(missingVisibleValue.error?.issues).toContainEqual(expect.objectContaining({
      path: ["lastschOther"],
      message: expect.stringContaining("required"),
    }));
  });

  it("rejects values outside captured select options", () => {
    const result = getEnrollmateValidator("bachelors").safeParse({
      gender: "Not a captured option",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown operational sections", () => {
    expect(profileOperationalDataSchema.safeParse({ other: {} }).success).toBe(false);
  });
});
