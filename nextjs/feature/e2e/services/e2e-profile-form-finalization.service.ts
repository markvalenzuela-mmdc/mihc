import { getEnrollmateValidator } from "@mihc/enrollmate-contract";
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

type FinalizeE2eProfileFormServiceInput = FinalizeE2eProfileFormInput & {
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

export async function finalizeE2eProfileForm(
  input: FinalizeE2eProfileFormServiceInput,
  db: DbExecutor = getDb(),
): Promise<{ profileId: string }> {
  const parsedCore = e2eProfileCoreSchema.safeParse(input.core);
  if (!parsedCore.success) {
    throw new E2eProfileFormError(
      E2eProfileFormErrorCode.UNEXPECTED,
      "The complete profile contains invalid values.",
      getIssueErrors(parsedCore.error.issues, "core"),
    );
  }

  const core = parsedCore.data;

  const parsedEnrollmate = getEnrollmateValidator(core.flowType).safeParse(
    input.enrollmateData,
  );
  if (!parsedEnrollmate.success) {
    throw new E2eProfileFormError(
      E2eProfileFormErrorCode.UNEXPECTED,
      "The complete profile contains invalid values.",
      getIssueErrors(parsedEnrollmate.error.issues, "enrollmate"),
    );
  }

  const normalizedEnrollmateData = parsedEnrollmate.data;

  return db
    .transaction(async (tx) => {
      const [existingProfile] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, core.email))
        .limit(1);

      if (existingProfile) {
        throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
      }

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
    })
    .catch((error: unknown) => {
      if (error instanceof E2eProfileFormError) throw error;

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new E2eProfileFormError(E2eProfileFormErrorCode.EMAIL_CONFLICT);
      }

      throw error;
    });
}
