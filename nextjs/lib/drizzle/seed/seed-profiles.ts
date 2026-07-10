import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { profileForms, profiles } from "../schema";
import type * as schema from "../schema";

const profileFixtures = [
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40101", name: "Ari Santos", middleName: null, email: "ari.santos@example.edu", program: "BS Information Technology", cohort: "2026-A", status: "validated", flows: ["bachelors", "microcredentials"] as const },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40102", name: "Mika Reyes", middleName: null, email: "mika.reyes@example.edu", program: "BS Business Administration", cohort: "2026-A", status: "new", flows: ["bachelors"] as const },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40103", name: "Noel Cruz", middleName: null, email: "noel.cruz@example.edu", program: "BS Information Technology", cohort: "2026-A", status: "guidance_needed", flows: ["bachelors"] as const },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40104", name: "Sam Lim", middleName: null, email: "sam.lim@example.edu", program: "BS Business Administration", cohort: "2026-A", status: "completed", flows: ["bachelors"] as const },
];

function createFormData(flowType: "bachelors" | "microcredentials", email: string) {
  const data: Record<string, unknown> = { email };
  const fields = getEnrollmateFlowDefinition(flowType).steps.flatMap((step) => step.sections.flatMap((section) => section.fields));
  for (const field of fields) {
    if (data[field.name] !== undefined || !field.required) continue;
    if (field.type === "checkbox") data[field.name] = false;
    else if (field.type === "file") data[field.name] = { fixtureUri: `fixtures/${field.name}.pdf`, filename: `${field.name}.pdf`, mimeType: "application/pdf", sizeBytes: 1 };
    else if (field.type === "email") data[field.name] = email;
    else if (field.type === "date") data[field.name] = "2000-01-01";
    else if (field.options.length) data[field.name] = field.options[0]!.value;
    else if (Object.keys(field.optionsByDependency).length) data[field.name] = Object.values(field.optionsByDependency)[0]![0]!.value;
    else data[field.name] = "Seeded value";
  }
  return getEnrollmateValidator(flowType).parse(data);
}

export async function seedProfiles(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];
  for (const profile of profileFixtures) {
    const { flows, ...profileValues } = profile;
    const operationalData = profileOperationalDataSchema.parse({ systemInfo: { isSentToApi: true } });
    const status = profile.status as (typeof profiles.$inferInsert)["status"];
    await tx.insert(profiles).values({ ...profileValues, status, operationalData, createdBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3", updatedBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3" }).onConflictDoUpdate({ target: profiles.id, set: { name: profile.name, email: profile.email, program: profile.program, cohort: profile.cohort, status, operationalData } });
    for (const flowType of flows) {
      const data = createFormData(flowType, profile.email);
      await tx.insert(profileForms).values({ profileId: profile.id, flowType, definitionHash: getEnrollmateDefinitionHash(), data }).onConflictDoUpdate({ target: [profileForms.profileId, profileForms.flowType], set: { definitionHash: getEnrollmateDefinitionHash(), data } });
    }
    messages.push(`Seeded profile: ${profile.name}`);
  }
  return messages;
}

export { profileFixtures as profiles };
