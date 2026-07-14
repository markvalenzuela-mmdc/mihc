import {
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { createEnrollmateFixture } from "@mihc/enrollmate-contract/testing";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { EnrollmateFlowType } from "@mihc/enrollmate-contract";

import { profileForms, profiles } from "../schema";
import type * as schema from "../schema";
import { profileFixtures } from "./profile/profile-fixtures";
import { createProfileFormValueResolver } from "./profile/profile-form-value-policy";
import { currentOperator } from "./seed-operator";

export function createProfileFormData(flowType: EnrollmateFlowType, email: string, overrides?: Record<string, unknown>) {
  return createEnrollmateFixture(flowType, {
    overrides: { email, ...overrides },
    resolveField: createProfileFormValueResolver(email),
  });
}

export async function seedProfiles(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

  for (const profile of profileFixtures) {
    const { flowType, formOverrides, ...profileValues } = profile;
    const operationalData = profileOperationalDataSchema.parse({
      systemInfo: { isSentToApi: true },
    });
    const status = profile.status as (typeof profiles.$inferInsert)["status"];

    await tx
      .insert(profiles)
      .values({
        ...profileValues,
        flowType,
        status,
        operationalData,
        createdBy: currentOperator.id,
        updatedBy: currentOperator.id,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: profile.name,
          email: profile.email,
          flowType,
          status,
          operationalData,
        },
      });

    const data = createProfileFormData(
      flowType,
      profile.email,
      formOverrides,
    );

    await tx
      .insert(profileForms)
      .values({
        profileId: profile.id,
        definitionHash: getEnrollmateDefinitionHash(),
        data,
      })
      .onConflictDoUpdate({
        target: profileForms.profileId,
        set: {
          definitionHash: getEnrollmateDefinitionHash(),
          data,
        },
      });

    messages.push(`Seeded profile: ${profile.name}`);
  }

  return messages;
}

export { profileFixtures as profiles } from "./profile/profile-fixtures";
