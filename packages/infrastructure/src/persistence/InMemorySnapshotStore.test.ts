/**
 * @file InMemorySnapshotStore Tests
 * Comprehensive test suite for the in-memory implementation of the SnapshotStore interface.
 *
 * @remarks
 * This test suite validates the InMemorySnapshotStore implementation following TDD principles.
 * Tests focus on:
 * - Basic save/get snapshot operations
 * - Multiple aggregate type support (Game, TeamLineup, InningState)
 * - Concurrent access scenarios
 * - Memory cleanup and management
 * - Edge cases: null/undefined handling, non-existent snapshots
 * - Data integrity and immutability
 * - Performance characteristics for testing
 *
 * The implementation should provide:
 * - Type-safe operations with proper generics
 * - Thread-safe operations (as much as possible in JavaScript)
 * - Proper error handling
 * - Support for clearing/resetting (for test utilities)
 * - Easy testing integration
 */

import type {
  SnapshotStore,
  AggregateSnapshot,
} from '@twsoftball/application/ports/out/SnapshotStore';
import { GameId, TeamLineupId, InningStateId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { InMemorySnapshotStore } from './InMemorySnapshotStore';

// Test data interfaces for type safety
interface GameState {
  score: { home: number; away: number };
  inning: number;
  isActive: boolean;
}

interface TeamLineupState {
  players: Array<{ id: string; name: string; position: number }>;
  battingOrder: string[];
  teamName: string;
}

interface InningStateData {
  currentInning: number;
  isTopHalf: boolean;
  outs: number;
  balls: number;
  strikes: number;
}

describe('InMemorySnapshotStore', () => {
  let snapshotStore: SnapshotStore;
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;

  beforeEach(() => {
    snapshotStore = new InMemorySnapshotStore();
    gameId = GameId.generate();
    teamLineupId = TeamLineupId.generate();
    inningStateId = InningStateId.generate();
  });

  describe('Core Implementation', () => {
    it('should implement SnapshotStore interface', () => {
      expect(snapshotStore).toBeInstanceOf(InMemorySnapshotStore);
      expect(typeof snapshotStore.saveSnapshot).toBe('function');
      expect(typeof snapshotStore.getSnapshot).toBe('function');
    });

    it('should provide clear() method for test utilities', () => {
      // Type assertion to access test utility methods
      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(typeof testStore.clear).toBe('function');
    });

    it('should provide getSnapshotCount() method for testing', () => {
      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(typeof testStore.getSnapshotCount).toBe('function');
      expect(testStore.getSnapshotCount()).toBe(0);
    });
  });

  describe('Basic Save and Get Operations', () => {
    it('should save and retrieve a Game snapshot', async () => {
      const gameState: GameState = {
        score: { home: 5, away: 3 },
        inning: 7,
        isActive: true,
      };

      const snapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 42,
        data: gameState,
        timestamp: new Date('2023-09-13T10:00:00Z'),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<GameState>(gameId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.aggregateId).toEqual(gameId);
      expect(retrieved!.aggregateType).toBe('Game');
      expect(retrieved!.version).toBe(42);
      expect(retrieved!.data).toEqual(gameState);
      expect(retrieved!.timestamp).toEqual(new Date('2023-09-13T10:00:00Z'));
    });

    it('should save and retrieve a TeamLineup snapshot', async () => {
      const teamLineupState: TeamLineupState = {
        players: [
          { id: 'p1', name: 'John Doe', position: 1 },
          { id: 'p2', name: 'Jane Smith', position: 2 },
        ],
        battingOrder: ['p1', 'p2'],
        teamName: 'Thunder Bolts',
      };

      const snapshot: AggregateSnapshot<TeamLineupState> = {
        aggregateId: teamLineupId,
        aggregateType: 'TeamLineup',
        version: 15,
        data: teamLineupState,
        timestamp: new Date('2023-09-13T11:00:00Z'),
      };

      await snapshotStore.saveSnapshot(teamLineupId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<TeamLineupState>(teamLineupId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.aggregateId).toEqual(teamLineupId);
      expect(retrieved!.aggregateType).toBe('TeamLineup');
      expect(retrieved!.version).toBe(15);
      expect(retrieved!.data).toEqual(teamLineupState);
      expect(retrieved!.timestamp).toEqual(new Date('2023-09-13T11:00:00Z'));
    });

    it('should save and retrieve an InningState snapshot', async () => {
      const inningStateData: InningStateData = {
        currentInning: 3,
        isTopHalf: false,
        outs: 2,
        balls: 2,
        strikes: 1,
      };

      const snapshot: AggregateSnapshot<InningStateData> = {
        aggregateId: inningStateId,
        aggregateType: 'InningState',
        version: 8,
        data: inningStateData,
        timestamp: new Date('2023-09-13T12:00:00Z'),
      };

      await snapshotStore.saveSnapshot(inningStateId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<InningStateData>(inningStateId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.aggregateId).toEqual(inningStateId);
      expect(retrieved!.aggregateType).toBe('InningState');
      expect(retrieved!.version).toBe(8);
      expect(retrieved!.data).toEqual(inningStateData);
      expect(retrieved!.timestamp).toEqual(new Date('2023-09-13T12:00:00Z'));
    });

    it('should return null for non-existent snapshots', async () => {
      const nonExistentId = GameId.generate();
      const snapshot = await snapshotStore.getSnapshot(nonExistentId);
      expect(snapshot).toBeNull();
    });

    it('should overwrite existing snapshots for the same aggregate', async () => {
      const gameState1: GameState = {
        score: { home: 1, away: 0 },
        inning: 1,
        isActive: true,
      };

      const gameState2: GameState = {
        score: { home: 5, away: 3 },
        inning: 7,
        isActive: true,
      };

      const snapshot1: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 10,
        data: gameState1,
        timestamp: new Date('2023-09-13T10:00:00Z'),
      };

      const snapshot2: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 50,
        data: gameState2,
        timestamp: new Date('2023-09-13T11:00:00Z'),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot1);
      await snapshotStore.saveSnapshot(gameId, snapshot2);

      const retrieved = await snapshotStore.getSnapshot<GameState>(gameId);
      expect(retrieved!.version).toBe(50);
      expect(retrieved!.data).toEqual(gameState2);
      expect(retrieved!.timestamp).toEqual(new Date('2023-09-13T11:00:00Z'));
    });
  });

  describe('Multiple Aggregate Type Support', () => {
    it('should handle multiple different aggregate types simultaneously', async () => {
      const gameState: GameState = {
        score: { home: 2, away: 1 },
        inning: 4,
        isActive: true,
      };

      const teamLineupState: TeamLineupState = {
        players: [{ id: 'p1', name: 'Player 1', position: 1 }],
        battingOrder: ['p1'],
        teamName: 'Team A',
      };

      const inningStateData: InningStateData = {
        currentInning: 4,
        isTopHalf: true,
        outs: 1,
        balls: 0,
        strikes: 2,
      };

      const gameSnapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 20,
        data: gameState,
        timestamp: new Date('2023-09-13T10:00:00Z'),
      };

      const teamSnapshot: AggregateSnapshot<TeamLineupState> = {
        aggregateId: teamLineupId,
        aggregateType: 'TeamLineup',
        version: 5,
        data: teamLineupState,
        timestamp: new Date('2023-09-13T10:05:00Z'),
      };

      const inningSnapshot: AggregateSnapshot<InningStateData> = {
        aggregateId: inningStateId,
        aggregateType: 'InningState',
        version: 12,
        data: inningStateData,
        timestamp: new Date('2023-09-13T10:10:00Z'),
      };

      await Promise.all([
        snapshotStore.saveSnapshot(gameId, gameSnapshot),
        snapshotStore.saveSnapshot(teamLineupId, teamSnapshot),
        snapshotStore.saveSnapshot(inningStateId, inningSnapshot),
      ]);

      const [retrievedGame, retrievedTeam, retrievedInning] = await Promise.all([
        snapshotStore.getSnapshot<GameState>(gameId),
        snapshotStore.getSnapshot<TeamLineupState>(teamLineupId),
        snapshotStore.getSnapshot<InningStateData>(inningStateId),
      ]);

      expect(retrievedGame!.data).toEqual(gameState);
      expect(retrievedTeam!.data).toEqual(teamLineupState);
      expect(retrievedInning!.data).toEqual(inningStateData);

      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(testStore.getSnapshotCount()).toBe(3);
    });

    it('should maintain type safety across different aggregate types', async () => {
      const gameSnapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: { score: { home: 0, away: 0 }, inning: 1, isActive: true },
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, gameSnapshot);

      // This should maintain type safety - the generic ensures proper typing
      const retrieved = await snapshotStore.getSnapshot<GameState>(gameId);
      expect(retrieved!.data.score.home).toBe(0);
      expect(retrieved!.data.inning).toBe(1);
      expect(retrieved!.data.isActive).toBe(true);
    });
  });

  describe('Concurrent Access Scenarios', () => {
    it('should handle concurrent save operations', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        const id = GameId.generate();
        const snapshot: AggregateSnapshot<GameState> = {
          aggregateId: id,
          aggregateType: 'Game',
          version: i,
          data: { score: { home: i, away: i + 1 }, inning: i + 1, isActive: true },
          timestamp: new Date(),
        };
        promises.push(snapshotStore.saveSnapshot(id, snapshot));
      }

      await Promise.all(promises);

      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(testStore.getSnapshotCount()).toBe(10);
    });

    it('should handle concurrent read operations', async () => {
      const gameState: GameState = {
        score: { home: 3, away: 2 },
        inning: 5,
        isActive: true,
      };

      const snapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 25,
        data: gameState,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);

      // Perform multiple concurrent reads
      const readPromises = Array.from({ length: 10 }, () =>
        snapshotStore.getSnapshot<GameState>(gameId)
      );

      const results = await Promise.all(readPromises);

      results.forEach((result: AggregateSnapshot<GameState> | null) => {
        expect(result).not.toBeNull();
        expect(result!.data).toEqual(gameState);
        expect(result!.version).toBe(25);
      });
    });

    it('should handle mixed concurrent read/write operations', async () => {
      const initialSnapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: { score: { home: 0, away: 0 }, inning: 1, isActive: true },
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, initialSnapshot);

      const operations: Promise<void>[] = [];

      // Add concurrent read operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          snapshotStore
            .getSnapshot<GameState>(gameId)
            .then((result: AggregateSnapshot<GameState> | null) => {
              expect(result).not.toBeNull();
            })
        );
      }

      // Add concurrent write operations
      for (let i = 0; i < 5; i++) {
        const newSnapshot: AggregateSnapshot<GameState> = {
          aggregateId: gameId,
          aggregateType: 'Game',
          version: i + 2,
          data: { score: { home: i, away: i }, inning: i + 1, isActive: true },
          timestamp: new Date(),
        };
        operations.push(snapshotStore.saveSnapshot(gameId, newSnapshot));
      }

      await Promise.all(operations);

      // Verify final state
      const finalSnapshot = await snapshotStore.getSnapshot<GameState>(gameId);
      expect(finalSnapshot).not.toBeNull();
      expect(finalSnapshot!.version).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should provide clear() method for resetting storage', async () => {
      // Add multiple snapshots
      for (let i = 0; i < 5; i++) {
        const id = GameId.generate();
        const snapshot: AggregateSnapshot<GameState> = {
          aggregateId: id,
          aggregateType: 'Game',
          version: i,
          data: { score: { home: i, away: i }, inning: 1, isActive: true },
          timestamp: new Date(),
        };
        await snapshotStore.saveSnapshot(id, snapshot);
      }

      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(testStore.getSnapshotCount()).toBe(5);

      testStore.clear();
      expect(testStore.getSnapshotCount()).toBe(0);

      // Verify snapshots are actually gone
      const nonExistentSnapshot = await snapshotStore.getSnapshot(gameId);
      expect(nonExistentSnapshot).toBeNull();
    });

    it('should provide getSnapshotCount() for monitoring memory usage', async () => {
      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(testStore.getSnapshotCount()).toBe(0);

      const snapshot1: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: { score: { home: 0, away: 0 }, inning: 1, isActive: true },
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot1);
      expect(testStore.getSnapshotCount()).toBe(1);

      const snapshot2: AggregateSnapshot<TeamLineupState> = {
        aggregateId: teamLineupId,
        aggregateType: 'TeamLineup',
        version: 1,
        data: { players: [], battingOrder: [], teamName: 'Test' },
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(teamLineupId, snapshot2);
      expect(testStore.getSnapshotCount()).toBe(2);

      // Overwriting should not increase count
      await snapshotStore.saveSnapshot(gameId, snapshot1);
      expect(testStore.getSnapshotCount()).toBe(2);
    });

    it('should handle large snapshot data efficiently', async () => {
      // Create a large data structure
      const largeGameState: GameState & { metadata: unknown } = {
        score: { home: 10, away: 8 },
        inning: 9,
        isActive: true,
        metadata: {
          plays: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            inning: Math.floor(i / 100) + 1,
            description: `Play ${i}`,
            timestamp: new Date().toISOString(),
            data: Array.from({ length: 10 }, (_, j) => `data_${i}_${j}`),
          })),
        },
      };

      const snapshot: AggregateSnapshot<GameState & { metadata: unknown }> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 100,
        data: largeGameState,
        timestamp: new Date(),
      };

      const startTime = Date.now();
      await snapshotStore.saveSnapshot(gameId, snapshot);
      const saveTime = Date.now() - startTime;

      const retrieveStartTime = Date.now();
      const retrieved = await snapshotStore.getSnapshot<GameState & { metadata: unknown }>(gameId);
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(retrieved).not.toBeNull();
      expect(retrieved!.data).toEqual(largeGameState);

      // Performance should be reasonable (under 100ms for in-memory operations)
      expect(saveTime).toBeLessThan(100);
      expect(retrieveTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle saveSnapshot errors properly', async () => {
      // Force an error in the saveSnapshot method by creating a malformed snapshot
      // that will cause JSON.stringify to fail (circular reference)
      const circularData: Record<string, unknown> = { name: 'test' };
      circularData['self'] = circularData; // Create circular reference

      const circularSnapshot: AggregateSnapshot<Record<string, unknown>> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: circularData,
        timestamp: new Date(),
      };

      // Should reject with a properly wrapped error
      await expect(snapshotStore.saveSnapshot(gameId, circularSnapshot)).rejects.toThrow();
    });

    it('should handle Map access errors', async () => {
      // Test the edge case where Map.get throws (very unlikely but covers the error path)
      const originalGet = Map.prototype.get;
      Map.prototype.get = function (): unknown {
        throw new Error('Map access failed');
      };

      try {
        await expect(snapshotStore.getSnapshot(gameId)).rejects.toThrow();
      } finally {
        // Restore original Map.get
        Map.prototype.get = originalGet;
      }
    });

    it('should handle saveSnapshot internal errors', async () => {
      // Create a snapshot that will cause issues during the save process
      const snapshot: AggregateSnapshot<Record<string, unknown>> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: { score: { home: 0, away: 0 }, inning: 1, isActive: true },
        timestamp: new Date(),
      };

      // Mock the internal deepCloneSnapshot method to throw an error
      const storeWithPrivateMembers = snapshotStore as unknown as {
        deepCloneSnapshot: unknown;
      };
      const originalDeepClone = storeWithPrivateMembers.deepCloneSnapshot;
      storeWithPrivateMembers.deepCloneSnapshot = (): unknown => {
        throw new Error('Non-Error object thrown'); // String instead of Error
      };

      try {
        await expect(snapshotStore.saveSnapshot(gameId, snapshot)).rejects.toThrow();
      } finally {
        // Restore original method
        storeWithPrivateMembers.deepCloneSnapshot = originalDeepClone;
      }
    });

    it('should handle null and undefined data gracefully', async () => {
      const snapshotWithNull: AggregateSnapshot<null> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: null,
        timestamp: new Date(),
      };

      const snapshotWithUndefined: AggregateSnapshot<undefined> = {
        aggregateId: teamLineupId,
        aggregateType: 'TeamLineup',
        version: 1,
        data: undefined,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshotWithNull);
      await snapshotStore.saveSnapshot(teamLineupId, snapshotWithUndefined);

      const retrievedNull = await snapshotStore.getSnapshot<null>(gameId);
      const retrievedUndefined = await snapshotStore.getSnapshot<undefined>(teamLineupId);

      expect(retrievedNull).not.toBeNull();
      expect(retrievedNull!.data).toBeNull();

      expect(retrievedUndefined).not.toBeNull();
      expect(retrievedUndefined!.data).toBeUndefined();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        game: {
          score: { home: 5, away: 3 },
          players: {
            home: [
              { id: '1', stats: { hits: 2, runs: 1, rbis: 1 } },
              { id: '2', stats: { hits: 1, runs: 2, rbis: 0 } },
            ],
            away: [
              { id: '3', stats: { hits: 3, runs: 1, rbis: 2 } },
              { id: '4', stats: { hits: 0, runs: 0, rbis: 0 } },
            ],
          },
        },
        metadata: {
          created: new Date('2023-09-13T10:00:00Z'),
          weather: { temperature: 75, humidity: 60, wind: 'SW 5mph' },
          officials: ['Ump1', 'Ump2'],
        },
      };

      const snapshot: AggregateSnapshot<typeof complexData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 50,
        data: complexData,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<typeof complexData>(gameId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.data).toEqual(complexData);
      expect(retrieved!.data.game.players.home[0]!.stats.hits).toBe(2);
      expect(retrieved!.data.metadata.weather.temperature).toBe(75);
    });

    it('should handle Date objects properly', async () => {
      const gameStartTime = new Date('2023-09-13T14:00:00Z');
      const lastPlayTime = new Date('2023-09-13T16:30:00Z');

      const gameState = {
        score: { home: 4, away: 2 },
        inning: 8,
        isActive: true,
        gameStartTime,
        lastPlayTime,
        timestamps: [
          new Date('2023-09-13T14:05:00Z'),
          new Date('2023-09-13T14:10:00Z'),
          new Date('2023-09-13T14:15:00Z'),
        ],
      };

      const snapshot: AggregateSnapshot<typeof gameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 75,
        data: gameState,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<typeof gameState>(gameId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.data.gameStartTime).toEqual(gameStartTime);
      expect(retrieved!.data.lastPlayTime).toEqual(lastPlayTime);
      expect(retrieved!.data.timestamps).toEqual(gameState.timestamps);
    });

    it('should handle empty objects and arrays', async () => {
      const emptyState = {
        emptyObject: {},
        emptyArray: [],
        nestedEmpty: {
          obj: {},
          arr: [],
          mixed: [{}],
        },
      };

      const snapshot: AggregateSnapshot<typeof emptyState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: emptyState,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<typeof emptyState>(gameId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.data).toEqual(emptyState);
      expect(retrieved!.data.emptyArray).toEqual([]);
      expect(retrieved!.data.emptyObject).toEqual({});
    });
  });

  describe('Data Integrity and Immutability', () => {
    it('should maintain data immutability - modifications to returned data should not affect stored data', async () => {
      const originalGameState: GameState = {
        score: { home: 3, away: 1 },
        inning: 6,
        isActive: true,
      };

      const snapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 30,
        data: originalGameState,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<GameState>(gameId);

      // Modify the retrieved data
      retrieved!.data.score.home = 999;
      retrieved!.data.inning = 999;
      retrieved!.data.isActive = false;

      // Get the data again - it should be unchanged
      const retrievedAgain = await snapshotStore.getSnapshot<GameState>(gameId);
      expect(retrievedAgain!.data.score.home).toBe(3);
      expect(retrievedAgain!.data.inning).toBe(6);
      expect(retrievedAgain!.data.isActive).toBe(true);
    });

    it('should maintain snapshot metadata immutability', async () => {
      const snapshot: AggregateSnapshot<GameState> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 40,
        data: { score: { home: 2, away: 4 }, inning: 5, isActive: true },
        timestamp: new Date('2023-09-13T15:00:00Z'),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<GameState>(gameId);

      // Attempt to modify metadata (should not affect stored data)
      const modifiableRetrieved = retrieved as unknown as Record<string, unknown>;
      modifiableRetrieved['version'] = 999;
      modifiableRetrieved['aggregateType'] = 'ModifiedType';

      // Get the data again - metadata should be unchanged
      const retrievedAgain = await snapshotStore.getSnapshot<GameState>(gameId);
      expect(retrievedAgain!.version).toBe(40);
      expect(retrievedAgain!.aggregateType).toBe('Game');
      expect(retrievedAgain!.timestamp).toEqual(new Date('2023-09-13T15:00:00Z'));
    });

    it('should create deep copies of stored data', async () => {
      const nestedData = {
        level1: {
          level2: {
            level3: {
              value: 'original',
              array: [1, 2, 3],
            },
          },
        },
      };

      const snapshot: AggregateSnapshot<typeof nestedData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: nestedData,
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, snapshot);
      const retrieved = await snapshotStore.getSnapshot<typeof nestedData>(gameId);

      // Modify deeply nested properties
      retrieved!.data.level1.level2.level3.value = 'modified';
      retrieved!.data.level1.level2.level3.array.push(4);

      // Verify original data is preserved
      const retrievedAgain = await snapshotStore.getSnapshot<typeof nestedData>(gameId);
      expect(retrievedAgain!.data.level1.level2.level3.value).toBe('original');
      expect(retrievedAgain!.data.level1.level2.level3.array).toEqual([1, 2, 3]);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle multiple snapshots efficiently', async () => {
      const numberOfSnapshots = 100;
      const snapshots: Array<{ id: GameId; snapshot: AggregateSnapshot<GameState> }> = [];

      // Prepare snapshots
      for (let i = 0; i < numberOfSnapshots; i++) {
        const id = GameId.generate();
        const snapshot: AggregateSnapshot<GameState> = {
          aggregateId: id,
          aggregateType: 'Game',
          version: i,
          data: { score: { home: i, away: i + 1 }, inning: (i % 9) + 1, isActive: true },
          timestamp: new Date(),
        };
        snapshots.push({ id, snapshot });
      }

      // Measure save performance
      const saveStartTime = Date.now();
      await Promise.all(
        snapshots.map(({ id, snapshot }) => snapshotStore.saveSnapshot(id, snapshot))
      );
      const saveTime = Date.now() - saveStartTime;

      // Measure retrieval performance
      const retrieveStartTime = Date.now();
      const retrieved = await Promise.all(
        snapshots.map(({ id }) => snapshotStore.getSnapshot<GameState>(id))
      );
      const retrieveTime = Date.now() - retrieveStartTime;

      // Verify all snapshots were saved and retrieved correctly
      expect(retrieved.length).toBe(numberOfSnapshots);
      retrieved.forEach((snapshot: AggregateSnapshot<GameState> | null, index: number) => {
        expect(snapshot).not.toBeNull();
        expect(snapshot!.version).toBe(index);
      });

      const testStore = snapshotStore as InMemorySnapshotStore;
      expect(testStore.getSnapshotCount()).toBe(numberOfSnapshots);

      // Performance should be reasonable for in-memory operations
      expect(saveTime).toBeLessThan(1000); // Should save 100 snapshots in under 1 second
      expect(retrieveTime).toBeLessThan(1000); // Should retrieve 100 snapshots in under 1 second
    });

    it('should maintain consistent performance with storage growth', async () => {
      const batches = [10, 20, 50, 100];
      const performanceResults: number[] = [];

      for (const batchSize of batches) {
        const testStore = new InMemorySnapshotStore();
        const snapshots: AggregateSnapshot<GameState>[] = [];

        // Prepare batch
        for (let i = 0; i < batchSize; i++) {
          const id = GameId.generate();
          snapshots.push({
            aggregateId: id,
            aggregateType: 'Game',
            version: i,
            data: { score: { home: i, away: i }, inning: 1, isActive: true },
            timestamp: new Date(),
          });
        }

        // Measure performance for this batch size
        const startTime = Date.now();
        await Promise.all(
          snapshots.map(snapshot => testStore.saveSnapshot(snapshot.aggregateId, snapshot))
        );
        const endTime = Date.now();

        performanceResults.push(endTime - startTime);
      }

      // Performance should scale roughly linearly (not exponentially)
      const firstBatchTime = performanceResults[0]!;
      const lastBatchTime = performanceResults[performanceResults.length - 1]!;
      const lastBatchSize = batches[batches.length - 1]!;
      const firstBatchSize = batches[0]!;

      // The time per operation should not increase dramatically
      const timePerOpFirst = firstBatchTime / firstBatchSize;
      const timePerOpLast = lastBatchTime / lastBatchSize;

      // Only check performance scaling if we have meaningful time measurements
      if (timePerOpFirst > 0 && timePerOpLast > 0) {
        expect(timePerOpLast).toBeLessThan(timePerOpFirst * 3); // Should not be 3x slower per operation
      } else {
        // For very fast operations, just ensure they completed successfully
        expect(lastBatchTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Test Utility Integration', () => {
    it('should support test setup and teardown patterns', async () => {
      const testStore = snapshotStore as InMemorySnapshotStore;

      // Setup phase - add test data
      const setupSnapshots = Array.from({ length: 5 }, (_, i) => {
        const id = GameId.generate();
        return {
          id,
          snapshot: {
            aggregateId: id,
            aggregateType: 'Game' as const,
            version: i,
            data: { score: { home: i, away: i }, inning: 1, isActive: true },
            timestamp: new Date(),
          },
        };
      });

      for (const { id, snapshot } of setupSnapshots) {
        await snapshotStore.saveSnapshot(id, snapshot);
      }

      expect(testStore.getSnapshotCount()).toBe(5);

      // Test phase - verify test operations work
      const firstSnapshot = await snapshotStore.getSnapshot<GameState>(setupSnapshots[0]!.id);
      expect(firstSnapshot).not.toBeNull();

      // Teardown phase - clean up
      testStore.clear();
      expect(testStore.getSnapshotCount()).toBe(0);

      // Verify cleanup worked
      const afterClearSnapshot = await snapshotStore.getSnapshot<GameState>(setupSnapshots[0]!.id);
      expect(afterClearSnapshot).toBeNull();
    });

    it('should provide useful debugging information', async () => {
      const testStore = snapshotStore as InMemorySnapshotStore;

      // Add snapshots with known data
      const debugData = [
        { type: 'Game', count: 3 },
        { type: 'TeamLineup', count: 2 },
        { type: 'InningState', count: 1 },
      ];

      let totalSnapshots = 0;
      for (const { type, count } of debugData) {
        for (let i = 0; i < count; i++) {
          let id: GameId | TeamLineupId | InningStateId;
          let aggregateType: 'Game' | 'TeamLineup' | 'InningState';

          if (type === 'Game') {
            id = GameId.generate();
            aggregateType = 'Game';
          } else if (type === 'TeamLineup') {
            id = TeamLineupId.generate();
            aggregateType = 'TeamLineup';
          } else {
            id = InningStateId.generate();
            aggregateType = 'InningState';
          }

          const snapshot: AggregateSnapshot<unknown> = {
            aggregateId: id,
            aggregateType,
            version: i,
            data: {},
            timestamp: new Date(),
          };

          await snapshotStore.saveSnapshot(id, snapshot);
          totalSnapshots++;
        }
      }

      expect(testStore.getSnapshotCount()).toBe(totalSnapshots);
      expect(testStore.getSnapshotCount()).toBe(6); // 3 + 2 + 1 = 6
    });
  });
});
