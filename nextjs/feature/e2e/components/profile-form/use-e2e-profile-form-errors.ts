"use client";

import type {
  AnyFieldLikeMeta,
  AnyFieldLikeMetaBase,
  DeepKeys,
  Updater,
} from "@tanstack/react-form";
import { useState } from "react";

import type {
  E2eProfileFormEditorStep,
  E2eProfileFormFieldErrors,
  E2eProfileFormValues,
} from "../../types/e2e-profile-form.types";
import {
  CORE_FIELD_ORDER,
  getErrorMessages,
  getOrderedErrorFields,
} from "./e2e-profile-form-validation";

type E2eProfileErrorForm = {
  getFieldMeta: <TField extends DeepKeys<E2eProfileFormValues>>(
    field: TField,
  ) => AnyFieldLikeMeta | undefined;
  setFieldMeta: <TField extends DeepKeys<E2eProfileFormValues>>(
    field: TField,
    updater: Updater<AnyFieldLikeMetaBase>,
  ) => void;
};

export function useE2eProfileFormErrors<TForm extends E2eProfileErrorForm>({
  form,
  steps,
  activeStepNumber,
  goToStep,
}: {
  form: TForm;
  steps: readonly E2eProfileFormEditorStep[];
  activeStepNumber: number;
  goToStep: (stepNumber: number) => Promise<unknown>;
}) {
  const [messages, setMessages] = useState<string[]>([]);

  function writeErrorsToVisibleFields(errors: E2eProfileFormFieldErrors) {
    const allFields = [
      ...CORE_FIELD_ORDER,
      ...steps.flatMap((step) =>
        step.sections.flatMap((section) =>
          section.fields.map((field) => "enrollmate." + field.name),
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

    setMessages(getErrorMessages(errors));
  }

  function show(errors: E2eProfileFormFieldErrors) {
    const firstField = getOrderedErrorFields(errors, steps)[0];
    const owningStep = firstField?.startsWith("enrollmate.")
      ? steps.find((step) =>
          step.sections.some((section) =>
            section.fields.some(
              (field) => "enrollmate." + field.name === firstField,
            ),
          ),
        )
      : undefined;

    if (owningStep && owningStep.step !== activeStepNumber) {
      setMessages(getErrorMessages(errors));
      void goToStep(owningStep.step).then(() => {
        window.setTimeout(() => writeErrorsToVisibleFields(errors), 0);
      });
      return;
    }

    writeErrorsToVisibleFields(errors);
  }

  function showMessage(message: string) {
    setMessages([message]);
  }

  function clear() {
    writeErrorsToVisibleFields({});
    setMessages([]);
  }

  return {
    clear,
    messages,
    show,
    showMessage,
  };
}
