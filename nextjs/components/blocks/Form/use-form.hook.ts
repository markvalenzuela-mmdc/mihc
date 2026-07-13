"use client";

import {
  createFormHook,
  createFormHookContexts,
  mergeForm,
} from "@tanstack/react-form";
import { initialFormState, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import type { FormInput } from "./form.schema";
import {
  FormField,
  FormSelect,
  FormTextarea,
  FormTextInput,
} from "./form-fields.block";
import { generateFormOptions } from "./form-options";
import { formSubmit } from "./form-submit.action";

/**
 * Helper function for creating form hook contexts.
 * The fieldContext and formContext is passed to the createFormHook,
 * while the useFieldContext are used in the field components
 */
export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

/**
 * Form hook factory that initializes the app form hook and also the form field components
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormField,
    FormTextInput,
    FormTextarea,
    FormSelect,
  },
  formComponents: {},
});

/**
 * Main form hook that will be used in pages and components
 */
export function useGenerateForm({
  defaultValues,
}: {
  defaultValues: FormInput;
}) {
  const [state, action] = useActionState(formSubmit, initialFormState);

  const form = useAppForm({
    ...generateFormOptions(defaultValues),
    // biome-ignore lint/style/noNonNullAssertion: null
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    onSubmitInvalid: (val) => {
      console.log(val.formApi.getAllErrors());
    },
  });

  return { form, action };
}
