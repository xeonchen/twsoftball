import { describe, it, expect } from 'vitest';

import { GameStatus } from './GameStatus.js';

describe('GameStatus', () => {
  describe('Game states', () => {
    it('should have correct status values', () => {
      expect(GameStatus.NOT_STARTED).toBe('NOT_STARTED');
      expect(GameStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(GameStatus.COMPLETED).toBe('COMPLETED');
    });
  });

  describe('State transitions', () => {
    it('should progress in correct order', () => {
      // This test documents the expected state progression
      const expectedOrder = [GameStatus.NOT_STARTED, GameStatus.IN_PROGRESS, GameStatus.COMPLETED];

      expect(expectedOrder[0]).toBe('NOT_STARTED');
      expect(expectedOrder[1]).toBe('IN_PROGRESS');
      expect(expectedOrder[2]).toBe('COMPLETED');
    });
  });

  describe('Type validation', () => {
    it('should have all expected values', () => {
      const allValues = Object.values(GameStatus);
      const expectedValues = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

      expect(allValues).toHaveLength(expectedValues.length);
      expectedValues.forEach(value => {
        expect(allValues).toContain(value);
      });
    });

    it('should be properly typed', () => {
      // Type test - should compile without error
      const notStarted: GameStatus = GameStatus.NOT_STARTED;
      const inProgress: GameStatus = GameStatus.IN_PROGRESS;
      const completed: GameStatus = GameStatus.COMPLETED;

      expect(notStarted).toBeDefined();
      expect(inProgress).toBeDefined();
      expect(completed).toBeDefined();
    });
  });
});
