import { describe, expect, it, vi } from "vitest";

import { getProfileSheetGroups } from "@/feature/e2e/components/workspace/e2e-profile-sheet-groups";
import type { E2eProfileWorkspaceProfile } from "@/feature/e2e/types/e2e-testing.types";

vi.mock("@mihc/enrollmate-contract", () => ({
  getEnrollmateFlowDefinition: () => ({
    steps: [
      {
        sections: [
          {
            label: "Applicant",
            fields: [
              { name: "firstName", label: "First name" },
              { name: "middleName", label: "Middle name" },
              { name: "suffix", label: "Suffix" },
              { name: "nickname", label: "Nickname" },
              { name: "notes", label: "Notes" },
              { name: "isWorking", label: "Working student" },
              { name: "attempts", label: "Attempts" },
            ],
          },
        ],
      },
    ],
  }),
}));

describe("getProfileSheetGroups", () => {
  it("preserves profile, form, and operational group order", () => {
    const profile = {
      name: "Ari Santos",
      middleName: null,
      email: "ari@example.edu",
      flowType: "bachelors",
      status: "new",
      profileForm: {
        data: { firstName: "Ari" },
        state: "active",
      },
      operationalData: {
        payment: { method: "Card" },
        disclosures: undefined,
      },
    } as unknown as E2eProfileWorkspaceProfile;

    expect(getProfileSheetGroups(profile)).toEqual([
      expect.objectContaining({ label: "Profile" }),
      {
        label: "Applicant",
        fields: [
          { label: "First name", value: "Ari" },
          { label: "Middle name", value: "Not provided" },
          { label: "Suffix", value: "Not provided" },
          { label: "Nickname", value: "Not provided" },
          { label: "Notes", value: "Not provided" },
          { label: "Working student", value: "Not provided" },
          { label: "Attempts", value: "Not provided" },
        ],
      },
      { label: "payment", fields: [{ label: "method", value: "Card" }] },
    ]);
  });

  it("labels deprecated forms with the parent profile flow", () => {
    const profile = {
      name: "Ari Santos",
      middleName: null,
      email: "ari@example.edu",
      flowType: "microcredentials",
      status: "new",
      profileForm: {
        definitionHash: "old-hash",
        data: {},
        state: "deprecated",
      },
      operationalData: {},
    } as unknown as E2eProfileWorkspaceProfile;

    expect(getProfileSheetGroups(profile)[1]).toEqual({
      label: "Deprecated microcredentials application",
      fields: [
        { label: "Definition hash", value: "old-hash" },
        {
          label: "Status",
          value:
            "This profile form does not match the active EnrollMate definition.",
        },
      ],
    });
  });

  it("shows every active field and labels empty answers as not provided", () => {
    const profile = {
      name: "Ari Santos",
      middleName: null,
      email: "ari@example.edu",
      flowType: "bachelors",
      status: "new",
      profileForm: {
        data: {
          firstName: "Ari",
          suffix: null,
          nickname: "",
          notes: "   ",
          isWorking: false,
          attempts: 0,
        },
        state: "active",
      },
      operationalData: {},
    } as unknown as E2eProfileWorkspaceProfile;

    const groups = getProfileSheetGroups(profile);

    expect(groups[0]).toEqual({
      label: "Profile",
      fields: [
        { label: "Name", value: "Ari Santos" },
        { label: "Middle name", value: "Not provided" },
        { label: "Email", value: "ari@example.edu" },
        { label: "Program", value: "bachelors" },
        { label: "Status", value: "new" },
      ],
    });
    expect(groups[1]).toEqual({
      label: "Applicant",
      fields: [
        { label: "First name", value: "Ari" },
        { label: "Middle name", value: "Not provided" },
        { label: "Suffix", value: "Not provided" },
        { label: "Nickname", value: "Not provided" },
        { label: "Notes", value: "Not provided" },
        { label: "Working student", value: false },
        { label: "Attempts", value: 0 },
      ],
    });
  });

  it("renders invalid forms as validation summaries", () => {
    const profile = {
      name: "Ari Santos",
      middleName: null,
      email: "ari@example.edu",
      flowType: "bachelors",
      status: "new",
      profileForm: {
        definitionHash: "current-hash",
        data: { email: "invalid" },
        state: "invalid",
        validationIssues: [
          { path: "email", message: "Invalid email address" },
          { path: "birthdate", message: "Expected an ISO date" },
        ],
      },
      operationalData: {},
    } as unknown as E2eProfileWorkspaceProfile;

    expect(getProfileSheetGroups(profile)[1]).toEqual({
      label: "Invalid bachelors application",
      fields: [
        { label: "Definition hash", value: "current-hash" },
        {
          label: "Status",
          value:
            "This profile form does not satisfy the active EnrollMate definition.",
        },
        { label: "email", value: "Invalid email address" },
        { label: "birthdate", value: "Expected an ISO date" },
      ],
    });
  });
});
