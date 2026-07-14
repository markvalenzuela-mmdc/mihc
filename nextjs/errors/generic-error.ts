import { AppError } from "@/errors/app-error";

export enum GenericErrorCode {
  INVALID_INPUT = "invalidInput",
  INTERNAL_SERVER_ERROR = "internalServerError",
}

export class GenericError extends AppError<GenericErrorCode> {
  constructor(code: GenericErrorCode, message?: string) {
    super(code, message);
  }
}
