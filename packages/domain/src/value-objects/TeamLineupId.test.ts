import { describe, it, expect } from 'vitest';
import { TeamLineupId } from './TeamLineupId';
import { DomainError } from '../errors/DomainError';

describe('TeamLineupId', () => {
  describe('Construction', () => {
    it('should create TeamLineupId with valid string value', () => {
      const teamLineupId = new TeamLineupId('lineup-123');

      expect(teamLineupId.value).toBe('lineup-123');
    });

    it('should reject empty string', () => {
      expect(() => new TeamLineupId('')).toThrow(DomainError);
      expect(() => new TeamLineupId('')).toThrow('TeamLineupId cannot be empty or whitespace');
    });

    it('should reject whitespace-only string', () => {
      expect(() => new TeamLineupId('   ')).toThrow(DomainError);
      expect(() => new TeamLineupId('   ')).toThrow('TeamLineupId cannot be empty or whitespace');
    });

    it('should reject strings longer than 50 characters', () => {
      const longId = 'a'.repeat(51);

      expect(() => new TeamLineupId(longId)).toThrow(DomainError);
      expect(() => new TeamLineupId(longId)).toThrow('TeamLineupId cannot exceed 50 characters');
    });

    it('should accept string exactly 50 characters long', () => {
      const maxLengthId = 'a'.repeat(50);

      expect(() => new TeamLineupId(maxLengthId)).not.toThrow();

      const teamLineupId = new TeamLineupId(maxLengthId);
      expect(teamLineupId.value).toBe(maxLengthId);
    });
  });

  describe('Equality', () => {
    it('should be equal when values are the same', () => {
      const id1 = new TeamLineupId('same-id');
      const id2 = new TeamLineupId('same-id');

      expect(id1.equals(id2)).toBe(true);
      expect(id2.equals(id1)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const id1 = new TeamLineupId('id-1');
      const id2 = new TeamLineupId('id-2');

      expect(id1.equals(id2)).toBe(false);
      expect(id2.equals(id1)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const teamLineupId = new TeamLineupId('test-id');

      // TypeScript prevents this at compile time, but test runtime behavior
      expect(teamLineupId.equals(null as unknown as TeamLineupId)).toBe(false);
      expect(teamLineupId.equals(undefined as unknown as TeamLineupId)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const teamLineupId = new TeamLineupId('test-lineup-id');

      expect(teamLineupId.toString()).toBe('test-lineup-id');
    });
  });

  describe('Static factory methods', () => {
    it('should generate unique TeamLineupIds', () => {
      const id1 = TeamLineupId.generate();
      const id2 = TeamLineupId.generate();

      expect(id1.value).toBeDefined();
      expect(id2.value).toBeDefined();
      expect(id1.value).not.toBe(id2.value);
      expect(typeof id1.value).toBe('string');
      expect(id1.value.length).toBeGreaterThan(0);
    });

    it('should generate valid TeamLineupIds', () => {
      const generated = TeamLineupId.generate();

      // Should not throw when creating from generated value
      expect(() => new TeamLineupId(generated.value)).not.toThrow();

      // Generated ID should be within length limits
      expect(generated.value.length).toBeLessThanOrEqual(50);
      expect(generated.value.length).toBeGreaterThan(0);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const teamLineupId = new TeamLineupId('test-id');

      // Value should be readonly (TypeScript enforced)
      expect(teamLineupId.value).toBe('test-id');

      // Should not have any methods that mutate state
      const keys = Object.getOwnPropertyNames(TeamLineupId.prototype);
      const mutatingMethods = keys.filter(
        key => key.startsWith('set') || key.startsWith('add') || key.startsWith('remove')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should support JSON serialization', () => {
      const teamLineupId = new TeamLineupId('serializable-id');

      const serialized = JSON.stringify(teamLineupId);
      const parsed = JSON.parse(serialized);

      expect(parsed.value).toBe('serializable-id');
    });
  });
});
