import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { and, eq, ne } from "drizzle-orm";

import { getDb, profileForms, profiles } from "@/lib/drizzle/db";
import type { DbExecutor } from "@/types/db-transaction";
import { E2eProfileFormError, E2eProfileFormErrorCode } from "../errors/e2e-profile-form.error";
import { e2eProfileCoreSchema } from "../schema/e2e-profile-form.schema";
import type {
  E2eProfileFormFieldErrors,
  SaveE2eProfileDraftInput,
} from "../types/e2e-profile-form.types";
import { clearUnavailableE2eProfileFormValues } from "../utils/e2e-profile-form.util";

export type SaveE2eProfileDraftServiceInput = SaveE2eProfileDraftInput & {
  userId: string;
};

type ProfileRow = typeof profiles.$inferSelect;
type ProfileFormRow = typeof profileForms.$inferSelect;

function getIssueErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
  prefix: "core" | "enrollmate",
): E2eProfileFormFieldErrors {
  const errors: E2eProfileFormFieldErrors = {};

  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    const fieldName = path ? `${prefix}.${path}` : prefix;
    errors[fieldName] = [...(errors[fieldName] ?? []), issue.message];
  }

  return errors;
}

function throwValidationError(
  errors: E2eProfileFormFieldErrors,
): never {
  throw new E2eProfileFormError(
    E2eProfileFormErrorCode.UNEXPECTED,
    "The profile contains invalid values.",
    errors,
  );
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function getStepFieldNames(flowType: EnrollmateFlowType, stepNumber: number) {
  const flow = getEnrollmateFlowDefinition(flowType);
  const step = flow.steps[stepNumber - 1];

  if (!step) {
    throwValidationError({
      stepNumber: ["The selected profile step is not available."],
    });
  }

  return {
    flow,
    step,
    fieldNames: step.sections.flatMap((section) =>
      section.fields.map((field) => field.name),
    ),
  };
}

function mergeStepValues(
  flowType: EnrollmateFlowType,
  stepNumber: number,
  currentData: Record<string, unknown>,
  stepData: Record<string, unknown>,
) {
  const { fieldNames } = getStepFieldNames(flowType, stepNumber);
  const mergedData = { ...currentData };

  for (const fieldName of fieldNames) {
    delete mergedData[fieldName];
  }

  for (const fieldName of fieldNames) {
    if (Object.hasOwn(stepData, fieldName)) {
      mergedData[fieldName] = stepData[fieldName];
    }
  }

  return clearUnavailableE2eProfileFormValues(
    getEnrollmateFlowDefinition(flowType),
    mergedData,
  );
}

function validateCore(coreInput: SaveE2eProfileDraftInput["core"]) {
  const result = e2eProfileCoreSchema.safeParse(coreInput);
  if (!result.success) {
    throwValidationError(getIssueErrors(result.error.issues, "core"));
  }

  return result.data;
}

function validateStep(
  flowType: EnrollmateFlowType,
  stepNumber: number,
  data: Record<string, unknown>,
) {
  const result = getEnrollmateStepValidator(flowType, stepNumber).safeParse(data);
  if (!result.success) {
    throwValidationError(getIssueErrors(result.error.issues, "enrollmate"));
  }

  const { fieldNames } = getStepFieldNames(flowType, stepNumber);
  return Object.fromEntries(
    fieldNames
      .filter((fieldName) => Object.hasOwn(result.data, fieldName))
      .map((fieldName) => [fieldName, result.data[fieldName]]),
  );
}

async function withTransaction<T>(
  db: DbExecutor,
  callback: (tx: DbExecutor) => Promise<T>,
) {
  if ("transaction" in db) {
    return db.transaction((tx) => callback(tx));
  }

  return callback(db);
}

async function findProfileForUpdate(db: DbExecutor, profileId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .for("update");

  return profile as ProfileRow | undefined;
}

async function findProfileFormForUpdate(db: DbExecutor, profileId: string) {
  const [profileForm] = await db
    .select()
    .from(profileForms)
    .where(eq(profileForms.profileId, profileId))
    .for("update");

  return profileForm as ProfileFormRow | undefined;
}

async function assertEmailAvailable(
  db: DbExecutor,
  email: string,
  profileId?: string,
) {
  const [existingProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      profileId
        ? and(eq(profiles.email, email), ne(profiles.id, profileId))
        : eq(profiles.email, email),
    )
    .limit(1);

  if (existingProfile) {
    throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
  }
}

function assertDefinition(profileForm: ProfileFormRow) {
  if (profileForm.definitionHash !== getEnrollmateDefinitionHash()) {
    throw new E2eProfileFormError(
      E2eProfileFormErrorCode.DEFINITION_CONFLICT,
    );
  }
}

export async function saveE2eProfileDraft(
  input: SaveE2eProfileDraftServiceInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string; nextStep: number | null }> {
  const core = validateCore(input.core);

  return withTransaction(db, async (tx) => {
    if (input.mode === "create") {
      await assertEmailAvailable(tx, core.email);

      const { flow, step } = getStepFieldNames(core.flowType, input.stepNumber);
      const mergedData = mergeStepValues(
        core.flowType,
        input.stepNumber,
        {},
        input.stepData,
      );
      const validatedStepData = validateStep(
        core.flowType,
        input.stepNumber,
        mergedData,
      );
      const profileRows = await tx
        .insert(profiles)
        .values({
          name: core.name,
          middleName: core.middleName ?? null,
          email: core.email,
          flowType: core.flowType,
          status: "new",
          createdBy: input.userId,
          updatedBy: input.userId,
        })
        .returning({ id: profiles.id });
      const profileId = profileRows[0]?.id;

      if (!profileId) {
        throw new Error("Profile creation did not return an ID");
      }

      await tx.insert(profileForms).values({
        profileId,
        definitionHash: getEnrollmateDefinitionHash(),
        data: validatedStepData,
      });

      return {
        profileId,
        nextStep: input.stepNumber < flow.steps.length ? step.step + 1 : null,
      };
    }

    const profile = await findProfileForUpdate(tx, input.profileId);
    const profileForm = await findProfileFormForUpdate(tx, input.profileId);

    if (!profile || !profileForm) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.NOT_FOUND);
    }
    if (profile.status !== "new") {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.LOCKED);
    }
    if (profile.flowType !== core.flowType) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.FLOW_CONFLICT);
    }

    assertDefinition(profileForm);
    await assertEmailAvailable(tx, core.email, profile.id);

    const { flow, step } = getStepFieldNames(core.flowType, input.stepNumber);
    const mergedData = mergeStepValues(
      core.flowType,
      input.stepNumber,
      profileForm.data,
      input.stepData,
    );
    const validatedStepData = validateStep(
      core.flowType,
      input.stepNumber,
      mergedData,
    );
    const nextData = { ...mergedData, ...validatedStepData };

    await tx
      .update(profiles)
      .set({
        name: core.name,
        middleName: core.middleName ?? null,
        email: core.email,
        updatedBy: input.userId,
      })
      .where(eq(profiles.id, profile.id));
    await tx
      .update(profileForms)
      .set({ data: nextData })
      .where(eq(profileForms.id, profileForm.id));

    return {
      profileId: profile.id,
      nextStep: input.stepNumber < flow.steps.length ? step.step + 1 : null,
    };
  }).catch((error: unknown) => {
    if (error instanceof E2eProfileFormError) throw error;
    if (isUniqueViolation(error)) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
    }
    throw error;
  });
}
