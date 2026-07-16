import { beforeEach, describe, expect, it, vi } from "vitest";

const stepSafeParse = vi.hoisted(() => vi.fn());

vi.mock("@mihc/enrollmate-contract", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@mihc/enrollmate-contract")
  >();

  return {
    ...actual,
    getEnrollmateStepValidator: vi.fn(() => ({
      safeParse: stepSafeParse,
    })),
  };
});

import {
  getErrorMessages,
  getIssueErrors,
  normalizeActionFieldErrors,
  validateProfileFormStep,
} from "@/feature/e2e/components/profile-form/e2e-profile-form-validation";

describe("E2E profile-form validation helpers", () => {
  beforeEach(() => {
    stepSafeParse.mockReset();
  });

  it("maps repeated issues to the first path segment", () => {
    expect(
      getIssueErrors(
        [
          { path: ["email"], message: "Email is required." },
          { path: ["email", "domain"], message: "Email is invalid." },
        ],
        "core",
      ),
    ).toEqual({
      "core.email": ["Email is required.", "Email is invalid."],
    });
  });

  it("normalizes action field names by section", () => {
    expect(
      normalizeActionFieldErrors({
        email: ["Email is already used."],
        "enrollmate.givenName": ["Given name is required."],
        postalCode: ["Postal code is required."],
      }),
    ).toEqual({
      "core.email": ["Email is already used."],
      "enrollmate.givenName": ["Given name is required."],
      "enrollmate.postalCode": ["Postal code is required."],
    });
  });

  it("deduplicates error-summary messages in encounter order", () => {
    expect(
      getErrorMessages({
        "core.name": ["Required."],
        "core.email": ["Required.", "Invalid."],
      }),
    ).toEqual(["Required.", "Invalid."]);
  });

  it("returns parsed core and step data when both validators succeed", () => {
    const parsedStep = { givenName: "Parsed" };
    stepSafeParse.mockReturnValue({ success: true, data: parsedStep });

    expect(
      validateProfileFormStep({
        core: {
          name: "Ari Santos",
          middleName: "",
          email: "ari@example.com",
          flowType: "bachelors",
        },
        enrollmate: { givenName: "Ari" },
        flowType: "bachelors",
        stepNumber: 1,
      }),
    ).toEqual({
      ok: true,
      core: {
        name: "Ari Santos",
        middleName: "",
        email: "ari@example.com",
        flowType: "bachelors",
      },
      enrollmate: parsedStep,
    });
  });

  it("merges core and step errors when either validator fails", () => {
    stepSafeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ path: ["givenName"], message: "Given name is required." }],
      },
    });

    expect(
      validateProfileFormStep({
        core: {
          name: "",
          middleName: "",
          email: "invalid",
          flowType: "bachelors",
        },
        enrollmate: {},
        flowType: "bachelors",
        stepNumber: 1,
      }),
    ).toEqual({
      ok: false,
      errors: {
        "core.name": ["Name is required."],
        "core.email": ["Enter a valid email address."],
        "enrollmate.givenName": ["Given name is required."],
      },
    });
  });
});
