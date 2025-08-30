import { describe, it, expect } from 'vitest';
import { GameScore } from './GameScore';
import { Score } from './Score';
import { DomainError } from '../errors/DomainError';

describe('GameScore', () => {
  describe('Construction', () => {
    it('should create GameScore with valid home and away scores', () => {
      const homeScore = new Score(5);
      const awayScore = new Score(3);
      const gameScore = new GameScore(homeScore, awayScore);

      expect(gameScore.homeScore).toBe(homeScore);
      expect(gameScore.awayScore).toBe(awayScore);
    });

    it('should create GameScore with zero scores', () => {
      const homeScore = Score.zero();
      const awayScore = Score.zero();
      const gameScore = new GameScore(homeScore, awayScore);

      expect(gameScore.homeScore.runs).toBe(0);
      expect(gameScore.awayScore.runs).toBe(0);
    });

    it('should reject null home score', () => {
      const awayScore = new Score(3);

      expect(() => new GameScore(null as unknown as Score, awayScore)).toThrow(DomainError);
      expect(() => new GameScore(null as unknown as Score, awayScore)).toThrow(
        'Home score cannot be null or undefined'
      );
    });

    it('should reject null away score', () => {
      const homeScore = new Score(5);

      expect(() => new GameScore(homeScore, null as unknown as Score)).toThrow(DomainError);
      expect(() => new GameScore(homeScore, null as unknown as Score)).toThrow(
        'Away score cannot be null or undefined'
      );
    });
  });

  describe('Score queries', () => {
    it('should return correct home runs', () => {
      const gameScore = new GameScore(new Score(7), new Score(4));

      expect(gameScore.getHomeRuns()).toBe(7);
    });

    it('should return correct away runs', () => {
      const gameScore = new GameScore(new Score(2), new Score(9));

      expect(gameScore.getAwayRuns()).toBe(9);
    });

    it('should return total runs', () => {
      const gameScore = new GameScore(new Score(6), new Score(8));

      expect(gameScore.getTotalRuns()).toBe(14);
    });

    it('should handle zero total runs', () => {
      const gameScore = new GameScore(Score.zero(), Score.zero());

      expect(gameScore.getTotalRuns()).toBe(0);
    });
  });

  describe('Game status queries', () => {
    it('should identify home team winning', () => {
      const gameScore = new GameScore(new Score(8), new Score(5));

      expect(gameScore.isHomeWinning()).toBe(true);
      expect(gameScore.isAwayWinning()).toBe(false);
      expect(gameScore.isTied()).toBe(false);
    });

    it('should identify away team winning', () => {
      const gameScore = new GameScore(new Score(3), new Score(7));

      expect(gameScore.isHomeWinning()).toBe(false);
      expect(gameScore.isAwayWinning()).toBe(true);
      expect(gameScore.isTied()).toBe(false);
    });

    it('should identify tied game', () => {
      const gameScore = new GameScore(new Score(6), new Score(6));

      expect(gameScore.isHomeWinning()).toBe(false);
      expect(gameScore.isAwayWinning()).toBe(false);
      expect(gameScore.isTied()).toBe(true);
    });

    it('should identify zero-zero tie', () => {
      const gameScore = new GameScore(Score.zero(), Score.zero());

      expect(gameScore.isTied()).toBe(true);
    });

    it('should calculate run differential', () => {
      const gameScore = new GameScore(new Score(10), new Score(7));

      expect(gameScore.getRunDifferential()).toBe(3); // Home leading by 3
    });

    it('should calculate negative run differential', () => {
      const gameScore = new GameScore(new Score(4), new Score(9));

      expect(gameScore.getRunDifferential()).toBe(-5); // Home trailing by 5
    });
  });

  describe('Score updates', () => {
    it('should add runs to home team', () => {
      const originalScore = new GameScore(new Score(3), new Score(5));
      const newScore = originalScore.addHomeRuns(2);

      expect(newScore.getHomeRuns()).toBe(5);
      expect(newScore.getAwayRuns()).toBe(5);
      expect(originalScore.getHomeRuns()).toBe(3); // Original unchanged
    });

    it('should add runs to away team', () => {
      const originalScore = new GameScore(new Score(7), new Score(2));
      const newScore = originalScore.addAwayRuns(4);

      expect(newScore.getHomeRuns()).toBe(7);
      expect(newScore.getAwayRuns()).toBe(6);
      expect(originalScore.getAwayRuns()).toBe(2); // Original unchanged
    });

    it('should add zero runs correctly', () => {
      const originalScore = new GameScore(new Score(5), new Score(3));
      const newHomeScore = originalScore.addHomeRuns(0);
      const newAwayScore = originalScore.addAwayRuns(0);

      expect(newHomeScore.getHomeRuns()).toBe(5);
      expect(newAwayScore.getAwayRuns()).toBe(3);
    });
  });

  describe('Equality', () => {
    it('should be equal when both scores are the same', () => {
      const score1 = new GameScore(new Score(5), new Score(7));
      const score2 = new GameScore(new Score(5), new Score(7));

      expect(score1.equals(score2)).toBe(true);
      expect(score2.equals(score1)).toBe(true);
    });

    it('should not be equal when home scores differ', () => {
      const score1 = new GameScore(new Score(5), new Score(7));
      const score2 = new GameScore(new Score(6), new Score(7));

      expect(score1.equals(score2)).toBe(false);
      expect(score2.equals(score1)).toBe(false);
    });

    it('should not be equal when away scores differ', () => {
      const score1 = new GameScore(new Score(5), new Score(7));
      const score2 = new GameScore(new Score(5), new Score(8));

      expect(score1.equals(score2)).toBe(false);
      expect(score2.equals(score1)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const gameScore = new GameScore(new Score(3), new Score(4));

      expect(gameScore.equals(null as unknown as GameScore)).toBe(false);
      expect(gameScore.equals(undefined as unknown as GameScore)).toBe(false);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable', () => {
      const gameScore = new GameScore(new Score(8), new Score(6));

      // Scores should be readonly (TypeScript enforced)
      expect(gameScore.homeScore.runs).toBe(8);
      expect(gameScore.awayScore.runs).toBe(6);

      // Operations should return new instances
      const newScore = gameScore.addHomeRuns(2);
      expect(gameScore.getHomeRuns()).toBe(8); // Original unchanged
      expect(newScore.getHomeRuns()).toBe(10); // New instance
      expect(newScore).not.toBe(gameScore); // Different objects
    });

    it('should support JSON serialization', () => {
      const gameScore = new GameScore(new Score(12), new Score(8));

      const serialized = JSON.stringify(gameScore);
      const parsed = JSON.parse(serialized);

      expect(parsed.homeScore.runs).toBe(12);
      expect(parsed.awayScore.runs).toBe(8);
    });

    it('should have meaningful string representation', () => {
      const gameScore = new GameScore(new Score(9), new Score(7));

      expect(gameScore.toString()).toBe('9-7');
    });

    it('should format zero scores correctly', () => {
      const gameScore = new GameScore(Score.zero(), Score.zero());

      expect(gameScore.toString()).toBe('0-0');
    });
  });

  describe('Static factory methods', () => {
    it('should create zero-zero game score', () => {
      const gameScore = GameScore.zero();

      expect(gameScore.getHomeRuns()).toBe(0);
      expect(gameScore.getAwayRuns()).toBe(0);
    });

    it('should create game score from runs', () => {
      const gameScore = GameScore.fromRuns(15, 12);

      expect(gameScore.getHomeRuns()).toBe(15);
      expect(gameScore.getAwayRuns()).toBe(12);
    });

    it('should validate runs in factory method', () => {
      expect(() => GameScore.fromRuns(-1, 5)).toThrow(DomainError);
      expect(() => GameScore.fromRuns(5, -1)).toThrow(DomainError);
      expect(() => GameScore.fromRuns(3.14, 5)).toThrow(DomainError);
    });
  });
});
