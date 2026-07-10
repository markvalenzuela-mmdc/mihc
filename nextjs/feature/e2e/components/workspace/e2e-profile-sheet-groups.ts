import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";

import type { E2eProfileWorkspaceProfile } from "../../types/e2e-testing.types";

export type ProfileSheetFieldValue = string | number | boolean | Date | null | undefined;
export type ProfileSheetField = { label: string; value: ProfileSheetFieldValue };
export type ProfileSheetGroup = { label: string; fields: ProfileSheetField[] };

function valueForDisplay(value: unknown): ProfileSheetFieldValue {
  if (value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object" && "filename" in value && typeof value.filename === "string") return value.filename;
  return JSON.stringify(value);
}

function formGroups(profileForm: E2eProfileWorkspaceProfile["profileForms"][number]) {
  if (profileForm.isDeprecated) {
    return [{ label: `Deprecated ${profileForm.flowType} application`, fields: [
      { label: "Definition hash", value: profileForm.definitionHash },
      { label: "Status", value: "This profile form does not match the active EnrollMate definition." },
    ] }];
  }
  const data = profileForm.data;
  return getEnrollmateFlowDefinition(profileForm.flowType).steps.flatMap((step) => step.sections.map((section) => ({
    label: section.label,
    fields: section.fields.filter((field) => field.name in data).map((field) => ({ label: field.label, value: valueForDisplay(data[field.name]) })),
  })).filter((group) => group.fields.length > 0));
}

function operationalGroups(profile: E2eProfileWorkspaceProfile) {
  return Object.entries(profile.operationalData).flatMap(([section, data]) => {
    if (!data) return [];
    return [{ label: section, fields: Object.entries(data).map(([label, value]) => ({ label, value: valueForDisplay(value) })) }];
  });
}

export function getProfileSheetGroups(profile: E2eProfileWorkspaceProfile): ProfileSheetGroup[] {
  return [
    { label: "Profile", fields: [
      { label: "Name", value: profile.name }, { label: "Middle name", value: profile.middleName },
      { label: "Email", value: profile.email }, { label: "Program", value: profile.program },
      { label: "Cohort", value: profile.cohort }, { label: "Status", value: profile.status },
    ] },
    ...profile.profileForms.flatMap(formGroups),
    ...operationalGroups(profile),
  ];
}
