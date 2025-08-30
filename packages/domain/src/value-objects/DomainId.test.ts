import { describe, it, expect } from 'vitest';
import { DomainId } from './DomainId';
import { DomainError } from '../errors/DomainError';

/**
 * Concrete test implementation of DomainId for testing abstract base class.
 *
 * @remarks
 * This test class allows us to verify the behavior of the abstract DomainId
 * base class without relying on concrete domain ID implementations.
 * It follows the exact same pattern that real ID classes should use.
 */
class TestId extends DomainId<TestId> {
  constructor(value: string, maxLength: number = 50) {
    super(value, 'TestId', maxLength);
  }

  equals(other: TestId): boolean {
    return this.equalsImpl(other, TestId);
  }

  static generate(): TestId {
    return new TestId(crypto.randomUUID());
  }
}

// Helper to simulate different type for error message testing

describe('DomainId', () => {
  describe('constructor validation', () => {
    it('should create ID with valid string', () => {
      const id = new TestId('valid-id-123');
      expect(id.value).toBe('valid-id-123');
    });

    it('should create ID with UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = new TestId(uuid);
      expect(id.value).toBe(uuid);
    });

    it('should throw DomainError for null value', () => {
      expect(() => new TestId(null as unknown as string)).toThrow(DomainError);
      expect(() => new TestId(null as unknown as string)).toThrow(
        'TestId cannot be empty or whitespace'
      );
    });

    it('should throw DomainError for undefined value', () => {
      expect(() => new TestId(undefined as unknown as string)).toThrow(DomainError);
      expect(() => new TestId(undefined as unknown as string)).toThrow(
        'TestId cannot be empty or whitespace'
      );
    });

    it('should throw DomainError for empty string', () => {
      expect(() => new TestId('')).toThrow(DomainError);
      expect(() => new TestId('')).toThrow('TestId cannot be empty or whitespace');
    });

    it('should throw DomainError for whitespace-only string', () => {
      expect(() => new TestId('   ')).toThrow(DomainError);
      expect(() => new TestId('   ')).toThrow('TestId cannot be empty or whitespace');
    });

    it('should throw DomainError for tab-only string', () => {
      expect(() => new TestId('\t')).toThrow(DomainError);
      expect(() => new TestId('\t')).toThrow('TestId cannot be empty or whitespace');
    });

    it('should throw DomainError for newline-only string', () => {
      expect(() => new TestId('\n')).toThrow(DomainError);
      expect(() => new TestId('\n')).toThrow('TestId cannot be empty or whitespace');
    });

    it('should throw DomainError for mixed whitespace string', () => {
      expect(() => new TestId(' \t\n ')).toThrow(DomainError);
      expect(() => new TestId(' \t\n ')).toThrow('TestId cannot be empty or whitespace');
    });

    it('should accept string with leading/trailing whitespace if content exists', () => {
      const id = new TestId('  valid-id  ');
      expect(id.value).toBe('  valid-id  ');
    });
  });

  describe('length validation', () => {
    it('should accept string at default max length (50 characters)', () => {
      const fiftyCharString = 'a'.repeat(50);
      const id = new TestId(fiftyCharString);
      expect(id.value).toBe(fiftyCharString);
    });

    it('should throw DomainError for string exceeding default max length', () => {
      const fiftyOneCharString = 'a'.repeat(51);
      expect(() => new TestId(fiftyOneCharString)).toThrow(DomainError);
      expect(() => new TestId(fiftyOneCharString)).toThrow('TestId cannot exceed 50 characters');
    });

    it('should accept custom max length', () => {
      const twentyCharString = 'a'.repeat(20);
      const id = new TestId(twentyCharString, 20);
      expect(id.value).toBe(twentyCharString);
    });

    it('should throw DomainError for string exceeding custom max length', () => {
      const twentyOneCharString = 'a'.repeat(21);
      expect(() => new TestId(twentyOneCharString, 20)).toThrow(DomainError);
      expect(() => new TestId(twentyOneCharString, 20)).toThrow(
        'TestId cannot exceed 20 characters'
      );
    });

    it('should handle very small max length', () => {
      const id = new TestId('a', 1);
      expect(id.value).toBe('a');

      expect(() => new TestId('ab', 1)).toThrow(DomainError);
      expect(() => new TestId('ab', 1)).toThrow('TestId cannot exceed 1 characters');
    });

    it('should handle very large max length', () => {
      const largeString = 'x'.repeat(1000);
      const id = new TestId(largeString, 1000);
      expect(id.value).toBe(largeString);
    });
  });

  describe('toString()', () => {
    it('should return the underlying string value', () => {
      const testValue = 'test-id-value';
      const id = new TestId(testValue);
      expect(id.toString()).toBe(testValue);
    });

    it('should return UUID string for UUID values', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = new TestId(uuid);
      expect(id.toString()).toBe(uuid);
    });

    it('should return string with whitespace preserved', () => {
      const valueWithWhitespace = '  test-id  ';
      const id = new TestId(valueWithWhitespace);
      expect(id.toString()).toBe(valueWithWhitespace);
    });
  });

  describe('equals()', () => {
    it('should return true for IDs with same value', () => {
      const id1 = new TestId('same-value');
      const id2 = new TestId('same-value');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for IDs with different values', () => {
      const id1 = new TestId('value-1');
      const id2 = new TestId('value-2');
      expect(id1.equals(id2)).toBe(false);
    });

    it('should return true when comparing ID with itself', () => {
      const id = new TestId('self-comparison');
      expect(id.equals(id)).toBe(true);
    });

    it('should return false for null comparison', () => {
      const id = new TestId('test-value');
      expect(id.equals(null as unknown as TestId)).toBe(false);
    });

    it('should return false for undefined comparison', () => {
      const id = new TestId('test-value');
      expect(id.equals(undefined as unknown as TestId)).toBe(false);
    });

    it('should return false for different ID type with same value', () => {
      const testId = new TestId('same-value');
      // Simulate a different ID type by creating an object with different constructor
      const differentTypeId = {
        ...testId,
        constructor: { name: 'AnotherTestId' },
      };

      // This tests type safety - different ID types should not be equal
      expect(testId.equals(differentTypeId as unknown as TestId)).toBe(false);
    });

    it('should return false for non-ID object', () => {
      const id = new TestId('test-value');
      const notAnId = { value: 'test-value' };
      expect(id.equals(notAnId as unknown as TestId)).toBe(false);
    });

    it('should return false for string comparison', () => {
      const id = new TestId('test-value');
      expect(id.equals('test-value' as unknown as TestId)).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      const id1 = new TestId('Test-Value');
      const id2 = new TestId('test-value');
      expect(id1.equals(id2)).toBe(false);
    });

    it('should handle whitespace differences correctly', () => {
      const id1 = new TestId('test-value');
      const id2 = new TestId(' test-value ');
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('value immutability', () => {
    it('should have readonly value property', () => {
      const id = new TestId('immutable-value');

      // This should pass compilation - value is accessible
      expect(id.value).toBe('immutable-value');

      // TypeScript should prevent assignment (compile-time check)
      // The value property is readonly, preventing modification
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in ID value', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const id = new TestId(specialChars);
      expect(id.value).toBe(specialChars);
      expect(id.toString()).toBe(specialChars);
    });

    it('should handle Unicode characters', () => {
      const unicode = '測試-🎾-⚾-αβγ';
      const id = new TestId(unicode);
      expect(id.value).toBe(unicode);
      expect(id.toString()).toBe(unicode);
    });

    it('should handle numbers as string', () => {
      const numericString = '12345';
      const id = new TestId(numericString);
      expect(id.value).toBe(numericString);
    });

    it('should handle string with line breaks if within length', () => {
      const multiLine = 'line1\nline2';
      const id = new TestId(multiLine);
      expect(id.value).toBe(multiLine);
    });
  });

  describe('error message format consistency', () => {
    it('should use correct ID type name in empty error message', () => {
      expect(() => new TestId('')).toThrow('TestId cannot be empty or whitespace');
    });

    it('should use correct ID type name in length error message', () => {
      const longString = 'a'.repeat(51);
      expect(() => new TestId(longString)).toThrow('TestId cannot exceed 50 characters');
    });

    it('should use correct ID type name with custom max length', () => {
      expect(() => new TestId('toolong', 5)).toThrow('TestId cannot exceed 5 characters');
    });

    it('should maintain consistency with different ID type names', () => {
      // Test that TestId uses its proper type name in error messages
      expect(() => new TestId('')).toThrow('TestId cannot be empty or whitespace');
      expect(() => new TestId('a'.repeat(51))).toThrow('TestId cannot exceed 50 characters');

      // Test with custom maxLength to verify error message format consistency
      expect(() => new TestId('a'.repeat(21), 20)).toThrow('TestId cannot exceed 20 characters');
    });
  });

  describe('static generate() pattern', () => {
    it('should support static generate method in concrete classes', () => {
      const id = TestId.generate();
      expect(id).toBeInstanceOf(TestId);
      expect(typeof id.value).toBe('string');
      expect(id.value.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = TestId.generate();
      const id2 = TestId.generate();
      expect(id1.equals(id2)).toBe(false);
    });

    it('should generate valid UUID format', () => {
      const id = TestId.generate();
      // Basic UUID format check (8-4-4-4-12 hex digits)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(id.value)).toBe(true);
    });
  });
});
