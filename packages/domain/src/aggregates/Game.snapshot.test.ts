/**
 * @file Game Snapshot Reconstruction Tests
 * Comprehensive test suite for Game.fromSnapshot() method and snapshot-based reconstruction.
 *
 * @remarks
 * This test suite validates the snapshot reconstruction capabilities of the Game aggregate,
 * ensuring proper state reconstruction from snapshots combined with subsequent event replay.
 * Tests cover various scenarios including different game states, edge cases, and validation
 * of the complete snapshot + event replay workflow.
 *
 * Test Categories:
 * - Snapshot structure validation
 * - Basic snapshot reconstruction
 * - Snapshot + subsequent events replay
 * - Edge cases and error handling
 * - State consistency validation
 * - Complex game scenarios
 * - Performance characteristics
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { GameStatus } from '../constants/GameStatus.js';
import { DomainError } from '../errors/DomainError.js';
import { DomainEvent } from '../events/DomainEvent.js';
import { GameCompleted } from '../events/GameCompleted.js';
import { GameCreated } from '../events/GameCreated.js';
import { GameStarted } from '../events/GameStarted.js';
import { InningAdvanced } from '../events/InningAdvanced.js';
import { ScoreUpdated } from '../events/ScoreUpdated.js';
import { GameId } from '../value-objects/GameId.js';

import { Game } from './Game.js';

/**
 * Game snapshot data structure for testing.
 *
 * @remarks
 * Represents the serializable state data that would be captured in a snapshot.
 * This includes all necessary information to reconstruct the Game aggregate state
 * without replaying all historical events.
 */
interface GameSnapshotData {
  readonly id: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly status: GameStatus;
  readonly homeRuns: number;
  readonly awayRuns: number;
  readonly currentInning: number;
  readonly isTopHalf: boolean;
  readonly outs: number;
}

/**
 * Mock aggregate snapshot structure for testing.
 *
 * @remarks
 * Simulates the AggregateSnapshot<T> interface from the application layer
 * for testing purposes without introducing infrastructure dependencies.
 */
interface MockAggregateSnapshot<T> {
  readonly aggregateId: GameId;
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';
  readonly version: number;
  readonly data: T;
  readonly timestamp: Date;
}

describe('Game Aggregate Root - Snapshot Reconstruction', () => {
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();
  });

  describe('Game.fromSnapshot() - Basic Functionality', () => {
    it('should reconstruct Game from snapshot with initial state', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Springfield Tigers',
        awayTeamName: 'Shelbyville Lions',
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: snapshotData,
        timestamp: new Date(),
      };

      const game = Game.fromSnapshot(snapshot, []);

      expect(game.id.equals(gameId)).toBe(true);
      expect(game.homeTeamName).toBe('Springfield Tigers');
      expect(game.awayTeamName).toBe('Shelbyville Lions');
      expect(game.status).toBe(GameStatus.NOT_STARTED);
      expect(game.score.getHomeRuns()).toBe(0);
      expect(game.score.getAwayRuns()).toBe(0);
      expect(game.currentInning).toBe(1);
      expect(game.isTopHalf).toBe(true);
      expect(game.outs).toBe(0);
      expect(game.getVersion()).toBe(1);
    });

    it('should reconstruct Game from snapshot with in-progress state', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Chicago Cubs',
        awayTeamName: 'St. Louis Cardinals',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 3,
        awayRuns: 2,
        currentInning: 5,
        isTopHalf: false,
        outs: 1,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 42,
        data: snapshotData,
        timestamp: new Date(),
      };

      const game = Game.fromSnapshot(snapshot, []);

      expect(game.id.equals(gameId)).toBe(true);
      expect(game.homeTeamName).toBe('Chicago Cubs');
      expect(game.awayTeamName).toBe('St. Louis Cardinals');
      expect(game.status).toBe(GameStatus.IN_PROGRESS);
      expect(game.score.getHomeRuns()).toBe(3);
      expect(game.score.getAwayRuns()).toBe(2);
      expect(game.currentInning).toBe(5);
      expect(game.isTopHalf).toBe(false);
      expect(game.outs).toBe(1);
      expect(game.getVersion()).toBe(42);
    });

    it('should reconstruct Game from snapshot with completed state', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Boston Red Sox',
        awayTeamName: 'New York Yankees',
        status: GameStatus.COMPLETED,
        homeRuns: 7,
        awayRuns: 4,
        currentInning: 7,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 150,
        data: snapshotData,
        timestamp: new Date(),
      };

      const game = Game.fromSnapshot(snapshot, []);

      expect(game.id.equals(gameId)).toBe(true);
      expect(game.homeTeamName).toBe('Boston Red Sox');
      expect(game.awayTeamName).toBe('New York Yankees');
      expect(game.status).toBe(GameStatus.COMPLETED);
      expect(game.score.getHomeRuns()).toBe(7);
      expect(game.score.getAwayRuns()).toBe(4);
      expect(game.currentInning).toBe(7);
      expect(game.isTopHalf).toBe(true);
      expect(game.outs).toBe(0);
      expect(game.getVersion()).toBe(150);
    });
  });

  describe('Game.fromSnapshot() + Event Replay', () => {
    it('should apply subsequent events after snapshot reconstruction', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Detroit Tigers',
        awayTeamName: 'Cleveland Guardians',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 2,
        awayRuns: 1,
        currentInning: 3,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 25,
        data: snapshotData,
        timestamp: new Date(),
      };

      // Events that occurred after the snapshot
      const subsequentEvents: DomainEvent[] = [
        new ScoreUpdated(gameId, 'AWAY', 3, { home: 2, away: 4 }),
        new InningAdvanced(gameId, 3, false),
        new ScoreUpdated(gameId, 'HOME', 1, { home: 3, away: 4 }),
      ];

      const game = Game.fromSnapshot(snapshot, subsequentEvents);

      expect(game.id.equals(gameId)).toBe(true);
      expect(game.homeTeamName).toBe('Detroit Tigers');
      expect(game.awayTeamName).toBe('Cleveland Guardians');
      expect(game.status).toBe(GameStatus.IN_PROGRESS);
      // Score should reflect both snapshot and subsequent events
      expect(game.score.getHomeRuns()).toBe(3);
      expect(game.score.getAwayRuns()).toBe(4);
      expect(game.currentInning).toBe(3);
      expect(game.isTopHalf).toBe(false); // Changed by InningAdvanced
      expect(game.outs).toBe(0); // Reset by InningAdvanced
      expect(game.getVersion()).toBe(28); // 25 + 3 subsequent events
    });

    it('should handle game completion via subsequent events', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Seattle Mariners',
        awayTeamName: 'Oakland Athletics',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 8,
        awayRuns: 2,
        currentInning: 6,
        isTopHalf: false,
        outs: 2,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 75,
        data: snapshotData,
        timestamp: new Date(),
      };

      // Complete the game via subsequent events
      const subsequentEvents: DomainEvent[] = [
        new InningAdvanced(gameId, 7, true),
        new GameCompleted(gameId, 'MERCY_RULE', { home: 8, away: 2 }, 7),
      ];

      const game = Game.fromSnapshot(snapshot, subsequentEvents);

      expect(game.status).toBe(GameStatus.COMPLETED);
      expect(game.score.getHomeRuns()).toBe(8);
      expect(game.score.getAwayRuns()).toBe(2);
      expect(game.currentInning).toBe(7);
      expect(game.isTopHalf).toBe(true);
      expect(game.outs).toBe(0); // Reset by InningAdvanced
      expect(game.getVersion()).toBe(77); // 75 + 2 subsequent events
    });

    it('should handle complex sequence of subsequent events', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Tampa Bay Rays',
        awayTeamName: 'Toronto Blue Jays',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 1,
        awayRuns: 1,
        currentInning: 4,
        isTopHalf: true,
        outs: 1,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 30,
        data: snapshotData,
        timestamp: new Date(),
      };

      // Complex sequence: multiple innings, scoring, completion
      const subsequentEvents: DomainEvent[] = [
        new ScoreUpdated(gameId, 'AWAY', 2, { home: 1, away: 3 }),
        new InningAdvanced(gameId, 4, false), // Bottom 4th
        new ScoreUpdated(gameId, 'HOME', 4, { home: 5, away: 3 }),
        new InningAdvanced(gameId, 5, true), // Top 5th
        new InningAdvanced(gameId, 5, false), // Bottom 5th
        new InningAdvanced(gameId, 6, true), // Top 6th
        new ScoreUpdated(gameId, 'AWAY', 1, { home: 5, away: 4 }),
        new InningAdvanced(gameId, 6, false), // Bottom 6th
        new InningAdvanced(gameId, 7, true), // Top 7th
        new InningAdvanced(gameId, 7, false), // Bottom 7th
        new GameCompleted(gameId, 'REGULATION', { home: 5, away: 4 }, 7),
      ];

      const game = Game.fromSnapshot(snapshot, subsequentEvents);

      expect(game.status).toBe(GameStatus.COMPLETED);
      expect(game.score.getHomeRuns()).toBe(5);
      expect(game.score.getAwayRuns()).toBe(4);
      expect(game.currentInning).toBe(7);
      expect(game.isTopHalf).toBe(false);
      expect(game.outs).toBe(0);
      expect(game.getVersion()).toBe(41); // 30 + 11 subsequent events
    });
  });

  describe('Game.fromSnapshot() - Validation and Error Handling', () => {
    it('should throw error for null snapshot', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        Game.fromSnapshot(null as any, []);
      }).toThrow(DomainError);
    });

    it('should throw error for undefined snapshot', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        Game.fromSnapshot(undefined as any, []);
      }).toThrow(DomainError);
    });

    it('should throw error for snapshot with wrong aggregate type', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const invalidSnapshot = {
        aggregateId: gameId,
        aggregateType: 'TeamLineup' as const, // Wrong type
        version: 1,
        data: snapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(invalidSnapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for snapshot with mismatched aggregate ID', () => {
      const differentGameId = GameId.generate();
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const mismatchedSnapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: differentGameId, // Different ID than data.id
        aggregateType: 'Game',
        version: 1,
        data: snapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(mismatchedSnapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for snapshot with invalid version', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const invalidSnapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: -1, // Invalid negative version
        data: snapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(invalidSnapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for empty team names in snapshot data', () => {
      const invalidSnapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: '', // Empty home team name
        awayTeamName: 'Away Team',
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: invalidSnapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(snapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for identical team names in snapshot data', () => {
      const invalidSnapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Same Team',
        awayTeamName: 'Same Team', // Identical team names
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: invalidSnapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(snapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for invalid game state in snapshot data', () => {
      const invalidSnapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.NOT_STARTED,
        homeRuns: -1, // Invalid negative runs
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: invalidSnapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(snapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for invalid outs in snapshot data', () => {
      const invalidSnapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 2,
        awayRuns: 1,
        currentInning: 3,
        isTopHalf: true,
        outs: 3, // Invalid: > 2
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 15,
        data: invalidSnapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(snapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for invalid current inning in snapshot data', () => {
      const invalidSnapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 2,
        awayRuns: 1,
        currentInning: 0, // Invalid: < 1
        isTopHalf: true,
        outs: 1,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 15,
        data: invalidSnapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        Game.fromSnapshot(snapshot, []);
      }).toThrow(DomainError);
    });

    it('should throw error for invalid isTopHalf in snapshot data', () => {
      const invalidSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 2,
        awayRuns: 1,
        currentInning: 3,
        isTopHalf: 'not-a-boolean', // Invalid: not a boolean
        outs: 1,
      };

      const snapshot = {
        aggregateId: gameId,
        aggregateType: 'Game' as const,
        version: 15,
        data: invalidSnapshotData,
        timestamp: new Date(),
      };

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        Game.fromSnapshot(snapshot as any, []);
      }).toThrow(DomainError);
    });

    it('should handle null subsequent events gracefully', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.NOT_STARTED,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: snapshotData,
        timestamp: new Date(),
      };

      // Should treat null as empty array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const game = Game.fromSnapshot(snapshot, null as any);
      expect(game.getVersion()).toBe(1);
    });

    it('should throw error for subsequent events with wrong game ID', () => {
      const differentGameId = GameId.generate();
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 0,
        awayRuns: 0,
        currentInning: 1,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 5,
        data: snapshotData,
        timestamp: new Date(),
      };

      // Event with different game ID
      const subsequentEvents: DomainEvent[] = [
        new ScoreUpdated(differentGameId, 'HOME', 1, { home: 1, away: 0 }),
      ];

      expect(() => {
        Game.fromSnapshot(snapshot, subsequentEvents);
      }).toThrow(DomainError);
    });
  });

  describe('Game.fromSnapshot() - Consistency with fromEvents()', () => {
    it('should produce identical state to fromEvents() when snapshot represents all events', () => {
      // Create a game with full event history
      const allEvents: DomainEvent[] = [
        new GameCreated(gameId, 'Full History Tigers', 'Full History Lions'),
        new GameStarted(gameId),
        new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
        new InningAdvanced(gameId, 1, false),
        new ScoreUpdated(gameId, 'AWAY', 1, { home: 2, away: 1 }),
        new InningAdvanced(gameId, 2, true),
      ];

      const gameFromEvents = Game.fromEvents(allEvents);

      // Create snapshot representing the same final state
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Full History Tigers',
        awayTeamName: 'Full History Lions',
        status: gameFromEvents.status,
        homeRuns: gameFromEvents.score.getHomeRuns(),
        awayRuns: gameFromEvents.score.getAwayRuns(),
        currentInning: gameFromEvents.currentInning,
        isTopHalf: gameFromEvents.isTopHalf,
        outs: gameFromEvents.outs,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: allEvents.length,
        data: snapshotData,
        timestamp: new Date(),
      };

      const gameFromSnapshot = Game.fromSnapshot(snapshot, []);

      // Should be identical
      expect(gameFromSnapshot.id.equals(gameFromEvents.id)).toBe(true);
      expect(gameFromSnapshot.homeTeamName).toBe(gameFromEvents.homeTeamName);
      expect(gameFromSnapshot.awayTeamName).toBe(gameFromEvents.awayTeamName);
      expect(gameFromSnapshot.status).toBe(gameFromEvents.status);
      expect(gameFromSnapshot.score.getHomeRuns()).toBe(gameFromEvents.score.getHomeRuns());
      expect(gameFromSnapshot.score.getAwayRuns()).toBe(gameFromEvents.score.getAwayRuns());
      expect(gameFromSnapshot.currentInning).toBe(gameFromEvents.currentInning);
      expect(gameFromSnapshot.isTopHalf).toBe(gameFromEvents.isTopHalf);
      expect(gameFromSnapshot.outs).toBe(gameFromEvents.outs);
      expect(gameFromSnapshot.getVersion()).toBe(gameFromEvents.getVersion());
    });

    it('should produce identical state to fromEvents() when combining snapshot + subsequent events', () => {
      // Full event sequence
      const allEvents: DomainEvent[] = [
        new GameCreated(gameId, 'Consistency Test Home', 'Consistency Test Away'),
        new GameStarted(gameId),
        new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 }),
        new InningAdvanced(gameId, 1, false),
        new ScoreUpdated(gameId, 'AWAY', 2, { home: 1, away: 2 }),
        new InningAdvanced(gameId, 2, true),
        new ScoreUpdated(gameId, 'AWAY', 1, { home: 1, away: 3 }),
        new InningAdvanced(gameId, 2, false),
        new ScoreUpdated(gameId, 'HOME', 3, { home: 4, away: 3 }),
      ];

      const gameFromAllEvents = Game.fromEvents(allEvents);

      // Split events: first 5 events in snapshot, rest as subsequent
      const snapshotEvents = allEvents.slice(0, 5);
      const subsequentEvents = allEvents.slice(5);

      const gameFromSnapshotEvents = Game.fromEvents(snapshotEvents);

      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Consistency Test Home',
        awayTeamName: 'Consistency Test Away',
        status: gameFromSnapshotEvents.status,
        homeRuns: gameFromSnapshotEvents.score.getHomeRuns(),
        awayRuns: gameFromSnapshotEvents.score.getAwayRuns(),
        currentInning: gameFromSnapshotEvents.currentInning,
        isTopHalf: gameFromSnapshotEvents.isTopHalf,
        outs: gameFromSnapshotEvents.outs,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: snapshotEvents.length,
        data: snapshotData,
        timestamp: new Date(),
      };

      const gameFromSnapshotPlusEvents = Game.fromSnapshot(snapshot, subsequentEvents);

      // Results should be identical
      expect(gameFromSnapshotPlusEvents.id.equals(gameFromAllEvents.id)).toBe(true);
      expect(gameFromSnapshotPlusEvents.homeTeamName).toBe(gameFromAllEvents.homeTeamName);
      expect(gameFromSnapshotPlusEvents.awayTeamName).toBe(gameFromAllEvents.awayTeamName);
      expect(gameFromSnapshotPlusEvents.status).toBe(gameFromAllEvents.status);
      expect(gameFromSnapshotPlusEvents.score.getHomeRuns()).toBe(
        gameFromAllEvents.score.getHomeRuns()
      );
      expect(gameFromSnapshotPlusEvents.score.getAwayRuns()).toBe(
        gameFromAllEvents.score.getAwayRuns()
      );
      expect(gameFromSnapshotPlusEvents.currentInning).toBe(gameFromAllEvents.currentInning);
      expect(gameFromSnapshotPlusEvents.isTopHalf).toBe(gameFromAllEvents.isTopHalf);
      expect(gameFromSnapshotPlusEvents.outs).toBe(gameFromAllEvents.outs);
      expect(gameFromSnapshotPlusEvents.getVersion()).toBe(gameFromAllEvents.getVersion());
    });
  });

  describe('Game.fromSnapshot() - Uncommitted Events', () => {
    it('should have no uncommitted events after snapshot reconstruction', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Clean State Home',
        awayTeamName: 'Clean State Away',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 2,
        awayRuns: 1,
        currentInning: 3,
        isTopHalf: false,
        outs: 1,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 20,
        data: snapshotData,
        timestamp: new Date(),
      };

      const subsequentEvents: DomainEvent[] = [
        new ScoreUpdated(gameId, 'HOME', 1, { home: 3, away: 1 }),
        new InningAdvanced(gameId, 4, true),
      ];

      const game = Game.fromSnapshot(snapshot, subsequentEvents);

      // Should have no uncommitted events (all events were replayed, not newly generated)
      expect(game.getUncommittedEvents()).toHaveLength(0);
    });

    it('should generate new uncommitted events for operations after snapshot reconstruction', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'New Operations Home',
        awayTeamName: 'New Operations Away',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 1,
        awayRuns: 1,
        currentInning: 2,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 15,
        data: snapshotData,
        timestamp: new Date(),
      };

      const game = Game.fromSnapshot(snapshot, []);

      // Should have no uncommitted events initially
      expect(game.getUncommittedEvents()).toHaveLength(0);

      // Perform new operations
      game.addHomeRuns(2);
      game.advanceInning();

      // Should now have uncommitted events
      const uncommittedEvents = game.getUncommittedEvents();
      expect(uncommittedEvents).toHaveLength(2);
      expect(uncommittedEvents[0]?.type).toBe('ScoreUpdated');
      expect(uncommittedEvents[1]?.type).toBe('InningAdvanced');
    });
  });

  describe('Game.fromSnapshot() - Post-Reconstruction Operations', () => {
    it('should throw error for NaN runs during addHomeRuns', () => {
      const snapshotData: GameSnapshotData = {
        id: gameId.value,
        homeTeamName: 'Test Home',
        awayTeamName: 'Test Away',
        status: GameStatus.IN_PROGRESS,
        homeRuns: 1,
        awayRuns: 1,
        currentInning: 2,
        isTopHalf: true,
        outs: 0,
      };

      const snapshot: MockAggregateSnapshot<GameSnapshotData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 10,
        data: snapshotData,
        timestamp: new Date(),
      };

      const game = Game.fromSnapshot(snapshot, []);

      expect(() => {
        game.addHomeRuns(NaN);
      }).toThrow(DomainError);
    });
  });
});
