/**
 * @file safe-json-parser.test.ts
 * Tests for safe JSON parsing utilities that eliminate security hotspots.
 */

import { describe, it, expect } from 'vitest';

import { SafeJsonParser, JsonValidationUtils, safeParseJson } from './safe-json-parser.js';

describe('SafeJsonParser', () => {
  describe('safeParse', () => {
    it('should parse valid JSON successfully', () => {
      const result = SafeJsonParser.safeParse('{"name": "test", "value": 42}');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'test', value: 42 });
        expect(result.error).toBeNull();
      }
    });

    it('should handle parsing failures gracefully', () => {
      const result = SafeJsonParser.safeParse('{"invalid": json}');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data).toBeNull();
        expect(result.error).toMatch(/JSON parse error:/);
      }
    });

    it('should validate input type', () => {
      const result = SafeJsonParser.safeParse(123 as unknown as string);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Input must be a string');
      }
    });

    it('should enforce maximum length limits', () => {
      const longString = 'x'.repeat(1000);
      const result = SafeJsonParser.safeParse(`"${longString}"`, { maxLength: 100 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/JSON string too long:/);
      }
    });

    it('should reject empty strings', () => {
      const result = SafeJsonParser.safeParse('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('JSON string cannot be empty');
      }
    });

    it('should reject whitespace-only strings', () => {
      const result = SafeJsonParser.safeParse('   ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('JSON string cannot be empty');
      }
    });

    it('should handle null values based on allowNull option', () => {
      const resultAllowed = SafeJsonParser.safeParse('null', { allowNull: true });
      const resultDisallowed = SafeJsonParser.safeParse('null', { allowNull: false });

      expect(resultAllowed.success).toBe(true);
      expect(resultDisallowed.success).toBe(false);

      if (!resultDisallowed.success) {
        expect(resultDisallowed.error).toBe('Null values not allowed');
      }
    });

    it('should apply custom validation when provided', () => {
      const validator = (data: unknown): boolean => {
        return (
          typeof data === 'object' &&
          data !== null &&
          'requiredField' in (data as Record<string, unknown>)
        );
      };

      const validResult = SafeJsonParser.safeParse('{"requiredField": "test"}', { validator });
      const invalidResult = SafeJsonParser.safeParse('{"otherField": "test"}', { validator });

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);

      if (!invalidResult.success) {
        expect(invalidResult.error).toBe('Custom validation failed');
      }
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        level1: {
          level2: {
            level3: ['item1', 'item2', { nested: true }],
          },
        },
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
      };

      const result = SafeJsonParser.safeParse(JSON.stringify(complexObject));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(complexObject);
      }
    });
  });

  describe('parseEventData', () => {
    it('should parse valid event data', () => {
      const eventData = '{"eventType": "AtBatCompleted", "playerId": "player123"}';
      const result = SafeJsonParser.parseEventData(eventData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          eventType: 'AtBatCompleted',
          playerId: 'player123',
        });
      }
    });

    it('should reject non-object event data', () => {
      const result = SafeJsonParser.parseEventData('"just a string"');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Custom validation failed');
      }
    });

    it('should reject array event data', () => {
      const result = SafeJsonParser.parseEventData('[1, 2, 3]');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Custom validation failed');
      }
    });

    it('should reject null event data', () => {
      const result = SafeJsonParser.parseEventData('null');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Null values not allowed');
      }
    });

    it('should enforce event data size limits (64KB)', () => {
      const largeObject = { data: 'x'.repeat(65 * 1024) }; // > 64KB
      const result = SafeJsonParser.parseEventData(JSON.stringify(largeObject));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/JSON string too long:/);
      }
    });
  });

  describe('parseConfiguration', () => {
    it('should parse valid configuration', () => {
      const config = '{"setting1": "value1", "setting2": 42}';
      const result = SafeJsonParser.parseConfiguration(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ setting1: 'value1', setting2: 42 });
      }
    });

    it('should reject null configuration', () => {
      const result = SafeJsonParser.parseConfiguration('null');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Null values not allowed');
      }
    });

    it('should enforce configuration size limits (16KB)', () => {
      const largeConfig = { setting: 'x'.repeat(17 * 1024) }; // > 16KB
      const result = SafeJsonParser.parseConfiguration(JSON.stringify(largeConfig));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/JSON string too long:/);
      }
    });
  });

  describe('isValidJson', () => {
    it('should return true for valid JSON', () => {
      expect(SafeJsonParser.isValidJson('{"valid": true}')).toBe(true);
      expect(SafeJsonParser.isValidJson('[1, 2, 3]')).toBe(true);
      expect(SafeJsonParser.isValidJson('"string"')).toBe(true);
      expect(SafeJsonParser.isValidJson('42')).toBe(true);
      expect(SafeJsonParser.isValidJson('true')).toBe(true);
      expect(SafeJsonParser.isValidJson('null')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(SafeJsonParser.isValidJson('{"invalid": json}')).toBe(false);
      expect(SafeJsonParser.isValidJson('')).toBe(false);
      expect(SafeJsonParser.isValidJson('   ')).toBe(false);
      expect(SafeJsonParser.isValidJson(123 as unknown as string)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return null for successful parse', () => {
      const result = SafeJsonParser.safeParse('{"valid": true}');
      expect(SafeJsonParser.getErrorMessage(result)).toBeNull();
    });

    it('should return error message for failed parse', () => {
      const result = SafeJsonParser.safeParse('invalid');
      const errorMessage = SafeJsonParser.getErrorMessage(result);

      expect(errorMessage).toBeTruthy();
      expect(typeof errorMessage).toBe('string');
    });
  });

  describe('parseWithFallback', () => {
    it('should return parsed data on success', () => {
      const result = SafeJsonParser.parseWithFallback('{"test": true}', { fallback: true });
      expect(result).toEqual({ test: true });
    });

    it('should return fallback on failure', () => {
      const fallback = { default: 'value' };
      const result = SafeJsonParser.parseWithFallback('invalid json', fallback);
      expect(result).toBe(fallback);
    });

    it('should work with primitive fallbacks', () => {
      expect(SafeJsonParser.parseWithFallback('invalid', 'fallback')).toBe('fallback');
      expect(SafeJsonParser.parseWithFallback('invalid', 42)).toBe(42);
      expect(SafeJsonParser.parseWithFallback('invalid', true)).toBe(true);
      expect(SafeJsonParser.parseWithFallback('invalid', null)).toBe(null);
    });
  });
});

describe('JsonValidationUtils', () => {
  describe('isValidEventData', () => {
    it('should validate valid event objects', () => {
      expect(JsonValidationUtils.isValidEventData({ eventType: 'test' })).toBe(true);
      expect(JsonValidationUtils.isValidEventData({})).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(JsonValidationUtils.isValidEventData('string')).toBe(false);
      expect(JsonValidationUtils.isValidEventData(42)).toBe(false);
      expect(JsonValidationUtils.isValidEventData(true)).toBe(false);
      expect(JsonValidationUtils.isValidEventData(null)).toBe(false);
      expect(JsonValidationUtils.isValidEventData([1, 2, 3])).toBe(false);
    });
  });

  describe('isNonEmptyObject', () => {
    it('should validate non-empty objects', () => {
      expect(JsonValidationUtils.isNonEmptyObject({ key: 'value' })).toBe(true);
      expect(JsonValidationUtils.isNonEmptyObject({ a: 1, b: 2 })).toBe(true);
    });

    it('should reject empty objects', () => {
      expect(JsonValidationUtils.isNonEmptyObject({})).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(JsonValidationUtils.isNonEmptyObject(null)).toBe(false);
      expect(JsonValidationUtils.isNonEmptyObject('string')).toBe(false);
      expect(JsonValidationUtils.isNonEmptyObject([1])).toBe(false);
    });
  });

  describe('isValidString', () => {
    it('should validate non-empty strings', () => {
      expect(JsonValidationUtils.isValidString('test')).toBe(true);
      expect(JsonValidationUtils.isValidString('   spaces   ')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(JsonValidationUtils.isValidString('')).toBe(false);
    });

    it('should reject non-strings', () => {
      expect(JsonValidationUtils.isValidString(42)).toBe(false);
      expect(JsonValidationUtils.isValidString(null)).toBe(false);
      expect(JsonValidationUtils.isValidString({})).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(JsonValidationUtils.isPositiveNumber(42)).toBe(true);
      expect(JsonValidationUtils.isPositiveNumber(0.5)).toBe(true);
      expect(JsonValidationUtils.isPositiveNumber(Number.MAX_VALUE)).toBe(true);
    });

    it('should reject zero and negative numbers', () => {
      expect(JsonValidationUtils.isPositiveNumber(0)).toBe(false);
      expect(JsonValidationUtils.isPositiveNumber(-1)).toBe(false);
      expect(JsonValidationUtils.isPositiveNumber(-0.5)).toBe(false);
    });

    it('should reject invalid numbers', () => {
      expect(JsonValidationUtils.isPositiveNumber(NaN)).toBe(false);
      expect(JsonValidationUtils.isPositiveNumber(Infinity)).toBe(false);
      expect(JsonValidationUtils.isPositiveNumber(-Infinity)).toBe(false);
    });

    it('should reject non-numbers', () => {
      expect(JsonValidationUtils.isPositiveNumber('42')).toBe(false);
      expect(JsonValidationUtils.isPositiveNumber(true)).toBe(false);
      expect(JsonValidationUtils.isPositiveNumber(null)).toBe(false);
    });
  });
});

describe('safeParseJson (legacy function)', () => {
  it('should work as an alias for SafeJsonParser.safeParse', () => {
    const result1 = safeParseJson('{"test": true}');
    const result2 = SafeJsonParser.safeParse('{"test": true}');

    expect(result1.success).toBe(result2.success);
    expect(result1.data).toEqual(result2.data);
    expect(result1.error).toBe(result2.error);
  });

  it('should handle errors the same way', () => {
    const result1 = safeParseJson('invalid');
    const result2 = SafeJsonParser.safeParse('invalid');

    expect(result1.success).toBe(result2.success);
    expect(result1.success).toBe(false);
  });
});
