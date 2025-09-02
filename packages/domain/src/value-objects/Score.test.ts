import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError';

import { Score } from './Score';

describe('Score', () => {
  describe('Construction', () => {
    it('should create Score with valid runs value', () => {
      const score = new Score(5);

      expect(score.runs).toBe(5);
    });

    it('should accept zero runs', () => {
      const score = new Score(0);

      expect(score.runs).toBe(0);
    });

    it('should reject negative runs', () => {
      expect(() => new Score(-1)).toThrow(DomainError);
      expect(() => new Score(-1)).toThrow('Score must be a non-negative integer');
    });

    it('should reject non-integer values', () => {
      expect(() => new Score(3.5)).toThrow(DomainError);
      expect(() => new Score(3.5)).toThrow('Score must be a non-negative integer');
    });

    it('should reject NaN', () => {
      expect(() => new Score(NaN)).toThrow(DomainError);
      expect(() => new Score(NaN)).toThrow('Score must be a non-negative integer');
    });

    it('should reject Infinity', () => {
      expect(() => new Score(Infinity)).toThrow(DomainError);
      expect(() => new Score(Infinity)).toThrow('Score must be a non-negative integer');
    });

    it('should accept large integer values', () => {
      const score = new Score(999);

      expect(score.runs).toBe(999);
    });
  });

  describe('Business operations', () => {
    it('should add runs correctly', () => {
      const originalScore = new Score(3);
      const newScore = originalScore.addRuns(2);

      expect(newScore.runs).toBe(5);
      expect(originalScore.runs).toBe(3); // Original should be unchanged (immutable)
    });

    it('should add zero runs', () => {
      const originalScore = new Score(5);
      const newScore = originalScore.addRuns(0);

      expect(newScore.runs).toBe(5);
      expect(originalScore.runs).toBe(5);
    });

    it('should reject adding negative runs', () => {
      const score = new Score(5);

      expect(() => score.addRuns(-1)).toThrow(DomainError);
      expect(() => score.addRuns(-1)).toThrow('Additional runs must be a non-negative integer');
    });

    it('should reject adding non-integer runs', () => {
      const score = new Score(3);

      expect(() => score.addRuns(1.5)).toThrow(DomainError);
      expect(() => score.addRuns(1.5)).toThrow('Additional runs must be a non-negative integer');
    });

    it('should handle large additions', () => {
      const score = new Score(100);
      const newScore = score.addRuns(50);

      expect(newScore.runs).toBe(150);
    });
  });

  describe('Equality', () => {
    it('should be equal when runs are the same', () => {
      const score1 = new Score(7);
      const score2 = new Score(7);

      expect(score1.equals(score2)).toBe(true);
      expect(score2.equals(score1)).toBe(true);
    });

    it('should not be equal when runs are different', () => {
      const score1 = new Score(3);
      const score2 = new Score(5);

      expect(score1.equals(score2)).toBe(false);
      expect(score2.equals(score1)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const score = new Score(5);

      expect(score.equals(null as unknown as Score)).toBe(false);
      expect(score.equals(undefined as unknown as Score)).toBe(false);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const score = new Score(10);

      // Runs should be readonly (TypeScript enforced)
      expect(score.runs).toBe(10);

      // Operations should return new instances
      const newScore = score.addRuns(5);
      expect(score.runs).toBe(10); // Original unchanged
      expect(newScore.runs).toBe(15); // New instance
      expect(newScore).not.toBe(score); // Different objects
    });

    it('should support JSON serialization', () => {
      const score = new Score(12);

      const serialized = JSON.stringify(score);
      const parsed = JSON.parse(serialized);

      expect(parsed.runs).toBe(12);
    });

    it('should have meaningful string representation', () => {
      const score = new Score(8);

      expect(score.toString()).toBe('8');
    });
  });

  describe('Static factory methods', () => {
    it('should create zero score', () => {
      const score = Score.zero();

      expect(score.runs).toBe(0);
    });

    it('should create score from runs', () => {
      const score = Score.fromRuns(15);

      expect(score.runs).toBe(15);
    });

    it('should validate runs in factory method', () => {
      expect(() => Score.fromRuns(-1)).toThrow(DomainError);
      expect(() => Score.fromRuns(3.14)).toThrow(DomainError);
    });
  });
});
