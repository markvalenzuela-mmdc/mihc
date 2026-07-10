import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";

import type { E2eProfileWorkspaceProfile } from "../../types/e2e-testing.types";

export type ProfileSheetFieldValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;
export type ProfileSheetField = {
  label: string;
  value: ProfileSheetFieldValue;
};
export type ProfileSheetGroup = { label: string; fields: ProfileSheetField[] };
type ProfileForm = E2eProfileWorkspaceProfile["profileForm"];

function getDisplayValue(value: unknown): ProfileSheetFieldValue {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string") {
    return value.trim().length === 0 ? "Not provided" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const displayValue = value.map(String).join(", ");
    return displayValue.length === 0 ? "Not provided" : displayValue;
  }

  if (
    typeof value === "object" &&
    "filename" in value &&
    typeof value.filename === "string"
  )
    return value.filename.trim().length === 0
      ? "Not provided"
      : value.filename;

  return JSON.stringify(value);
}

function getProfileGroup(
  profile: E2eProfileWorkspaceProfile,
): ProfileSheetGroup {
  return {
    label: "Profile",
    fields: [
      { label: "Name", value: getDisplayValue(profile.name) },
      { label: "Middle name", value: getDisplayValue(profile.middleName) },
      { label: "Email", value: getDisplayValue(profile.email) },
      { label: "Program", value: getDisplayValue(profile.flowType) },
      { label: "Status", value: getDisplayValue(profile.status) },
    ],
  };
}

function getDeprecatedFormGroup(
  profileForm: Extract<ProfileForm, { state: "deprecated" }>,
  flowType: E2eProfileWorkspaceProfile["flowType"],
): ProfileSheetGroup {
  return {
    label: `Deprecated ${flowType} application`,
    fields: [
      { label: "Definition hash", value: profileForm.definitionHash },
      {
        label: "Status",
        value:
          "This profile form does not match the active EnrollMate definition.",
      },
    ],
  };
}

function getInvalidFormGroup(
  profileForm: Extract<ProfileForm, { state: "invalid" }>,
  flowType: E2eProfileWorkspaceProfile["flowType"],
): ProfileSheetGroup {
  return {
    label: `Invalid ${flowType} application`,
    fields: [
      { label: "Definition hash", value: profileForm.definitionHash },
      {
        label: "Status",
        value:
          "This profile form does not satisfy the active EnrollMate definition.",
      },
      ...profileForm.validationIssues.map((issue) => ({
        label: issue.path,
        value: issue.message,
      })),
    ],
  };
}

function getActiveFormGroups(
  profileForm: Extract<ProfileForm, { state: "active" }>,
  flowType: E2eProfileWorkspaceProfile["flowType"],
): ProfileSheetGroup[] {
  const groups: ProfileSheetGroup[] = [];

  for (const step of getEnrollmateFlowDefinition(flowType).steps) {
    for (const section of step.sections) {
      const fields = section.fields.map((field) => ({
        label: field.label,
        value: getDisplayValue(profileForm.data[field.name]),
      }));

      if (fields.length > 0) {
        groups.push({ label: section.label, fields });
      }
    }
  }

  return groups;
}

function getFormGroups(
  profileForm: ProfileForm,
  flowType: E2eProfileWorkspaceProfile["flowType"],
): ProfileSheetGroup[] {
  switch (profileForm.state) {
    case "deprecated":
      return [getDeprecatedFormGroup(profileForm, flowType)];
    case "invalid":
      return [getInvalidFormGroup(profileForm, flowType)];
    case "active":
      return getActiveFormGroups(profileForm, flowType);
  }
}

function getOperationalGroups(
  profile: E2eProfileWorkspaceProfile,
): ProfileSheetGroup[] {
  const groups: ProfileSheetGroup[] = [];

  for (const [label, data] of Object.entries(profile.operationalData)) {
    if (!data) continue;

    groups.push({
      label,
      fields: Object.entries(data).map(([fieldLabel, value]) => ({
        label: fieldLabel,
        value: getDisplayValue(value),
      })),
    });
  }

  return groups;
}

export function getProfileSheetGroups(
  profile: E2eProfileWorkspaceProfile,
): ProfileSheetGroup[] {
  return [
    getProfileGroup(profile),
    ...getFormGroups(profile.profileForm, profile.flowType),
    ...getOperationalGroups(profile),
  ];
}
