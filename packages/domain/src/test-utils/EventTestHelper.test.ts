import { describe, it, expect } from 'vitest';
import { EventTestHelper } from './EventTestHelper';
import { GameId } from '../value-objects/GameId';
import { AtBatCompleted } from '../events/AtBatCompleted';
import { AtBatResultType } from '../constants/AtBatResultType';
import { PlayerId } from '../value-objects/PlayerId';
import { DomainError } from '../errors/DomainError';

describe('EventTestHelper', () => {
  describe('createValidScore', () => {
    it('should create valid score object with defaults', () => {
      const score = EventTestHelper.createValidScore();

      expect(score).toEqual({ home: 5, away: 3 });
      expect(typeof score.home).toBe('number');
      expect(typeof score.away).toBe('number');
    });

    it('should create score with custom values', () => {
      const score = EventTestHelper.createValidScore(8, 12);

      expect(score).toEqual({ home: 8, away: 12 });
    });

    it('should handle zero scores', () => {
      const score = EventTestHelper.createValidScore(0, 0);

      expect(score).toEqual({ home: 0, away: 0 });
    });

    it('should handle high scores', () => {
      const score = EventTestHelper.createValidScore(25, 18);

      expect(score).toEqual({ home: 25, away: 18 });
    });
  });

  describe('createScoreScenarios', () => {
    it('should return array of score test scenarios', () => {
      const scenarios = EventTestHelper.createScoreScenarios();

      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);

      // Check structure of scenarios
      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('valid');
        expect(scenario).toHaveProperty('score');
        expect(scenario).toHaveProperty('description');
        expect(typeof scenario.valid).toBe('boolean');
        expect(typeof scenario.description).toBe('string');
      });
    });

    it('should include valid score scenarios', () => {
      const scenarios = EventTestHelper.createScoreScenarios();
      const validScenarios = scenarios.filter(s => s.valid);

      expect(validScenarios.length).toBeGreaterThan(0);

      // Check some valid scenarios
      const zeroScore = validScenarios.find(s => s.description.includes('zero'));
      expect(zeroScore).toBeDefined();
      expect(zeroScore!.score).toEqual({ home: 0, away: 0 });
    });

    it('should include invalid score scenarios', () => {
      const scenarios = EventTestHelper.createScoreScenarios();
      const invalidScenarios = scenarios.filter(s => !s.valid);

      expect(invalidScenarios.length).toBeGreaterThan(0);

      // Check some invalid scenarios
      const negativeScore = invalidScenarios.find(s => s.description.includes('negative'));
      expect(negativeScore).toBeDefined();
    });

    it('should include edge case scenarios', () => {
      const scenarios = EventTestHelper.createScoreScenarios();

      const nullScore = scenarios.find(s => s.description.includes('null'));
      const undefinedScore = scenarios.find(s => s.description.includes('undefined'));
      const stringScore = scenarios.find(s => s.description.includes('string'));

      expect(nullScore).toBeDefined();
      expect(undefinedScore).toBeDefined();
      expect(stringScore).toBeDefined();
    });
  });

  describe('createGameId', () => {
    it('should create GameId with default suffix', () => {
      const gameId = EventTestHelper.createGameId();

      expect(gameId).toBeInstanceOf(GameId);
      expect(gameId.value).toBe('game-test');
    });

    it('should create GameId with custom suffix', () => {
      const gameId = EventTestHelper.createGameId('custom');

      expect(gameId).toBeInstanceOf(GameId);
      expect(gameId.value).toBe('game-custom');
    });

    it('should create unique GameIds with different suffixes', () => {
      const gameId1 = EventTestHelper.createGameId('first');
      const gameId2 = EventTestHelper.createGameId('second');

      expect(gameId1.value).not.toBe(gameId2.value);
      expect(gameId1.value).toBe('game-first');
      expect(gameId2.value).toBe('game-second');
    });
  });

  describe('assertEventValid', () => {
    it('should not throw for valid event', () => {
      const gameId = EventTestHelper.createGameId('valid-event');
      const playerId = new PlayerId('batter-1');

      const event = new AtBatCompleted(gameId, playerId, 1, AtBatResultType.SINGLE, 2, 0);

      expect(() => EventTestHelper.assertEventValid(event)).not.toThrow();
    });

    it('should validate event has required properties', () => {
      const gameId = EventTestHelper.createGameId();
      const playerId = new PlayerId('batter-1');

      const event = new AtBatCompleted(gameId, playerId, 1, AtBatResultType.HOME_RUN, 2, 1);

      expect(() => EventTestHelper.assertEventValid(event)).not.toThrow();

      // Event should have the basic domain event properties
      expect(event.gameId).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.type).toBeDefined();
    });
  });

  describe('assertScoreValidationError', () => {
    it('should not throw when expected error is thrown', () => {
      const throwingFunction = (): void => {
        throw new DomainError('Score cannot be negative');
      };

      expect(() =>
        EventTestHelper.assertScoreValidationError(throwingFunction, 'Score cannot be negative')
      ).not.toThrow();
    });

    it('should throw when function does not throw expected error', () => {
      const nonThrowingFunction = (): void => {
        // Function that doesn't throw
      };

      expect(() =>
        EventTestHelper.assertScoreValidationError(nonThrowingFunction, 'Expected error message')
      ).toThrow('Expected function to throw error with message: "Expected error message"');
    });

    it('should throw when wrong error message is thrown', () => {
      const wrongErrorFunction = (): void => {
        throw new DomainError('Different error message');
      };

      expect(() =>
        EventTestHelper.assertScoreValidationError(wrongErrorFunction, 'Expected error message')
      ).toThrow(
        'Expected error message: "Expected error message", but got: "Different error message"'
      );
    });

    it('should throw when non-DomainError is thrown', () => {
      const nonDomainErrorFunction = (): void => {
        throw new Error('Regular error');
      };

      expect(() =>
        EventTestHelper.assertScoreValidationError(nonDomainErrorFunction, 'Expected domain error')
      ).toThrow('Expected DomainError, but got: Error');
    });
  });
});
