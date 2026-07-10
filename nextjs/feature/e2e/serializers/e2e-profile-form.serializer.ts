import { getEnrollmateValidator } from "@mihc/enrollmate-contract";
import type { EnrollmateFlowType } from "@mihc/enrollmate-contract";

import { profileForms } from "@/lib/drizzle/db";
import type { E2eProfileForm } from "../types/e2e-testing.types";

type ProfileFormRecord = typeof profileForms.$inferSelect;

export function serializeE2eProfileForm(
  form: ProfileFormRecord,
  flowType: EnrollmateFlowType,
  currentDefinitionHash: string,
): E2eProfileForm {
  if (form.definitionHash !== currentDefinitionHash) {
    return { ...form, state: "deprecated" };
  }

  const result = getEnrollmateValidator(flowType).safeParse(form.data);
  if (result.success) {
    return { ...form, data: result.data, state: "active" };
  }

  return {
    ...form,
    state: "invalid",
    validationIssues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "form",
      message: issue.message,
    })),
  };
}
