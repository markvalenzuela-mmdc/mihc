import { AppError } from "@/errors/app-error";

export enum E2eProfileFormErrorCode {
  EMAIL_CONFLICT = "emailConflict",
  FORBIDDEN = "forbidden",
  UNEXPECTED = "unexpected",
}

export const E2eProfileFormErrorCodeToMessage: Record<
  E2eProfileFormErrorCode,
  string
> = {
  [E2eProfileFormErrorCode.EMAIL_CONFLICT]:
    "A profile already uses this email address.",
  [E2eProfileFormErrorCode.FORBIDDEN]:
    "You do not have permission to save this profile.",
  [E2eProfileFormErrorCode.UNEXPECTED]:
    "The profile could not be saved. Try again.",
};

export class E2eProfileFormError extends AppError<E2eProfileFormErrorCode> {
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: E2eProfileFormErrorCode,
    message?: (typeof E2eProfileFormErrorCodeToMessage)[typeof code],
    fieldErrors?: Record<string, string[]>,
  ) {
    super(code, (message ??= E2eProfileFormErrorCodeToMessage[code]));
    this.fieldErrors = fieldErrors;
  }
}
