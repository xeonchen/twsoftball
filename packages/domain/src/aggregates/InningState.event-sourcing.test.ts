import { describe, it, expect } from 'vitest';

import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';
import { AtBatCompleted } from '../events/AtBatCompleted.js';
import { CurrentBatterChanged } from '../events/CurrentBatterChanged.js';
import { DomainEvent } from '../events/DomainEvent.js';
import { HalfInningEnded } from '../events/HalfInningEnded.js';
import { InningAdvanced } from '../events/InningAdvanced.js';
import { InningStateCreated } from '../events/InningStateCreated.js';
import { RunnerAdvanced, AdvanceReason } from '../events/RunnerAdvanced.js';
import { RunScored } from '../events/RunScored.js';
import { GameId } from '../value-objects/GameId.js';
import { InningStateId } from '../value-objects/InningStateId.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { InningState } from './InningState.js';

describe('InningState - Event Sourcing', () => {
  const inningStateId = new InningStateId('inning-state-1');
  const gameId = new GameId('game-1');
  const batterId = new PlayerId('batter-1');

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
          new HalfInningEnded(gameId, 1, true, 3, 1, 1),
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
          new HalfInningEnded(gameId, 2, true, 3, 1, 1),
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
          new HalfInningEnded(gameId, 1, true, 3, 1, 1),
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
          new HalfInningEnded(gameId, 3, false, 3, 1, 1),
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
