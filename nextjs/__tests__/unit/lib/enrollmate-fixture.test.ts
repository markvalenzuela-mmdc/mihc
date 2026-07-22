import {
  getEnrollmateValidator,
  type EnrollmateField,
} from "@mihc/enrollmate-contract";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
import { describe, expect, it } from "vitest";

function resolveFixtureField(field: EnrollmateField) {
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

describe("createEnrollmateFixture", () => {
  it.each(["bachelors", "microcredentials"] as const)(
    "creates valid %s data",
    (flowType) => {
      const data = createEnrollmateFixture(flowType, {
        resolveField: resolveFixtureField,
      });

      expect(getEnrollmateValidator(flowType).safeParse(data).success).toBe(
        true,
      );
    },
  );

  it("applies overrides before evaluating conditional fields", () => {
    const data = createEnrollmateFixture("bachelors", {
      overrides: {
        schoolNotFound: true,
        lastschOther: "Example Academy",
      },
      resolveField: resolveFixtureField,
    });

    expect(data).toMatchObject({
      schoolNotFound: true,
      lastschOther: "Example Academy",
    });
  });

  it("fails with the unsupported field name when no value can be resolved", () => {
    expect(() =>
      createEnrollmateFixture("bachelors", {
        resolveField: () => undefined,
      }),
    ).toThrow(/termApplied|givenName|email/);
  });
});
