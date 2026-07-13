"use server";

import {
  createServerValidate,
  ServerValidateError,
} from "@tanstack/react-form-nextjs";
import { type FormOutput, formSchema } from "./form.schema";
import { generateFormOptions } from "./form-options";

/**
 * Helper function for server side validation using the zod schema
 */
const serverValidate = createServerValidate({
  ...generateFormOptions,
  onServerValidate: formSchema,
});

/**
 * Form submission server action
 */
export async function formSubmit(_prev: unknown, formData: FormData) {
  try {
    console.log(formData);

    const validatedData = (await serverValidate(formData)) as FormOutput;

    console.log(validatedData);
    // return "Form has been submitted";
  } catch (err) {
    if (err instanceof ServerValidateError) {
      return err.formState;
    }

    throw err;
  }
}
