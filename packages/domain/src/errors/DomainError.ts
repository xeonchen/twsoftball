export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }

    // Ensure the prototype chain is maintained
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
