import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { EnrollmateFlowType } from "@mihc/enrollmate-contract";

import { profileForms, profiles } from "../schema";
import type * as schema from "../schema";

const profileFixtures = [
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40101", name: "Ari Santos", middleName: null, email: "ari.santos@example.edu", flowType: "bachelors" as const, status: "validated" as const, formOverrides: { withMedicalCondition: "No", interestedForAScholarship: "Yes" } },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40102", name: "Mika Reyes", middleName: null, email: "mika.reyes@example.edu", flowType: "bachelors" as const, status: "new" as const, formOverrides: { withMedicalCondition: "Yes", interestedForAScholarship: "No" } },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40103", name: "Noel Cruz", middleName: null, email: "noel.cruz@example.edu", flowType: "bachelors" as const, status: "guidance_needed" as const, formOverrides: { withMedicalCondition: "No", interestedForAScholarship: "No" } },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40104", name: "Sam Lim", middleName: null, email: "sam.lim@example.edu", flowType: "bachelors" as const, status: "completed" as const },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40105", name: "Rosa Cruz", middleName: null, email: "rosa.cruz@example.edu", flowType: "microcredentials" as const, status: "new" as const },
];

function createFormData(flowType: EnrollmateFlowType, email: string, overrides?: Record<string, unknown>) {
  const data: Record<string, unknown> = { email, ...overrides };
  const fields = getEnrollmateFlowDefinition(flowType).steps.flatMap((step) => step.sections.flatMap((section) => section.fields));

  function setField(field: (typeof fields)[number]) {
    if (data[field.name] !== undefined) return;
    if (field.type === "checkbox") data[field.name] = false;
    else if (field.type === "file") data[field.name] = { fixtureUri: `fixtures/${field.name}.pdf`, filename: `${field.name}.pdf`, mimeType: "application/pdf", sizeBytes: 1 };
    else if (field.type === "email") data[field.name] = email;
    else if (field.type === "date") data[field.name] = "2000-01-01";
    else if (field.options.length) {
      const isCountry = field.name.toLowerCase().includes("country");
      const phOption = isCountry ? field.options.find((o) => o.value === "Philippines") : undefined;
      data[field.name] = (phOption ?? field.options[0]!).value;
    }
    else if (Object.keys(field.optionsByDependency).length) data[field.name] = Object.values(field.optionsByDependency)[0]![0]!.value;
    else if (field.requiredWhenConditionMet) data[field.name] = "Seeded conditional value";
    else data[field.name] = "Seeded value";
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
    const data = createFormData(flowType, profile.email, formOverrides);
    await tx.insert(profileForms).values({ profileId: profile.id, flowType, definitionHash: getEnrollmateDefinitionHash(), data }).onConflictDoUpdate({ target: [profileForms.profileId, profileForms.flowType], set: { definitionHash: getEnrollmateDefinitionHash(), data } });
    messages.push(`Seeded profile: ${profile.name}`);
  }
  return messages;
}

export { profileFixtures as profiles };
