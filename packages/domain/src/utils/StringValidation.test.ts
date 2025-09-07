import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';

import { StringValidation } from './StringValidation';

describe('StringValidation', () => {
  describe('validateNonEmptyString', () => {
    it('should accept valid non-empty strings', () => {
      expect(() => StringValidation.validateNonEmptyString('valid', 'test')).not.toThrow();
      expect(() => StringValidation.validateNonEmptyString('a', 'single char')).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyString('  text with spaces  ', 'padded')
      ).not.toThrow();
      expect(() => StringValidation.validateNonEmptyString('123', 'numeric string')).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyString('special!@#$%^&*()', 'special chars')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyString('Multi\nline\nstring', 'multiline')
      ).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => StringValidation.validateNonEmptyString('', 'GameId')).toThrow(
        new DomainError('GameId cannot be empty or whitespace')
      );
    });

    it('should reject whitespace-only strings', () => {
      expect(() => StringValidation.validateNonEmptyString('   ', 'PlayerId')).toThrow(
        new DomainError('PlayerId cannot be empty or whitespace')
      );

      expect(() => StringValidation.validateNonEmptyString('\t', 'TabId')).toThrow(
        new DomainError('TabId cannot be empty or whitespace')
      );

      expect(() => StringValidation.validateNonEmptyString('\n', 'NewlineId')).toThrow(
        new DomainError('NewlineId cannot be empty or whitespace')
      );

      expect(() => StringValidation.validateNonEmptyString(' \t\n ', 'MixedWhitespace')).toThrow(
        new DomainError('MixedWhitespace cannot be empty or whitespace')
      );
    });

    it('should reject null and undefined values', () => {
      expect(() =>
        StringValidation.validateNonEmptyString(null as unknown as string, 'NullId')
      ).toThrow(
        expect.objectContaining({
          message: 'NullId cannot be empty or whitespace',
          name: 'DomainError',
        }) as Error
      );

      expect(() =>
        StringValidation.validateNonEmptyString(undefined as unknown as string, 'UndefinedId')
      ).toThrow(
        expect.objectContaining({
          message: 'UndefinedId cannot be empty or whitespace',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should include field name in error message', () => {
      expect(() => StringValidation.validateNonEmptyString('', 'player name')).toThrow(
        new DomainError('player name cannot be empty or whitespace')
      );

      expect(() => StringValidation.validateNonEmptyString('   ', 'team identifier')).toThrow(
        new DomainError('team identifier cannot be empty or whitespace')
      );
    });
  });

  describe('validateNonEmptyStringWithLength', () => {
    it('should accept valid strings within length limit', () => {
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('valid', 10, 'GameId')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a', 1, 'SingleChar')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a'.repeat(50), 50, 'MaxLength')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('uuid-like-string', 50, 'UUID')
      ).not.toThrow();
    });

    it('should reject empty string (inherits from validateNonEmptyString)', () => {
      expect(() => StringValidation.validateNonEmptyStringWithLength('', 50, 'GameId')).toThrow(
        new DomainError('GameId cannot be empty or whitespace')
      );
    });

    it('should reject whitespace-only strings (inherits from validateNonEmptyString)', () => {
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('   ', 50, 'PlayerId')
      ).toThrow(
        expect.objectContaining({
          message: 'PlayerId cannot be empty or whitespace',
          name: 'DomainError',
        }) as Error
      );

      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('\t\n ', 50, 'WhitespaceId')
      ).toThrow(
        expect.objectContaining({
          message: 'WhitespaceId cannot be empty or whitespace',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should reject strings exceeding maximum length', () => {
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('toolong', 5, 'ShortId')
      ).toThrow(
        expect.objectContaining({
          message: 'ShortId cannot exceed 5 characters',
          name: 'DomainError',
        }) as Error
      );

      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a'.repeat(51), 50, 'GameId')
      ).toThrow(
        expect.objectContaining({
          message: 'GameId cannot exceed 50 characters',
          name: 'DomainError',
        }) as Error
      );

      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('exactly11chars!', 10, 'TenCharMax')
      ).toThrow(
        expect.objectContaining({
          message: 'TenCharMax cannot exceed 10 characters',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should accept strings exactly at maximum length', () => {
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('12345', 5, 'ExactLength')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a'.repeat(50), 50, 'MaxGameId')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('x', 1, 'SingleCharMax')
      ).not.toThrow();
    });

    it('should include field name and limit in error messages', () => {
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('', 25, 'player identifier')
      ).toThrow(
        expect.objectContaining({
          message: 'player identifier cannot be empty or whitespace',
          name: 'DomainError',
        }) as Error
      );

      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('way too long string', 10, 'short field')
      ).toThrow(
        expect.objectContaining({
          message: 'short field cannot exceed 10 characters',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should handle unicode characters correctly', () => {
      // Unicode characters should count properly for length
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('café', 4, 'Unicode')
      ).not.toThrow();
      expect(() => StringValidation.validateNonEmptyStringWithLength('café', 3, 'Unicode')).toThrow(
        new DomainError('Unicode cannot exceed 3 characters')
      );

      // Multi-byte characters - using simpler approach
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('αβ', 2, 'Greek')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('αβγ', 2, 'TooManyGreek')
      ).toThrow(
        expect.objectContaining({
          message: 'TooManyGreek cannot exceed 2 characters',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should work with various maximum length values', () => {
      // Very small limit
      expect(() => StringValidation.validateNonEmptyStringWithLength('x', 1, 'Tiny')).not.toThrow();
      expect(() => StringValidation.validateNonEmptyStringWithLength('xy', 1, 'TooLong')).toThrow(
        new DomainError('TooLong cannot exceed 1 characters')
      );

      // Standard limits
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a'.repeat(25), 25, 'Standard')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a'.repeat(50), 50, 'GameId')
      ).not.toThrow();

      // Large limit
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength('a'.repeat(100), 100, 'Large')
      ).not.toThrow();
    });
  });

  describe('integration and edge cases', () => {
    it('should maintain consistent behavior between validation methods', () => {
      const emptyString = '';
      const whitespaceString = '   ';
      const validString = 'valid';
      const fieldName = 'TestField';

      // Both methods should reject empty strings with same error
      expect(() => StringValidation.validateNonEmptyString(emptyString, fieldName)).toThrow(
        DomainError
      );

      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(emptyString, 50, fieldName)
      ).toThrow(DomainError);

      // Both methods should reject whitespace with same error
      expect(() => StringValidation.validateNonEmptyString(whitespaceString, fieldName)).toThrow(
        DomainError
      );

      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(whitespaceString, 50, fieldName)
      ).toThrow(DomainError);

      // Both methods should accept valid strings (when length is sufficient)
      expect(() => StringValidation.validateNonEmptyString(validString, fieldName)).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(validString, 50, fieldName)
      ).not.toThrow();
    });

    it('should handle boundary cases for length validation', () => {
      // Zero-length maximum should always fail (even for empty valid content)
      expect(() => StringValidation.validateNonEmptyStringWithLength('a', 0, 'ZeroMax')).toThrow(
        new DomainError('ZeroMax cannot exceed 0 characters')
      );

      // Very long strings
      const veryLongString = 'a'.repeat(1000);
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(veryLongString, 1000, 'VeryLong')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(veryLongString, 999, 'TooLong')
      ).toThrow(
        expect.objectContaining({
          message: 'TooLong cannot exceed 999 characters',
          name: 'DomainError',
        }) as Error
      );
    });

    it('should handle special characters and content types', () => {
      // UUIDs (common use case)
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(uuid, 50, 'UUID')
      ).not.toThrow();

      // JSON-like strings
      const jsonString = '{"key":"value"}';
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(jsonString, 20, 'JSON')
      ).not.toThrow();

      // URLs
      const url = 'https://example.com/path';
      expect(() => StringValidation.validateNonEmptyStringWithLength(url, 30, 'URL')).not.toThrow();

      // Base64-like strings
      const base64 = 'dGVzdCBzdHJpbmc=';
      expect(() =>
        StringValidation.validateNonEmptyStringWithLength(base64, 20, 'Base64')
      ).not.toThrow();
    });

    it('should provide clear error messages for debugging', () => {
      // Error messages should be descriptive enough for developers
      try {
        StringValidation.validateNonEmptyString('', 'GameId');
      } catch (error) {
        expect((error as Error).message).toBe('GameId cannot be empty or whitespace');
        expect((error as Error).name).toBe('DomainError');
      }

      try {
        StringValidation.validateNonEmptyStringWithLength('toolongstring', 5, 'ShortField');
      } catch (error) {
        expect((error as Error).message).toBe('ShortField cannot exceed 5 characters');
        expect((error as Error).name).toBe('DomainError');
      }
    });

    it('should work with realistic domain field names', () => {
      // Test with actual field names used in the softball domain
      expect(() =>
        StringValidation.validateNonEmptyString('valid-game-id', 'GameId')
      ).not.toThrow();
      expect(() => StringValidation.validateNonEmptyString('player-123', 'PlayerId')).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyString('lineup-456', 'TeamLineupId')
      ).not.toThrow();
      expect(() =>
        StringValidation.validateNonEmptyString('inning-789', 'InningStateId')
      ).not.toThrow();

      expect(() => StringValidation.validateNonEmptyString('', 'GameId')).toThrow(
        new DomainError('GameId cannot be empty or whitespace')
      );
    });
  });
});
