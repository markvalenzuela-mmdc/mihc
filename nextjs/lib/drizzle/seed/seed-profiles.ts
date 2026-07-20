import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
  profileOperationalDataSchema,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { EnrollmateFlowType } from "@mihc/enrollmate-contract";

import { getApprovedE2eProfileFixtures } from "@/feature/e2e/services/e2e-profile-fixtures.service";
import type { E2eProfileFormValues } from "@/feature/e2e/types/e2e-profile-form.types";
import { getE2eProfileStepMockValues } from "@/feature/e2e/utils/e2e-profile-form-mock.util";
import {
  clearUnavailableE2eProfileFormValues,
  getDefaultE2eProfileFormValues,
} from "@/feature/e2e/utils/e2e-profile-form.util";

import { profileForms, profiles } from "../schema";
import type * as schema from "../schema";
import { profileFixtures } from "./profile/profile-fixtures";
import { currentOperator } from "./seed-operator";

function createMockProfileData(flowType: EnrollmateFlowType) {
  const flow = getEnrollmateFlowDefinition(flowType);
  const current: E2eProfileFormValues = {
    core: {
      name: "",
      middleName: "",
      email: "",
      flowType,
    },
    enrollmate: getDefaultE2eProfileFormValues(flow),
  };
  const fixtures = getApprovedE2eProfileFixtures();

  for (const step of flow.steps) {
    const generated = getE2eProfileStepMockValues(
      flow,
      step.step,
      current,
      "full",
      { fixtures },
    );

    Object.assign(current.core, generated.core);
    Object.assign(current.enrollmate, generated.enrollmate);
    current.enrollmate = clearUnavailableE2eProfileFormValues(
      flow,
      current.enrollmate,
    );
  }

  const lastSchoolAttended = flow.steps
    .flatMap((step) => step.sections)
    .flatMap((section) => section.fields)
    .find((field) => field.name === "lastSchoolAttended");
  const listedSchool = lastSchoolAttended?.options[0]?.value;

  if (listedSchool) {
    current.enrollmate.schoolNotFound = false;
    current.enrollmate.lastSchoolAttended = listedSchool;
    delete current.enrollmate.lastschOther;
  }

  return current;
}

export function createProfileFormData(
  flowType: EnrollmateFlowType,
  email: string,
) {
  const generated = createMockProfileData(flowType);
  const data = getEnrollmateValidator(flowType).parse({
    ...generated.enrollmate,
    email,
  });

  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

export async function seedProfiles(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

  for (const profile of profileFixtures) {
    const generated = createMockProfileData(profile.flowType);
    const operationalData = profileOperationalDataSchema.parse({
      systemInfo: { isSentToApi: true },
    });
    const status = profile.status as (typeof profiles.$inferInsert)["status"];

    await tx
      .insert(profiles)
      .values({
        id: profile.id,
        name: generated.core.name,
        middleName: generated.core.middleName || null,
        email: generated.core.email,
        flowType: profile.flowType,
        status,
        operationalData,
        createdBy: currentOperator.id,
        updatedBy: currentOperator.id,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: generated.core.name,
          middleName: generated.core.middleName || null,
          email: generated.core.email,
          flowType: profile.flowType,
          status,
          operationalData,
        },
      });

    const data = generated.enrollmate;

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

    messages.push(`Seeded profile: ${generated.core.name}`);
  }

  return messages;
}

export { profileFixtures as profiles } from "./profile/profile-fixtures";
