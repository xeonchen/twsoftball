/**
 * @file SnapshotStore Tests
 * Comprehensive test suite for SnapshotStore interface and AggregateSnapshot types.
 *
 * @remarks
 * This test file validates the snapshot store interface contract and ensures
 * type safety for all aggregate types. Tests are written before implementation
 * following TDD principles.
 *
 * Test coverage includes:
 * - Interface contract validation
 * - AggregateSnapshot structure validation
 * - Type safety for Game, TeamLineup, and InningState aggregates
 * - Metadata completeness requirements
 * - Serialization/deserialization compatibility
 * - Error handling and edge cases
 *
 * @example
 * ```typescript
 * // Test validates proper snapshot structure
 * const snapshot: AggregateSnapshot<Game> = {
 *   aggregateId: gameId,
 *   aggregateType: 'Game',
 *   version: 42,
 *   data: serializedGameData,
 *   timestamp: new Date()
 * };
 * ```
 */

import { GameId, TeamLineupId, InningStateId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import type { SnapshotStore, AggregateSnapshot } from './SnapshotStore.js';

// Mock implementations for testing interface contracts
class MockSnapshotStore implements SnapshotStore {
  private readonly snapshots: Map<string, AggregateSnapshot<unknown>> = new Map();

  saveSnapshot<T>(
    aggregateId: GameId | TeamLineupId | InningStateId,
    snapshot: AggregateSnapshot<T>
  ): Promise<void> {
    this.snapshots.set(aggregateId.value, snapshot);
    return Promise.resolve();
  }

  getSnapshot<T>(
    aggregateId: GameId | TeamLineupId | InningStateId
  ): Promise<AggregateSnapshot<T> | null> {
    const snapshot = this.snapshots.get(aggregateId.value) as AggregateSnapshot<T> | undefined;
    return Promise.resolve(snapshot || null);
  }

  // Testing utility methods
  clear(): void {
    this.snapshots.clear();
  }

  getSnapshotCount(): number {
    return this.snapshots.size;
  }
}

// Test data factories for different aggregate types
const createGameSnapshot = (gameId: GameId, version: number = 1): AggregateSnapshot<unknown> => ({
  aggregateId: gameId,
  aggregateType: 'Game',
  version,
  data: {
    gameId: gameId.value,
    homeTeamName: 'Red Sox',
    awayTeamName: 'Yankees',
    status: 'IN_PROGRESS',
    inning: 3,
    outs: 2,
    score: { home: 5, away: 3 },
    bases: { first: null, second: 'player-1', third: null },
  },
  timestamp: new Date('2024-01-15T14:30:00Z'),
});

const createTeamLineupSnapshot = (
  lineupId: TeamLineupId,
  version: number = 1
): AggregateSnapshot<unknown> => ({
  aggregateId: lineupId,
  aggregateType: 'TeamLineup',
  version,
  data: {
    lineupId: lineupId.value,
    gameId: 'game-123',
    teamSide: 'HOME',
    battingOrder: ['player-1', 'player-2', 'player-3'],
    positions: {
      'player-1': 'FIRST_BASE',
      'player-2': 'PITCHER',
      'player-3': 'CATCHER',
    },
  },
  timestamp: new Date('2024-01-15T14:30:00Z'),
});

const createInningStateSnapshot = (
  inningId: InningStateId,
  version: number = 1
): AggregateSnapshot<unknown> => ({
  aggregateId: inningId,
  aggregateType: 'InningState',
  version,
  data: {
    inningId: inningId.value,
    gameId: 'game-123',
    inningNumber: 3,
    isTopHalf: false,
    outs: 2,
    currentBatterIndex: 4,
    atBatHistory: ['single', 'out', 'double'],
  },
  timestamp: new Date('2024-01-15T14:30:00Z'),
});

describe('SnapshotStore Interface Contract', () => {
  let snapshotStore: MockSnapshotStore;
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;

  beforeEach(() => {
    snapshotStore = new MockSnapshotStore();
    gameId = new GameId('game-123');
    teamLineupId = new TeamLineupId('lineup-456');
    inningStateId = new InningStateId('inning-789');
  });

  describe('saveSnapshot method', () => {
    it('should save Game aggregate snapshot successfully', async () => {
      const snapshot = createGameSnapshot(gameId, 42);

      await expect(snapshotStore.saveSnapshot(gameId, snapshot)).resolves.toBeUndefined();

      expect(snapshotStore.getSnapshotCount()).toBe(1);
    });

    it('should save TeamLineup aggregate snapshot successfully', async () => {
      const snapshot = createTeamLineupSnapshot(teamLineupId, 15);

      await expect(snapshotStore.saveSnapshot(teamLineupId, snapshot)).resolves.toBeUndefined();

      expect(snapshotStore.getSnapshotCount()).toBe(1);
    });

    it('should save InningState aggregate snapshot successfully', async () => {
      const snapshot = createInningStateSnapshot(inningStateId, 8);

      await expect(snapshotStore.saveSnapshot(inningStateId, snapshot)).resolves.toBeUndefined();

      expect(snapshotStore.getSnapshotCount()).toBe(1);
    });

    it('should overwrite existing snapshot for same aggregate ID', async () => {
      const firstSnapshot = createGameSnapshot(gameId, 10);
      const secondSnapshot = createGameSnapshot(gameId, 20);

      await snapshotStore.saveSnapshot(gameId, firstSnapshot);
      await snapshotStore.saveSnapshot(gameId, secondSnapshot);

      expect(snapshotStore.getSnapshotCount()).toBe(1);

      const retrieved = await snapshotStore.getSnapshot(gameId);
      expect(retrieved?.version).toBe(20);
    });

    it('should handle multiple snapshots for different aggregates', async () => {
      const gameSnapshot = createGameSnapshot(gameId);
      const lineupSnapshot = createTeamLineupSnapshot(teamLineupId);
      const inningSnapshot = createInningStateSnapshot(inningStateId);

      await snapshotStore.saveSnapshot(gameId, gameSnapshot);
      await snapshotStore.saveSnapshot(teamLineupId, lineupSnapshot);
      await snapshotStore.saveSnapshot(inningStateId, inningSnapshot);

      expect(snapshotStore.getSnapshotCount()).toBe(3);
    });
  });

  describe('getSnapshot method', () => {
    it('should retrieve saved Game snapshot correctly', async () => {
      const originalSnapshot = createGameSnapshot(gameId, 42);
      await snapshotStore.saveSnapshot(gameId, originalSnapshot);

      const retrieved = await snapshotStore.getSnapshot(gameId);

      expect(retrieved).toEqual(originalSnapshot);
      expect(retrieved?.aggregateType).toBe('Game');
      expect(retrieved?.version).toBe(42);
    });

    it('should retrieve saved TeamLineup snapshot correctly', async () => {
      const originalSnapshot = createTeamLineupSnapshot(teamLineupId, 15);
      await snapshotStore.saveSnapshot(teamLineupId, originalSnapshot);

      const retrieved = await snapshotStore.getSnapshot(teamLineupId);

      expect(retrieved).toEqual(originalSnapshot);
      expect(retrieved?.aggregateType).toBe('TeamLineup');
      expect(retrieved?.version).toBe(15);
    });

    it('should retrieve saved InningState snapshot correctly', async () => {
      const originalSnapshot = createInningStateSnapshot(inningStateId, 8);
      await snapshotStore.saveSnapshot(inningStateId, originalSnapshot);

      const retrieved = await snapshotStore.getSnapshot(inningStateId);

      expect(retrieved).toEqual(originalSnapshot);
      expect(retrieved?.aggregateType).toBe('InningState');
      expect(retrieved?.version).toBe(8);
    });

    it('should return null for non-existent snapshot', async () => {
      const nonExistentId = new GameId('non-existent');

      const result = await snapshotStore.getSnapshot(nonExistentId);

      expect(result).toBeNull();
    });

    it('should return null for empty snapshot store', async () => {
      const result = await snapshotStore.getSnapshot(gameId);

      expect(result).toBeNull();
    });

    it('should distinguish between different aggregate IDs', async () => {
      const gameSnapshot = createGameSnapshot(gameId);
      const differentGameId = new GameId('different-game');

      await snapshotStore.saveSnapshot(gameId, gameSnapshot);

      const retrieved = await snapshotStore.getSnapshot(differentGameId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Type safety and generic constraints', () => {
    it('should maintain type safety with typed snapshots', async () => {
      // This test validates TypeScript compilation and type constraints
      interface GameData {
        gameId: string;
        status: string;
        score: { home: number; away: number };
      }

      const typedSnapshot: AggregateSnapshot<GameData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: {
          gameId: 'game-123',
          status: 'IN_PROGRESS',
          score: { home: 3, away: 2 },
        },
        timestamp: new Date(),
      };

      await snapshotStore.saveSnapshot(gameId, typedSnapshot);
      const retrieved = await snapshotStore.getSnapshot<GameData>(gameId);

      expect(retrieved?.data.gameId).toBe('game-123');
      expect(retrieved?.data.score.home).toBe(3);
    });

    it('should support all three aggregate ID types in methods', async () => {
      // Validates that all three ID types are accepted by interface methods
      const gameSnapshot = createGameSnapshot(gameId);
      const lineupSnapshot = createTeamLineupSnapshot(teamLineupId);
      const inningSnapshot = createInningStateSnapshot(inningStateId);

      // Should compile without type errors
      await snapshotStore.saveSnapshot(gameId, gameSnapshot);
      await snapshotStore.saveSnapshot(teamLineupId, lineupSnapshot);
      await snapshotStore.saveSnapshot(inningStateId, inningSnapshot);

      await snapshotStore.getSnapshot(gameId);
      await snapshotStore.getSnapshot(teamLineupId);
      await snapshotStore.getSnapshot(inningStateId);

      // All operations should succeed
      expect(snapshotStore.getSnapshotCount()).toBe(3);
    });
  });
});

describe('AggregateSnapshot Structure Validation', () => {
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;

  beforeEach(() => {
    gameId = new GameId('game-123');
    teamLineupId = new TeamLineupId('lineup-456');
    inningStateId = new InningStateId('inning-789');
  });

  describe('Required properties validation', () => {
    it('should have all required properties for Game aggregate', () => {
      const snapshot = createGameSnapshot(gameId, 42);

      expect(snapshot).toHaveProperty('aggregateId');
      expect(snapshot).toHaveProperty('aggregateType');
      expect(snapshot).toHaveProperty('version');
      expect(snapshot).toHaveProperty('data');
      expect(snapshot).toHaveProperty('timestamp');

      expect(snapshot.aggregateId).toBe(gameId);
      expect(snapshot.aggregateType).toBe('Game');
      expect(snapshot.version).toBe(42);
      expect(snapshot.data).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should have all required properties for TeamLineup aggregate', () => {
      const snapshot = createTeamLineupSnapshot(teamLineupId, 15);

      expect(snapshot).toHaveProperty('aggregateId');
      expect(snapshot).toHaveProperty('aggregateType');
      expect(snapshot).toHaveProperty('version');
      expect(snapshot).toHaveProperty('data');
      expect(snapshot).toHaveProperty('timestamp');

      expect(snapshot.aggregateId).toBe(teamLineupId);
      expect(snapshot.aggregateType).toBe('TeamLineup');
      expect(snapshot.version).toBe(15);
      expect(snapshot.data).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should have all required properties for InningState aggregate', () => {
      const snapshot = createInningStateSnapshot(inningStateId, 8);

      expect(snapshot).toHaveProperty('aggregateId');
      expect(snapshot).toHaveProperty('aggregateType');
      expect(snapshot).toHaveProperty('version');
      expect(snapshot).toHaveProperty('data');
      expect(snapshot).toHaveProperty('timestamp');

      expect(snapshot.aggregateId).toBe(inningStateId);
      expect(snapshot.aggregateType).toBe('InningState');
      expect(snapshot.version).toBe(8);
      expect(snapshot.data).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Property type validation', () => {
    it('should enforce correct aggregateId types', () => {
      const gameSnapshot = createGameSnapshot(gameId);
      const lineupSnapshot = createTeamLineupSnapshot(teamLineupId);
      const inningSnapshot = createInningStateSnapshot(inningStateId);

      expect(gameSnapshot.aggregateId).toBeInstanceOf(GameId);
      expect(lineupSnapshot.aggregateId).toBeInstanceOf(TeamLineupId);
      expect(inningSnapshot.aggregateId).toBeInstanceOf(InningStateId);
    });

    it('should enforce correct aggregateType values', () => {
      const gameSnapshot = createGameSnapshot(gameId);
      const lineupSnapshot = createTeamLineupSnapshot(teamLineupId);
      const inningSnapshot = createInningStateSnapshot(inningStateId);

      // Test that aggregateType matches expected values
      expect(['Game', 'TeamLineup', 'InningState']).toContain(gameSnapshot.aggregateType);
      expect(['Game', 'TeamLineup', 'InningState']).toContain(lineupSnapshot.aggregateType);
      expect(['Game', 'TeamLineup', 'InningState']).toContain(inningSnapshot.aggregateType);

      // Test specific types
      expect(gameSnapshot.aggregateType).toBe('Game');
      expect(lineupSnapshot.aggregateType).toBe('TeamLineup');
      expect(inningSnapshot.aggregateType).toBe('InningState');
    });

    it('should enforce version as positive number', () => {
      const gameSnapshot = createGameSnapshot(gameId, 42);

      expect(typeof gameSnapshot.version).toBe('number');
      expect(gameSnapshot.version).toBeGreaterThan(0);
      expect(Number.isInteger(gameSnapshot.version)).toBe(true);
    });

    it('should enforce timestamp as Date object', () => {
      const snapshot = createGameSnapshot(gameId);

      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should allow any data structure in data property', () => {
      const complexData = {
        nested: {
          object: true,
          array: [1, 2, 3],
          nullValue: null,
          stringValue: 'test',
        },
        primitives: {
          boolean: true,
          number: 42,
          string: 'value',
        },
      };

      const snapshot: AggregateSnapshot<typeof complexData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: complexData,
        timestamp: new Date(),
      };

      expect(snapshot.data).toEqual(complexData);
      expect(snapshot.data.nested.object).toBe(true);
      expect(snapshot.data.primitives.number).toBe(42);
    });
  });

  describe('Serialization compatibility', () => {
    it('should be JSON serializable and deserializable', () => {
      const originalSnapshot = createGameSnapshot(gameId, 42);

      // Serialize to JSON
      const jsonString = JSON.stringify(originalSnapshot, (_key, value: unknown) => {
        // Handle GameId serialization (assuming it has a toJSON method or value property)
        if (value instanceof GameId) {
          return { __type: 'GameId', value: value.value };
        }
        return value;
      });

      expect(jsonString).toBeDefined();
      expect(jsonString.length).toBeGreaterThan(0);

      // Parse from JSON
      const parsed = JSON.parse(jsonString, (key: string, value: unknown) => {
        // Handle GameId deserialization
        if (
          value &&
          typeof value === 'object' &&
          'value' in value &&
          '__type' in value &&
          value.__type === 'GameId'
        ) {
          return new GameId(value.value as string);
        }
        if (key === 'timestamp') {
          return new Date(value as string);
        }
        return value;
      }) as AggregateSnapshot<unknown>;

      expect(parsed.aggregateType).toBe(originalSnapshot.aggregateType);
      expect(parsed.version).toBe(originalSnapshot.version);
      expect(parsed.aggregateId).toEqual(originalSnapshot.aggregateId);
      expect(parsed.data).toEqual(originalSnapshot.data);
    });

    it('should preserve data integrity after serialization round-trip', () => {
      const complexData = {
        gameState: {
          score: { home: 7, away: 5 },
          bases: { first: 'player-1', second: null, third: 'player-3' },
          metadata: {
            weather: 'sunny',
            temperature: 75,
            conditions: ['ideal', 'dry'],
          },
        },
      };

      const snapshot: AggregateSnapshot<typeof complexData> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 25,
        data: complexData,
        timestamp: new Date('2024-01-15T14:30:00Z'),
      };

      const serialized = JSON.stringify(snapshot, (_key, value: unknown) => {
        if (value instanceof GameId) {
          return { __type: 'GameId', value: value.value };
        }
        return value;
      });

      const deserialized = JSON.parse(serialized, (key: string, value: unknown) => {
        if (
          value &&
          typeof value === 'object' &&
          'value' in value &&
          '__type' in value &&
          value.__type === 'GameId'
        ) {
          return new GameId(value.value as string);
        }
        if (key === 'timestamp') {
          return new Date(value as string);
        }
        return value;
      }) as AggregateSnapshot<typeof complexData>;

      expect(deserialized.data.gameState.score.home).toBe(7);
      expect(deserialized.data.gameState.bases.first).toBe('player-1');
      expect(deserialized.data.gameState.bases.second).toBeNull();
      expect(deserialized.data.gameState.metadata.conditions).toEqual(['ideal', 'dry']);
      expect(deserialized.version).toBe(25);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle minimum version number (1)', () => {
      const snapshot = createGameSnapshot(gameId, 1);

      expect(snapshot.version).toBe(1);
    });

    it('should handle large version numbers', () => {
      const largeVersion = 999999;
      const snapshot = createGameSnapshot(gameId, largeVersion);

      expect(snapshot.version).toBe(largeVersion);
    });

    it('should handle empty data object', () => {
      const snapshot: AggregateSnapshot<Record<string, never>> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: {},
        timestamp: new Date(),
      };

      expect(snapshot.data).toEqual({});
    });

    it('should handle null values in data', () => {
      const dataWithNulls = {
        optionalField: null,
        requiredField: 'value',
        nestedObject: {
          nullValue: null,
          definedValue: 42,
        },
      };

      const snapshot: AggregateSnapshot<typeof dataWithNulls> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 1,
        data: dataWithNulls,
        timestamp: new Date(),
      };

      expect(snapshot.data.optionalField).toBeNull();
      expect(snapshot.data.nestedObject.nullValue).toBeNull();
      expect(snapshot.data.nestedObject.definedValue).toBe(42);
    });

    it('should handle very recent timestamps', () => {
      const recentTimestamp = new Date();
      const snapshot = createGameSnapshot(gameId);
      // Override timestamp by creating new snapshot object with recent timestamp
      const snapshotWithRecentTimestamp = { ...snapshot, timestamp: recentTimestamp };

      expect(snapshotWithRecentTimestamp.timestamp).toBe(recentTimestamp);
      expect(Date.now() - snapshotWithRecentTimestamp.timestamp.getTime()).toBeLessThan(1000);
    });

    it('should handle historical timestamps', () => {
      const historicalTimestamp = new Date('2020-01-01T00:00:00Z');
      const snapshot = createGameSnapshot(gameId);
      // Override timestamp by creating new snapshot object with historical timestamp
      const snapshotWithHistoricalTimestamp = { ...snapshot, timestamp: historicalTimestamp };

      expect(snapshotWithHistoricalTimestamp.timestamp).toBe(historicalTimestamp);
      expect(snapshotWithHistoricalTimestamp.timestamp.getFullYear()).toBe(2020);
    });
  });
});

describe('Multi-aggregate type support', () => {
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;
  let snapshotStore: MockSnapshotStore;

  beforeEach(() => {
    gameId = new GameId('game-123');
    teamLineupId = new TeamLineupId('lineup-456');
    inningStateId = new InningStateId('inning-789');
    snapshotStore = new MockSnapshotStore();
  });

  it('should handle snapshots for all three aggregate types simultaneously', async () => {
    const gameSnapshot = createGameSnapshot(gameId, 10);
    const lineupSnapshot = createTeamLineupSnapshot(teamLineupId, 5);
    const inningSnapshot = createInningStateSnapshot(inningStateId, 3);

    await snapshotStore.saveSnapshot(gameId, gameSnapshot);
    await snapshotStore.saveSnapshot(teamLineupId, lineupSnapshot);
    await snapshotStore.saveSnapshot(inningStateId, inningSnapshot);

    const retrievedGame = await snapshotStore.getSnapshot(gameId);
    const retrievedLineup = await snapshotStore.getSnapshot(teamLineupId);
    const retrievedInning = await snapshotStore.getSnapshot(inningStateId);

    expect(retrievedGame?.aggregateType).toBe('Game');
    expect(retrievedLineup?.aggregateType).toBe('TeamLineup');
    expect(retrievedInning?.aggregateType).toBe('InningState');

    expect(retrievedGame?.version).toBe(10);
    expect(retrievedLineup?.version).toBe(5);
    expect(retrievedInning?.version).toBe(3);
  });

  it('should maintain aggregate isolation (no cross-contamination)', async () => {
    const gameSnapshot = createGameSnapshot(gameId, 20);
    const lineupSnapshot = createTeamLineupSnapshot(teamLineupId, 15);

    await snapshotStore.saveSnapshot(gameId, gameSnapshot);
    await snapshotStore.saveSnapshot(teamLineupId, lineupSnapshot);

    // Modify one snapshot
    const updatedGameSnapshot = createGameSnapshot(gameId, 25);
    await snapshotStore.saveSnapshot(gameId, updatedGameSnapshot);

    // Other snapshot should remain unchanged
    const retrievedLineup = await snapshotStore.getSnapshot(teamLineupId);
    const retrievedGame = await snapshotStore.getSnapshot(gameId);

    expect(retrievedLineup?.version).toBe(15); // Unchanged
    expect(retrievedGame?.version).toBe(25); // Updated
  });

  it('should support different data structures for each aggregate type', async () => {
    interface GameData {
      score: { home: number; away: number };
      status: string;
    }

    interface LineupData {
      battingOrder: string[];
      positions: Record<string, string>;
    }

    interface InningData {
      inningNumber: number;
      outs: number;
      currentBatter: string;
    }

    const gameSnapshot: AggregateSnapshot<GameData> = {
      aggregateId: gameId,
      aggregateType: 'Game',
      version: 1,
      data: { score: { home: 3, away: 2 }, status: 'IN_PROGRESS' },
      timestamp: new Date(),
    };

    const lineupSnapshot: AggregateSnapshot<LineupData> = {
      aggregateId: teamLineupId,
      aggregateType: 'TeamLineup',
      version: 1,
      data: {
        battingOrder: ['player1', 'player2'],
        positions: { player1: 'PITCHER', player2: 'CATCHER' },
      },
      timestamp: new Date(),
    };

    const inningSnapshot: AggregateSnapshot<InningData> = {
      aggregateId: inningStateId,
      aggregateType: 'InningState',
      version: 1,
      data: {
        inningNumber: 3,
        outs: 2,
        currentBatter: 'player1',
      },
      timestamp: new Date(),
    };

    await snapshotStore.saveSnapshot(gameId, gameSnapshot);
    await snapshotStore.saveSnapshot(teamLineupId, lineupSnapshot);
    await snapshotStore.saveSnapshot(inningStateId, inningSnapshot);

    const retrievedGame = await snapshotStore.getSnapshot<GameData>(gameId);
    const retrievedLineup = await snapshotStore.getSnapshot<LineupData>(teamLineupId);
    const retrievedInning = await snapshotStore.getSnapshot<InningData>(inningStateId);

    expect(retrievedGame?.data.score.home).toBe(3);
    expect(retrievedLineup?.data.battingOrder).toContain('player1');
    expect(retrievedInning?.data.outs).toBe(2);
  });
});
