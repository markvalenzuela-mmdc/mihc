export abstract class AppError<T extends string> extends Error {
  public readonly code: T;

  constructor(code: T, message?: string) {
    super(message ?? code);
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
