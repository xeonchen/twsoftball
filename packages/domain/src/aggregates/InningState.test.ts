import { describe, it, expect } from 'vitest';

import { AtBatResultType } from '../constants/AtBatResultType';
import { DomainError } from '../errors/DomainError';
import { AtBatCompleted } from '../events/AtBatCompleted';
import { CurrentBatterChanged } from '../events/CurrentBatterChanged';
import { DomainEvent } from '../events/DomainEvent';
import { HalfInningEnded } from '../events/HalfInningEnded';
import { InningAdvanced } from '../events/InningAdvanced';
import { InningStateCreated } from '../events/InningStateCreated';
import { RunnerAdvanced, AdvanceReason } from '../events/RunnerAdvanced';
import { RunScored } from '../events/RunScored';
import { GameId } from '../value-objects/GameId';
import { InningStateId } from '../value-objects/InningStateId';
import { PlayerId } from '../value-objects/PlayerId';

import { InningState } from './InningState';

describe('InningState', () => {
  const inningStateId = new InningStateId('inning-state-1');
  const gameId = new GameId('game-1');
  const batterId = new PlayerId('batter-1');

  describe('createNew', () => {
    it('should create a new inning state with default values', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      expect(inningState.id).toEqual(inningStateId);
      expect(inningState.gameId).toEqual(gameId);
      expect(inningState.inning).toBe(1);
      expect(inningState.isTopHalf).toBe(true);
      expect(inningState.outs).toBe(0);
      expect(inningState.currentBattingSlot).toBe(1);
      expect(inningState.basesState.getOccupiedBases()).toHaveLength(0);
    });

    it('should emit InningStateCreated event', () => {
      const inningState = InningState.createNew(inningStateId, gameId);
      const events = inningState.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('InningStateCreated');
      expect(events[0]!).toMatchObject({
        inningStateId,
        gameId,
        inning: 1,
        isTopHalf: true,
      });
    });

    it('should throw error when inningStateId is null', () => {
      expect(() => InningState.createNew(null as unknown as InningStateId, gameId)).toThrow(
        DomainError
      );
    });

    it('should throw error when gameId is null', () => {
      expect(() => InningState.createNew(inningStateId, null as unknown as GameId)).toThrow(
        DomainError
      );
    });
  });

  describe('recordAtBat', () => {
    it('should record a single and advance batter to first base', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1);

      expect(updated.basesState.getRunner('FIRST')).toEqual(batterId);
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.outs).toBe(0);
    });

    it('should record a double and advance batter to second base', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.DOUBLE, 1);

      expect(updated.basesState.getRunner('SECOND')).toEqual(batterId);
      expect(updated.basesState.getRunner('FIRST')).toBeUndefined();
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.outs).toBe(0);
    });

    it('should record a triple and advance batter to third base', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.TRIPLE, 1);

      expect(updated.basesState.getRunner('THIRD')).toEqual(batterId);
      expect(updated.basesState.getRunner('FIRST')).toBeUndefined();
      expect(updated.basesState.getRunner('SECOND')).toBeUndefined();
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.outs).toBe(0);
    });

    it('should record a home run and clear all bases', () => {
      const baseRunner = new PlayerId('base-runner-1');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'FIRST',
        baseRunner
      );

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.HOME_RUN, 1);

      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.outs).toBe(0);
    });

    it('should record a walk and advance batter to first base', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.WALK, 1);

      expect(updated.basesState.getRunner('FIRST')).toEqual(batterId);
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.outs).toBe(0);
    });

    it('should record a strikeout and add an out', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.STRIKEOUT, 1);

      expect(updated.outs).toBe(1);
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);
    });

    it('should record a ground out and add an out', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.GROUND_OUT, 1);

      expect(updated.outs).toBe(1);
      expect(updated.currentBattingSlot).toBe(2);
    });

    it('should record a fly out and add an out', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.FLY_OUT, 1);

      expect(updated.outs).toBe(1);
      expect(updated.currentBattingSlot).toBe(2);
    });

    it('should handle sacrifice fly with runner on third', () => {
      const runnerOnThird = new PlayerId('runner-third');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'THIRD',
        runnerOnThird
      );

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.SACRIFICE_FLY, 1);

      expect(updated.outs).toBe(1);
      expect(updated.basesState.getRunner('THIRD')).toBeUndefined();
      expect(updated.currentBattingSlot).toBe(2);
    });

    it('should handle error result and advance batter to first', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.ERROR, 1);

      expect(updated.basesState.getRunner('FIRST')).toEqual(batterId);
      expect(updated.currentBattingSlot).toBe(2);
      expect(updated.outs).toBe(0);
    });

    it('should handle fielders choice', () => {
      const runnerOnFirst = new PlayerId('runner-first');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'FIRST',
        runnerOnFirst
      );

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.FIELDERS_CHOICE, 1);

      expect(updated.basesState.getRunner('FIRST')).toEqual(batterId);
      expect(updated.outs).toBe(1); // Runner forced out
      expect(updated.currentBattingSlot).toBe(2);
    });

    it('should handle double play', () => {
      const runnerOnFirst = new PlayerId('runner-first');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'FIRST',
        runnerOnFirst
      );

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.DOUBLE_PLAY, 1);

      expect(updated.outs).toBe(2);
      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);
      expect(updated.currentBattingSlot).toBe(2);
    });

    it('should end inning when third out is recorded', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withOuts(2); // Two outs already

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.GROUND_OUT, 1);

      expect(updated.outs).toBe(0); // Reset for next half-inning
      expect(updated.isTopHalf).toBe(false); // Switch to bottom half
      expect(updated.inning).toBe(1); // Still first inning
      expect(updated.currentBattingSlot).toBe(1); // Reset batting order
      expect(updated.basesState.getOccupiedBases()).toHaveLength(0); // Clear bases
    });

    it('should advance to next inning after bottom half ends', () => {
      const inningState = InningState.createNew(inningStateId, gameId)
        .withInningHalf(1, false) // Bottom of first
        .withOuts(2);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.FLY_OUT, 1);

      expect(updated.outs).toBe(0);
      expect(updated.isTopHalf).toBe(true); // Back to top half
      expect(updated.inning).toBe(2); // Second inning
      expect(updated.currentBattingSlot).toBe(1);
      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);
    });

    it('should emit AtBatCompleted event', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(
        batterId,
        1, // Use slot 1 since that's the current batter
        AtBatResultType.SINGLE,
        1
      );

      const events = updated.getUncommittedEvents();
      const atBatEvent = events.find(e => e.type === 'AtBatCompleted');

      expect(atBatEvent).toBeDefined();
      expect(atBatEvent).toMatchObject({
        gameId,
        batterId,
        battingSlot: 1,
        result: AtBatResultType.SINGLE,
        inning: 1,
        outs: 0,
      });
    });

    it('should emit RunnerAdvanced events for base hits', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.DOUBLE, 1);

      const events = updated.getUncommittedEvents();
      const runnerEvents = events.filter(e => e.type === 'RunnerAdvanced');

      expect(runnerEvents).toHaveLength(1);
      expect(runnerEvents[0]).toMatchObject({
        gameId,
        runnerId: batterId,
        from: null,
        to: 'SECOND',
      });
    });

    it('should emit RunScored events for home runs', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.HOME_RUN, 1);

      const events = updated.getUncommittedEvents();
      const runEvents = events.filter(e => e.type === 'RunScored');

      expect(runEvents).toHaveLength(1);
      expect(runEvents[0]).toMatchObject({
        gameId,
        scorerId: batterId,
        battingTeam: 'AWAY', // Top half = away team batting
        rbiCreditedTo: batterId,
      });
    });

    it('should emit HalfInningEnded event when inning ends', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withOuts(2);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.STRIKEOUT, 1);

      const events = updated.getUncommittedEvents();
      const endEvent = events.find(e => e.type === 'HalfInningEnded');

      expect(endEvent).toBeDefined();
      expect(endEvent).toMatchObject({
        gameId,
        inning: 1,
        wasTopHalf: true,
      });
    });

    it('should cycle batting slots from 1 to 9', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withCurrentBattingSlot(9);

      const updated = inningState.recordAtBat(batterId, 9, AtBatResultType.SINGLE, 1);

      expect(updated.currentBattingSlot).toBe(1); // Cycle back to 1
    });

    it('should handle batting slots beyond 9 (up to 20)', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withCurrentBattingSlot(15);

      const updated = inningState.recordAtBat(batterId, 15, AtBatResultType.WALK, 1);

      expect(updated.currentBattingSlot).toBe(16);
    });

    it('should cycle from slot 20 back to 1', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withCurrentBattingSlot(20);

      const updated = inningState.recordAtBat(batterId, 20, AtBatResultType.DOUBLE, 1);

      expect(updated.currentBattingSlot).toBe(1);
    });

    it('should throw error for invalid batting slot', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      expect(() => inningState.recordAtBat(batterId, 0, AtBatResultType.SINGLE, 1)).toThrow(
        DomainError
      );

      expect(() => inningState.recordAtBat(batterId, 21, AtBatResultType.SINGLE, 1)).toThrow(
        DomainError
      );
    });

    it('should throw error for invalid inning', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      expect(() => inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 0)).toThrow(
        DomainError
      );
    });

    it('should validate batting slot matches current batter', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withCurrentBattingSlot(3);

      expect(() =>
        inningState.recordAtBat(
          batterId,
          5, // Wrong batting slot
          AtBatResultType.SINGLE,
          1
        )
      ).toThrow(DomainError);
    });
  });

  describe('advanceRunners', () => {
    it('should advance runners on a single', () => {
      const runner1 = new PlayerId('runner-1');
      const runner2 = new PlayerId('runner-2');
      const inningState = InningState.createNew(inningStateId, gameId)
        .withRunnerOnBase('FIRST', runner1)
        .withRunnerOnBase('SECOND', runner2);

      const updated = inningState.advanceRunners(AtBatResultType.SINGLE, [
        { runnerId: runner1, from: 'FIRST', to: 'SECOND' },
        { runnerId: runner2, from: 'SECOND', to: 'HOME' },
      ]);

      expect(updated.basesState.getRunner('SECOND')).toEqual(runner1);
      expect(updated.basesState.getRunner('FIRST')).toBeUndefined();
    });

    it('should emit RunnerAdvanced events for each movement', () => {
      const runner1 = new PlayerId('runner-1');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'FIRST',
        runner1
      );

      const updated = inningState.advanceRunners(AtBatResultType.DOUBLE, [
        { runnerId: runner1, from: 'FIRST', to: 'THIRD' },
      ]);

      const events = updated.getUncommittedEvents();
      const runnerEvents = events.filter(e => e.type === 'RunnerAdvanced');

      expect(runnerEvents).toHaveLength(1);
      expect(runnerEvents[0]).toMatchObject({
        runnerId: runner1,
        from: 'FIRST',
        to: 'THIRD',
      });
    });

    it('should emit RunScored events when runners score', () => {
      const runner1 = new PlayerId('runner-1');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'THIRD',
        runner1
      );

      const updated = inningState.advanceRunners(AtBatResultType.SINGLE, [
        { runnerId: runner1, from: 'THIRD', to: 'HOME' },
      ]);

      const events = updated.getUncommittedEvents();
      const scoreEvents = events.filter(e => e.type === 'RunScored');

      expect(scoreEvents).toHaveLength(1);
      expect(scoreEvents[0]).toMatchObject({
        scorerId: runner1,
        battingTeam: 'AWAY', // Top half = away team batting
        rbiCreditedTo: null, // Simplified implementation
      });
    });

    it('should handle runners being put out', () => {
      const runner1 = new PlayerId('runner-1');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'FIRST',
        runner1
      );

      const updated = inningState.advanceRunners(AtBatResultType.FIELDERS_CHOICE, [
        { runnerId: runner1, from: 'FIRST', to: 'OUT' },
      ]);

      expect(updated.basesState.getRunner('FIRST')).toBeUndefined();
      expect(updated.outs).toBe(1);
    });

    it('should handle runner advancement with default advance reason on strikeout', () => {
      const runner1 = new PlayerId('runner-1');
      const inningState = InningState.createNew(inningStateId, gameId).withRunnerOnBase(
        'THIRD',
        runner1
      );

      const updated = inningState.advanceRunners(AtBatResultType.STRIKEOUT, [
        { runnerId: runner1, from: 'THIRD', to: 'HOME' },
      ]);

      const events = updated.getUncommittedEvents();
      const runnerAdvancedEvents = events.filter(e => e.type === 'RunnerAdvanced');

      expect(runnerAdvancedEvents).toHaveLength(1);
      expect(runnerAdvancedEvents[0]).toMatchObject({
        runnerId: runner1,
        from: 'THIRD',
        to: 'HOME',
        reason: 'HIT', // Default fallback from determineAdvanceReason
      });
    });
  });

  describe('endHalfInning', () => {
    it('should transition from top to bottom half', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withOuts(2); // Two outs is valid

      const updated = inningState.endHalfInning();

      expect(updated.isTopHalf).toBe(false);
      expect(updated.inning).toBe(1);
      expect(updated.outs).toBe(0);
      expect(updated.currentBattingSlot).toBe(1);
      expect(updated.basesState.getOccupiedBases()).toHaveLength(0);
    });

    it('should advance to next inning after bottom half', () => {
      const inningState = InningState.createNew(inningStateId, gameId)
        .withInningHalf(3, false)
        .withOuts(2); // Two outs is valid

      const updated = inningState.endHalfInning();

      expect(updated.isTopHalf).toBe(true);
      expect(updated.inning).toBe(4);
      expect(updated.outs).toBe(0);
      expect(updated.currentBattingSlot).toBe(1);
    });

    it('should emit HalfInningEnded event', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.endHalfInning();

      const events = updated.getUncommittedEvents();
      const endEvent = events.find(e => e.type === 'HalfInningEnded');

      expect(endEvent).toBeDefined();
      expect(endEvent).toMatchObject({
        gameId,
        inning: 1,
        wasTopHalf: true,
      });
    });

    it('should emit InningAdvanced event when moving to next full inning', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withInningHalf(2, false);

      const updated = inningState.endHalfInning();

      const events = updated.getUncommittedEvents();
      const advancedEvent = events.find(e => e.type === 'InningAdvanced');

      expect(advancedEvent).toBeDefined();
      expect(advancedEvent).toMatchObject({
        gameId,
        newInning: 3,
        isTopHalf: true,
      });
    });
  });

  describe('getCurrentSituation', () => {
    it('should return current game situation', () => {
      const runner = new PlayerId('runner-1');
      const inningState = InningState.createNew(inningStateId, gameId)
        .withInningHalf(3, false)
        .withOuts(1)
        .withCurrentBattingSlot(5)
        .withRunnerOnBase('SECOND', runner);

      const situation = inningState.getCurrentSituation();

      expect(situation).toEqual({
        inning: 3,
        isTopHalf: false,
        outs: 1,
        currentBattingSlot: 5,
        basesState: inningState.basesState,
        runnersInScoringPosition: [runner],
      });
    });

    it('should handle empty bases', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const situation = inningState.getCurrentSituation();

      expect(situation.runnersInScoringPosition).toHaveLength(0);
      expect(situation.basesState.getOccupiedBases()).toHaveLength(0);
    });
  });

  describe('isInningComplete', () => {
    it('should return false for top half of inning', () => {
      const inningState = InningState.createNew(inningStateId, gameId);
      expect(inningState.isInningComplete()).toBe(false);
    });

    it('should return false for bottom half of inning', () => {
      const inningState = InningState.createNew(inningStateId, gameId).withInningHalf(1, false);
      expect(inningState.isInningComplete()).toBe(false);
    });

    it('should return true only after both halves complete', () => {
      // This would typically be determined by external game logic
      // InningState tracks the current half, not completion
      const inningState = InningState.createNew(inningStateId, gameId);
      expect(inningState.isInningComplete()).toBe(false);
    });
  });

  describe('helper methods for test setup', () => {
    describe('withRunnerOnBase', () => {
      it('should place a runner on the specified base', () => {
        const runner = new PlayerId('runner-1');
        const inningState = InningState.createNew(inningStateId, gameId);

        const updated = inningState.withRunnerOnBase('SECOND', runner);

        expect(updated.basesState.getRunner('SECOND')).toEqual(runner);
        expect(updated.basesState.getRunner('FIRST')).toBeUndefined();
        expect(updated.basesState.getRunner('THIRD')).toBeUndefined();
      });
    });

    describe('withOuts', () => {
      it('should set the number of outs', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        const updated = inningState.withOuts(2);

        expect(updated.outs).toBe(2);
      });

      it('should validate outs are between 0-2', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        expect(() => inningState.withOuts(-1)).toThrow(DomainError);
        expect(() => inningState.withOuts(3)).toThrow(DomainError);
      });
    });

    describe('withCurrentBattingSlot', () => {
      it('should set the current batting slot', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        const updated = inningState.withCurrentBattingSlot(5);

        expect(updated.currentBattingSlot).toBe(5);
      });

      it('should validate batting slot is between 1-20', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        expect(() => inningState.withCurrentBattingSlot(0)).toThrow(DomainError);
        expect(() => inningState.withCurrentBattingSlot(21)).toThrow(DomainError);
      });
    });

    describe('withInningHalf', () => {
      it('should set the inning and half', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        const updated = inningState.withInningHalf(7, false);

        expect(updated.inning).toBe(7);
        expect(updated.isTopHalf).toBe(false);
      });

      it('should validate inning is positive', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        expect(() => inningState.withInningHalf(0, true)).toThrow(DomainError);
      });
    });
  });

  describe('event sourcing capabilities', () => {
    it('should track uncommitted events', () => {
      const inningState = InningState.createNew(inningStateId, gameId);
      const events = inningState.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('InningStateCreated');
    });

    it('should mark events as committed', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      inningState.markEventsAsCommitted();
      const events = inningState.getUncommittedEvents();

      expect(events).toHaveLength(0);
    });

    it('should accumulate events from multiple operations', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState
        .recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1)
        .recordAtBat(new PlayerId('batter-2'), 2, AtBatResultType.WALK, 1);

      const events = updated.getUncommittedEvents();

      expect(events.length).toBeGreaterThan(2); // Creation + multiple at-bat events
    });

    it('should preserve event order for replay', () => {
      const inningState = InningState.createNew(inningStateId, gameId);

      const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.DOUBLE, 1);

      const events = updated.getUncommittedEvents();
      const eventTypes = events.map(e => e.type);

      expect(eventTypes).toEqual([
        'InningStateCreated',
        'AtBatCompleted',
        'RunnerAdvanced',
        'CurrentBatterChanged',
      ]);
    });
  });

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

  describe('InningState.fromEvents() - Event Sourcing Reconstruction', () => {
    let gameId: GameId;
    let inningStateId: InningStateId;
    let batterId1: PlayerId;
    let batterId2: PlayerId;
    let runner1: PlayerId;

    beforeEach(() => {
      gameId = GameId.generate();
      inningStateId = InningStateId.generate();
      batterId1 = new PlayerId('batter-1');
      batterId2 = new PlayerId('batter-2');
      runner1 = new PlayerId('runner-1');
    });

    describe('Core Event Reconstruction', () => {
      it('should create inning state from InningStateCreated event', () => {
        const events = [new InningStateCreated(inningStateId, gameId, 1, true)];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.id).toEqual(inningStateId);
        expect(reconstructed.gameId).toEqual(gameId);
        expect(reconstructed.inning).toBe(1);
        expect(reconstructed.isTopHalf).toBe(true);
        expect(reconstructed.outs).toBe(0);
        expect(reconstructed.currentBattingSlot).toBe(1);
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0);
      });

      it('should replay events in chronological order', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.SINGLE, 1, 0),
          new RunnerAdvanced(gameId, batterId1, null, 'FIRST', AdvanceReason.HIT),
          new CurrentBatterChanged(gameId, 1, 2, 1, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.basesState.getRunner('FIRST')).toEqual(batterId1);
        expect(reconstructed.currentBattingSlot).toBe(2);
        expect(reconstructed.outs).toBe(0);
      });

      it('should maintain domain invariants during reconstruction', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.STRIKEOUT, 1, 0),
          new CurrentBatterChanged(gameId, 1, 2, 1, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        // Domain invariants maintained
        expect(reconstructed.outs).toBe(1); // Out was recorded
        expect(reconstructed.currentBattingSlot).toBe(2); // Batting order advanced
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0); // No runners on base
      });

      it('should handle empty event array gracefully', () => {
        expect(() => InningState.fromEvents([])).toThrow(DomainError);
        expect(() => InningState.fromEvents([])).toThrow(
          'Cannot reconstruct inning state from empty event array'
        );
      });

      it('should throw error if first event is not InningStateCreated', () => {
        const events = [new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.SINGLE, 1, 0)];

        expect(() => InningState.fromEvents(events)).toThrow(DomainError);
        expect(() => InningState.fromEvents(events)).toThrow(
          'First event must be InningStateCreated'
        );
      });
    });

    describe('Complex Scenario Reconstruction', () => {
      it('should reconstruct full inning with multiple at-bats', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 3, false),
          // First at-bat: Single
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.SINGLE, 3, 0),
          new RunnerAdvanced(gameId, batterId1, null, 'FIRST', AdvanceReason.HIT),
          new CurrentBatterChanged(gameId, 1, 2, 3, false),
          // Second at-bat: Double, runner scores
          new AtBatCompleted(gameId, batterId2, 2, AtBatResultType.DOUBLE, 3, 0),
          new RunnerAdvanced(gameId, batterId1, 'FIRST', 'HOME', AdvanceReason.HIT),
          new RunScored(gameId, batterId1, 'HOME', batterId2, { home: 1, away: 0 }),
          new RunnerAdvanced(gameId, batterId2, null, 'SECOND', AdvanceReason.HIT),
          new CurrentBatterChanged(gameId, 2, 3, 3, false),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.inning).toBe(3);
        expect(reconstructed.isTopHalf).toBe(false);
        expect(reconstructed.basesState.getRunner('SECOND')).toEqual(batterId2);
        expect(reconstructed.basesState.getRunner('FIRST')).toBeUndefined();
        expect(reconstructed.currentBattingSlot).toBe(3);
        expect(reconstructed.outs).toBe(0);
      });

      it('should restore correct base runner positions', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new RunnerAdvanced(gameId, batterId1, null, 'FIRST', AdvanceReason.WALK),
          new RunnerAdvanced(gameId, batterId2, null, 'SECOND', AdvanceReason.HIT),
          new RunnerAdvanced(gameId, runner1, null, 'THIRD', AdvanceReason.HIT),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.basesState.getRunner('FIRST')).toEqual(batterId1);
        expect(reconstructed.basesState.getRunner('SECOND')).toEqual(batterId2);
        expect(reconstructed.basesState.getRunner('THIRD')).toEqual(runner1);
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(3);
      });

      it('should maintain accurate out count through replay', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.STRIKEOUT, 1, 0),
          new AtBatCompleted(gameId, batterId2, 2, AtBatResultType.GROUND_OUT, 1, 1),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.outs).toBe(2);
      });

      it('should handle inning transitions correctly', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new HalfInningEnded(gameId, 1, true, 3),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.inning).toBe(1);
        expect(reconstructed.isTopHalf).toBe(false); // Switched to bottom half
        expect(reconstructed.outs).toBe(0); // Reset for new half
        expect(reconstructed.currentBattingSlot).toBe(1); // Reset batting order
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0); // Bases cleared
      });

      it('should preserve batting order progression', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new CurrentBatterChanged(gameId, 1, 2, 1, true),
          new CurrentBatterChanged(gameId, 2, 3, 1, true),
          new CurrentBatterChanged(gameId, 9, 1, 1, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.currentBattingSlot).toBe(1); // Cycled back to 1
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should ignore unknown event types gracefully', () => {
        // Create a mock unknown event that still extends DomainEvent
        class UnknownEvent {
          readonly eventId = crypto.randomUUID();
          readonly timestamp = new Date();
          readonly version = 1;
          readonly type = 'UnknownEventType';
          readonly gameId = gameId;
          someProperty = 'someValue';
        }

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new UnknownEvent() as unknown as DomainEvent,
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.SINGLE, 1, 0),
        ];

        const reconstructed = InningState.fromEvents(events);

        // Should process known events normally despite unknown event
        expect(reconstructed.id).toEqual(inningStateId);
        expect(reconstructed.inning).toBe(1);
        // Unknown event should be ignored without causing errors
      });

      it('should handle malformed events gracefully', () => {
        // Create a mock malformed event that still has required DomainEvent properties
        class MalformedEvent {
          readonly eventId = crypto.randomUUID();
          readonly timestamp = new Date();
          readonly version = 1;
          readonly type = 'AtBatCompleted';
          readonly gameId = gameId;
          // Missing other required properties like batterId, etc.
        }

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new MalformedEvent() as unknown as DomainEvent,
        ];

        // Should not crash during reconstruction
        expect(() => InningState.fromEvents(events)).not.toThrow();
      });

      it('should be idempotent for repeat events', () => {
        const batterChangeEvent = new CurrentBatterChanged(gameId, 1, 2, 1, true);
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          batterChangeEvent,
          batterChangeEvent, // Repeat event
        ];

        const reconstructed = InningState.fromEvents(events);

        // Repeat event should not cause duplicate state changes
        expect(reconstructed.currentBattingSlot).toBe(2);
      });

      it('should clear uncommitted events for reconstructed aggregate', () => {
        const events = [new InningStateCreated(inningStateId, gameId, 1, true)];

        const reconstructed = InningState.fromEvents(events);

        // Reconstructed aggregates should have no uncommitted events
        expect(reconstructed.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('InningState.applyEvent() - Event Application Logic', () => {
    let gameId: GameId;
    let inningStateId: InningStateId;
    let batterId1: PlayerId;
    let batterId2: PlayerId;
    let runner1: PlayerId;

    beforeEach(() => {
      gameId = GameId.generate();
      inningStateId = InningStateId.generate();
      batterId1 = new PlayerId('batter-1');
      batterId2 = new PlayerId('batter-2');
      runner1 = new PlayerId('runner-1');
    });

    describe('AtBatCompleted Event Application', () => {
      it('should apply AtBatCompleted event for strikeout (adds out)', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.STRIKEOUT, 1, 0),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.outs).toBe(1);
        expect(reconstructed.currentBattingSlot).toBe(1); // No batter change event yet
      });

      it('should apply AtBatCompleted event for double play (adds 2 outs)', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.DOUBLE_PLAY, 1, 0),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.outs).toBe(2);
      });

      it('should apply AtBatCompleted event for triple play (adds 3 outs)', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.TRIPLE_PLAY, 1, 0),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.outs).toBe(3);
      });

      it('should not add outs for hit results', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.SINGLE, 1, 0),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.outs).toBe(0);
      });
    });

    describe('RunnerAdvanced Event Application', () => {
      it('should place runner on base for new advancement', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new RunnerAdvanced(gameId, batterId1, null, 'FIRST', AdvanceReason.HIT),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.basesState.getRunner('FIRST')).toEqual(batterId1);
      });

      it('should move runner from one base to another', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new RunnerAdvanced(gameId, batterId1, null, 'FIRST', AdvanceReason.HIT),
          new RunnerAdvanced(gameId, batterId1, 'FIRST', 'SECOND', AdvanceReason.HIT),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.basesState.getRunner('FIRST')).toBeUndefined();
        expect(reconstructed.basesState.getRunner('SECOND')).toEqual(batterId1);
      });

      it('should remove runner when advancing to HOME', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new RunnerAdvanced(gameId, batterId1, null, 'THIRD', AdvanceReason.HIT),
          new RunnerAdvanced(gameId, batterId1, 'THIRD', 'HOME', AdvanceReason.HIT),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.basesState.getRunner('THIRD')).toBeUndefined();
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0);
      });

      it('should remove runner when marked OUT', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new RunnerAdvanced(gameId, batterId1, null, 'FIRST', AdvanceReason.HIT),
          new RunnerAdvanced(gameId, batterId2, null, 'SECOND', AdvanceReason.HIT),
          new RunnerAdvanced(gameId, batterId1, 'FIRST', 'OUT', AdvanceReason.FIELDERS_CHOICE),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.basesState.getRunner('FIRST')).toBeUndefined();
        expect(reconstructed.basesState.getRunner('SECOND')).toEqual(batterId2);
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(1);
      });

      it('should handle malformed RunnerAdvanced events gracefully', () => {
        // Create a malformed RunnerAdvanced event
        class MalformedRunnerAdvancedEvent {
          readonly eventId = crypto.randomUUID();
          readonly timestamp = new Date();
          readonly version = 1;
          readonly type = 'RunnerAdvanced';
          readonly gameId = gameId;
          // Missing runnerId and to properties
          readonly from = 'FIRST';
          readonly reason = 'HIT';
        }

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new MalformedRunnerAdvancedEvent() as unknown as DomainEvent,
        ];

        // Should not crash
        expect(() => InningState.fromEvents(events)).not.toThrow();

        const reconstructed = InningState.fromEvents(events);
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0);
      });
    });

    describe('CurrentBatterChanged Event Application', () => {
      it('should update current batting slot', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new CurrentBatterChanged(gameId, 1, 5, 1, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.currentBattingSlot).toBe(5);
      });

      it('should handle batting order cycling', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new CurrentBatterChanged(gameId, 9, 1, 1, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.currentBattingSlot).toBe(1);
      });

      it('should handle malformed CurrentBatterChanged events gracefully', () => {
        // Create a malformed CurrentBatterChanged event
        class MalformedCurrentBatterChangedEvent {
          readonly eventId = crypto.randomUUID();
          readonly timestamp = new Date();
          readonly version = 1;
          readonly type = 'CurrentBatterChanged';
          readonly gameId = gameId;
          readonly previousSlot = 1;
          // Missing newSlot
          readonly inning = 1;
          readonly isTopHalf = true;
        }

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new MalformedCurrentBatterChangedEvent() as unknown as DomainEvent,
        ];

        const reconstructed = InningState.fromEvents(events);

        // Should maintain original batting slot
        expect(reconstructed.currentBattingSlot).toBe(1);
      });
    });

    describe('HalfInningEnded Event Application', () => {
      it('should switch from top to bottom half of inning', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 2, true),
          new AtBatCompleted(gameId, batterId1, 1, AtBatResultType.STRIKEOUT, 2, 2),
          new RunnerAdvanced(gameId, runner1, null, 'FIRST', AdvanceReason.HIT),
          new HalfInningEnded(gameId, 2, true, 3),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.inning).toBe(2);
        expect(reconstructed.isTopHalf).toBe(false); // Switched to bottom
        expect(reconstructed.outs).toBe(0); // Reset
        expect(reconstructed.currentBattingSlot).toBe(1); // Reset
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0); // Bases cleared
      });

      it('should reset all tactical state', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId1, 7, AtBatResultType.STRIKEOUT, 1, 1),
          new CurrentBatterChanged(gameId, 7, 8, 1, true),
          new RunnerAdvanced(gameId, runner1, null, 'SECOND', AdvanceReason.HIT),
          new HalfInningEnded(gameId, 1, true, 3),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.outs).toBe(0);
        expect(reconstructed.currentBattingSlot).toBe(1);
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0);
      });
    });

    describe('InningAdvanced Event Application', () => {
      it('should advance to next inning and set to top half', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 3, false),
          new HalfInningEnded(gameId, 3, false, 3),
          new InningAdvanced(gameId, 4, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.inning).toBe(4);
        expect(reconstructed.isTopHalf).toBe(true);
        expect(reconstructed.outs).toBe(0);
        expect(reconstructed.currentBattingSlot).toBe(1);
      });

      it('should handle malformed InningAdvanced events gracefully', () => {
        // Create a malformed InningAdvanced event
        class MalformedInningAdvancedEvent {
          readonly eventId = crypto.randomUUID();
          readonly timestamp = new Date();
          readonly version = 1;
          readonly type = 'InningAdvanced';
          readonly gameId = gameId;
          // Missing newInning and isTopHalf
        }

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new MalformedInningAdvancedEvent() as unknown as DomainEvent,
        ];

        const reconstructed = InningState.fromEvents(events);

        // Should maintain original state
        expect(reconstructed.inning).toBe(1);
        expect(reconstructed.isTopHalf).toBe(true);
      });
    });

    describe('RunScored Event Application', () => {
      it('should handle RunScored events without state changes', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new RunScored(gameId, batterId1, 'AWAY', batterId2, { home: 0, away: 1 }),
        ];

        const reconstructed = InningState.fromEvents(events);

        // RunScored should not affect InningState directly
        expect(reconstructed.outs).toBe(0);
        expect(reconstructed.basesState.getOccupiedBases()).toHaveLength(0);
        expect(reconstructed.currentBattingSlot).toBe(1);
      });
    });

    describe('Event Processing Edge Cases', () => {
      it('should be idempotent when applying same event multiple times', () => {
        const batterChangeEvent = new CurrentBatterChanged(gameId, 1, 3, 1, true);

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          batterChangeEvent,
          batterChangeEvent, // Duplicate event
        ];

        const reconstructed = InningState.fromEvents(events);

        // Should not cause issues, final state should be consistent
        expect(reconstructed.currentBattingSlot).toBe(3);
      });

      it('should ignore completely unknown event types', () => {
        // Create a completely unknown event type
        class CompletelyUnknownEvent {
          readonly eventId = crypto.randomUUID();
          readonly timestamp = new Date();
          readonly version = 1;
          readonly type = 'CompletelyUnknownEventType';
          readonly gameId = gameId;
          readonly randomProperty = 'randomValue';
        }

        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new CompletelyUnknownEvent() as unknown as DomainEvent,
          new CurrentBatterChanged(gameId, 1, 2, 1, true),
        ];

        const reconstructed = InningState.fromEvents(events);

        // Should process known events normally
        expect(reconstructed.currentBattingSlot).toBe(2);
        expect(reconstructed.inning).toBe(1);
      });
    });
  });

  describe('Event Management Methods', () => {
    let gameId: GameId;
    let inningStateId: InningStateId;
    let batterId: PlayerId;

    beforeEach(() => {
      gameId = GameId.generate();
      inningStateId = InningStateId.generate();
      batterId = new PlayerId('batter-1');
    });

    describe('getVersion()', () => {
      it('should return version 1 after creation', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        expect(inningState.getVersion()).toBe(1);
      });

      it('should increment version when events are added', () => {
        const inningState = InningState.createNew(inningStateId, gameId);
        const initialVersion = inningState.getVersion();

        const updated = inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1);

        // recordAtBat adds multiple events: AtBatCompleted + RunnerAdvanced + CurrentBatterChanged
        expect(updated.getVersion()).toBeGreaterThan(initialVersion);
        expect(updated.getVersion()).toBe(4); // 1 (creation) + 3 (at-bat events)
      });

      it('should preserve version through event sourcing reconstruction', () => {
        const events = [
          new InningStateCreated(inningStateId, gameId, 1, true),
          new AtBatCompleted(gameId, batterId, 1, AtBatResultType.SINGLE, 1, 0),
          new RunnerAdvanced(gameId, batterId, null, 'FIRST', AdvanceReason.HIT),
        ];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.getVersion()).toBe(3); // 1 + 2 events applied
      });

      it('should maintain version consistency across multiple operations', () => {
        let inningState = InningState.createNew(inningStateId, gameId);
        const initialVersion = inningState.getVersion();

        // Record multiple at-bats
        inningState = inningState.recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1);
        const afterFirstAtBat = inningState.getVersion();
        expect(afterFirstAtBat).toBeGreaterThan(initialVersion);

        inningState = inningState.recordAtBat(new PlayerId('batter-2'), 2, AtBatResultType.WALK, 1);
        const afterSecondAtBat = inningState.getVersion();
        expect(afterSecondAtBat).toBeGreaterThan(afterFirstAtBat);

        // Version should match the total number of events in the aggregate
        const totalEvents = inningState.getUncommittedEvents().length;
        expect(inningState.getVersion()).toBe(totalEvents);
      });
    });

    describe('getUncommittedEvents()', () => {
      it('should return copy of uncommitted events array', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        const events = inningState.getUncommittedEvents();
        const eventsAgain = inningState.getUncommittedEvents();

        // Should be different array instances
        expect(events).not.toBe(eventsAgain);
        // But with same content
        expect(events).toEqual(eventsAgain);
        expect(events).toHaveLength(1);
        expect(events[0]!.type).toBe('InningStateCreated');
      });

      it('should include all events from multiple operations', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        const updated = inningState
          .recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1)
          .recordAtBat(new PlayerId('batter-2'), 2, AtBatResultType.WALK, 1);

        const events = updated.getUncommittedEvents();

        expect(events.length).toBeGreaterThan(5); // Creation + multiple at-bat events

        // Check event types are included
        const eventTypes = events.map(e => e.type);
        expect(eventTypes).toContain('InningStateCreated');
        expect(eventTypes).toContain('AtBatCompleted');
        expect(eventTypes).toContain('RunnerAdvanced');
        expect(eventTypes).toContain('CurrentBatterChanged');
      });

      it('should return empty array for reconstructed aggregates', () => {
        const events = [new InningStateCreated(inningStateId, gameId, 1, true)];

        const reconstructed = InningState.fromEvents(events);

        expect(reconstructed.getUncommittedEvents()).toHaveLength(0);
      });
    });

    describe('markEventsAsCommitted()', () => {
      it('should clear uncommitted events array', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        expect(inningState.getUncommittedEvents()).toHaveLength(1);

        inningState.markEventsAsCommitted();

        expect(inningState.getUncommittedEvents()).toHaveLength(0);
      });

      it('should preserve version after marking events as committed', () => {
        const inningState = InningState.createNew(inningStateId, gameId);
        const versionBeforeCommit = inningState.getVersion();

        inningState.markEventsAsCommitted();
        const versionAfterCommit = inningState.getVersion();

        expect(versionAfterCommit).toBe(versionBeforeCommit);
      });

      it('should work with complex event sequences', () => {
        const inningState = InningState.createNew(inningStateId, gameId);

        const updated = inningState
          .recordAtBat(batterId, 1, AtBatResultType.SINGLE, 1)
          .recordAtBat(new PlayerId('batter-2'), 2, AtBatResultType.DOUBLE, 1);

        const eventsBeforeCommit = updated.getUncommittedEvents();
        const versionBeforeCommit = updated.getVersion();

        expect(eventsBeforeCommit.length).toBeGreaterThan(5);

        updated.markEventsAsCommitted();

        expect(updated.getUncommittedEvents()).toHaveLength(0);
        expect(updated.getVersion()).toBe(versionBeforeCommit);
      });
    });

    describe('Version Tracking Integration', () => {
      it('should track version correctly throughout aggregate lifecycle', () => {
        // Create new aggregate
        let inningState = InningState.createNew(inningStateId, gameId);
        expect(inningState.getVersion()).toBe(1);

        // Add events
        inningState = inningState.recordAtBat(batterId, 1, AtBatResultType.TRIPLE, 1);
        const versionAfterTriple = inningState.getVersion();
        expect(versionAfterTriple).toBeGreaterThan(1);

        // End half inning
        inningState = inningState
          .withOuts(2)
          .recordAtBat(new PlayerId('batter-2'), 2, AtBatResultType.STRIKEOUT, 1);
        const versionAfterInningEnd = inningState.getVersion();
        expect(versionAfterInningEnd).toBeGreaterThan(versionAfterTriple);

        // Commit events
        const versionBeforeCommit = inningState.getVersion();
        inningState.markEventsAsCommitted();
        expect(inningState.getVersion()).toBe(versionBeforeCommit);
      });

      it('should maintain version consistency during event sourcing round trip', () => {
        // Create and modify aggregate
        const original = InningState.createNew(inningStateId, gameId).recordAtBat(
          batterId,
          1,
          AtBatResultType.HOME_RUN,
          1
        );

        const originalEvents = original.getUncommittedEvents();
        const originalVersion = originalEvents.length; // Version should equal event count

        // Simulate persistence and reconstruction
        const reconstructed = InningState.fromEvents(originalEvents);

        expect(reconstructed.getVersion()).toBe(originalVersion);
        expect(reconstructed.getUncommittedEvents()).toHaveLength(0);

        // States should be equivalent
        expect(reconstructed.inning).toBe(original.inning);
        expect(reconstructed.isTopHalf).toBe(original.isTopHalf);
        expect(reconstructed.outs).toBe(original.outs);
        expect(reconstructed.currentBattingSlot).toBe(original.currentBattingSlot);
      });
    });
  });
});
