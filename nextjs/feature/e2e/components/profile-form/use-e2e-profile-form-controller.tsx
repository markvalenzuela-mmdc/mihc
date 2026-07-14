import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
import { useSelector } from "@tanstack/react-form";
import { DeepKeys } from "@tanstack/react-table";
import { useQueryState, parseAsInteger } from "nuqs";
import { useState, useRef, useEffect, SyntheticEvent } from "react";
import { E2eProfileFormErrorCodeToMessage } from "../../errors/e2e-profile-form.error";
import { e2eProfileCoreSchema } from "../../schema/e2e-profile-form.schema";
import {
  FinalizeE2eProfileForm,
  SaveE2eProfileDraft,
  E2eProfileFormFieldErrors,
  E2eProfileFormValues,
  E2eProfileFormActionError,
  E2eProfileFormEditorStep,
} from "../../types/e2e-profile-form.types";
import {
  clearUnavailableE2eProfileFormValues,
  getDefaultE2eProfileFormValues,
  extractE2eProfileStepValues,
} from "../../utils/e2e-profile-form.util";
import { e2eProfileFormOptions } from "./e2e-profile-core-fields";
import { E2eProfileFormPageBaseProps } from "./e2e-profile-form-page";

const CORE_FIELD_ORDER = [
  "core.name",
  "core.middleName",
  "core.email",
  "core.flowType",
] as const;

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

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
    return (
      (leftIndex < 0 ? order.length : leftIndex) -
      (rightIndex < 0 ? order.length : rightIndex)
    );
  });
}

function getErrorMessages(errors: E2eProfileFormFieldErrors) {
  return [...new Set(Object.values(errors).flat())];
}

function focusElement(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 0);
}

function useE2eProfileFormController({
  finalize,
  flows,
  initialValues,
  initialStep,
  initialValidatedSteps,
  onFinish,
  profileId: initialProfileId,
  saveDraft,
}: Pick<
  E2eProfileFormPageBaseProps,
  | "flows"
  | "initialValues"
  | "initialStep"
  | "initialValidatedSteps"
  | "onFinish"
  | "profileId"
> & {
  finalize: FinalizeE2eProfileForm;
  saveDraft: SaveE2eProfileDraft;
}) {
  const [queryStep, setQueryStep] = useQueryState(
    "step",
    parseAsInteger
      .withDefault(initialStep ?? 1)
      .withOptions({ clearOnDefault: false }),
  );
  const [profileId, setProfileId] = useState<string | undefined>(
    initialProfileId,
  );
  const [isPending, setIsPending] = useState(false);
  const [validatedSteps, setValidatedSteps] = useState<ReadonlySet<number>>(
    () => new Set(initialValidatedSteps),
  );
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const profileIdRef = useRef<string | undefined>(initialProfileId);
  const pendingRef = useRef(false);

  const form = useAppForm({
    ...e2eProfileFormOptions,
    ...(initialValues ? { defaultValues: initialValues } : {}),
    listeners: {
      onChange: ({ fieldApi, formApi }) => {
        if (
          fieldApi.name === "enrollmate.fthrDeceased" ||
          fieldApi.name === "enrollmate.mthrDeceased"
        ) {
          formApi.setFieldValue(
            "enrollmate",
            clearUnavailableE2eProfileFormValues(
              getEnrollmateFlowDefinition(formApi.state.values.core.flowType),
              formApi.state.values.enrollmate,
            ),
            {
              dontRunListeners: true,
              dontUpdateMeta: true,
              dontValidate: true,
            },
          );
          return;
        }

        if (fieldApi.name !== "core.flowType" || profileIdRef.current) return;
        const nextFlow = formApi.state.values.core.flowType;
        formApi.setFieldValue(
          "enrollmate",
          getDefaultE2eProfileFormValues(getEnrollmateFlowDefinition(nextFlow)),
        );
        setValidatedSteps(new Set());
        setErrorMessages([]);
        void setQueryStep(1);
      },
    },
  });

  const flowType = useSelector(
    form.store,
    (state) => state.values.core.flowType,
  );
  const isDirty = useSelector(form.store, (state) => state.isDirty);
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
      form.setFieldMeta(field, (previous = currentMeta) => ({
        ...previous,
        isTouched: errors[fieldName] ? true : previous.isTouched,
        errorMap: {
          ...previous.errorMap,
          onSubmit: errors[fieldName],
        },
      }));
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

    setErrorMessages([E2eProfileFormErrorCodeToMessage[error]]);
    focusElement("e2e-profile-form-errors");
  }

  async function saveAndContinue() {
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
      const draftResult = await saveDraft({
        mode: "edit",
        profileId: currentProfileId,
        core: validation.core,
        stepNumber: activeStep.step,
        stepData: extractE2eProfileStepValues(
          activeStep,
          validation.enrollmate,
        ),
      });

      if (!draftResult.ok) {
        applyActionError(draftResult.error);
        return;
      }

      profileIdRef.current = draftResult.data.profileId;
      setProfileId(draftResult.data.profileId);
      setValidatedSteps((current) => new Set(current).add(activeStep.step));
      markFieldsPristine([
        ...CORE_FIELD_ORDER,
        "enrollmate",
        ...activeStep.sections.flatMap((section) =>
          section.fields.map((field) => `enrollmate.${field.name}`),
        ),
      ]);

      const result = await finalize({
        profileId: draftResult.data.profileId,
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
    saveAndContinue,
    steps,
    validatedSteps,
  };
}

export default useE2eProfileFormController;
