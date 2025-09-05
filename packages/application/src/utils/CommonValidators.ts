/**
 * @file CommonValidators
 * Shared validation utilities to reduce duplication across DTO validation.
 *
 * @remarks
 * This module provides common validation functions that are reused across
 * multiple DTO validators. By centralizing these validation patterns, we
 * eliminate code duplication while maintaining consistent validation behavior.
 *
 * Each validator function is designed to be generic and reusable across
 * different DTO types by accepting an error factory function that creates
 * the appropriate ValidationError subclass.
 *
 * @example
 * ```typescript
 * // In a DTO validator
 * import { CommonValidators } from '../utils/CommonValidators';
 *
 * validateBasicFields(command: MyCommand): void {
 *   if (command.notes !== undefined) {
 *     CommonValidators.validateNotes(
 *       command.notes,
 *       (msg, field, value) => new MyCommandValidationError(msg, field, value)
 *     );
 *   }
 * }
 * ```
 */

import { ValidationError } from '../errors/ValidationError';

/**
 * Type for error factory functions that create ValidationError instances.
 * Enables generic validators to create the correct error type.
 */
export type ValidationErrorFactory = (
  message: string,
  field?: string,
  value?: unknown
) => ValidationError;

/**
 * Shared validation utilities for common DTO fields and patterns.
 */
export const CommonValidators = {
  /**
   * Validates notes field following standard business rules.
   *
   * @remarks
   * Standard notes validation includes:
   * - Maximum length of 500 characters
   * - Cannot be only whitespace if provided
   * - Empty string is allowed (means no notes)
   *
   * @param notes - The notes string to validate
   * @param createError - Factory function to create appropriate ValidationError
   * @throws {ValidationError} When notes validation fails
   *
   * @example
   * ```typescript
   * CommonValidators.validateNotes(
   *   command.notes,
   *   (msg, field, value) => new MyCommandValidationError(msg, field, value)
   * );
   * ```
   */
  validateNotes(notes: string, createError: ValidationErrorFactory): void {
    if (notes.length > 500) {
      throw createError('notes cannot exceed 500 characters', 'notes', notes);
    }

    // Allow empty string as valid (means no notes)
    // But trim and check for meaningful content if provided
    if (notes.trim().length === 0 && notes.length > 0) {
      throw createError('notes cannot be only whitespace', 'notes', notes);
    }
  },

  /**
   * Validates timestamp field following standard business rules.
   *
   * @remarks
   * Standard timestamp validation includes:
   * - Must be a valid Date object
   * - Cannot be more than 1 hour in the future (time zone tolerance)
   * - Cannot be more than 1 year in the past (reasonable business limit)
   *
   * @param timestamp - The Date object to validate
   * @param createError - Factory function to create appropriate ValidationError
   * @throws {ValidationError} When timestamp validation fails
   *
   * @example
   * ```typescript
   * CommonValidators.validateTimestamp(
   *   command.timestamp,
   *   (msg, field, value) => new MyCommandValidationError(msg, field, value)
   * );
   * ```
   */
  validateTimestamp(timestamp: Date, createError: ValidationErrorFactory): void {
    if (!(timestamp instanceof Date)) {
      throw createError('timestamp must be a valid Date object', 'timestamp', timestamp);
    }

    if (isNaN(timestamp.getTime())) {
      throw createError('timestamp must be a valid Date', 'timestamp', timestamp);
    }

    // Business rule: timestamp cannot be too far in the future
    const now = new Date();
    const maxFutureMinutes = 60; // Allow up to 1 hour in future for time zone differences
    const maxFutureTime = new Date(now.getTime() + maxFutureMinutes * 60 * 1000);

    if (timestamp > maxFutureTime) {
      throw createError(
        'timestamp cannot be more than 1 hour in the future',
        'timestamp',
        timestamp
      );
    }

    // Business rule: timestamp cannot be too far in the past (e.g., more than 1 year ago)
    const minPastTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (timestamp < minPastTime) {
      throw createError('timestamp cannot be more than 1 year in the past', 'timestamp', timestamp);
    }
  },

  /**
   * Validates gameId field is present and not empty.
   *
   * @param gameId - The gameId to validate
   * @param createError - Factory function to create appropriate ValidationError
   * @throws {ValidationError} When gameId validation fails
   */
  validateGameId(gameId: unknown, createError: ValidationErrorFactory): void {
    if (!gameId) {
      throw createError('gameId is required', 'gameId', gameId);
    }
  },

  /**
   * Validates inning number follows softball rules.
   *
   * @remarks
   * Standard inning validation:
   * - Must be a positive integer (1 or greater)
   * - Cannot exceed 20 innings (safety limit for extra innings)
   *
   * @param inning - The inning number to validate
   * @param createError - Factory function to create appropriate ValidationError
   * @throws {ValidationError} When inning validation fails
   */
  validateInning(inning: number, createError: ValidationErrorFactory): void {
    if (!Number.isInteger(inning) || inning < 1) {
      throw createError('inning must be a positive integer (1 or greater)', 'inning', inning);
    }

    if (inning > 20) {
      throw createError('inning cannot exceed 20 for safety limits', 'inning', inning);
    }
  },

  /**
   * Validates outs count follows softball rules.
   *
   * @remarks
   * Standard outs validation:
   * - Must be an integer between 0 and 3
   * - 3 outs ends the inning
   *
   * @param outs - The outs count to validate
   * @param fieldName - The field name for error messages (default: 'outs')
   * @param createError - Factory function to create appropriate ValidationError
   * @throws {ValidationError} When outs validation fails
   */
  validateOuts(
    outs: number,
    fieldName: string = 'outs',
    createError: ValidationErrorFactory
  ): void {
    if (!Number.isInteger(outs) || outs < 0 || outs > 3) {
      throw createError(`${fieldName} must be an integer between 0 and 3`, fieldName, outs);
    }
  },
} as const;
