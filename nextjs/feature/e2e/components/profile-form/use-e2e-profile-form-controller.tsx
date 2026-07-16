import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import {
  getEnrollmateFlowDefinition,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
import { useSelector } from "@tanstack/react-form";
import type { DeepKeys } from "@tanstack/react-table";
import { useState, useRef, useEffect, type SyntheticEvent } from "react";
import { E2eProfileFormErrorCodeToMessage } from "../../errors/e2e-profile-form.error";
import type {
  FinalizeE2eProfileForm,
  E2eProfileFixture,
  E2eProfileFormValues,
  E2eProfileFormActionError,
  E2eProfileMockMode,
} from "../../types/e2e-profile-form.types";
import {
  clearUnavailableE2eProfileFormValues,
  getDefaultE2eProfileFormValues,
  getEmptyEnrollmateFieldValue,
} from "../../utils/e2e-profile-form.util";
import { getE2eProfileStepMockValues } from "../../utils/e2e-profile-form-mock.util";
import { e2eProfileFormOptions } from "./e2e-profile-core-fields";
import type { E2eProfileFormPageBaseProps } from "./e2e-profile-form-page";
import {
  getIssueErrors,
  isFieldErrorMap,
  normalizeActionFieldErrors,
  validateProfileFormStep,
} from "./e2e-profile-form-validation";
import { useE2eProfileFormStep } from "./use-e2e-profile-form-step";
import { useE2eProfileFormErrors } from "./use-e2e-profile-form-errors";
import { useUnsavedProfileWarning } from "./use-unsaved-profile-warning";

function useE2eProfileFormController({
  finalize,
  fixtures,
  flows,
  onFinish,
}: Pick<E2eProfileFormPageBaseProps, "flows" | "onFinish"> & {
  finalize: FinalizeE2eProfileForm;
  fixtures: readonly E2eProfileFixture[];
}) {
  const resetNavigationRef = useRef<() => void>(() => undefined);
  const clearErrorsRef = useRef<() => void>(() => undefined);
  type PendingAction = "navigating" | "finalizing";
  const pendingActionRef = useRef<PendingAction | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const isPending = pendingAction !== null;
  const isFinalizing = pendingAction === "finalizing";
  const [validatedSteps, setValidatedSteps] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const form = useAppForm({
    ...e2eProfileFormOptions,
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

        if (fieldApi.name !== "core.flowType") return;
        const nextFlow = formApi.state.values.core.flowType;
        formApi.setFieldValue(
          "enrollmate",
          getDefaultE2eProfileFormValues(getEnrollmateFlowDefinition(nextFlow)),
        );
        setValidatedSteps(new Set());
        clearErrorsRef.current();
        resetNavigationRef.current();
      },
    },
  });

  const flowType = useSelector(
    form.store,
    (state) => state.values.core.flowType,
  );
  const isDirty = useSelector(form.store, (state) => state.isDirty);
  const steps = flows[flowType];
  const navigation = useE2eProfileFormStep({ steps });
  const { activeStep, activeStepNumber, goTo: goToStep } = navigation;
  const errors = useE2eProfileFormErrors({
    form,
    steps,
    activeStepNumber,
    goToStep,
  });

  useEffect(() => {
    resetNavigationRef.current = () => {
      void goToStep(1);
    };
    clearErrorsRef.current = errors.clear;
  }, [errors.clear, goToStep]);

  useUnsavedProfileWarning(isDirty);

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

  function validateCurrentStep() {
    return validateProfileFormStep({
      core: form.state.values.core,
      enrollmate: getCleanedEnrollmateValues(),
      flowType,
      stepNumber: activeStep.step,
    });
  }

  function applyActionError(error: E2eProfileFormActionError) {
    if (isFieldErrorMap(error)) {
      errors.show(normalizeActionFieldErrors(error));
      return;
    }

    errors.showMessage(E2eProfileFormErrorCodeToMessage[error]);
  }

  async function runExclusive(
    action: PendingAction,
    operation: () => Promise<void>,
  ) {
    if (pendingActionRef.current) return;

    pendingActionRef.current = action;
    setPendingAction(action);
    try {
      await operation();
    } finally {
      pendingActionRef.current = null;
      setPendingAction(null);
    }
  }

  async function continueToNextStep() {
    await runExclusive("navigating", async () => {
      const validation = validateCurrentStep();
      if (!validation.ok) {
        errors.show(validation.errors);
        return;
      }

      setValidatedSteps((current) => new Set(current).add(activeStep.step));
      errors.clear();
      await navigation.goNext();
    });
  }

  async function finalizeProfile() {
    await runExclusive("finalizing", async () => {
      const validation = validateCurrentStep();
      if (!validation.ok) {
        errors.show(validation.errors);
        return;
      }

      const completeValidation = getEnrollmateValidator(flowType).safeParse(
        validation.enrollmate,
      );
      if (!completeValidation.success) {
        errors.show(
          getIssueErrors(completeValidation.error.issues, "enrollmate"),
        );
        return;
      }

      try {
        const result = await finalize({
          core: validation.core,
          enrollmateData: completeValidation.data,
        });
        if (!result.ok) {
          applyActionError(result.error);
          return;
        }
        errors.clear();
        onFinish?.(result.data.profileId);
      } catch {
        errors.showMessage(E2eProfileFormErrorCodeToMessage.unexpected);
      }
    });
  }

  async function goToPreviousStep() {
    if (activeStepNumber <= 1) return;

    await runExclusive("navigating", async () => {
      errors.clear();
      await navigation.goPrevious();
    });
  }

  function clearMockUnavailableValues() {
    const flow = getEnrollmateFlowDefinition(flowType);
    const currentValues = form.state.values.enrollmate;
    const cleanedValues = clearUnavailableE2eProfileFormValues(
      flow,
      currentValues,
    );
    const fields = flow.steps.flatMap((step) =>
      step.sections.flatMap((section) => section.fields),
    );

    for (const fieldDefinition of fields) {
      if (!Object.hasOwn(currentValues, fieldDefinition.name)) continue;

      const nextValue = Object.hasOwn(cleanedValues, fieldDefinition.name)
        ? cleanedValues[fieldDefinition.name]
        : getEmptyEnrollmateFieldValue(fieldDefinition);
      if (Object.is(currentValues[fieldDefinition.name], nextValue)) continue;

      form.setFieldValue(
        `enrollmate.${fieldDefinition.name}` as DeepKeys<E2eProfileFormValues>,
        nextValue as never,
      );
    }
  }

  function mockCurrentStep(mode: E2eProfileMockMode) {
    if (pendingActionRef.current) return;

    const generated = getE2eProfileStepMockValues(
      getEnrollmateFlowDefinition(flowType),
      activeStep.step,
      form.state.values,
      mode,
      { fixtures },
    );

    for (const [fieldName, value] of Object.entries(generated.core)) {
      form.setFieldValue(
        `core.${fieldName}` as DeepKeys<E2eProfileFormValues>,
        value as never,
      );
    }
    for (const [fieldName, value] of Object.entries(generated.enrollmate)) {
      form.setFieldValue(
        `enrollmate.${fieldName}` as DeepKeys<E2eProfileFormValues>,
        value as never,
      );
    }

    clearMockUnavailableValues();
    errors.clear();
  }

  function blockPendingFieldChange(event: SyntheticEvent) {
    if (!pendingActionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    activeStep,
    activeStepNumber,
    blockPendingFieldChange,
    errorMessages: errors.messages,
    finalizeProfile,
    flowType,
    form,
    goToPreviousStep,
    isFinalizing,
    isPending,
    mockCurrentStep,
    continueToNextStep,
    steps,
    validatedSteps,
  };
}

export default useE2eProfileFormController;
