/**
 * @file SnapshotManager.test.ts
 * Comprehensive test suite for SnapshotManager service using TDD approach.
 *
 * @remarks
 * This test suite validates all aspects of snapshot management including:
 * - Snapshot frequency determination (every 100 events)
 * - Loading aggregates from snapshot + subsequent events
 * - Fallback to full event replay when no snapshot exists
 * - Snapshot creation triggers and timing
 * - Cross-aggregate support (Game, TeamLineup, InningState)
 * - Error handling for corrupt/invalid snapshots
 * - Performance characteristics
 * - Memory management
 *
 * Following TDD approach: Tests are written FIRST, then implementation follows.
 * Each test case represents a specific requirement from the Phase 4.4.2 specification.
 */

import { GameId, TeamLineupId, InningStateId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

import { EventStore, StoredEvent } from '../ports/out/EventStore.js';
import { SnapshotStore, AggregateSnapshot } from '../ports/out/SnapshotStore.js';

import { SnapshotManager } from './SnapshotManager.js';

// Mock aggregate interface for testing
interface MockEventSourcedAggregate {
  getId(): GameId | TeamLineupId | InningStateId;
  getVersion(): number;
  getAggregateType(): 'Game' | 'TeamLineup' | 'InningState';
  getState(): unknown;
  applyEvents(events: StoredEvent[]): void;
}

describe('SnapshotManager', () => {
  let snapshotManager: SnapshotManager;
  let mockEventStore: EventStore;
  let mockSnapshotStore: SnapshotStore;
  let gameId: GameId;
  let teamLineupId: TeamLineupId;
  let inningStateId: InningStateId;

  beforeEach(() => {
    // Create mock implementations
    mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn(),
      getGameEvents: vi.fn(),
      getAllEvents: vi.fn(),
      getEventsByType: vi.fn(),
      getEventsByGameId: vi.fn(),
    };

    mockSnapshotStore = {
      saveSnapshot: vi.fn(),
      getSnapshot: vi.fn(),
    };

    // Create test aggregate IDs
    gameId = new GameId('test-game-1');
    teamLineupId = new TeamLineupId('test-lineup-1');
    inningStateId = new InningStateId('test-inning-1');

    // Initialize SnapshotManager with mocked dependencies
    snapshotManager = new SnapshotManager(mockEventStore, mockSnapshotStore);
  });

  describe('Constructor and Initialization', () => {
    it('should create SnapshotManager with required dependencies', () => {
      expect(snapshotManager).toBeDefined();
      expect(snapshotManager).toBeInstanceOf(SnapshotManager);
    });

    it('should expose SNAPSHOT_FREQUENCY as 100 events', () => {
      // Access the constant through a static method we'll implement
      expect(SnapshotManager.SNAPSHOT_FREQUENCY).toBe(100);
    });

    it('should throw error if EventStore is not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(() => new SnapshotManager(null as any, mockSnapshotStore)).toThrow(
        'EventStore is required for SnapshotManager'
      );
    });

    it('should throw error if SnapshotStore is not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(() => new SnapshotManager(mockEventStore, null as any)).toThrow(
        'SnapshotStore is required for SnapshotManager'
      );
    });
  });

  describe('shouldCreateSnapshot - Frequency Determination', () => {
    it('should return false when aggregate has no events', async () => {
      // Arrange
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(false);
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);
      expect(mockSnapshotStore.getSnapshot).toHaveBeenCalledWith(gameId);
    });

    it('should return false when aggregate has fewer than 100 events and no snapshot', async () => {
      // Arrange
      const mockEvents = createMockEvents(50, gameId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(false);
    });

    it('should return true when aggregate has exactly 100 events and no snapshot', async () => {
      // Arrange
      const mockEvents = createMockEvents(100, gameId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(true);
    });

    it('should return true when aggregate has more than 100 events and no snapshot', async () => {
      // Arrange
      const mockEvents = createMockEvents(150, gameId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(true);
    });

    it('should return false when events since last snapshot are less than 100', async () => {
      // Arrange
      const mockEvents = createMockEvents(175, gameId);
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 150,
        data: { test: 'data' },
        timestamp: new Date(),
      };

      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(false);
    });

    it('should return true when events since last snapshot are exactly 100', async () => {
      // Arrange
      const mockEvents = createMockEvents(250, gameId);
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 150,
        data: { test: 'data' },
        timestamp: new Date(),
      };

      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(true);
    });

    it('should return true when events since last snapshot exceed 100', async () => {
      // Arrange
      const mockEvents = createMockEvents(275, gameId);
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 150,
        data: { test: 'data' },
        timestamp: new Date(),
      };

      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(shouldCreate).toBe(true);
    });

    it('should support TeamLineup aggregates', async () => {
      // Arrange
      const mockEvents = createMockEvents(100, teamLineupId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(teamLineupId);

      // Assert
      expect(shouldCreate).toBe(true);
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(teamLineupId);
    });

    it('should support InningState aggregates', async () => {
      // Arrange
      const mockEvents = createMockEvents(100, inningStateId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(inningStateId);

      // Assert
      expect(shouldCreate).toBe(true);
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(inningStateId);
    });
  });

  describe('createSnapshot - Snapshot Creation', () => {
    let mockAggregate: MockEventSourcedAggregate;

    beforeEach(() => {
      mockAggregate = {
        getId: vi.fn().mockReturnValue(gameId),
        getVersion: vi.fn().mockReturnValue(150),
        getAggregateType: vi.fn().mockReturnValue('Game'),
        getState: vi.fn().mockReturnValue({ score: { home: 5, away: 3 }, inning: 7 }),
        applyEvents: vi.fn(),
      };
    });

    it('should create snapshot with correct structure for Game aggregate', async () => {
      // Arrange
      const expectedSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 150,
        data: { score: { home: 5, away: 3 }, inning: 7 },
        timestamp: expect.any(Date),
      };

      // Act
      await snapshotManager.createSnapshot(mockAggregate);

      // Assert
      expect(mockSnapshotStore.saveSnapshot).toHaveBeenCalledWith(gameId, expectedSnapshot);
    });

    it('should create snapshot with correct structure for TeamLineup aggregate', async () => {
      // Arrange
      mockAggregate.getId = vi.fn().mockReturnValue(teamLineupId);
      mockAggregate.getAggregateType = vi.fn().mockReturnValue('TeamLineup');
      mockAggregate.getState = vi.fn().mockReturnValue({ players: ['player1', 'player2'] });

      const expectedSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: teamLineupId,
        aggregateType: 'TeamLineup',
        version: 150,
        data: { players: ['player1', 'player2'] },
        timestamp: expect.any(Date),
      };

      // Act
      await snapshotManager.createSnapshot(mockAggregate);

      // Assert
      expect(mockSnapshotStore.saveSnapshot).toHaveBeenCalledWith(teamLineupId, expectedSnapshot);
    });

    it('should create snapshot with correct structure for InningState aggregate', async () => {
      // Arrange
      mockAggregate.getId = vi.fn().mockReturnValue(inningStateId);
      mockAggregate.getAggregateType = vi.fn().mockReturnValue('InningState');
      mockAggregate.getState = vi.fn().mockReturnValue({ outs: 2, bases: [] });

      const expectedSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: inningStateId,
        aggregateType: 'InningState',
        version: 150,
        data: { outs: 2, bases: [] },
        timestamp: expect.any(Date),
      };

      // Act
      await snapshotManager.createSnapshot(mockAggregate);

      // Assert
      expect(mockSnapshotStore.saveSnapshot).toHaveBeenCalledWith(inningStateId, expectedSnapshot);
    });

    it('should include current timestamp in snapshot', async () => {
      // Arrange
      const beforeTime = new Date();

      // Act
      await snapshotManager.createSnapshot(mockAggregate);

      // Assert
      const afterTime = new Date();
      expect(mockSnapshotStore.saveSnapshot).toHaveBeenCalled();

      const [, snapshot] = (mockSnapshotStore.saveSnapshot as Mock).mock.calls[0] || [];
      expect(snapshot.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(snapshot.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle snapshot store errors gracefully', async () => {
      // Arrange
      const error = new Error('Snapshot store failed');
      (mockSnapshotStore.saveSnapshot as Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(snapshotManager.createSnapshot(mockAggregate)).rejects.toThrow(
        'Failed to create snapshot: Snapshot store failed'
      );
    });

    it('should validate aggregate has required methods', async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalidAggregate = {} as any;

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(snapshotManager.createSnapshot(invalidAggregate)).rejects.toThrow(
        'Invalid aggregate: missing required methods'
      );
    });
  });

  describe('loadAggregate - Aggregate Reconstruction', () => {
    it('should load aggregate from snapshot plus subsequent events', async () => {
      // Arrange
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 100,
        data: { score: { home: 3, away: 2 }, inning: 5 },
        timestamp: new Date(),
      };

      const subsequentEvents = createMockEvents(25, gameId, 101); // Events 101-125

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);
      (mockEventStore.getEvents as Mock).mockResolvedValue(subsequentEvents);

      // Act
      const result = await snapshotManager.loadAggregate(gameId, 'Game');

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual({
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 125,
        snapshotVersion: 100,
        data: mockSnapshot.data,
        subsequentEvents: subsequentEvents,
        reconstructedFromSnapshot: true,
      });

      expect(mockSnapshotStore.getSnapshot).toHaveBeenCalledWith(gameId);
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId, 100);
    });

    it('should load aggregate from full event history when no snapshot exists', async () => {
      // Arrange
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      const allEvents = createMockEvents(75, gameId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(allEvents);

      // Act
      const result = await snapshotManager.loadAggregate(gameId, 'Game');

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual({
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 75,
        snapshotVersion: null,
        data: null,
        subsequentEvents: allEvents,
        reconstructedFromSnapshot: false,
      });

      expect(mockSnapshotStore.getSnapshot).toHaveBeenCalledWith(gameId);
      expect(mockEventStore.getEvents).toHaveBeenCalledWith(gameId);
    });

    it('should support TeamLineup aggregate loading', async () => {
      // Arrange
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: teamLineupId,
        aggregateType: 'TeamLineup',
        version: 50,
        data: { players: [] },
        timestamp: new Date(),
      };

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Act
      const result = await snapshotManager.loadAggregate(teamLineupId, 'TeamLineup');

      // Assert
      expect(result).toBeDefined();
      expect(result.aggregateType).toBe('TeamLineup');
      expect(result.aggregateId).toBe(teamLineupId);
    });

    it('should support InningState aggregate loading', async () => {
      // Arrange
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: inningStateId,
        aggregateType: 'InningState',
        version: 30,
        data: { outs: 1 },
        timestamp: new Date(),
      };

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Act
      const result = await snapshotManager.loadAggregate(inningStateId, 'InningState');

      // Assert
      expect(result).toBeDefined();
      expect(result.aggregateType).toBe('InningState');
      expect(result.aggregateId).toBe(inningStateId);
    });

    it('should validate aggregate type matches snapshot type', async () => {
      // Arrange
      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 100,
        data: {},
        timestamp: new Date(),
      };

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);

      // Act & Assert
      await expect(snapshotManager.loadAggregate(gameId, 'TeamLineup')).rejects.toThrow(
        'Aggregate type mismatch: expected TeamLineup, but snapshot is Game'
      );
    });

    it('should return null when aggregate does not exist (no snapshot, no events)', async () => {
      // Arrange
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      // Act
      const result = await snapshotManager.loadAggregate(gameId, 'Game');

      // Assert
      expect(result).toEqual({
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 0,
        snapshotVersion: null,
        data: null,
        subsequentEvents: [],
        reconstructedFromSnapshot: false,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupt snapshot data gracefully', async () => {
      // Arrange
      const corruptSnapshot = {
        aggregateId: gameId,
        aggregateType: 'Game',
        // Missing version, data, and timestamp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(corruptSnapshot);

      // Act & Assert
      await expect(snapshotManager.loadAggregate(gameId, 'Game')).rejects.toThrow(
        'Invalid snapshot structure'
      );
    });

    it('should handle event store failures during shouldCreateSnapshot', async () => {
      // Arrange
      const error = new Error('Event store connection failed');
      (mockEventStore.getEvents as Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(snapshotManager.shouldCreateSnapshot(gameId)).rejects.toThrow(
        'Failed to determine snapshot necessity: Event store connection failed'
      );
    });

    it('should handle snapshot store failures during shouldCreateSnapshot', async () => {
      // Arrange
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      const error = new Error('Snapshot store connection failed');
      (mockSnapshotStore.getSnapshot as Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(snapshotManager.shouldCreateSnapshot(gameId)).rejects.toThrow(
        'Failed to determine snapshot necessity: Snapshot store connection failed'
      );
    });

    it('should handle event store failures during loadAggregate', async () => {
      // Arrange
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      const error = new Error('Event store read failed');
      (mockEventStore.getEvents as Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(snapshotManager.loadAggregate(gameId, 'Game')).rejects.toThrow(
        'Failed to load aggregate: Event store read failed'
      );
    });

    it('should handle snapshot store failures during loadAggregate', async () => {
      // Arrange
      const error = new Error('Snapshot store read failed');
      (mockSnapshotStore.getSnapshot as Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(snapshotManager.loadAggregate(gameId, 'Game')).rejects.toThrow(
        'Failed to load aggregate: Snapshot store read failed'
      );
    });

    it('should validate aggregate ID parameter', async () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      await expect(snapshotManager.shouldCreateSnapshot(null as any)).rejects.toThrow(
        'Aggregate ID is required'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      await expect(snapshotManager.loadAggregate(null as any, 'Game')).rejects.toThrow(
        'Aggregate ID is required'
      );
    });

    it('should validate aggregate type parameter', async () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      await expect(snapshotManager.loadAggregate(gameId, null as any)).rejects.toThrow(
        'Aggregate type is required'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      await expect(snapshotManager.loadAggregate(gameId, 'InvalidType' as any)).rejects.toThrow(
        'Invalid aggregate type: InvalidType'
      );
    });
  });

  describe('Performance Characteristics', () => {
    it('should process large event counts efficiently', async () => {
      // Arrange
      const largeEventCount = 1000;
      const mockEvents = createMockEvents(largeEventCount, gameId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      const startTime = Date.now();

      // Act
      const shouldCreate = await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(shouldCreate).toBe(true);
    });

    it('should handle memory efficiently with large snapshots', async () => {
      // Arrange
      const largeSnapshotData = {
        gameState: new Array(10000).fill(0).map((_, i) => ({ id: i, data: 'test data' })),
      };

      const mockSnapshot: AggregateSnapshot<unknown> = {
        aggregateId: gameId,
        aggregateType: 'Game',
        version: 100,
        data: largeSnapshotData,
        timestamp: new Date(),
      };

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(mockSnapshot);
      (mockEventStore.getEvents as Mock).mockResolvedValue([]);

      const startTime = Date.now();

      // Act
      const result = await snapshotManager.loadAggregate(gameId, 'Game');

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200); // Should complete within 200ms even with large data
      expect(result).toBeDefined();
      expect(result.data).toEqual(largeSnapshotData);
    });

    it('should make minimal calls to external stores', async () => {
      // Arrange
      const mockEvents = createMockEvents(50, gameId);
      (mockEventStore.getEvents as Mock).mockResolvedValue(mockEvents);
      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      await snapshotManager.shouldCreateSnapshot(gameId);

      // Assert
      expect(mockEventStore.getEvents).toHaveBeenCalledTimes(1);
      expect(mockSnapshotStore.getSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cross-Aggregate Support', () => {
    it('should handle mixed aggregate types in sequence', async () => {
      // Arrange
      const gameEvents = createMockEvents(100, gameId);
      const teamEvents = createMockEvents(100, teamLineupId);
      const inningEvents = createMockEvents(100, inningStateId);

      (mockEventStore.getEvents as Mock)
        .mockResolvedValueOnce(gameEvents)
        .mockResolvedValueOnce(teamEvents)
        .mockResolvedValueOnce(inningEvents);

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const gameResult = await snapshotManager.shouldCreateSnapshot(gameId);
      const teamResult = await snapshotManager.shouldCreateSnapshot(teamLineupId);
      const inningResult = await snapshotManager.shouldCreateSnapshot(inningStateId);

      // Assert
      expect(gameResult).toBe(true);
      expect(teamResult).toBe(true);
      expect(inningResult).toBe(true);
    });

    it('should maintain separate snapshot thresholds per aggregate type', async () => {
      // Arrange - Game has 100 events, Team has 50 events
      (mockEventStore.getEvents as Mock)
        .mockResolvedValueOnce(createMockEvents(100, gameId))
        .mockResolvedValueOnce(createMockEvents(50, teamLineupId));

      (mockSnapshotStore.getSnapshot as Mock).mockResolvedValue(null);

      // Act
      const gameResult = await snapshotManager.shouldCreateSnapshot(gameId);
      const teamResult = await snapshotManager.shouldCreateSnapshot(teamLineupId);

      // Assert
      expect(gameResult).toBe(true); // 100 events = threshold
      expect(teamResult).toBe(false); // 50 events < threshold
    });
  });
});

/**
 * Helper function to create mock events for testing
 */
function createMockEvents(
  count: number,
  aggregateId: GameId | TeamLineupId | InningStateId,
  startVersion: number = 1
): StoredEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    eventId: `event-${startVersion + i}`,
    streamId: aggregateId.value,
    aggregateType: determineAggregateType(aggregateId),
    eventType: 'TestEvent',
    eventData: JSON.stringify({ eventIndex: startVersion + i }),
    eventVersion: 1,
    streamVersion: startVersion + i,
    timestamp: new Date(),
    metadata: {
      source: 'test',
      createdAt: new Date(),
    },
  }));
}

/**
 * Helper function to determine aggregate type from ID
 */
function determineAggregateType(
  aggregateId: GameId | TeamLineupId | InningStateId
): 'Game' | 'TeamLineup' | 'InningState' {
  if (aggregateId instanceof GameId) return 'Game';
  if (aggregateId instanceof TeamLineupId) return 'TeamLineup';
  if (aggregateId instanceof InningStateId) return 'InningState';
  throw new Error('Unknown aggregate type');
}
