import {
  getEnrollmateValidator,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { eq } from "drizzle-orm";

import { getDb, profileForms, profiles } from "@/lib/drizzle/db";
import type { DbExecutor } from "@/types/db-transaction";
import {
  E2eProfileFormError,
  E2eProfileFormErrorCode,
} from "../errors/e2e-profile-form.error";
import { e2eProfileCoreSchema } from "../schema/e2e-profile-form.schema";
import type {
  E2eProfileFormFieldErrors,
  FinalizeE2eProfileFormInput,
} from "../types/e2e-profile-form.types";

export type FinalizeE2eProfileFormServiceInput =
  FinalizeE2eProfileFormInput & {
    userId: string;
  };

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
    "The complete profile contains invalid values.",
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

async function withTransaction<T>(
  db: DbExecutor,
  callback: (tx: DbExecutor) => Promise<T>,
) {
  if ("transaction" in db) {
    return db.transaction((tx) => callback(tx));
  }

  return callback(db);
}

async function assertEmailAvailable(db: DbExecutor, email: string) {
  const [existingProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);

  if (existingProfile) {
    throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
  }
}

function validateCore(coreInput: FinalizeE2eProfileFormInput["core"]) {
  const result = e2eProfileCoreSchema.safeParse(coreInput);
  if (!result.success) {
    throwValidationError(getIssueErrors(result.error.issues, "core"));
  }

  return result.data;
}

function validateEnrollmate(
  flowType: EnrollmateFlowType,
  enrollmateData: Record<string, unknown>,
) {
  const result = getEnrollmateValidator(flowType).safeParse(enrollmateData);
  if (!result.success) {
    throwValidationError(getIssueErrors(result.error.issues, "enrollmate"));
  }

  return result.data;
}

export async function finalizeE2eProfileForm(
  input: FinalizeE2eProfileFormServiceInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string }> {
  const core = validateCore(input.core);
  const normalizedEnrollmateData = validateEnrollmate(
    core.flowType,
    input.enrollmateData,
  );

  return withTransaction(db, async (tx) => {
    await assertEmailAvailable(tx, core.email);

    const profileRows = await tx
      .insert(profiles)
      .values({
        name: core.name,
        middleName: core.middleName ?? null,
        email: core.email,
        flowType: core.flowType,
        status: "validated",
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
      data: normalizedEnrollmateData,
    });

    return { profileId };
  }).catch((error: unknown) => {
    if (error instanceof E2eProfileFormError) throw error;
    if (isUniqueViolation(error)) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
    }
    throw error;
  });
}
