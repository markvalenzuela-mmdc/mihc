"use client";

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import {
  FormField,
  FormSelect,
  FormTextarea,
  FormTextInput,
} from "./form-fields.block";

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
