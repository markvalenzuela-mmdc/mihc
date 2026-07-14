import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";

import { getDb } from "@/lib/drizzle/db";
import type { DbExecutor } from "@/types/db-transaction";
import { E2eProfileFormError, E2eProfileFormErrorCode } from "../errors/e2e-profile-form.error";
import { e2eProfileCoreSchema } from "../schema/e2e-profile-form.schema";
import { serializeE2eProfileFormEditorSteps } from "../serializers/e2e-profile-form-editor.serializer";
import type { E2eProfileFormEditorData } from "../types/e2e-profile-form.types";
import { getApprovedE2eProfileFixtures } from "./e2e-profile-fixtures.service";

function getValidatedSteps(
  flowType: EnrollmateFlowType,
  data: Record<string, unknown>,
) {
  const flow = getEnrollmateFlowDefinition(flowType);
  return flow.steps
    .filter((step) =>
      getEnrollmateStepValidator(flowType, step.step).safeParse(data).success,
    )
    .map((step) => step.step);
}

export async function getE2eProfileFormEditorData(
  profileId: string,
  db: DbExecutor = getDb(),
): Promise<E2eProfileFormEditorData> {
  const profile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.id, profileId),
    with: { profileForm: true },
  });

  if (!profile?.profileForm) {
    throw new E2eProfileFormError(E2eProfileFormErrorCode.NOT_FOUND);
  }
  if (profile.status !== "new") {
    throw new E2eProfileFormError(E2eProfileFormErrorCode.LOCKED);
  }
  if (profile.profileForm.definitionHash !== getEnrollmateDefinitionHash()) {
    throw new E2eProfileFormError(
      E2eProfileFormErrorCode.DEFINITION_CONFLICT,
    );
  }

  const core = e2eProfileCoreSchema.parse({
    name: profile.name,
    middleName: profile.middleName ?? "",
    email: profile.email,
    flowType: profile.flowType,
  });
  const flow = getEnrollmateFlowDefinition(profile.flowType);
  const validatedSteps = getValidatedSteps(profile.flowType, profile.profileForm.data);
  const firstIncompleteStep = flow.steps.find(
    (step) => !validatedSteps.includes(step.step),
  );

  return {
    profileId: profile.id,
    core,
    enrollmateData: profile.profileForm.data,
    flows: {
      bachelors: serializeE2eProfileFormEditorSteps(
        getEnrollmateFlowDefinition("bachelors"),
      ),
      microcredentials: serializeE2eProfileFormEditorSteps(
        getEnrollmateFlowDefinition("microcredentials"),
      ),
    },
    fixtures: getApprovedE2eProfileFixtures(),
    validatedSteps,
    initialStep: firstIncompleteStep?.step ?? flow.steps.length,
  };
}
