import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  EnrollmateField,
  EnrollmateFlowType,
} from "@mihc/enrollmate-contract";

import { profileForms, profiles } from "../schema";
import type * as schema from "../schema";

const profileFixtures = [
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40101",
    name: "Ari Santos",
    middleName: null,
    email: "ari.santos@example.edu",
    flowType: "bachelors" as const,
    status: "validated" as const,
    formOverrides: {
      givenName: "Ari",
      familyName: "Santos",
      birthplace: "Quezon City",
      birthdate: "2003-04-18",
      mobile: "09171234567",
      withMedicalCondition: "No",
      interestedForAScholarship: "Yes",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40102",
    name: "Mika Reyes",
    middleName: null,
    email: "mika.reyes@example.edu",
    flowType: "bachelors" as const,
    status: "new" as const,
    formOverrides: {
      givenName: "Mika",
      familyName: "Reyes",
      birthplace: "Pasig City",
      birthdate: "2002-09-07",
      mobile: "09181234567",
      withMedicalCondition: "Yes",
      medicalDiagnosisDescription: "Managed asthma",
      interestedForAScholarship: "No",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40103",
    name: "Noel Cruz",
    middleName: null,
    email: "noel.cruz@example.edu",
    flowType: "bachelors" as const,
    status: "guidance_needed" as const,
    formOverrides: {
      givenName: "Noel",
      familyName: "Cruz",
      birthplace: "Antipolo City",
      birthdate: "2004-01-22",
      mobile: "09191234567",
      withMedicalCondition: "No",
      interestedForAScholarship: "No",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40104",
    name: "Sam Lim",
    middleName: null,
    email: "sam.lim@example.edu",
    flowType: "bachelors" as const,
    status: "completed" as const,
    formOverrides: {
      givenName: "Sam",
      familyName: "Lim",
      birthplace: "Manila",
      birthdate: "2001-12-03",
      mobile: "09201234567",
    },
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40105",
    name: "Rosa Cruz",
    middleName: null,
    email: "rosa.cruz@example.edu",
    flowType: "microcredentials" as const,
    status: "new" as const,
    formOverrides: {
      givenName: "Rosa",
      familyName: "Cruz",
      birthplace: "Makati City",
      birthdate: "1998-06-14",
      mobile: "09211234567",
    },
  },
];

function getRequiredTextSeedValue(field: EnrollmateField, email: string) {
  if (field.type === "email") return email;
  if (field.type === "date") return "1980-01-01";
  if (field.type === "tel") return "09170000000";

  const fieldName = field.name.toLowerCase();

  if (fieldName.endsWith("givenname")) return "Maria";
  if (fieldName.endsWith("middlename")) return "Reyes";
  if (fieldName.endsWith("familyname")) return "Santos";
  if (fieldName.includes("addrline1")) return "123";
  if (fieldName.includes("addrline2")) return "Rizal Street, San Isidro";
  if (fieldName.includes("zipcode")) return "1920";
  if (fieldName.includes("citymun")) return "Tanay";
  if (fieldName.includes("barangay")) return "Sampaloc";
  if (fieldName.includes("occupation")) return "Operations Manager";

  const values: Record<string, string> = {
    birthplace: "Quezon City",
    studentCompany: "Mapúa Learning Solutions",
    otherStrand: "General Academic Strand",
    lastSchoolAttended: "Rizal National High School",
    lastschOther: "Rizal National High School",
    medicalDiagnosisDescription: "Managed asthma",
    grdnOtherApplRelationship: "Aunt",
  };
  const value = values[field.name];

  if (value) return value;
  throw new Error(`Missing realistic seed value for field: ${field.name}`);
}

export function createProfileFormData(flowType: EnrollmateFlowType, email: string, overrides?: Record<string, unknown>) {
  const data: Record<string, unknown> = { email, ...overrides };
  const fields = getEnrollmateFlowDefinition(flowType).steps.flatMap((step) => step.sections.flatMap((section) => section.fields));

  function setField(field: (typeof fields)[number]) {
    if (data[field.name] !== undefined) return;
    if (field.type === "checkbox") data[field.name] = false;
    else if (field.type === "file") data[field.name] = { fixtureUri: `fixtures/${field.name}.pdf`, filename: `${field.name}.pdf`, mimeType: "application/pdf", sizeBytes: 1 };
    else if (field.options.length) {
      const fieldName = field.name.toLowerCase();
      const preferredValue = fieldName.includes("country")
        ? "Philippines"
        : fieldName.includes("province")
          ? "Rizal"
          : undefined;
      const preferredOption = preferredValue
        ? field.options.find((option) => option.value === preferredValue)
        : undefined;
      data[field.name] = (preferredOption ?? field.options[0]!).value;
    }
    else if (Object.keys(field.optionsByDependency).length) data[field.name] = Object.values(field.optionsByDependency)[0]![0]!.value;
    else data[field.name] = getRequiredTextSeedValue(field, email);
  }

  const conditionalFieldNames = new Set(fields.filter((f) => f.requiredWhenConditionMet).map((f) => f.name));
  for (const field of fields) {
    if (data[field.name] !== undefined) continue;
    if (conditionalFieldNames.has(field.name)) continue;
    if (field.required) setField(field);
  }

  for (const field of fields) {
    if (data[field.name] !== undefined || !field.conditionalOn) continue;
    if (!field.requiredWhenConditionMet && field.required) continue;
    const parentValue = data[field.conditionalOn.field];
    if (
      (typeof parentValue === "string" || typeof parentValue === "boolean") &&
      field.conditionalOn.equalsAny.includes(parentValue)
    ) {
      setField(field);
    }
  }

  return getEnrollmateValidator(flowType).parse(data);
}

export async function seedProfiles(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];
  for (const profile of profileFixtures) {
    const { flowType, formOverrides, ...profileValues } = profile;
    const operationalData = profileOperationalDataSchema.parse({ systemInfo: { isSentToApi: true } });
    const status = profile.status as (typeof profiles.$inferInsert)["status"];
    await tx.insert(profiles).values({ ...profileValues, flowType, status, operationalData, createdBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3", updatedBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3" }).onConflictDoUpdate({ target: profiles.id, set: { name: profile.name, email: profile.email, flowType, status, operationalData } });
    const data = createProfileFormData(flowType, profile.email, formOverrides);
    await tx.insert(profileForms).values({ profileId: profile.id, flowType, definitionHash: getEnrollmateDefinitionHash(), data }).onConflictDoUpdate({ target: [profileForms.profileId, profileForms.flowType], set: { definitionHash: getEnrollmateDefinitionHash(), data } });
    messages.push(`Seeded profile: ${profile.name}`);
  }
  return messages;
}

export { profileFixtures as profiles };
