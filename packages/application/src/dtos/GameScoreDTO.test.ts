/**
 * @file GameScoreDTO Tests
 * Tests for DTO representing current game score with calculated fields.
 */

import { describe, it, expect } from 'vitest';

import { GameScoreDTO } from './GameScoreDTO';

describe('GameScoreDTO', () => {
  describe('Score Scenarios', () => {
    it('should handle home team leading', () => {
      const score: GameScoreDTO = {
        home: 7,
        away: 4,
        leader: 'HOME',
        difference: 3,
      };

      expect(score.home).toBe(7);
      expect(score.away).toBe(4);
      expect(score.leader).toBe('HOME');
      expect(score.difference).toBe(3);
    });

    it('should handle away team leading', () => {
      const score: GameScoreDTO = {
        home: 2,
        away: 5,
        leader: 'AWAY',
        difference: 3,
      };

      expect(score.home).toBe(2);
      expect(score.away).toBe(5);
      expect(score.leader).toBe('AWAY');
      expect(score.difference).toBe(3);
    });

    it('should handle tied game', () => {
      const score: GameScoreDTO = {
        home: 6,
        away: 6,
        leader: 'TIE',
        difference: 0,
      };

      expect(score.home).toBe(6);
      expect(score.away).toBe(6);
      expect(score.leader).toBe('TIE');
      expect(score.difference).toBe(0);
    });

    it('should handle 0-0 game (beginning)', () => {
      const score: GameScoreDTO = {
        home: 0,
        away: 0,
        leader: 'TIE',
        difference: 0,
      };

      expect(score.home).toBe(0);
      expect(score.away).toBe(0);
      expect(score.leader).toBe('TIE');
      expect(score.difference).toBe(0);
    });

    it('should handle single run games', () => {
      const homeLeadsOne: GameScoreDTO = {
        home: 1,
        away: 0,
        leader: 'HOME',
        difference: 1,
      };

      const awayLeadsOne: GameScoreDTO = {
        home: 0,
        away: 1,
        leader: 'AWAY',
        difference: 1,
      };

      expect(homeLeadsOne.leader).toBe('HOME');
      expect(homeLeadsOne.difference).toBe(1);
      expect(awayLeadsOne.leader).toBe('AWAY');
      expect(awayLeadsOne.difference).toBe(1);
    });
  });

  describe('High Scoring Games', () => {
    it('should handle high scoring games', () => {
      const highScore: GameScoreDTO = {
        home: 15,
        away: 12,
        leader: 'HOME',
        difference: 3,
      };

      expect(highScore.home).toBe(15);
      expect(highScore.away).toBe(12);
      expect(highScore.leader).toBe('HOME');
      expect(highScore.difference).toBe(3);
    });

    it('should handle mercy rule scenarios', () => {
      const mercyRuleScore: GameScoreDTO = {
        home: 18,
        away: 5,
        leader: 'HOME',
        difference: 13,
      };

      expect(mercyRuleScore.difference).toBe(13);
      expect(mercyRuleScore.leader).toBe('HOME');
    });
  });

  describe('Consistency Validation', () => {
    it('should maintain leader consistency with scores', () => {
      // Test various scenarios to ensure leader matches actual scores
      const scenarios: GameScoreDTO[] = [
        { home: 5, away: 3, leader: 'HOME', difference: 2 },
        { home: 2, away: 7, leader: 'AWAY', difference: 5 },
        { home: 4, away: 4, leader: 'TIE', difference: 0 },
        { home: 0, away: 0, leader: 'TIE', difference: 0 },
      ];

      scenarios.forEach(score => {
        if (score.home > score.away) {
          expect(score.leader).toBe('HOME');
          expect(score.difference).toBe(score.home - score.away);
        } else if (score.away > score.home) {
          expect(score.leader).toBe('AWAY');
          expect(score.difference).toBe(score.away - score.home);
        } else {
          expect(score.leader).toBe('TIE');
          expect(score.difference).toBe(0);
        }
      });
    });

    it('should have non-negative scores', () => {
      const validScore: GameScoreDTO = {
        home: 3,
        away: 5,
        leader: 'AWAY',
        difference: 2,
      };

      expect(validScore.home).toBeGreaterThanOrEqual(0);
      expect(validScore.away).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative difference', () => {
      const scores: GameScoreDTO[] = [
        { home: 7, away: 3, leader: 'HOME', difference: 4 },
        { home: 1, away: 6, leader: 'AWAY', difference: 5 },
        { home: 2, away: 2, leader: 'TIE', difference: 0 },
      ];

      scores.forEach(score => {
        expect(score.difference).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce proper leader type', () => {
      const homeLeader: GameScoreDTO = {
        home: 5,
        away: 3,
        leader: 'HOME',
        difference: 2,
      };

      const awayLeader: GameScoreDTO = {
        home: 3,
        away: 5,
        leader: 'AWAY',
        difference: 2,
      };

      const tieGame: GameScoreDTO = {
        home: 4,
        away: 4,
        leader: 'TIE',
        difference: 0,
      };

      expect(homeLeader.leader).toBe('HOME');
      expect(awayLeader.leader).toBe('AWAY');
      expect(tieGame.leader).toBe('TIE');
    });

    it('should maintain numeric types for scores', () => {
      const score: GameScoreDTO = {
        home: 3,
        away: 5,
        leader: 'AWAY',
        difference: 2,
      };

      expect(typeof score.home).toBe('number');
      expect(typeof score.away).toBe('number');
      expect(typeof score.difference).toBe('number');
      expect(Number.isInteger(score.home)).toBe(true);
      expect(Number.isInteger(score.away)).toBe(true);
      expect(Number.isInteger(score.difference)).toBe(true);
    });
  });
});
