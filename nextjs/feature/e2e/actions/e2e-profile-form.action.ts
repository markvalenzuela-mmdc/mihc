"use server";

import { revalidatePath } from "next/cache";

import { err, ok } from "@/utils/server-action-return";
import {
  E2eProfileFormError,
  E2eProfileFormErrorCode,
} from "../errors/e2e-profile-form.error";
import {
  finalizeE2eProfileFormSchema,
} from "../schema/e2e-profile-form.schema";
import { finalizeE2eProfileForm } from "../services/e2e-profile-form-finalization.service";
import type {
  E2eProfileFormActionError,
  E2eProfileFormFieldErrors,
  FinalizeE2eProfileFormInput,
  FinalizeE2eProfileFormResult,
} from "../types/e2e-profile-form.types";
import { getCurrentUser } from "@/feature/auth/actions/auth.action";

function getFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): E2eProfileFormFieldErrors {
  const errors: E2eProfileFormFieldErrors = {};

  for (const issue of issues) {
    const fieldName = issue.path.map(String).join(".") || "form";
    errors[fieldName] = [...(errors[fieldName] ?? []), issue.message];
  }

  return errors;
}

function getActionError(
  error: unknown,
): E2eProfileFormActionError {
  if (error instanceof E2eProfileFormError) {
    return error.fieldErrors ?? error.code;
  }

  return E2eProfileFormErrorCode.UNEXPECTED;
}

export async function finalizeE2eProfileFormAction(
  input: FinalizeE2eProfileFormInput,
): Promise<FinalizeE2eProfileFormResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return err("forbidden");

    const parsed = finalizeE2eProfileFormSchema.safeParse(input);
    if (!parsed.success) return err(getFieldErrors(parsed.error.issues));

    const result = await finalizeE2eProfileForm({
      ...parsed.data,
      userId: user.id,
    });
    revalidatePath("/e2e-testing");
    return ok(result);
  } catch (error) {
    console.error("Failed to finalize E2E profile form", error);
    return err(getActionError(error));
  }
}
