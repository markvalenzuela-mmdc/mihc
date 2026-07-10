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
  it("preserves profile, form, deprecated, and operational group order", () => {
    const profile = {
      name: "Ari Santos",
      middleName: null,
      email: "ari@example.edu",
      flowType: "BSIT",
      status: "new",
      profileForms: [
        {
          flowType: "bachelors",
          data: { firstName: "Ari" },
          isDeprecated: false,
        },
        {
          flowType: "microcredentials",
          definitionHash: "old-hash",
          data: {},
          isDeprecated: true,
        },
      ],
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
      {
        label: "Deprecated microcredentials application",
        fields: [
          { label: "Definition hash", value: "old-hash" },
          {
            label: "Status",
            value:
              "This profile form does not match the active EnrollMate definition.",
          },
        ],
      },
      { label: "payment", fields: [{ label: "method", value: "Card" }] },
    ]);
  });

  it("shows every active field and labels empty answers as not provided", () => {
    const profile = {
      name: "Ari Santos",
      middleName: null,
      email: "ari@example.edu",
      flowType: "bachelors",
      status: "new",
      profileForms: [
        {
          flowType: "bachelors",
          data: {
            firstName: "Ari",
            suffix: null,
            nickname: "",
            notes: "   ",
            isWorking: false,
            attempts: 0,
          },
          isDeprecated: false,
        },
      ],
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
});
