import {
  getEnrollmateValidator,
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

function throwValidationError(errors: E2eProfileFormFieldErrors): never {
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

export async function finalizeE2eProfileForm(
  input: FinalizeE2eProfileFormServiceInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string }> {
  const coreResult = e2eProfileCoreSchema.safeParse(input.core);
  if (!coreResult.success) {
    throwValidationError(getIssueErrors(coreResult.error.issues, "core"));
  }

  return withTransaction(db, async (tx) => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, input.profileId))
      .for("update");
    const [profileForm] = await tx
      .select()
      .from(profileForms)
      .where(eq(profileForms.profileId, input.profileId))
      .for("update");

    if (!profile || !profileForm) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.NOT_FOUND);
    }
    if (profile.status !== "new") {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.LOCKED);
    }
    if (profile.flowType !== coreResult.data.flowType) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.FLOW_CONFLICT);
    }
    if (profileForm.definitionHash !== getEnrollmateDefinitionHash()) {
      throw new E2eProfileFormError(
        E2eProfileFormErrorCode.DEFINITION_CONFLICT,
      );
    }

    const [emailConflict] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.email, coreResult.data.email),
          ne(profiles.id, profile.id),
        ),
      )
      .limit(1);
    if (emailConflict) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
    }

    const normalizedResult = getEnrollmateValidator(
      profile.flowType as EnrollmateFlowType,
    ).safeParse(profileForm.data);
    if (!normalizedResult.success) {
      throwValidationError(
        getIssueErrors(normalizedResult.error.issues, "enrollmate"),
      );
    }

    await tx
      .update(profiles)
      .set({
        name: coreResult.data.name,
        middleName: coreResult.data.middleName ?? null,
        email: coreResult.data.email,
        status: "validated",
        updatedBy: input.userId,
      })
      .where(eq(profiles.id, profile.id));
    await tx
      .update(profileForms)
      .set({
        data: normalizedResult.data,
        definitionHash: getEnrollmateDefinitionHash(),
      })
      .where(eq(profileForms.id, profileForm.id));

    return { profileId: profile.id };
  }).catch((error: unknown) => {
    if (error instanceof E2eProfileFormError) throw error;
    if (isUniqueViolation(error)) {
      throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
    }
    throw error;
  });
}
