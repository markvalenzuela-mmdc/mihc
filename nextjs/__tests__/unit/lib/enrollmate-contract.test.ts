import {
  getEnrollmateFlowDefinition,
  getEnrollmateReusableOptionSets,
  getEnrollmateValidator,
  parseEnrollmateDefinition,
  parseEnrollmateDefinitionSource,
  profileOperationalDataSchema,
  type EnrollmateField,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
import { describe, expect, it } from "vitest";
import source from "../../../../packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json";

function resolveContractFixtureField(field: EnrollmateField) {
  if (field.type === "email") return "applicant@example.edu";
  if (field.type === "date") return "2000-01-01";
  if (field.type === "tel") return "639170000000";
  if (field.type === "text" || field.type === "textarea") {
    return "Example value";
  }
  if (field.name.toLowerCase().includes("province")) return "Rizal";
  if (field.name.toLowerCase().includes("citymun")) return "Tanay";
  if (field.name.toLowerCase().includes("barangay")) return "Sampaloc";
  if (field.optionSource?.kind === "external") return "Example value";
  return undefined;
}

function createValidBachelorData() {
  return createEnrollmateFixture("bachelors", {
    resolveField: resolveContractFixtureField,
  });
}

describe("EnrollMate contract", () => {
  it("loads both scraped flows and exposes a stable hash", () => {
    expect(getEnrollmateFlowDefinition("bachelors").steps).not.toHaveLength(0);
    expect(
      getEnrollmateFlowDefinition("microcredentials").steps,
    ).not.toHaveLength(0);
    expect(getEnrollmateDefinitionHash()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("exposes all reusable option sets without sharing mutable source objects", () => {
    const first = getEnrollmateReusableOptionSets();
    const second = getEnrollmateReusableOptionSets();

    expect(Object.keys(first).sort()).toEqual([
      "countryOptions",
      "lastSchoolAttendedOptions",
      "nationalityOptions",
      "philippineProvinces",
      "religionOptions",
      "suffixOptions",
    ]);
    expect(first.countryOptions[0]).toEqual({ label: "Afghanistan", value: "Afghanistan" });
    expect(first.countryOptions).not.toBe(second.countryOptions);
    expect(first.countryOptions[0]).not.toBe(second.countryOptions[0]);
  });

  it("enforces the versioned source contract without dropping section metadata", () => {
    const parsedSource = parseEnrollmateDefinitionSource(source);
    const definition = parseEnrollmateDefinition(parsedSource);
    const fields = definition.bachelors.steps.flatMap((step) =>
      step.sections.flatMap((section) => section.fields),
    );

    expect(parsedSource.schemaVersion).toBe(1);
    expect(Object.keys(parsedSource.reusableDependentOptionSets)).toEqual([
      "philippineMunicipalitiesByProvince",
      "philippineBarangaysByMunicipality",
    ]);
    expect(
      definition.bachelors.steps[1]?.sections.find((section) => section.label === "Guardian Information"),
    ).toMatchObject({ prefix: "grdn", description: expect.any(String) });
    expect(parsedSource.reusableOptionSets.lastSchoolAttendedOptions).toHaveLength(10);
    expect(parsedSource.reusableOptionSets.lastSchoolAttendedOptions).toContainEqual({
      label: "Mapua University-Makati",
      value: "Mapua University-Makati",
    });
    expect(fields.find((field) => field.name === "lastSchoolAttended")).toMatchObject({
      options: parsedSource.reusableOptionSets.lastSchoolAttendedOptions,
      optionSource: { kind: "reusable", optionSet: "lastSchoolAttendedOptions" },
      conditionalOn: { field: "schoolNotFound", equalsAny: [false] },
      required: false,
      requiredWhenConditionMet: true,
    });
    expect(fields).toContainEqual(expect.objectContaining({
      name: "lastschOther",
      conditionalOn: { field: "schoolNotFound", equalsAny: [true] },
    }));
    expect(fields.find((field) => field.name === "curraddrCitymun")?.automation)
      .toMatchObject({ exampleOptionsByParent: { Rizal: expect.arrayContaining(["Antipolo City"]) } });
    const currentCitymun = fields.find((field) => field.name === "curraddrCitymun");
    const currentBarangay = fields.find((field) => field.name === "curraddrBarangay");
    expect(Object.keys(currentCitymun?.optionsByDependency ?? {})).toHaveLength(
      source.reusableOptionSets.philippineProvinces.length,
    );
    expect(currentCitymun?.optionsByDependency.Aurora).toEqual(expect.arrayContaining([
      { label: "Baler", value: "Baler" },
    ]));
    expect(currentBarangay?.optionsByDependency.Baler).toEqual(expect.arrayContaining([
      { label: "Barangay III (Pob.)", value: "Barangay III (Pob.)" },
    ]));
    expect(currentCitymun)
      .toMatchObject({
        optionSource: { kind: "dependent", field: "curraddrProvince" },
        optionsByDependency: {
          Rizal: expect.arrayContaining([
            { label: "Antipolo City", value: "Antipolo City" },
          ]),
        },
      });
    expect(currentBarangay)
      .toMatchObject({
        optionSource: { kind: "dependent", field: "curraddrCitymun" },
        optionsByDependency: {
          Tanay: expect.arrayContaining([
            { label: "Sampaloc", value: "Sampaloc" },
          ]),
        },
      });
  });

  it("rejects undocumented source properties", () => {
    const invalid = JSON.parse(JSON.stringify(source));
    invalid.flows.bachelors.steps[0].sections[0].fields[0].unknown = true;

    expect(() => parseEnrollmateDefinitionSource(invalid)).toThrow();
  });

  it("rejects undocumented section properties", () => {
    const invalid = JSON.parse(JSON.stringify(source));
    invalid.flows.bachelors.steps[0].sections[0].unknown = true;

    expect(() => parseEnrollmateDefinitionSource(invalid)).toThrow();
  });

  it("enforces field-specific source shapes", () => {
    const missingChoiceSource = JSON.parse(JSON.stringify(source));
    delete missingChoiceSource.flows.bachelors.steps[0].sections[0].fields[1].optionSource;
    expect(() => parseEnrollmateDefinitionSource(missingChoiceSource)).toThrow();

    const incompatibleUpload = JSON.parse(JSON.stringify(source));
    incompatibleUpload.flows.bachelors.steps[0].sections[0].fields[0].upload = {
      acceptedFormats: [".pdf"],
      maxSizeBytes: 1,
    };
    expect(() => parseEnrollmateDefinitionSource(incompatibleUpload)).toThrow();
  });

  it("rejects unknown conditional, cascade, and dependent references", () => {
    const unknownCondition = JSON.parse(JSON.stringify(source));
    unknownCondition.flows.bachelors.steps[0].sections
      .flatMap((section: { fields: Array<{ name: string; visibleWhen?: { field: string } }> }) => section.fields)
      .find((field: { name: string }) => field.name === "lastschOther")
      .visibleWhen.field = "missingField";
    expect(() => parseEnrollmateDefinition(unknownCondition)).toThrow();

    const unknownCascade = JSON.parse(JSON.stringify(source));
    unknownCascade.flows.bachelors.steps[0].sections
      .flatMap((section: { fields: Array<{ name: string; cascade?: { dependsOn?: string } }> }) => section.fields)
      .find((field: { name: string }) => field.name === "curraddrCitymun")
      .cascade.dependsOn = "missingField";
    expect(() => parseEnrollmateDefinition(unknownCascade)).toThrow();

    const unknownDependentOption = JSON.parse(JSON.stringify(source));
    unknownDependentOption.flows.bachelors.steps[0].sections
      .flatMap((section: { fields: Array<{ name: string; optionSource?: { optionsByValue?: Record<string, unknown> } }> }) => section.fields)
      .find((field: { name: string }) => field.name === "programApplied")
      .optionSource.optionsByValue.missingMajor = [
      { label: "Missing", value: "missing" },
    ];
    expect(() => parseEnrollmateDefinition(unknownDependentOption)).toThrow();
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

    const validManualValue = validator.safeParse({
      ...createValidBachelorData(),
      schoolNotFound: true,
      lastSchoolAttended: undefined,
      lastschOther: "Example Academy",
    });
    expect(validManualValue.success).toBe(true);

    const missingPrimaryValue = validator.safeParse({
      ...createValidBachelorData(),
      schoolNotFound: false,
      lastSchoolAttended: undefined,
    });
    expect(missingPrimaryValue.success).toBe(false);
    expect(missingPrimaryValue.error?.issues).toContainEqual(expect.objectContaining({
      path: ["lastSchoolAttended"],
      message: expect.stringContaining("required"),
    }));
  });

  it("enforces select-controlled required and dependent options", () => {
    const validator = getEnrollmateValidator("bachelors");
    const missingSpecialization = validator.safeParse({
      ...createValidBachelorData(),
      programFocus: "BS Information Technology",
      programApplied: undefined,
    });
    const validSpecialization = validator.safeParse({
      ...createValidBachelorData(),
      programFocus: "BS Information Technology",
      programApplied: "BS IT Data Analytics Specialization",
    });
    const invalidSpecialization = validator.safeParse({
      ...createValidBachelorData(),
      programFocus: "BS Information Technology",
      programApplied: "BS BA HR Management Specialization",
    });

    expect(missingSpecialization.success).toBe(false);
    expect(missingSpecialization.error?.issues).toContainEqual(expect.objectContaining({
      path: ["programApplied"],
      message: expect.stringContaining("required"),
    }));
    expect(validSpecialization.success).toBe(true);
    expect(invalidSpecialization.success).toBe(false);
    expect(invalidSpecialization.error?.issues).toContainEqual(expect.objectContaining({
      path: ["programApplied"],
      message: expect.stringContaining("not valid for the selected major"),
    }));
  });

  it("enforces conditional file upload format and size limits", () => {
    const validator = getEnrollmateValidator("bachelors");
    const base = createValidBachelorData();
    const invalidExtension = validator.safeParse({
      ...base,
      withMedicalCondition: "Yes",
      DR: {
        fixtureUri: "fixtures/report.txt",
        filename: "report.txt",
        mimeType: "text/plain",
        sizeBytes: 1,
      },
    });
    const oversized = validator.safeParse({
      ...base,
      withMedicalCondition: "Yes",
      DR: {
        fixtureUri: "fixtures/report.pdf",
        filename: "report.pdf",
        mimeType: "application/pdf",
        sizeBytes: 3145729,
      },
    });

    expect(invalidExtension.success).toBe(false);
    expect(invalidExtension.error?.issues).toContainEqual(expect.objectContaining({
      path: ["DR", "filename"],
      message: expect.stringContaining("unsupported file extension"),
    }));
    expect(oversized.success).toBe(false);
    expect(oversized.error?.issues).toContainEqual(expect.objectContaining({
      path: ["DR", "sizeBytes"],
      message: expect.stringContaining("upload limit"),
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
