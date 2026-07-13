"use client";

import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
  getEnrollmateValidator,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";
import { type DeepKeys, useStore } from "@tanstack/react-form";
import { parseAsInteger, useQueryState } from "nuqs";
import { type SyntheticEvent, useEffect, useRef, useState } from "react";

import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import {
  E2eProfileCoreFields,
  e2eProfileFormOptions,
} from "@/feature/e2e/components/profile-form/e2e-profile-core-fields";
import { E2eProfileFormActions } from "@/feature/e2e/components/profile-form/e2e-profile-form-actions";
import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";
import { EnrollmateFieldRenderer } from "@/feature/e2e/components/profile-form/enrollmate-field-renderer";
import { EnrollmateSection } from "@/feature/e2e/components/profile-form/enrollmate-section";
import { createInMemoryE2eProfileFormMock } from "@/feature/e2e/mocks/e2e-profile-form.mock";
import { e2eProfileCoreSchema } from "@/feature/e2e/schema/e2e-profile-form.schema";
import type {
  E2eProfileFixture,
  E2eProfileFormActionError,
  E2eProfileFormEditorStep,
  E2eProfileFormFieldErrors,
  E2eProfileFormValues,
  FinalizeE2eProfileForm,
  SaveE2eProfileDraft,
} from "@/feature/e2e/types/e2e-profile-form.types";
import {
  clearUnavailableE2eProfileFormValues,
  extractE2eProfileStepValues,
  getDefaultE2eProfileFormValues,
} from "@/feature/e2e/utils/e2e-profile-form.util";

type E2eProfileFormPageBaseProps = {
  flows: Record<EnrollmateFlowType, E2eProfileFormEditorStep[]>;
  onExit?: (profileId: string) => void;
  onFinish?: (profileId: string) => void;
};

export type E2eProfileFormPageProps = E2eProfileFormPageBaseProps &
  (
    | {
        fixtures: E2eProfileFixture[];
        saveDraft: SaveE2eProfileDraft;
        finalize: FinalizeE2eProfileForm;
      }
    | {
        fixtures?: never;
        saveDraft?: never;
        finalize?: never;
      }
  );

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

const CORE_FIELD_ORDER = [
  "core.name",
  "core.middleName",
  "core.email",
  "core.flowType",
] as const;

const ACTION_ERROR_MESSAGES = {
  notFound: "This profile could not be found.",
  emailConflict: "A profile already uses this email address.",
  flowConflict: "The application flow no longer matches this draft.",
  definitionConflict: "The form definition changed. Review the profile before continuing.",
  forbidden: "You do not have permission to save this profile.",
  unexpected: "The profile could not be saved. Try again.",
} satisfies Record<Exclude<E2eProfileFormActionError, E2eProfileFormFieldErrors>, string>;

function clampStep(step: number, totalSteps: number) {
  return Math.min(Math.max(step, 1), totalSteps);
}

function getIssueErrors(
  issues: readonly ValidationIssue[],
  prefix: "core" | "enrollmate",
): E2eProfileFormFieldErrors {
  const errors: E2eProfileFormFieldErrors = {};

  for (const issue of issues) {
    const firstPath = issue.path[0];
    if (typeof firstPath !== "string") continue;
    const fieldName = `${prefix}.${firstPath}`;
    errors[fieldName] = [...(errors[fieldName] ?? []), issue.message];
  }

  return errors;
}

function mergeFieldErrors(
  ...errorMaps: E2eProfileFormFieldErrors[]
): E2eProfileFormFieldErrors {
  return Object.assign({}, ...errorMaps);
}

function isFieldErrorMap(
  error: E2eProfileFormActionError,
): error is E2eProfileFormFieldErrors {
  return typeof error === "object" && error !== null && !Array.isArray(error);
}

function normalizeActionFieldErrors(
  errors: E2eProfileFormFieldErrors,
): E2eProfileFormFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([fieldName, messages]) => {
      if (fieldName.startsWith("core.") || fieldName.startsWith("enrollmate.")) {
        return [fieldName, messages];
      }
      if (fieldName === "name" || fieldName === "middleName" || fieldName === "email" || fieldName === "flowType") {
        return [`core.${fieldName}`, messages];
      }
      return [`enrollmate.${fieldName}`, messages];
    }),
  );
}

function getOrderedErrorFields(
  errors: E2eProfileFormFieldErrors,
  steps: readonly E2eProfileFormEditorStep[],
) {
  const enrollmateFields = steps.flatMap((step) =>
    step.sections.flatMap((section) =>
      section.fields.map((field) => `enrollmate.${field.name}`),
    ),
  );
  const order = [...CORE_FIELD_ORDER, ...enrollmateFields];
  return Object.keys(errors).sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex < 0 ? order.length : leftIndex) -
      (rightIndex < 0 ? order.length : rightIndex);
  });
}

function getErrorMessages(errors: E2eProfileFormFieldErrors) {
  return [...new Set(Object.values(errors).flat())];
}

function focusElement(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 0);
}

function ProfileFormErrorSummary({ messages }: { messages: readonly string[] }) {
  if (messages.length === 0) return null;

  return (
    <div
      id="e2e-profile-form-errors"
      role="alert"
      tabIndex={-1}
      className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
    >
      <p className="font-medium">Review the highlighted fields.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function ProfileFormStepIntroduction({
  step,
}: {
  step: E2eProfileFormEditorStep;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-balance">{step.title}</h2>
      {step.sections.length === 0 && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          Confirm the complete profile is valid before finishing this draft.
        </p>
      )}
    </div>
  );
}

function useE2eProfileFormController({
  finalize,
  flows,
  onExit,
  onFinish,
  saveDraft,
}: Pick<
  E2eProfileFormPageBaseProps,
  "flows" | "onExit" | "onFinish"
> & {
  finalize: FinalizeE2eProfileForm;
  saveDraft: SaveE2eProfileDraft;
}) {
  const [queryStep, setQueryStep] = useQueryState(
    "step",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: false }),
  );
  const [profileId, setProfileId] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  const [validatedSteps, setValidatedSteps] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const profileIdRef = useRef<string | undefined>(undefined);
  const pendingRef = useRef(false);

  const form = useAppForm({
    ...e2eProfileFormOptions,
    listeners: {
      onChange: ({ fieldApi, formApi }) => {
        if (fieldApi.name !== "core.flowType" || profileIdRef.current) return;
        const nextFlow = formApi.state.values.core.flowType;
        formApi.setFieldValue(
          "enrollmate",
          getDefaultE2eProfileFormValues(
            getEnrollmateFlowDefinition(nextFlow),
          ),
        );
        setValidatedSteps(new Set());
        setErrorMessages([]);
        void setQueryStep(1);
      },
    },
  });

  const flowType = useStore(
    form.store,
    (state) => state.values.core.flowType,
  );
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const steps = flows[flowType];
  const activeStepNumber = clampStep(queryStep, steps.length);
  const activeStep = steps[activeStepNumber - 1]!;

  useEffect(() => {
    if (queryStep === activeStepNumber) return;

    const timeout = window.setTimeout(() => {
      void setQueryStep(activeStepNumber);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeStepNumber, queryStep, setQueryStep]);

  useEffect(() => {
    if (!isDirty) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  function applyFieldErrors(errors: E2eProfileFormFieldErrors) {
    const allFields = [
      ...CORE_FIELD_ORDER,
      ...steps.flatMap((step) =>
        step.sections.flatMap((section) =>
          section.fields.map((field) => `enrollmate.${field.name}`),
        ),
      ),
    ];

    for (const fieldName of allFields) {
      const field = fieldName as DeepKeys<E2eProfileFormValues>;
      const currentMeta = form.getFieldMeta(field);
      if (!currentMeta) continue;
      form.setFieldMeta(
        field,
        (previous = currentMeta) => ({
          ...previous,
          isTouched: errors[fieldName] ? true : previous.isTouched,
          errorMap: {
            ...previous.errorMap,
            onSubmit: errors[fieldName],
          },
        }),
      );
    }

    const orderedFields = getOrderedErrorFields(errors, steps);
    setErrorMessages(getErrorMessages(errors));
    if (orderedFields[0]) focusElement(orderedFields[0]);
  }

  function setFieldErrors(errors: E2eProfileFormFieldErrors) {
    const orderedFields = getOrderedErrorFields(errors, steps);
    const firstField = orderedFields[0];
    const owningStep = firstField?.startsWith("enrollmate.")
      ? steps.find((step) =>
          step.sections.some((section) =>
            section.fields.some(
              (field) => `enrollmate.${field.name}` === firstField,
            ),
          ),
        )
      : undefined;

    if (owningStep && owningStep.step !== activeStepNumber) {
      setErrorMessages(getErrorMessages(errors));
      void setQueryStep(owningStep.step).then(() => {
        window.setTimeout(() => applyFieldErrors(errors), 0);
      });
      return;
    }

    applyFieldErrors(errors);
  }

  function clearErrors() {
    setFieldErrors({});
    setErrorMessages([]);
  }

  function markFieldsPristine(fieldNames: readonly string[]) {
    for (const fieldName of fieldNames) {
      const field = fieldName as DeepKeys<E2eProfileFormValues>;
      const currentMeta = form.getFieldMeta(field);
      if (!currentMeta) continue;
      form.setFieldMeta(field, (previous = currentMeta) => ({
        ...previous,
        isDirty: false,
      }));
    }
  }

  function getCleanedEnrollmateValues() {
    const values = form.state.values.enrollmate;
    const cleanedValues = clearUnavailableE2eProfileFormValues(
      getEnrollmateFlowDefinition(flowType),
      values,
    );
    const removedFields = Object.keys(values).filter(
      (fieldName) => !Object.hasOwn(cleanedValues, fieldName),
    );

    if (removedFields.length > 0) {
      form.setFieldValue("enrollmate", cleanedValues, {
        dontRunListeners: true,
        dontUpdateMeta: true,
        dontValidate: true,
      });
      markFieldsPristine(
        removedFields.map((fieldName) => `enrollmate.${fieldName}`),
      );
    }

    return cleanedValues;
  }

  function validateActiveStep() {
    const values = form.state.values;
    const cleanedEnrollmateValues = getCleanedEnrollmateValues();
    const coreValidation = e2eProfileCoreSchema.safeParse(values.core);
    const stepValidation = getEnrollmateStepValidator(
      flowType,
      activeStep.step,
    ).safeParse(cleanedEnrollmateValues);
    const errors = mergeFieldErrors(
      coreValidation.success
        ? {}
        : getIssueErrors(coreValidation.error.issues, "core"),
      stepValidation.success
        ? {}
        : getIssueErrors(stepValidation.error.issues, "enrollmate"),
    );

    if (!coreValidation.success || !stepValidation.success) {
      setFieldErrors(errors);
      return undefined;
    }

    clearErrors();
    return {
      core: coreValidation.data,
      enrollmate: cleanedEnrollmateValues,
    };
  }

  function applyActionError(error: E2eProfileFormActionError) {
    if (isFieldErrorMap(error)) {
      setFieldErrors(normalizeActionFieldErrors(error));
      return;
    }

    setErrorMessages([ACTION_ERROR_MESSAGES[error]]);
    focusElement("e2e-profile-form-errors");
  }

  async function runDraft(intent: "continue" | "exit") {
    if (pendingRef.current) return;
    const validation = validateActiveStep();
    if (!validation) return;

    pendingRef.current = true;
    setIsPending(true);
    try {
      const currentProfileId = profileIdRef.current;
      const result = await saveDraft({
        ...(currentProfileId
          ? { mode: "edit" as const, profileId: currentProfileId }
          : { mode: "create" as const }),
        core: validation.core,
        stepNumber: activeStep.step,
        stepData: extractE2eProfileStepValues(
          activeStep,
          validation.enrollmate,
        ),
      });

      if (!result.ok) {
        applyActionError(result.error);
        return;
      }

      profileIdRef.current = result.data.profileId;
      setProfileId(result.data.profileId);
      setValidatedSteps((current) => new Set(current).add(activeStep.step));
      clearErrors();
      markFieldsPristine([
        ...CORE_FIELD_ORDER,
        "enrollmate",
        ...activeStep.sections.flatMap((section) =>
          section.fields.map((field) => `enrollmate.${field.name}`),
        ),
      ]);

      if (intent === "exit") {
        onExit?.(result.data.profileId);
        return;
      }

      const nextStep = result.data.nextStep ?? activeStepNumber + 1;
      await setQueryStep(clampStep(nextStep, steps.length));
    } catch {
      applyActionError("unexpected");
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  async function finalizeProfile() {
    if (pendingRef.current) return;
    const validation = validateActiveStep();
    if (!validation) return;

    const completeValidation = getEnrollmateValidator(flowType).safeParse(
      validation.enrollmate,
    );
    if (!completeValidation.success) {
      setFieldErrors(
        getIssueErrors(completeValidation.error.issues, "enrollmate"),
      );
      return;
    }

    const currentProfileId = profileIdRef.current;
    if (!currentProfileId) {
      setErrorMessages([
        "Save at least one profile step before validating the complete draft.",
      ]);
      focusElement("e2e-profile-form-errors");
      return;
    }

    pendingRef.current = true;
    setIsPending(true);
    try {
      const result = await finalize({
        profileId: currentProfileId,
        core: validation.core,
        enrollmateData: completeValidation.data,
      });
      if (!result.ok) {
        applyActionError(result.error);
        return;
      }
      clearErrors();
      markFieldsPristine([
        ...CORE_FIELD_ORDER,
        "enrollmate",
        ...steps.flatMap((step) =>
          step.sections.flatMap((section) =>
            section.fields.map((field) => `enrollmate.${field.name}`),
          ),
        ),
      ]);
      onFinish?.(result.data.profileId);
    } catch {
      applyActionError("unexpected");
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  function goToPreviousStep() {
    if (pendingRef.current || activeStepNumber <= 1) return;
    clearErrors();
    void setQueryStep(activeStepNumber - 1);
  }

  function blockPendingFieldChange(event: SyntheticEvent) {
    if (!pendingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    activeStep,
    activeStepNumber,
    blockPendingFieldChange,
    errorMessages,
    finalizeProfile,
    flowType,
    form,
    goToPreviousStep,
    isFlowLocked: Boolean(profileId),
    isPending,
    runDraft,
    steps,
    validatedSteps,
  };
}

export function E2eProfileFormPage({
  finalize: injectedFinalize,
  fixtures: injectedFixtures,
  flows,
  onExit,
  onFinish,
  saveDraft: injectedSaveDraft,
}: E2eProfileFormPageProps) {
  const hasInjectedBoundary =
    injectedFixtures !== undefined &&
    injectedSaveDraft !== undefined &&
    injectedFinalize !== undefined;
  const [mock] = useState(() =>
    hasInjectedBoundary ? null : createInMemoryE2eProfileFormMock(),
  );

  const boundary = hasInjectedBoundary
    ? {
        fixtures: injectedFixtures,
        saveDraft: injectedSaveDraft,
        finalize: injectedFinalize,
      }
    : mock!;

  useEffect(() => {
    return () => mock?.dispose();
  }, [mock]);

  const controller = useE2eProfileFormController({
    finalize: boundary.finalize,
    flows,
    onExit,
    onFinish,
    saveDraft: boundary.saveDraft,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Create E2E profile
        </h1>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          Build a reusable student profile one validated application step at a
          time. Phase 1 drafts remain in this page only.
        </p>
      </header>

      <E2eProfileFormProgress
        activeStep={controller.activeStepNumber}
        steps={controller.steps}
        validatedSteps={controller.validatedSteps}
      />

      <form
        className="space-y-8 rounded-lg border bg-card p-5 sm:p-7"
        aria-describedby={
          controller.errorMessages.length > 0
            ? "e2e-profile-form-errors"
            : undefined
        }
        onSubmit={(event) => event.preventDefault()}
      >
        <controller.form.AppForm>
          <ProfileFormErrorSummary messages={controller.errorMessages} />

          <fieldset
            disabled={controller.isPending}
            className="space-y-8"
            onChangeCapture={controller.blockPendingFieldChange}
          >
            <E2eProfileCoreFields
              form={controller.form}
              isFlowLocked={controller.isFlowLocked}
            />

            <div className="space-y-6 border-t pt-7">
              <ProfileFormStepIntroduction step={controller.activeStep} />

              <controller.form.Subscribe
                selector={(state) => state.values.enrollmate}
              >
                {(values) => (
                  <div className="space-y-8">
                    {controller.activeStep.sections.map((section) => (
                      <EnrollmateSection
                        key={section.id}
                        section={section}
                        fixtures={boundary.fixtures}
                        values={values}
                        renderField={({ definition, fixtures, values }) => (
                          <controller.form.AppField
                            name={`enrollmate.${definition.name}`}
                          >
                            {(field) => (
                              <EnrollmateFieldRenderer
                                boundField={field}
                                definition={definition}
                                fixtures={fixtures}
                                values={values}
                              />
                            )}
                          </controller.form.AppField>
                        )}
                      />
                    ))}
                  </div>
                )}
              </controller.form.Subscribe>
            </div>
          </fieldset>

          <E2eProfileFormActions
            currentStep={controller.activeStepNumber}
            totalSteps={controller.steps.length}
            isPending={controller.isPending}
            onPrevious={controller.goToPreviousStep}
            onSaveAndContinue={() => void controller.runDraft("continue")}
            onSaveAndExit={() => void controller.runDraft("exit")}
            onFinalize={() => void controller.finalizeProfile()}
          />
        </controller.form.AppForm>
      </form>
    </div>
  );
}
