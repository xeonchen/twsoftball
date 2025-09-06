/**
 * Comprehensive test suite for ValidationError and its utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  ValidationError,
  ValidationContext,
  ValidationErrorUtils,
  ValidationErrorFactory,
} from './ValidationError';

describe('ValidationError', () => {
  describe('Constructor and Basic Properties', () => {
    it('should create instance with minimal parameters', () => {
      const error = new ValidationError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.errorType).toBe('ValidationError');
      expect(error.name).toBe('ValidationError');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.validationContext).toEqual({});
    });

    it('should create instance with custom error type', () => {
      const error = new ValidationError('Test message', 'CustomError');

      expect(error.errorType).toBe('CustomError');
      expect(error.name).toBe('CustomError');
    });

    it('should create instance with field and value', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue'
      );

      expect(error.validationContext.field).toBe('testField');
      expect(error.validationContext.value).toBe('testValue');
    });

    it('should create instance with additional context', () => {
      const additionalContext: Partial<ValidationContext> = {
        rule: 'required',
        path: ['nested', 'field'],
        context: { custom: 'data' },
      };

      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        additionalContext
      );

      expect(error.validationContext).toEqual({
        field: 'testField',
        value: 'testValue',
        rule: 'required',
        path: ['nested', 'field'],
        context: { custom: 'data' },
      });
    });

    it('should handle undefined field and value correctly', () => {
      const error = new ValidationError('Test message', 'ValidationError', undefined, undefined);

      expect(error.validationContext).toEqual({});
    });
  });

  describe('getDetailedMessage', () => {
    it('should return basic message when no context', () => {
      const error = new ValidationError('Basic message');

      expect(error.getDetailedMessage()).toBe('Basic message');
    });

    it('should include field information', () => {
      const error = new ValidationError('Test message', 'ValidationError', 'testField');

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField');
    });

    it('should handle string values', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'stringValue'
      );

      expect(error.getDetailedMessage()).toBe(
        'Test message | Field: testField | Value: stringValue'
      );
    });

    it('should handle number values', () => {
      const error = new ValidationError('Test message', 'ValidationError', 'testField', 42);

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField | Value: 42');
    });

    it('should handle boolean values', () => {
      const error = new ValidationError('Test message', 'ValidationError', 'testField', true);

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField | Value: true');
    });

    it('should handle object values with JSON serialization', () => {
      const objValue = { key: 'value', nested: { data: 123 } };
      const error = new ValidationError('Test message', 'ValidationError', 'testField', objValue);

      expect(error.getDetailedMessage()).toBe(
        'Test message | Field: testField | Value: {"key":"value","nested":{"data":123}}'
      );
    });

    it('should handle non-serializable objects', () => {
      const circularObj: Record<string, unknown> = { key: 'value' };
      circularObj['circular'] = circularObj; // Create circular reference

      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        circularObj
      );

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField | Value: [object]');
    });

    it('should handle null values', () => {
      const error = new ValidationError('Test message', 'ValidationError', 'testField', null);

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField | Value: [unknown]');
    });

    it('should handle unknown value types', () => {
      const symbolValue = Symbol('test');
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        symbolValue
      );

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField | Value: [unknown]');
    });

    it('should include rule information', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        { rule: 'required' }
      );

      expect(error.getDetailedMessage()).toBe(
        'Test message | Field: testField | Value: testValue | Rule: required'
      );
    });

    it('should include path information', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        { path: ['parent', 'child', 'nested'] }
      );

      expect(error.getDetailedMessage()).toBe(
        'Test message | Field: testField | Value: testValue | Path: parent.child.nested'
      );
    });

    it('should include all context information', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        {
          rule: 'format',
          path: ['parent', 'child'],
        }
      );

      expect(error.getDetailedMessage()).toBe(
        'Test message | Field: testField | Value: testValue | Rule: format | Path: parent.child'
      );
    });

    it('should handle empty path array', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        { path: [] }
      );

      expect(error.getDetailedMessage()).toBe('Test message | Field: testField | Value: testValue');
    });
  });

  describe('toJSON', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    });

    it('should convert error to JSON-serializable object', () => {
      const error = new ValidationError('Test message', 'CustomError', 'testField', 'testValue');
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'CustomError',
        errorType: 'CustomError',
        message: 'Test message',
        detailedMessage: 'Test message | Field: testField | Value: testValue',
        validationContext: {
          field: 'testField',
          value: 'testValue',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
        stack: expect.any(String),
      });
    });

    it('should include complete validation context in JSON', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        {
          rule: 'required',
          path: ['parent', 'child'],
          context: { custom: 'data' },
        }
      );

      const json = error.toJSON();

      expect(json['validationContext']).toEqual({
        field: 'testField',
        value: 'testValue',
        rule: 'required',
        path: ['parent', 'child'],
        context: { custom: 'data' },
      });
    });
  });

  describe('isFieldError', () => {
    it('should return true for matching field', () => {
      const error = new ValidationError('Test message', 'ValidationError', 'testField');

      expect(error.isFieldError('testField')).toBe(true);
    });

    it('should return false for non-matching field', () => {
      const error = new ValidationError('Test message', 'ValidationError', 'testField');

      expect(error.isFieldError('otherField')).toBe(false);
    });

    it('should return false when no field is set', () => {
      const error = new ValidationError('Test message');

      expect(error.isFieldError('testField')).toBe(false);
    });
  });

  describe('isRuleError', () => {
    it('should return true for matching rule', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        { rule: 'required' }
      );

      expect(error.isRuleError('required')).toBe(true);
    });

    it('should return false for non-matching rule', () => {
      const error = new ValidationError(
        'Test message',
        'ValidationError',
        'testField',
        'testValue',
        { rule: 'required' }
      );

      expect(error.isRuleError('format')).toBe(false);
    });

    it('should return false when no rule is set', () => {
      const error = new ValidationError('Test message');

      expect(error.isRuleError('required')).toBe(false);
    });
  });
});

describe('ValidationErrorUtils', () => {
  describe('isValidationError', () => {
    it('should return true for ValidationError instances', () => {
      const error = new ValidationError('Test message');

      expect(ValidationErrorUtils.isValidationError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Test message');

      expect(ValidationErrorUtils.isValidationError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(ValidationErrorUtils.isValidationError('string')).toBe(false);
      expect(ValidationErrorUtils.isValidationError(123)).toBe(false);
      expect(ValidationErrorUtils.isValidationError({})).toBe(false);
      expect(ValidationErrorUtils.isValidationError(null)).toBe(false);
      expect(ValidationErrorUtils.isValidationError(undefined)).toBe(false);
    });
  });

  describe('filterValidationErrors', () => {
    it('should filter ValidationError instances from mixed array', () => {
      const validationError1 = new ValidationError('Validation error 1');
      const validationError2 = new ValidationError('Validation error 2');
      const regularError = new Error('Regular error');
      const notAnError = 'not an error';

      const mixed = [validationError1, regularError, validationError2, notAnError];
      const filtered = ValidationErrorUtils.filterValidationErrors(mixed);

      expect(filtered).toHaveLength(2);
      expect(filtered).toContain(validationError1);
      expect(filtered).toContain(validationError2);
    });

    it('should return empty array when no ValidationErrors present', () => {
      const mixed = [new Error('Regular error'), 'string', 123, {}];
      const filtered = ValidationErrorUtils.filterValidationErrors(mixed);

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty array', () => {
      const filtered = ValidationErrorUtils.filterValidationErrors([]);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('groupByField', () => {
    it('should group errors by field name', () => {
      const error1 = new ValidationError('Error 1', 'ValidationError', 'field1');
      const error2 = new ValidationError('Error 2', 'ValidationError', 'field2');
      const error3 = new ValidationError('Error 3', 'ValidationError', 'field1');

      const grouped = ValidationErrorUtils.groupByField([error1, error2, error3]);

      expect(grouped.size).toBe(2);
      expect(grouped.get('field1')).toEqual([error1, error3]);
      expect(grouped.get('field2')).toEqual([error2]);
    });

    it('should group errors with undefined field as unknown', () => {
      const error1 = new ValidationError('Error 1', 'ValidationError', 'field1');
      const error2 = new ValidationError('Error 2');
      const error3 = new ValidationError('Error 3');

      const grouped = ValidationErrorUtils.groupByField([error1, error2, error3]);

      expect(grouped.size).toBe(2);
      expect(grouped.get('field1')).toEqual([error1]);
      expect(grouped.get('unknown')).toEqual([error2, error3]);
    });

    it('should handle empty array', () => {
      const grouped = ValidationErrorUtils.groupByField([]);

      expect(grouped.size).toBe(0);
    });
  });

  describe('createErrorSummary', () => {
    it('should return "No validation errors" for empty array', () => {
      const summary = ValidationErrorUtils.createErrorSummary([]);

      expect(summary).toBe('No validation errors');
    });

    it('should return detailed message for single error', () => {
      const error = new ValidationError(
        'Single error',
        'ValidationError',
        'testField',
        'testValue'
      );
      const summary = ValidationErrorUtils.createErrorSummary([error]);

      expect(summary).toBe('Single error | Field: testField | Value: testValue');
    });

    it('should handle single null error gracefully', () => {
      const errors = [null as unknown as ValidationError];
      const summary = ValidationErrorUtils.createErrorSummary(errors);

      expect(summary).toBe('Unknown error');
    });

    it('should create summary for multiple errors', () => {
      const error1 = new ValidationError('Error 1', 'ValidationError', 'field1');
      const error2 = new ValidationError('Error 2', 'ValidationError', 'field2');
      const error3 = new ValidationError('Error 3', 'ValidationError', 'field1');

      const summary = ValidationErrorUtils.createErrorSummary([error1, error2, error3]);

      expect(summary).toBe('Multiple validation errors: field1: Error 1, Error 3; field2: Error 2');
    });

    it('should handle errors without field names', () => {
      const error1 = new ValidationError('Error 1');
      const error2 = new ValidationError('Error 2', 'ValidationError', 'field1');

      const summary = ValidationErrorUtils.createErrorSummary([error1, error2]);

      expect(summary).toBe('Multiple validation errors: unknown: Error 1; field1: Error 2');
    });
  });

  describe('toHttpErrorFormat', () => {
    it('should convert errors to HTTP-friendly format', () => {
      const error1 = new ValidationError('Error 1', 'ValidationError', 'field1', 'value1');
      const error2 = new ValidationError('Error 2', 'ValidationError', 'field2', 'value2');

      const httpFormat = ValidationErrorUtils.toHttpErrorFormat([error1, error2]);

      expect(httpFormat).toEqual({
        error: 'Validation failed',
        message: 'Multiple validation errors: field1: Error 1; field2: Error 2',
        details: [error1.toJSON(), error2.toJSON()],
        fieldErrors: {
          field1: ['Error 1'],
          field2: ['Error 2'],
        },
      });
    });

    it('should handle single error in HTTP format', () => {
      const error = new ValidationError('Single error', 'ValidationError', 'field1', 'value1');

      const httpFormat = ValidationErrorUtils.toHttpErrorFormat([error]);

      expect(httpFormat['error']).toBe('Validation failed');
      expect(httpFormat['message']).toBe('Single error | Field: field1 | Value: value1');
      expect(httpFormat['fieldErrors']).toEqual({
        field1: ['Single error'],
      });
    });

    it('should handle empty errors array', () => {
      const httpFormat = ValidationErrorUtils.toHttpErrorFormat([]);

      expect(httpFormat['error']).toBe('Validation failed');
      expect(httpFormat['message']).toBe('No validation errors');
      expect(httpFormat['details']).toEqual([]);
      expect(httpFormat['fieldErrors']).toEqual({});
    });

    it('should group multiple errors for same field in HTTP format', () => {
      const error1 = new ValidationError('Error 1', 'ValidationError', 'field1');
      const error2 = new ValidationError('Error 2', 'ValidationError', 'field1');

      const httpFormat = ValidationErrorUtils.toHttpErrorFormat([error1, error2]);

      expect(httpFormat['fieldErrors']).toEqual({
        field1: ['Error 1', 'Error 2'],
      });
    });
  });
});

describe('ValidationErrorFactory', () => {
  describe('requiredField', () => {
    it('should create required field error with default error type', () => {
      const error = ValidationErrorFactory.requiredField('testField');

      expect(error.message).toBe('testField is required and cannot be empty');
      expect(error.errorType).toBe('ValidationError');
      expect(error.validationContext.field).toBe('testField');
      expect(error.validationContext.rule).toBe('required');
      expect(error.validationContext.value).toBeUndefined();
    });

    it('should create required field error with custom error type', () => {
      const error = ValidationErrorFactory.requiredField('testField', 'CustomValidationError');

      expect(error.errorType).toBe('CustomValidationError');
      expect(error.name).toBe('CustomValidationError');
    });
  });

  describe('invalidFormat', () => {
    it('should create invalid format error with default error type', () => {
      const error = ValidationErrorFactory.invalidFormat('email', 'invalid-email', 'valid email');

      expect(error.message).toBe('email must be in valid email format');
      expect(error.errorType).toBe('ValidationError');
      expect(error.validationContext.field).toBe('email');
      expect(error.validationContext.value).toBe('invalid-email');
      expect(error.validationContext.rule).toBe('format');
    });

    it('should create invalid format error with custom error type', () => {
      const error = ValidationErrorFactory.invalidFormat(
        'email',
        'invalid-email',
        'valid email',
        'CustomError'
      );

      expect(error.errorType).toBe('CustomError');
    });
  });

  describe('outOfRange', () => {
    it('should create out of range error with default error type', () => {
      const error = ValidationErrorFactory.outOfRange('age', 150, 0, 120);

      expect(error.message).toBe('age must be between 0 and 120');
      expect(error.errorType).toBe('ValidationError');
      expect(error.validationContext.field).toBe('age');
      expect(error.validationContext.value).toBe(150);
      expect(error.validationContext.rule).toBe('range');
      expect(error.validationContext.context).toEqual({ min: 0, max: 120 });
    });

    it('should create out of range error with custom error type', () => {
      const error = ValidationErrorFactory.outOfRange('age', 150, 0, 120, 'RangeError');

      expect(error.errorType).toBe('RangeError');
    });
  });

  describe('notUnique', () => {
    it('should create not unique error with default error type', () => {
      const error = ValidationErrorFactory.notUnique('username', 'john_doe');

      expect(error.message).toBe('username must be unique');
      expect(error.errorType).toBe('ValidationError');
      expect(error.validationContext.field).toBe('username');
      expect(error.validationContext.value).toBe('john_doe');
      expect(error.validationContext.rule).toBe('unique');
    });

    it('should create not unique error with custom error type', () => {
      const error = ValidationErrorFactory.notUnique('username', 'john_doe', 'UniqueError');

      expect(error.errorType).toBe('UniqueError');
    });
  });

  describe('custom', () => {
    it('should create custom error with default error type', () => {
      const error = ValidationErrorFactory.custom(
        'Custom validation failed',
        'customField',
        'customValue',
        'customRule'
      );

      expect(error.message).toBe('Custom validation failed');
      expect(error.errorType).toBe('ValidationError');
      expect(error.validationContext.field).toBe('customField');
      expect(error.validationContext.value).toBe('customValue');
      expect(error.validationContext.rule).toBe('customRule');
    });

    it('should create custom error with custom error type', () => {
      const error = ValidationErrorFactory.custom(
        'Custom validation failed',
        'customField',
        'customValue',
        'customRule',
        'CustomValidationError'
      );

      expect(error.errorType).toBe('CustomValidationError');
    });
  });
});
