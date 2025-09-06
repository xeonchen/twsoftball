/**
 * Base validation error class for all DTO validation failures.
 *
 * @remarks
 * This base class provides a consistent foundation for all validation errors
 * across the application layer DTOs. It standardizes error handling, formatting,
 * and provides additional metadata for debugging and error tracking.
 *
 * By extending this base class, all DTO validation errors gain consistent
 * behavior and can be handled uniformly by error handlers and logging systems.
 *
 * The class includes contextual information such as the field that failed
 * validation and the attempted value, making debugging much easier.
 *
 * @example
 * ```typescript
 * // Creating a specific validation error
 * class GameCommandValidationError extends ValidationError {
 *   constructor(message: string, field?: string, value?: unknown) {
 *     super(message, 'GameCommandValidationError', field, value);
 *   }
 * }
 *
 * // Throwing a validation error
 * throw new GameCommandValidationError(
 *   'Game ID cannot be empty',
 *   'gameId',
 *   ''
 * );
 * ```
 */

/**
 * Additional context information for validation errors.
 */
export interface ValidationContext {
  /** The field or property that failed validation */
  field?: string;
  /** The value that was being validated */
  value?: unknown;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** The validation rule that was violated */
  rule?: string;
  /** Path to the nested field (for complex objects) */
  path?: string[];
}

/**
 * Base validation error class providing consistent error handling.
 *
 * @remarks
 * This class serves as the foundation for all validation errors in the
 * application layer. It provides consistent error formatting, metadata
 * tracking, and debugging information.
 *
 * All DTO validation error classes should extend this base class to
 * ensure uniform error handling and reduce code duplication.
 */
export class ValidationError extends Error {
  /**
   * The specific error type name for this validation error.
   */
  public readonly errorType: string;

  /**
   * Additional context information about the validation failure.
   */
  public readonly validationContext: ValidationContext;

  /**
   * Timestamp when the error occurred.
   */
  public readonly timestamp: Date;

  /**
   * Creates a new ValidationError instance.
   *
   * @param message - Human-readable error message
   * @param errorType - Specific error type identifier
   * @param field - Field name that failed validation
   * @param value - Value that was being validated
   * @param additionalContext - Additional validation context
   */
  constructor(
    message: string,
    errorType: string = 'ValidationError',
    field?: string,
    value?: unknown,
    additionalContext?: Partial<ValidationContext>
  ) {
    super(message);

    this.name = errorType; // Use the specific error type as the name
    this.errorType = errorType;
    this.timestamp = new Date();

    this.validationContext = {
      ...(field !== undefined && { field }),
      ...(value !== undefined && { value }),
      ...additionalContext,
    };
  }

  /**
   * Creates a formatted error message with context.
   *
   * @remarks
   * Generates a detailed error message that includes the original message
   * plus contextual information like field names and values for better debugging.
   *
   * @returns Formatted error message with validation context
   */
  getDetailedMessage(): string {
    const parts = [this.message];

    if (this.validationContext.field) {
      parts.push(`Field: ${this.validationContext.field}`);
    }

    if (this.validationContext.value !== undefined) {
      let valueStr: string;
      const value = this.validationContext.value;
      if (typeof value === 'object' && value !== null) {
        try {
          valueStr = JSON.stringify(value);
        } catch {
          valueStr = '[object]';
        }
      } else if (typeof value === 'string') {
        valueStr = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        valueStr = String(value);
      } else {
        valueStr = '[unknown]';
      }
      parts.push(`Value: ${valueStr}`);
    }

    if (this.validationContext.rule) {
      parts.push(`Rule: ${this.validationContext.rule}`);
    }

    if (this.validationContext.path && this.validationContext.path.length > 0) {
      parts.push(`Path: ${this.validationContext.path.join('.')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Converts the error to a JSON-serializable object.
   *
   * @remarks
   * Useful for logging, API responses, and debugging. Includes all
   * relevant error information in a structured format.
   *
   * @returns JSON-serializable error object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      errorType: this.errorType,
      message: this.message,
      detailedMessage: this.getDetailedMessage(),
      validationContext: this.validationContext,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Checks if this error is related to a specific field.
   *
   * @param fieldName - Field name to check
   * @returns True if the error is related to the specified field
   */
  isFieldError(fieldName: string): boolean {
    return this.validationContext.field === fieldName;
  }

  /**
   * Checks if this error is related to a specific validation rule.
   *
   * @param ruleName - Rule name to check
   * @returns True if the error is related to the specified rule
   */
  isRuleError(ruleName: string): boolean {
    return this.validationContext.rule === ruleName;
  }
}

/**
 * Utility functions for working with validation errors.
 */
export const ValidationErrorUtils = {
  /**
   * Checks if an error is a ValidationError instance.
   */
  isValidationError: (error: unknown): error is ValidationError => {
    return error instanceof ValidationError;
  },

  /**
   * Extracts validation errors from an array of mixed errors.
   */
  filterValidationErrors: (errors: unknown[]): ValidationError[] => {
    return errors.filter(ValidationErrorUtils.isValidationError);
  },

  /**
   * Groups validation errors by field name.
   */
  groupByField: (errors: ValidationError[]): Map<string, ValidationError[]> => {
    const groups = new Map<string, ValidationError[]>();

    for (const error of errors) {
      const field = error.validationContext.field || 'unknown';
      const existing = groups.get(field) || [];
      existing.push(error);
      groups.set(field, existing);
    }

    return groups;
  },

  /**
   * Creates a summary of validation errors.
   */
  createErrorSummary: (errors: ValidationError[]): string => {
    if (errors.length === 0) return 'No validation errors';
    if (errors.length === 1) {
      const error = errors[0];
      return error ? error.getDetailedMessage() : 'Unknown error';
    }

    const fieldGroups = ValidationErrorUtils.groupByField(errors);
    const summaryParts: string[] = [];

    for (const [field, fieldErrors] of fieldGroups) {
      const messages = fieldErrors.map(e => e.message);
      summaryParts.push(`${field}: ${messages.join(', ')}`);
    }

    return `Multiple validation errors: ${summaryParts.join('; ')}`;
  },

  /**
   * Converts validation errors to HTTP-friendly format.
   */
  toHttpErrorFormat: (errors: ValidationError[]): Record<string, unknown> => {
    return {
      error: 'Validation failed',
      message: ValidationErrorUtils.createErrorSummary(errors),
      details: errors.map(e => e.toJSON()),
      fieldErrors: Object.fromEntries(
        Array.from(ValidationErrorUtils.groupByField(errors).entries()).map(
          ([field, fieldErrors]) => [field, fieldErrors.map(e => e.message)]
        )
      ),
    };
  },
} as const;

/**
 * Factory functions for creating common validation errors.
 */
export const ValidationErrorFactory = {
  /**
   * Creates a required field validation error.
   */
  requiredField: (field: string, errorType: string = 'ValidationError'): ValidationError => {
    return new ValidationError(
      `${field} is required and cannot be empty`,
      errorType,
      field,
      undefined,
      { rule: 'required' }
    );
  },

  /**
   * Creates an invalid format validation error.
   */
  invalidFormat: (
    field: string,
    value: unknown,
    expectedFormat: string,
    errorType: string = 'ValidationError'
  ): ValidationError => {
    return new ValidationError(
      `${field} must be in ${expectedFormat} format`,
      errorType,
      field,
      value,
      { rule: 'format' }
    );
  },

  /**
   * Creates a range validation error.
   */
  outOfRange: (
    field: string,
    value: unknown,
    min: number,
    max: number,
    errorType: string = 'ValidationError'
  ): ValidationError => {
    return new ValidationError(
      `${field} must be between ${min} and ${max}`,
      errorType,
      field,
      value,
      { rule: 'range', context: { min, max } }
    );
  },

  /**
   * Creates a uniqueness validation error.
   */
  notUnique: (
    field: string,
    value: unknown,
    errorType: string = 'ValidationError'
  ): ValidationError => {
    return new ValidationError(`${field} must be unique`, errorType, field, value, {
      rule: 'unique',
    });
  },

  /**
   * Creates a custom validation error.
   */
  custom: (
    message: string,
    field: string,
    value: unknown,
    rule: string,
    errorType: string = 'ValidationError'
  ): ValidationError => {
    return new ValidationError(message, errorType, field, value, { rule });
  },
} as const;
