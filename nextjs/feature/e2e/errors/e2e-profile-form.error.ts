import { AppError } from "@/errors/app-error";

export enum E2eProfileFormErrorCode {
  NOT_FOUND = "notFound",
  EMAIL_CONFLICT = "emailConflict",
  FLOW_CONFLICT = "flowConflict",
  DEFINITION_CONFLICT = "definitionConflict",
  FORBIDDEN = "forbidden",
  UNEXPECTED = "unexpected",
}

export const E2eProfileFormErrorCodeToMessage: Record<
  E2eProfileFormErrorCode,
  string
> = {
  [E2eProfileFormErrorCode.NOT_FOUND]: "Profile not found.",
  [E2eProfileFormErrorCode.EMAIL_CONFLICT]:
    "A profile already uses this email address.",
  [E2eProfileFormErrorCode.FLOW_CONFLICT]:
    "The application flow no longer matches this draft.",
  [E2eProfileFormErrorCode.DEFINITION_CONFLICT]:
    "The form definition changed. Review the profile before continuing.",
  [E2eProfileFormErrorCode.FORBIDDEN]:
    "You do not have permission to save this profile.",
  [E2eProfileFormErrorCode.UNEXPECTED]:
    "The profile could not be saved. Try again.",
};

export class E2eProfileFormError extends AppError<E2eProfileFormErrorCode> {
  constructor(
    code: E2eProfileFormErrorCode,
    message?: (typeof E2eProfileFormErrorCodeToMessage)[typeof code],
  ) {
    super(code, (message ??= E2eProfileFormErrorCodeToMessage[code]));
  }
}
