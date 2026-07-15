import {
  getEnrollmateStepValidator,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";

import {
  e2eProfileCoreSchema,
  type E2eProfileCoreInput,
} from "../../schema/e2e-profile-form.schema";
import type {
  E2eProfileFormActionError,
  E2eProfileFormEditorStep,
  E2eProfileFormFieldErrors,
} from "../../types/e2e-profile-form.types";

export const CORE_FIELD_ORDER = [
  "core.name",
  "core.middleName",
  "core.email",
  "core.flowType",
] as const;

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

export function clampStep(step: number, totalSteps: number) {
  return Math.min(Math.max(step, 1), totalSteps);
}

export function getIssueErrors(
  issues: readonly ValidationIssue[],
  prefix: "core" | "enrollmate",
): E2eProfileFormFieldErrors {
  const errors: E2eProfileFormFieldErrors = {};

  for (const issue of issues) {
    const firstPath = issue.path[0];
    if (typeof firstPath !== "string") continue;
    const fieldName = prefix + "." + firstPath;
    errors[fieldName] = [...(errors[fieldName] ?? []), issue.message];
  }

  return errors;
}

export function getOrderedErrorFields(
  errors: E2eProfileFormFieldErrors,
  steps: readonly E2eProfileFormEditorStep[],
) {
  const enrollmateFields = steps.flatMap((step) =>
    step.sections.flatMap((section) =>
      section.fields.map((field) => "enrollmate." + field.name),
    ),
  );
  const order = [...CORE_FIELD_ORDER, ...enrollmateFields];
  return Object.keys(errors).sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (
      (leftIndex < 0 ? order.length : leftIndex) -
      (rightIndex < 0 ? order.length : rightIndex)
    );
  });
}

export function getErrorMessages(errors: E2eProfileFormFieldErrors) {
  return [...new Set(Object.values(errors).flat())];
}

export function mergeFieldErrors(
  ...errorMaps: E2eProfileFormFieldErrors[]
): E2eProfileFormFieldErrors {
  return Object.assign({}, ...errorMaps);
}

export function isFieldErrorMap(
  error: E2eProfileFormActionError,
): error is E2eProfileFormFieldErrors {
  return typeof error === "object" && error !== null && !Array.isArray(error);
}

export function normalizeActionFieldErrors(
  errors: E2eProfileFormFieldErrors,
): E2eProfileFormFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([fieldName, messages]) => {
      if (
        fieldName.startsWith("core.") ||
        fieldName.startsWith("enrollmate.")
      ) {
        return [fieldName, messages];
      }
      if (
        fieldName === "name" ||
        fieldName === "middleName" ||
        fieldName === "email" ||
        fieldName === "flowType"
      ) {
        return ["core." + fieldName, messages];
      }
      return ["enrollmate." + fieldName, messages];
    }),
  );
}

export type ValidateProfileFormStepInput = {
  core: unknown;
  enrollmate: Record<string, unknown>;
  flowType: EnrollmateFlowType;
  stepNumber: number;
};

export type ValidateProfileFormStepResult =
  | {
      ok: true;
      core: E2eProfileCoreInput;
      enrollmate: Record<string, unknown>;
    }
  | { ok: false; errors: E2eProfileFormFieldErrors };

export function validateProfileFormStep({
  core,
  enrollmate,
  flowType,
  stepNumber,
}: ValidateProfileFormStepInput): ValidateProfileFormStepResult {
  const coreResult = e2eProfileCoreSchema.safeParse(core);
  const stepResult = getEnrollmateStepValidator(flowType, stepNumber).safeParse(
    enrollmate,
  );
  const errors = mergeFieldErrors(
    coreResult.success ? {} : getIssueErrors(coreResult.error.issues, "core"),
    stepResult.success
      ? {}
      : getIssueErrors(stepResult.error.issues, "enrollmate"),
  );

  if (!coreResult.success || !stepResult.success) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    core: coreResult.data,
    enrollmate: stepResult.data,
  };
}
