import { describe, it, expect } from 'vitest';

import { BasesState } from './BasesState';
import { PlayerId } from './PlayerId';

describe('BasesState', () => {
  // Test data setup
  const player1 = new PlayerId('player-1');
  const player2 = new PlayerId('player-2');
  const player3 = new PlayerId('player-3');
  const player4 = new PlayerId('player-4');

  describe('Construction and Factory Methods', () => {
    it('should create empty bases state', () => {
      const basesState = BasesState.empty();

      expect(basesState.getRunner('FIRST')).toBeUndefined();
      expect(basesState.getRunner('SECOND')).toBeUndefined();
      expect(basesState.getRunner('THIRD')).toBeUndefined();
      expect(basesState.getOccupiedBases()).toEqual([]);
    });

    it('should create bases state with single runner', () => {
      const basesState = BasesState.empty().withRunnerOn('FIRST', player1);

      expect(basesState.getRunner('FIRST')).toEqual(player1);
      expect(basesState.getRunner('SECOND')).toBeUndefined();
      expect(basesState.getRunner('THIRD')).toBeUndefined();
      expect(basesState.getOccupiedBases()).toEqual(['FIRST']);
    });

    it('should create bases state with multiple runners', () => {
      const basesState = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2)
        .withRunnerOn('THIRD', player3);

      expect(basesState.getRunner('FIRST')).toEqual(player1);
      expect(basesState.getRunner('SECOND')).toEqual(player2);
      expect(basesState.getRunner('THIRD')).toEqual(player3);
      expect(basesState.getOccupiedBases()).toEqual(['FIRST', 'SECOND', 'THIRD']);
    });

    it('should replace runner on same base', () => {
      const basesState = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('FIRST', player2);

      expect(basesState.getRunner('FIRST')).toEqual(player2);
      expect(basesState.getOccupiedBases()).toEqual(['FIRST']);
    });

    it('should clear all bases', () => {
      const basesState = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2)
        .withRunnerOn('THIRD', player3)
        .withBasesCleared();

      expect(basesState.getRunner('FIRST')).toBeUndefined();
      expect(basesState.getRunner('SECOND')).toBeUndefined();
      expect(basesState.getRunner('THIRD')).toBeUndefined();
      expect(basesState.getOccupiedBases()).toEqual([]);
    });
  });

  describe('Runner Advancement', () => {
    it('should advance runner from first to second', () => {
      const initial = BasesState.empty().withRunnerOn('FIRST', player1);
      const advanced = initial.withRunnerAdvanced('FIRST', 'SECOND');

      expect(advanced.getRunner('FIRST')).toBeUndefined();
      expect(advanced.getRunner('SECOND')).toEqual(player1);
      expect(advanced.getOccupiedBases()).toEqual(['SECOND']);
    });

    it('should advance runner from third to home', () => {
      const initial = BasesState.empty().withRunnerOn('THIRD', player1);
      const advanced = initial.withRunnerAdvanced('THIRD', 'HOME');

      expect(advanced.getRunner('THIRD')).toBeUndefined();
      expect(advanced.getOccupiedBases()).toEqual([]);
    });

    it('should advance multiple runners', () => {
      const initial = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);

      const advanced = initial
        .withRunnerAdvanced('SECOND', 'THIRD')
        .withRunnerAdvanced('FIRST', 'SECOND');

      expect(advanced.getRunner('FIRST')).toBeUndefined();
      expect(advanced.getRunner('SECOND')).toEqual(player1);
      expect(advanced.getRunner('THIRD')).toEqual(player2);
      expect(advanced.getOccupiedBases()).toEqual(['SECOND', 'THIRD']);
    });

    it('should handle runner advancing to occupied base (overwrite)', () => {
      const initial = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);

      const advanced = initial.withRunnerAdvanced('FIRST', 'SECOND');

      expect(advanced.getRunner('FIRST')).toBeUndefined();
      expect(advanced.getRunner('SECOND')).toEqual(player1);
      expect(advanced.getOccupiedBases()).toEqual(['SECOND']);
    });

    it('should do nothing when advancing from empty base', () => {
      const initial = BasesState.empty().withRunnerOn('SECOND', player1);
      const advanced = initial.withRunnerAdvanced('FIRST', 'SECOND');

      // Should be unchanged since no runner on first
      expect(advanced.getRunner('FIRST')).toBeUndefined();
      expect(advanced.getRunner('SECOND')).toEqual(player1);
      expect(advanced.getOccupiedBases()).toEqual(['SECOND']);
    });
  });

  describe('Query Methods', () => {
    describe('getOccupiedBases', () => {
      it('should return bases in consistent order', () => {
        const basesState = BasesState.empty()
          .withRunnerOn('THIRD', player3)
          .withRunnerOn('FIRST', player1)
          .withRunnerOn('SECOND', player2);

        expect(basesState.getOccupiedBases()).toEqual(['FIRST', 'SECOND', 'THIRD']);
      });

      it('should return empty array for empty bases', () => {
        const basesState = BasesState.empty();
        expect(basesState.getOccupiedBases()).toEqual([]);
      });
    });

    describe('getRunnersInScoringPosition', () => {
      it('should return runners on second and third base', () => {
        const basesState = BasesState.empty()
          .withRunnerOn('FIRST', player1)
          .withRunnerOn('SECOND', player2)
          .withRunnerOn('THIRD', player3);

        const scoringRunners = basesState.getRunnersInScoringPosition();
        expect(scoringRunners).toEqual([player2, player3]);
      });

      it('should return empty array when no runners in scoring position', () => {
        const basesState = BasesState.empty().withRunnerOn('FIRST', player1);
        expect(basesState.getRunnersInScoringPosition()).toEqual([]);
      });

      it('should return empty array for empty bases', () => {
        const basesState = BasesState.empty();
        expect(basesState.getRunnersInScoringPosition()).toEqual([]);
      });

      it('should only return second base runner when third is empty', () => {
        const basesState = BasesState.empty().withRunnerOn('SECOND', player2);
        expect(basesState.getRunnersInScoringPosition()).toEqual([player2]);
      });

      it('should only return third base runner when second is empty', () => {
        const basesState = BasesState.empty().withRunnerOn('THIRD', player3);
        expect(basesState.getRunnersInScoringPosition()).toEqual([player3]);
      });
    });

    describe('isForceAt', () => {
      it('should be true for first base when batter reaches', () => {
        const basesState = BasesState.empty().withRunnerOn('FIRST', player1);
        expect(basesState.isForceAt('FIRST')).toBe(true);
      });

      it('should be true for second base when first and second occupied', () => {
        const basesState = BasesState.empty()
          .withRunnerOn('FIRST', player1)
          .withRunnerOn('SECOND', player2);
        expect(basesState.isForceAt('SECOND')).toBe(true);
      });

      it('should be true for third base when bases loaded', () => {
        const basesState = BasesState.empty()
          .withRunnerOn('FIRST', player1)
          .withRunnerOn('SECOND', player2)
          .withRunnerOn('THIRD', player3);
        expect(basesState.isForceAt('THIRD')).toBe(true);
      });

      it('should be false for second base when only second occupied', () => {
        const basesState = BasesState.empty().withRunnerOn('SECOND', player2);
        expect(basesState.isForceAt('SECOND')).toBe(false);
      });

      it('should be false for third base when only third occupied', () => {
        const basesState = BasesState.empty().withRunnerOn('THIRD', player3);
        expect(basesState.isForceAt('THIRD')).toBe(false);
      });

      it('should be false for third base when only first and third occupied', () => {
        const basesState = BasesState.empty()
          .withRunnerOn('FIRST', player1)
          .withRunnerOn('THIRD', player3);
        expect(basesState.isForceAt('THIRD')).toBe(false);
      });

      it('should be false for all bases when empty', () => {
        const basesState = BasesState.empty();
        expect(basesState.isForceAt('FIRST')).toBe(false);
        expect(basesState.isForceAt('SECOND')).toBe(false);
        expect(basesState.isForceAt('THIRD')).toBe(false);
      });
    });
  });

  describe('Equality and Value Object Behavior', () => {
    it('should be equal when runners are the same', () => {
      const state1 = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);

      const state2 = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);

      expect(state1.equals(state2)).toBe(true);
      expect(state2.equals(state1)).toBe(true);
    });

    it('should be equal when both are empty', () => {
      const state1 = BasesState.empty();
      const state2 = BasesState.empty();

      expect(state1.equals(state2)).toBe(true);
    });

    it('should not be equal when runners are different', () => {
      const state1 = BasesState.empty().withRunnerOn('FIRST', player1);
      const state2 = BasesState.empty().withRunnerOn('FIRST', player2);

      expect(state1.equals(state2)).toBe(false);
    });

    it('should not be equal when bases are different', () => {
      const state1 = BasesState.empty().withRunnerOn('FIRST', player1);
      const state2 = BasesState.empty().withRunnerOn('SECOND', player1);

      expect(state1.equals(state2)).toBe(false);
    });

    it('should not be equal when one has more runners', () => {
      const state1 = BasesState.empty().withRunnerOn('FIRST', player1);
      const state2 = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);

      expect(state1.equals(state2)).toBe(false);
    });

    it('should not be equal when compared to null or undefined', () => {
      const basesState = BasesState.empty().withRunnerOn('FIRST', player1);

      expect(basesState.equals(null as unknown as BasesState)).toBe(false);
      expect(basesState.equals(undefined as unknown as BasesState)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const basesState = BasesState.empty();
      const notBasesState = { getRunner: () => undefined } as unknown as BasesState;

      expect(basesState.equals(notBasesState)).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should not modify original when adding runner', () => {
      const original = BasesState.empty();
      const withRunner = original.withRunnerOn('FIRST', player1);

      expect(original.getRunner('FIRST')).toBeUndefined();
      expect(withRunner.getRunner('FIRST')).toEqual(player1);
      expect(original.equals(withRunner)).toBe(false);
    });

    it('should not modify original when advancing runner', () => {
      const original = BasesState.empty().withRunnerOn('FIRST', player1);
      const advanced = original.withRunnerAdvanced('FIRST', 'SECOND');

      expect(original.getRunner('FIRST')).toEqual(player1);
      expect(original.getRunner('SECOND')).toBeUndefined();
      expect(advanced.getRunner('FIRST')).toBeUndefined();
      expect(advanced.getRunner('SECOND')).toEqual(player1);
    });

    it('should not modify original when clearing bases', () => {
      const original = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);
      const cleared = original.withBasesCleared();

      expect(original.getOccupiedBases()).toEqual(['FIRST', 'SECOND']);
      expect(cleared.getOccupiedBases()).toEqual([]);
    });

    it('should not have any mutating methods', () => {
      const { prototype } = BasesState;
      const methodNames = Object.getOwnPropertyNames(prototype);

      const mutatingMethods = methodNames.filter(
        name =>
          name.startsWith('set') ||
          name.startsWith('add') ||
          name.startsWith('remove') ||
          name.startsWith('clear') ||
          name.startsWith('update') ||
          name.startsWith('modify')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should return new instance from factory methods', () => {
      const base = BasesState.empty();
      const withRunner = base.withRunnerOn('FIRST', player1);
      const advanced = withRunner.withRunnerAdvanced('FIRST', 'SECOND');
      const cleared = advanced.withBasesCleared();

      // All should be different instances
      expect(base).not.toBe(withRunner);
      expect(withRunner).not.toBe(advanced);
      expect(advanced).not.toBe(cleared);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle bases loaded scenario', () => {
      const basesLoaded = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2)
        .withRunnerOn('THIRD', player3);

      expect(basesLoaded.getOccupiedBases()).toEqual(['FIRST', 'SECOND', 'THIRD']);
      expect(basesLoaded.getRunnersInScoringPosition()).toEqual([player2, player3]);
      expect(basesLoaded.isForceAt('FIRST')).toBe(true);
      expect(basesLoaded.isForceAt('SECOND')).toBe(true);
      expect(basesLoaded.isForceAt('THIRD')).toBe(true);
    });

    it('should handle complex advancement scenario', () => {
      // Start with runners on first and third
      const initial = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('THIRD', player3);

      // Batter hits double - first goes to third, third scores
      const afterDouble = initial
        .withRunnerAdvanced('THIRD', 'HOME')
        .withRunnerAdvanced('FIRST', 'THIRD')
        .withRunnerOn('SECOND', player4); // New batter on second

      expect(afterDouble.getRunner('FIRST')).toBeUndefined();
      expect(afterDouble.getRunner('SECOND')).toEqual(player4);
      expect(afterDouble.getRunner('THIRD')).toEqual(player1);
      expect(afterDouble.getOccupiedBases()).toEqual(['SECOND', 'THIRD']);
      expect(afterDouble.getRunnersInScoringPosition()).toEqual([player4, player1]);
    });

    it('should handle force out scenario', () => {
      // Runners on first and second, force at second
      const bases = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player2);

      expect(bases.isForceAt('SECOND')).toBe(true);
      expect(bases.isForceAt('THIRD')).toBe(false);

      // After force out at second, advance first to second
      const afterForce = bases.withRunnerAdvanced('FIRST', 'SECOND'); // player1 replaces player2

      expect(afterForce.getRunner('FIRST')).toBeUndefined();
      expect(afterForce.getRunner('SECOND')).toEqual(player1);
      expect(afterForce.getRunner('THIRD')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle same player on multiple bases (edge case)', () => {
      // This shouldn't happen in real game but value object should handle it
      const bases = BasesState.empty()
        .withRunnerOn('FIRST', player1)
        .withRunnerOn('SECOND', player1);

      expect(bases.getRunner('FIRST')).toEqual(player1);
      expect(bases.getRunner('SECOND')).toEqual(player1);
      expect(bases.getOccupiedBases()).toEqual(['FIRST', 'SECOND']);
    });

    it('should handle advancing non-existent runner gracefully', () => {
      const empty = BasesState.empty();
      const stillEmpty = empty.withRunnerAdvanced('FIRST', 'SECOND');

      expect(stillEmpty.equals(empty)).toBe(true);
    });

    it('should handle clearing empty bases', () => {
      const empty = BasesState.empty();
      const stillEmpty = empty.withBasesCleared();

      expect(stillEmpty.equals(empty)).toBe(true);
    });
  });
});
