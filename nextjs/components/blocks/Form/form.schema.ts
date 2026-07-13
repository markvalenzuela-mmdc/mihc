import z from "zod";

/**
 * The main schema validation that will be shared by both frontend form and backend server function
 */
export const formSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  email: z.email(),
});

/**
 * Handles the default values type of the form
 */
export type FormInput = z.input<typeof formSchema>;
/**
 * Handles the type of the form values after validation and parsing
 */
export type FormOutput = z.output<typeof formSchema>;
