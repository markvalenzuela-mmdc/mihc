import { formOptions } from "@tanstack/react-form";
import { type FormInput, formSchema } from "./form.schema";

/**
 * Helper function for sharing form options throughout the app.
 * Contains the default values and also the schema validator
 */
export const generateFormOptions = (defaultValues: FormInput) =>
  formOptions({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
  });
