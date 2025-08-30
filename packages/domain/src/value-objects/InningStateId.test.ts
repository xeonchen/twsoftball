import { describe, it, expect } from 'vitest';
import { InningStateId } from './InningStateId';
import { DomainError } from '../errors/DomainError';

describe('InningStateId', () => {
  describe('Construction', () => {
    it('should create InningStateId with valid string value', () => {
      const inningStateId = new InningStateId('inning-123');

      expect(inningStateId.value).toBe('inning-123');
    });

    it('should reject empty string', () => {
      expect(() => new InningStateId('')).toThrow(DomainError);
      expect(() => new InningStateId('')).toThrow('InningStateId cannot be empty or whitespace');
    });

    it('should reject whitespace-only string', () => {
      expect(() => new InningStateId('   ')).toThrow(DomainError);
      expect(() => new InningStateId('   ')).toThrow('InningStateId cannot be empty or whitespace');
    });

    it('should reject strings longer than 50 characters', () => {
      const longId = 'a'.repeat(51);

      expect(() => new InningStateId(longId)).toThrow(DomainError);
      expect(() => new InningStateId(longId)).toThrow('InningStateId cannot exceed 50 characters');
    });

    it('should accept string exactly 50 characters long', () => {
      const maxLengthId = 'a'.repeat(50);

      expect(() => new InningStateId(maxLengthId)).not.toThrow();

      const inningStateId = new InningStateId(maxLengthId);
      expect(inningStateId.value).toBe(maxLengthId);
    });
  });

  describe('Equality', () => {
    it('should be equal when values are the same', () => {
      const id1 = new InningStateId('same-id');
      const id2 = new InningStateId('same-id');

      expect(id1.equals(id2)).toBe(true);
      expect(id2.equals(id1)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const id1 = new InningStateId('id-1');
      const id2 = new InningStateId('id-2');

      expect(id1.equals(id2)).toBe(false);
      expect(id2.equals(id1)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const inningStateId = new InningStateId('test-id');

      // TypeScript prevents this at compile time, but test runtime behavior
      expect(inningStateId.equals(null as unknown as InningStateId)).toBe(false);
      expect(inningStateId.equals(undefined as unknown as InningStateId)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const inningStateId = new InningStateId('test-inning-id');

      expect(inningStateId.toString()).toBe('test-inning-id');
    });
  });

  describe('Static factory methods', () => {
    it('should generate unique InningStateIds', () => {
      const id1 = InningStateId.generate();
      const id2 = InningStateId.generate();

      expect(id1.value).toBeDefined();
      expect(id2.value).toBeDefined();
      expect(id1.value).not.toBe(id2.value);
      expect(typeof id1.value).toBe('string');
      expect(id1.value.length).toBeGreaterThan(0);
    });

    it('should generate valid InningStateIds', () => {
      const generated = InningStateId.generate();

      // Should not throw when creating from generated value
      expect(() => new InningStateId(generated.value)).not.toThrow();

      // Generated ID should be within length limits
      expect(generated.value.length).toBeLessThanOrEqual(50);
      expect(generated.value.length).toBeGreaterThan(0);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const inningStateId = new InningStateId('test-id');

      // Value should be readonly (TypeScript enforced)
      expect(inningStateId.value).toBe('test-id');

      // Should not have any methods that mutate state
      const keys = Object.getOwnPropertyNames(InningStateId.prototype);
      const mutatingMethods = keys.filter(
        key => key.startsWith('set') || key.startsWith('add') || key.startsWith('remove')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should support JSON serialization', () => {
      const inningStateId = new InningStateId('serializable-id');

      const serialized = JSON.stringify(inningStateId);
      const parsed = JSON.parse(serialized);

      expect(parsed.value).toBe('serializable-id');
    });
  });
});
