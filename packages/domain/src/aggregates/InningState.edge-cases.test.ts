/**
 * @file InningState Edge Cases Tests
 * Tests for edge cases and validation paths to improve coverage.
 */

import { describe, it, expect } from 'vitest';

import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { InningStateId } from '../value-objects/InningStateId.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { InningState } from './InningState.js';

describe('InningState - Edge Cases', () => {
  const gameId = GameId.generate();
  const inningStateId = InningStateId.generate();

  describe('withRevertedInning', () => {
    it('should revert inning number correctly', () => {
      // Create InningState at inning 5, bottom half
      const inningState = InningState.createNew(gameId, inningStateId, 5, false);

      // Revert to inning 5, bottom half (as if inning 5 was completed)
      const reverted = inningState.withRevertedInning(5);

      // Should set to inning 5, bottom half (false) - the completed inning
      expect(reverted.inning).toBe(5);
      expect(reverted.isTopHalf).toBe(false);
    });

    it('should throw error when completedInning is less than 1', () => {
      const inningState = InningState.createNew(gameId, inningStateId, 1, true);

      expect(() => inningState.withRevertedInning(0)).toThrow(DomainError);
      expect(() => inningState.withRevertedInning(0)).toThrow(
        'Completed inning must be an integer of 1 or greater'
      );
    });

    it('should throw error when completedInning is not an integer', () => {
      const inningState = InningState.createNew(gameId, inningStateId, 3, true);

      expect(() => inningState.withRevertedInning(2.5)).toThrow(DomainError);
      expect(() => inningState.withRevertedInning(2.5)).toThrow(
        'Completed inning must be an integer'
      );
    });

    it('should preserve uncommitted events after reversion', () => {
      const inningState = InningState.createNew(gameId, inningStateId, 3, true);
      const batterId = PlayerId.generate();

      // Record an at-bat (adds uncommitted events)
      const withAtBat = inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 3, {
        homeScore: 0,
        awayScore: 0,
        totalInnings: 7,
        runsAboutToScore: 0,
      });

      // Revert inning
      const reverted = withAtBat.withRevertedInning(3);

      // Uncommitted events should be preserved
      expect(reverted.getUncommittedEvents().length).toBeGreaterThan(0);
    });

    it('should not mutate original instance', () => {
      const original = InningState.createNew(gameId, inningStateId, 5, false);
      const originalInning = original.inning;
      const originalIsTop = original.isTopHalf;

      // Revert (creates new instance)
      const reverted = original.withRevertedInning(5);

      // Original should be unchanged
      expect(original.inning).toBe(originalInning);
      expect(original.isTopHalf).toBe(originalIsTop);

      // Reverted should be different
      expect(reverted.inning).toBe(5);
      expect(reverted.isTopHalf).toBe(false);
    });
  });

  describe('GameContext validation in recordAtBat', () => {
    let inningState: InningState;
    let batterId: PlayerId;

    beforeEach(() => {
      inningState = InningState.createNew(gameId, inningStateId, 1, true);
      batterId = PlayerId.generate();
    });

    it('should throw error when GameContext homeScore is negative', () => {
      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: -1, // ❌ Negative
          awayScore: 0,
          totalInnings: 7,
          runsAboutToScore: 0,
        })
      ).toThrow(DomainError);
    });

    it('should throw error when GameContext awayScore is negative', () => {
      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: 0,
          awayScore: -1, // ❌ Negative
          totalInnings: 7,
          runsAboutToScore: 0,
        })
      ).toThrow(DomainError);
    });

    it('should throw error when GameContext totalInnings is zero or negative', () => {
      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: 0,
          awayScore: 0,
          totalInnings: 0, // ❌ Zero
          runsAboutToScore: 0,
        })
      ).toThrow(DomainError);

      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: 0,
          awayScore: 0,
          totalInnings: -1, // ❌ Negative
          runsAboutToScore: 0,
        })
      ).toThrow(DomainError);
    });

    it('should throw error when GameContext totalInnings is not an integer', () => {
      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: 0,
          awayScore: 0,
          totalInnings: 7.5, // ❌ Not an integer
          runsAboutToScore: 0,
        })
      ).toThrow(DomainError);
    });

    it('should throw error when GameContext runsAboutToScore is negative', () => {
      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: 0,
          awayScore: 0,
          totalInnings: 7,
          runsAboutToScore: -1, // ❌ Negative
        })
      ).toThrow(DomainError);
    });

    it('should throw error when GameContext runsAboutToScore is not an integer', () => {
      expect(() =>
        inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1, {
          homeScore: 0,
          awayScore: 0,
          totalInnings: 7,
          runsAboutToScore: 1.5, // ❌ Not an integer
        })
      ).toThrow(DomainError);
    });
  });
});
