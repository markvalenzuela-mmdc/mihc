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
  E2eProfileFormFieldErrors,
  E2eProfileFixture,
  E2eProfileFormValues,
  E2eProfileFormActionError,
  E2eProfileFormEditorStep,
  E2eProfileFormPendingAction,
  E2eProfileMockMode,
} from "../../types/e2e-profile-form.types";
import {
  clearUnavailableE2eProfileFormValues,
  getDefaultE2eProfileFormValues,
  getEmptyEnrollmateFieldValue,
} from "../../utils/e2e-profile-form.util";
import { getE2eProfileStepMockValues } from "../../utils/e2e-profile-form-mock.util";
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

function useE2eProfileFormController({
  finalize,
  fixtures,
  flows,
  onFinish,
}: Pick<
  E2eProfileFormPageBaseProps,
  "flows" | "onFinish"
> & {
  finalize: FinalizeE2eProfileForm;
  fixtures: readonly E2eProfileFixture[];
}) {
  const [queryStep, setQueryStep] = useQueryState(
    "step",
    parseAsInteger
      .withDefault(1)
      .withOptions({ clearOnDefault: false }),
  );
  const [pendingAction, setPendingAction] = useState<
    E2eProfileFormPendingAction | undefined
  >();
  const isPending = pendingAction !== undefined;
  const [validatedSteps, setValidatedSteps] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const pendingRef = useRef(false);

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

    setErrorMessages(getErrorMessages(errors));
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
  }

  async function continueToNextStep() {
    if (pendingRef.current) return;
    if (!validateActiveStep()) return;

    pendingRef.current = true;
    setPendingAction("continue");
    try {
      setValidatedSteps((current) => new Set(current).add(activeStep.step));
      clearErrors();
      await setQueryStep(clampStep(activeStepNumber + 1, steps.length));
    } finally {
      pendingRef.current = false;
      setPendingAction(undefined);
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

    pendingRef.current = true;
    setPendingAction("finalize");
    try {
      const result = await finalize({
        core: validation.core,
        enrollmateData: completeValidation.data,
      });
      if (!result.ok) {
        applyActionError(result.error);
        return;
      }
      clearErrors();
      onFinish?.(result.data.profileId);
    } catch {
      applyActionError("unexpected");
    } finally {
      pendingRef.current = false;
      setPendingAction(undefined);
    }
  }

  async function goToPreviousStep() {
    if (pendingRef.current || activeStepNumber <= 1) return;

    pendingRef.current = true;
    setPendingAction("previous");
    try {
      clearErrors();
      await setQueryStep(activeStepNumber - 1);
    } finally {
      pendingRef.current = false;
      setPendingAction(undefined);
    }
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
    if (pendingRef.current) return;

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
    clearErrors();
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
    isPending,
    mockCurrentStep,
    pendingAction,
    continueToNextStep,
    steps,
    validatedSteps,
  };
}

export default useE2eProfileFormController;
