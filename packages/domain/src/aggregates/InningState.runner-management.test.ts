import { describe, it, expect } from 'vitest';

import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { InningStateId } from '../value-objects/InningStateId.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { InningState } from './InningState.js';

describe('InningState - Runner Management', () => {
  const inningStateId = new InningStateId('inning-state-1');
  const gameId = new GameId('game-1');
  const batterId = new PlayerId('batter-1');

  describe('complex game scenarios', () => {
    it('should handle bases loaded walk', () => {
      const runner1 = new PlayerId('runner-1');
      const runner2 = new PlayerId('runner-2');
      const runner3 = new PlayerId('runner-3');

      const inningState = InningState.createNew(inningStateId, gameId)
        .withRunnerOnBase('FIRST', runner1)
        .withRunnerOnBase('SECOND', runner2)
        .withRunnerOnBase('THIRD', runner3);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.WALK, 1);

      // All runners forced to advance
      expect(updated.basesState.getRunner('FIRST')).toEqual(batterId);
      expect(updated.basesState.getRunner('SECOND')).toEqual(runner1);
      expect(updated.basesState.getRunner('THIRD')).toEqual(runner2);
      // Runner3 scores from third

      const events = updated.getUncommittedEvents();
      const scoreEvents = events.filter(e => e.type === 'RunScored');
      expect(scoreEvents).toHaveLength(1);
      expect(scoreEvents[0]).toMatchObject({ scorerId: runner3 });
    });

    it('should handle triple play scenario', () => {
      const runner1 = new PlayerId('runner-1');
      const runner2 = new PlayerId('runner-2');

      const inningState = InningState.createNew(inningStateId, gameId)
        .withRunnerOnBase('FIRST', runner1)
        .withRunnerOnBase('SECOND', runner2);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.TRIPLE_PLAY, 1);

      expect(updated.outs).toBe(0); // Inning ended, outs reset
      expect(updated.isTopHalf).toBe(false); // Switch sides
      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);
    });

    it('should handle inning-ending double play with 1 out', () => {
      const runner = new PlayerId('runner-1');

      const inningState = InningState.createNew(inningStateId, gameId)
        .withOuts(1)
        .withRunnerOnBase('FIRST', runner);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.DOUBLE_PLAY, 1);

      expect(updated.outs).toBe(0); // Reset for new half-inning
      expect(updated.isTopHalf).toBe(false); // Switch to bottom half
      expect(updated.inning).toBe(1); // Same inning
    });

    it('should handle grand slam with bases loaded', () => {
      const runner1 = new PlayerId('runner-1');
      const runner2 = new PlayerId('runner-2');
      const runner3 = new PlayerId('runner-3');

      const inningState = InningState.createNew(inningStateId, gameId)
        .withRunnerOnBase('FIRST', runner1)
        .withRunnerOnBase('SECOND', runner2)
        .withRunnerOnBase('THIRD', runner3);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.HOME_RUN, 1);

      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);

      const events = updated.getUncommittedEvents();
      const scoreEvents = events.filter(e => e.type === 'RunScored');
      expect(scoreEvents).toHaveLength(4); // All runners + batter score
    });
  });

  describe('validation and error handling', () => {
    it('should handle invalid at-bat result types', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      // Assuming there are validation checks in the implementation
      expect(() =>
        inningState.recordAtBat(batterId, 1, 'INVALID_RESULT' as unknown as AtBatResultType, 1)
      ).toThrow(DomainError);
    });

    it('should validate batter ID is not null', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      expect(() =>
        inningState.recordAtBat(null as unknown as PlayerId, 1, AtBatResultType.SINGLE, 1)
      ).toThrow(DomainError);
    });

    it('should handle edge case of advancing from non-occupied base', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      // Should handle gracefully if trying to advance a non-existent runner
      const updated = inningState.advanceRunners(AtBatResultType.SINGLE, [
        { runnerId: new PlayerId('nonexistent'), from: 'FIRST', to: 'SECOND' },
      ]);

      // Should not crash and return updated state
      expect(updated).toBeDefined();
    });
  });
});
