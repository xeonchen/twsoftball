/**
 * @file Mock Factories
 * Reusable mock implementations for reducing test code duplication.
 *
 * @remarks
 * This module provides factory functions for creating consistent mock implementations
 * of application ports, eliminating the need to duplicate mock classes across test files.
 * All mocks are designed to be flexible and configurable for different test scenarios.
 *
 * The factories use Vitest's vi.fn() for mock functions to ensure proper test isolation
 * and allow for easy verification of method calls, return values, and thrown errors.
 *
 * **Design Principles**:
 * - Consistent API across all mock factories
 * - Configurable behavior for different test scenarios
 * - Proper typing to maintain type safety in tests
 * - Easy customization through method override patterns
 *
 * @example
 * ```typescript
 * import { createMockGameRepository, createMockLogger } from '../test-factories/mock-factories.js';
 *
 * describe('MyUseCase', () => {
 *   let mockGameRepository: GameRepository;
 *   let mockLogger: Logger;
 *
 *   beforeEach(() => {
 *     mockGameRepository = createMockGameRepository();
 *     mockLogger = createMockLogger();
 *   });
 *
 *   it('should handle success case', async () => {
 *     // Configure mock behavior
 *     (mockGameRepository.findById as any).mockResolvedValue(testGame);
 *
 *     // Execute test...
 *   });
 * });
 * ```
 */

import {
  Game,
  GameId,
  GameStatus,
  DomainEvent,
  TeamLineupId,
  InningStateId,
  InningState,
  TeamLineup,
} from '@twsoftball/domain';
import { vi } from 'vitest';

import { EventStore, StoredEvent } from '../ports/out/EventStore.js';
import { GameRepository } from '../ports/out/GameRepository.js';
import { InningStateRepository } from '../ports/out/InningStateRepository.js';
import { Logger } from '../ports/out/Logger.js';
import { NotificationService } from '../ports/out/NotificationService.js';
import { TeamLineupRepository } from '../ports/out/TeamLineupRepository.js';

// Mock event interface for internal use
interface MockDomainEvent {
  readonly type?: string;
  readonly eventType?: string;
  readonly eventData?: unknown;
  readonly timestamp: Date;
}

/**
 * Creates a mock GameRepository with all methods implemented as Vitest mocks.
 *
 * @remarks
 * The repository includes a simple in-memory storage mechanism that can be used
 * for basic tests. For more complex scenarios, individual methods can be mocked
 * with specific behavior using vi.fn().mockResolvedValue() or similar.
 *
 * **Default Behavior**:
 * - findById: Returns null (game not found)
 * - save: Resolves successfully
 * - findByStatus: Returns empty array
 * - findByDateRange: Returns empty array
 * - exists: Returns false
 * - delete: Resolves successfully
 *
 * @returns Fully mocked GameRepository instance
 *
 * @example
 * ```typescript
 * const mockRepo = createMockGameRepository();
 *
 * // Configure specific behavior
 * (mockRepo.findById as any).mockResolvedValue(testGame);
 * (mockRepo.save as any).mockRejectedValue(new Error('Save failed'));
 *
 * // Use in test...
 * const useCase = new MyUseCase(mockRepo, ...);
 * ```
 */
export function createMockGameRepository(): GameRepository {
  const games = new Map<string, Game>();

  return {
    findById: vi.fn().mockImplementation((gameId: GameId): Promise<Game | null> => {
      return Promise.resolve(games.get(gameId.value) || null);
    }),

    save: vi.fn().mockImplementation((game: Game): Promise<void> => {
      games.set(game.id.value, game);
      return Promise.resolve();
    }),

    findByStatus: vi.fn().mockImplementation((_status: GameStatus): Promise<Game[]> => {
      return Promise.resolve([]);
    }),

    findByDateRange: vi
      .fn()
      .mockImplementation((_startDate: Date, _endDate: Date): Promise<Game[]> => {
        return Promise.resolve([]);
      }),

    exists: vi.fn().mockImplementation((gameId: GameId): Promise<boolean> => {
      return Promise.resolve(games.has(gameId.value));
    }),

    delete: vi.fn().mockImplementation((gameId: GameId): Promise<void> => {
      games.delete(gameId.value);
      return Promise.resolve();
    }),

    // Helper method to pre-populate the mock repository
    setMockGame: (game: Game): void => {
      games.set(game.id.value, game);
    },

    // Helper method to clear all games
    clear: (): void => {
      games.clear();
    },
  } as GameRepository & {
    setMockGame: (game: Game) => void;
    clear: () => void;
  };
}

/**
 * Creates a mock InningStateRepository with all methods implemented as Vitest mocks.
 *
 * @remarks
 * The repository includes a simple in-memory storage mechanism that can be used
 * for basic tests. For more complex scenarios, individual methods can be mocked
 * with specific behavior using vi.fn().mockResolvedValue() or similar.
 *
 * **Default Behavior**:
 * - findById: Returns null (inning state not found)
 * - findCurrentByGameId: Returns null (no current inning state)
 * - save: Resolves successfully
 * - delete: Resolves successfully
 *
 * @param overrides - Optional method overrides for specific test scenarios
 * @returns Fully mocked InningStateRepository instance
 *
 * @example
 * ```typescript
 * const mockRepo = createMockInningStateRepository({
 *   findCurrentByGameId: vi.fn().mockResolvedValue(mockInningState)
 * });
 * ```
 */
export function createMockInningStateRepository(
  overrides?: Partial<InningStateRepository>
): InningStateRepository {
  const inningStates = new Map<string, InningState>();
  const gameIdToInningStateId = new Map<string, string>(); // Track current inning state per game

  return {
    findById: vi.fn().mockImplementation((id: InningStateId): Promise<InningState | null> => {
      return Promise.resolve(inningStates.get(id.value) || null);
    }),

    findCurrentByGameId: vi
      .fn()
      .mockImplementation((gameId: GameId): Promise<InningState | null> => {
        // Use gameId-to-inningStateId mapping for efficient lookup
        const inningStateId = gameIdToInningStateId.get(gameId.value);
        if (inningStateId) {
          const inningState = inningStates.get(inningStateId);
          if (inningState) {
            return Promise.resolve(inningState);
          }
        }

        // Fallback: search through all inning states (for backward compatibility)
        for (const [, inningState] of inningStates) {
          if (inningState.gameId.value === gameId.value) {
            // Update mapping for future lookups
            gameIdToInningStateId.set(gameId.value, inningState.id.value);
            return Promise.resolve(inningState);
          }
        }
        return Promise.resolve(null);
      }),

    save: vi.fn().mockImplementation((inningState: InningState): Promise<void> => {
      inningStates.set(inningState.id.value, inningState);
      // Update gameId mapping to track current inning state
      gameIdToInningStateId.set(inningState.gameId.value, inningState.id.value);
      return Promise.resolve();
    }),

    delete: vi.fn().mockImplementation((id: InningStateId): Promise<void> => {
      const inningState = inningStates.get(id.value);
      if (inningState) {
        // Remove gameId mapping when deleting
        gameIdToInningStateId.delete(inningState.gameId.value);
      }
      inningStates.delete(id.value);
      return Promise.resolve();
    }),

    ...overrides,
  } as InningStateRepository;
}

/**
 * Creates a mock TeamLineupRepository with all methods implemented as Vitest mocks.
 *
 * @remarks
 * The repository includes a simple in-memory storage mechanism that can be used
 * for basic tests. For more complex scenarios, individual methods can be mocked
 * with specific behavior using vi.fn().mockResolvedValue() or similar.
 *
 * **Default Behavior**:
 * - findById: Returns null (lineup not found)
 * - findByGameId: Returns empty array
 * - findByGameIdAndSide: Returns null (lineup not found)
 * - save: Resolves successfully
 * - delete: Resolves successfully
 *
 * @param overrides - Optional method overrides for specific test scenarios
 * @returns Fully mocked TeamLineupRepository instance
 *
 * @example
 * ```typescript
 * const mockRepo = createMockTeamLineupRepository({
 *   findByGameIdAndSide: vi.fn().mockImplementation((gameId, side) => {
 *     return side === 'AWAY' ? mockAwayLineup : mockHomeLineup;
 *   })
 * });
 * ```
 */
export function createMockTeamLineupRepository(
  overrides?: Partial<TeamLineupRepository>
): TeamLineupRepository {
  const lineups = new Map<string, TeamLineup>();
  const gameLineups = new Map<string, Map<'HOME' | 'AWAY', TeamLineup>>(); // Track lineups by game+side

  return {
    findById: vi.fn().mockImplementation((id: TeamLineupId): Promise<TeamLineup | null> => {
      return Promise.resolve(lineups.get(id.value) || null);
    }),

    findByGameId: vi.fn().mockImplementation((gameId: GameId): Promise<TeamLineup[]> => {
      const result: TeamLineup[] = [];
      for (const [, lineup] of lineups) {
        if (lineup.gameId.value === gameId.value) {
          result.push(lineup);
        }
      }
      return Promise.resolve(result);
    }),

    findByGameIdAndSide: vi
      .fn()
      .mockImplementation((gameId: GameId, side: 'HOME' | 'AWAY'): Promise<TeamLineup | null> => {
        const gameKey = gameId.value;
        const cached = gameLineups.get(gameKey)?.get(side);
        if (cached) {
          return Promise.resolve(cached);
        }

        for (const lineup of lineups.values()) {
          if (lineup.gameId.value !== gameKey) continue;
          const lineupSide = lineup.teamSide;
          if (lineupSide === 'HOME' || lineupSide === 'AWAY') {
            let sideMap = gameLineups.get(gameKey);
            if (!sideMap) {
              sideMap = new Map<'HOME' | 'AWAY', TeamLineup>();
              gameLineups.set(gameKey, sideMap);
            }
            sideMap.set(lineupSide, lineup);
            if (lineupSide === side) {
              return Promise.resolve(lineup);
            }
          }
        }

        return Promise.resolve(null);
      }),

    save: vi.fn().mockImplementation((lineup: TeamLineup): Promise<void> => {
      lineups.set(lineup.id.value, lineup);

      const gameKey = lineup.gameId.value;
      let gameSideMap = gameLineups.get(gameKey);
      if (!gameSideMap) {
        gameSideMap = new Map<'HOME' | 'AWAY', TeamLineup>();
        gameLineups.set(gameKey, gameSideMap);
      }
      const lineupSide = lineup.teamSide;
      if (lineupSide === 'HOME' || lineupSide === 'AWAY') {
        gameSideMap.set(lineupSide, lineup);
      }

      return Promise.resolve();
    }),

    delete: vi.fn().mockImplementation((id: TeamLineupId): Promise<void> => {
      const lineup = lineups.get(id.value);
      if (lineup) {
        const gameKey = lineup.gameId.value;
        const gameSideMap = gameLineups.get(gameKey);
        if (gameSideMap) {
          const lineupSide = lineup.teamSide;
          if (lineupSide === 'HOME' || lineupSide === 'AWAY') {
            gameSideMap.delete(lineupSide);
          }
          if (gameSideMap.size === 0) {
            gameLineups.delete(gameKey);
          }
        }
      }
      lineups.delete(id.value);
      return Promise.resolve();
    }),

    ...overrides,
  } as TeamLineupRepository;
}

/**
 * Creates a mock EventStore with all methods implemented as Vitest mocks.
 *
 * @remarks
 * The event store includes in-memory storage for events and undo history to support
 * complex test scenarios. Individual methods can be overridden with specific behavior
 * as needed for different test cases.
 *
 * **Storage Capabilities**:
 * - In-memory event storage by stream ID
 * - Undo history tracking for undo/redo scenarios
 * - Support for filtering by event type, timestamp, and aggregate type
 * - Helper methods for setting up test scenarios
 *
 * @returns Fully mocked EventStore instance with helper methods
 *
 * @example
 * ```typescript
 * const mockEventStore = createMockEventStore();
 *
 * // Set up test events
 * mockEventStore.setMockEvents(gameId, [event1, event2]);
 * mockEventStore.setMockUndoHistory(gameId, [undoEvent1]);
 *
 * // Configure specific failures
 * (mockEventStore.append as any).mockRejectedValue(new Error('Store failed'));
 * ```
 */
export function createMockEventStore(): EventStore & {
  setMockEvents: (
    streamId: GameId | TeamLineupId | InningStateId,
    events: (DomainEvent | MockDomainEvent)[]
  ) => void;
  setMockUndoHistory: (gameId: GameId, events: (DomainEvent | MockDomainEvent)[]) => void;
  clear: () => void;
} {
  const events = new Map<string, MockDomainEvent[]>();
  const undoHistory = new Map<string, MockDomainEvent[]>();

  const mockEventStore = {
    getGameEvents: vi
      .fn()
      .mockImplementation((gameId: GameId, limit?: number): Promise<StoredEvent[]> => {
        const gameEvents = events.get(gameId.value) || [];
        const storedEvents = gameEvents.map((event, index) => ({
          eventId: `event-${index}`,
          streamId: gameId.value,
          aggregateType: 'Game' as const,
          eventType: event.eventType || event.type || 'unknown',
          eventData: JSON.stringify(event.eventData || {}),
          eventVersion: 1,
          streamVersion: index + 1,
          timestamp: event.timestamp,
          metadata: { source: 'test', createdAt: new Date() },
        }));
        return Promise.resolve(limit ? storedEvents.slice(-limit) : storedEvents);
      }),

    getEvents: vi
      .fn()
      .mockImplementation(
        (
          streamId: GameId | TeamLineupId | InningStateId,
          fromVersion?: number
        ): Promise<StoredEvent[]> => {
          const streamEvents = events.get(streamId.value) || [];
          const storedEvents = streamEvents.map((event, index) => ({
            eventId: `event-${index}`,
            streamId: streamId.value,
            aggregateType: 'Game' as const,
            eventType: event.eventType || event.type || 'unknown',
            eventData: JSON.stringify(event.eventData || {}),
            eventVersion: 1,
            streamVersion: index + 1,
            timestamp: event.timestamp,
            metadata: { source: 'test', createdAt: new Date() },
          }));
          return Promise.resolve(fromVersion ? storedEvents.slice(fromVersion) : storedEvents);
        }
      ),

    getAllEvents: vi.fn().mockImplementation((fromTimestamp?: Date): Promise<StoredEvent[]> => {
      const allEvents: StoredEvent[] = [];
      for (const [streamId, streamEvents] of events.entries()) {
        streamEvents.forEach((event, index) => {
          if (!fromTimestamp || event.timestamp >= fromTimestamp) {
            allEvents.push({
              eventId: `event-${streamId}-${index}`,
              streamId,
              aggregateType: 'Game' as const,
              eventType: event.eventType || event.type || 'unknown',
              eventData: JSON.stringify(event.eventData || {}),
              eventVersion: 1,
              streamVersion: index + 1,
              timestamp: event.timestamp,
              metadata: { source: 'test', createdAt: new Date() },
            });
          }
        });
      }
      return Promise.resolve(allEvents);
    }),

    getEventsByType: vi
      .fn()
      .mockImplementation(
        async (eventType: string, fromTimestamp?: Date): Promise<StoredEvent[]> => {
          const allEvents = await mockEventStore.getAllEvents(fromTimestamp);
          return allEvents.filter(event => event.eventType === eventType);
        }
      ),

    getEventsByGameId: vi
      .fn()
      .mockImplementation(
        async (
          gameId: GameId,
          aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[],
          fromTimestamp?: Date
        ): Promise<StoredEvent[]> => {
          let gameEvents = await mockEventStore.getGameEvents(gameId);
          if (aggregateTypes) {
            gameEvents = gameEvents.filter(event => aggregateTypes.includes(event.aggregateType));
          }
          if (fromTimestamp) {
            gameEvents = gameEvents.filter(event => event.timestamp >= fromTimestamp);
          }
          return gameEvents;
        }
      ),

    append: vi
      .fn()
      .mockImplementation(
        (
          streamId: GameId | TeamLineupId | InningStateId,
          _aggregateType: 'Game' | 'TeamLineup' | 'InningState',
          domainEvents: DomainEvent[],
          _expectedVersion?: number
        ): Promise<void> => {
          const existing = events.get(streamId.value) || [];
          const mockEvents: MockDomainEvent[] = domainEvents.map(event => ({
            type: event.type,
            eventType: event.type,
            eventData: event,
            timestamp: event.timestamp,
          }));
          events.set(streamId.value, [...existing, ...mockEvents]);
          return Promise.resolve();
        }
      ),

    // Helper methods for test setup
    setMockEvents: (
      streamId: GameId | TeamLineupId | InningStateId,
      testEvents: (DomainEvent | MockDomainEvent)[]
    ): void => {
      const mockEvents: MockDomainEvent[] = testEvents.map(event => {
        if ('type' in event && 'gameId' in event) {
          // This is a DomainEvent
          return {
            type: event.type,
            eventType: event.type,
            eventData: event,
            timestamp: event.timestamp,
          };
        } else {
          // This is already a MockDomainEvent
          return event;
        }
      });
      events.set(streamId.value, mockEvents);
    },

    setMockUndoHistory: (gameId: GameId, undoEvents: (DomainEvent | MockDomainEvent)[]): void => {
      const mockEvents: MockDomainEvent[] = undoEvents.map(event => {
        if ('type' in event && 'gameId' in event) {
          return {
            type: event.type,
            eventType: event.type,
            eventData: event,
            timestamp: event.timestamp,
          };
        } else {
          return event;
        }
      });
      undoHistory.set(gameId.value, mockEvents);
    },

    clear: (): void => {
      events.clear();
      undoHistory.clear();
    },
  } as EventStore & {
    setMockEvents: (
      streamId: GameId | TeamLineupId | InningStateId,
      events: (DomainEvent | MockDomainEvent)[]
    ) => void;
    setMockUndoHistory: (gameId: GameId, events: (DomainEvent | MockDomainEvent)[]) => void;
    clear: () => void;
  };

  return mockEventStore;
}

/**
 * Creates a mock Logger with all methods implemented as Vitest mocks.
 *
 * @remarks
 * The logger includes internal storage for log messages to support verification
 * of logging behavior in tests. All log levels are implemented with proper
 * parameter handling.
 *
 * **Features**:
 * - Captures all log messages with level, message, context, and error details
 * - Helper methods for retrieving and clearing logs
 * - Level checking support (always returns true in tests)
 * - Proper handling of optional error parameters
 *
 * @returns Fully mocked Logger instance with helper methods
 *
 * @example
 * ```typescript
 * const mockLogger = createMockLogger();
 *
 * // Execute code that logs...
 * useCase.execute(command);
 *
 * // Verify logging behavior
 * const logs = mockLogger.getLogs();
 * expect(logs.some(log => log.message.includes('Operation started'))).toBe(true);
 * expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', expect.any(Object));
 * ```
 */
export function createMockLogger(): Logger & {
  getLogs: () => Array<{ level: string; message: string; context?: unknown; error?: Error }>;
  clear: () => void;
} {
  const logs: Array<{ level: string; message: string; context?: unknown; error?: Error }> = [];

  return {
    debug: vi.fn().mockImplementation((message: string, context?: unknown): void => {
      logs.push({ level: 'debug', message, context });
    }),

    info: vi.fn().mockImplementation((message: string, context?: unknown): void => {
      logs.push({ level: 'info', message, context });
    }),

    warn: vi.fn().mockImplementation((message: string, context?: unknown): void => {
      logs.push({ level: 'warn', message, context });
    }),

    error: vi.fn().mockImplementation((message: string, error?: Error, context?: unknown): void => {
      if (error !== undefined) {
        logs.push({ level: 'error', message, context, error });
      } else {
        logs.push({ level: 'error', message, context });
      }
    }),

    log: vi
      .fn()
      .mockImplementation(
        (
          level: 'debug' | 'info' | 'warn' | 'error',
          message: string,
          context?: unknown,
          error?: Error
        ): void => {
          logs.push({ level, message, context, ...(error !== undefined && { error }) });
        }
      ),

    isLevelEnabled: vi
      .fn()
      .mockImplementation((_level: 'debug' | 'info' | 'warn' | 'error'): boolean => {
        return true; // Always enabled for tests
      }),

    // Helper methods
    getLogs: (): Array<{ level: string; message: string; context?: unknown; error?: Error }> => {
      return [...logs];
    },

    clear: (): void => {
      logs.length = 0;
    },
  };
}

/**
 * Creates a mock NotificationService with all methods implemented as Vitest mocks.
 *
 * @remarks
 * The notification service mock captures all notification calls for verification
 * in tests. Supports different notification types and includes helper methods
 * for test setup and verification.
 *
 * **Default Behavior**:
 * - All methods resolve successfully
 * - Captures notification details for verification
 * - Configurable failure scenarios via mock overrides
 *
 * @returns Fully mocked NotificationService instance with helper methods
 *
 * @example
 * ```typescript
 * const mockNotificationService = createMockNotificationService();
 *
 * // Configure failure behavior
 * (mockNotificationService.sendGameAlert as any)
 *   .mockRejectedValue(new Error('Notification failed'));
 *
 * // Verify notifications were sent
 * const notifications = mockNotificationService.getNotifications();
 * expect(notifications).toHaveLength(1);
 * ```
 */
export function createMockNotificationService(): NotificationService & {
  getNotifications: () => Array<{ type: string; data: unknown }>;
  clear: () => void;
} {
  const notifications: Array<{ type: string; data: unknown }> = [];

  const mockResult = {
    notificationId: 'test-notification-id',
    success: true,
    deliveredChannels: ['ui' as const],
    failedChannels: [],
    timestamp: new Date(),
  };

  return {
    sendUserNotification: vi.fn().mockImplementation((): Promise<unknown> => {
      notifications.push({ type: 'userNotification', data: {} });
      return Promise.resolve(mockResult);
    }),

    sendSystemNotification: vi.fn().mockImplementation((): Promise<unknown> => {
      notifications.push({ type: 'systemNotification', data: {} });
      return Promise.resolve(mockResult);
    }),

    sendBatchNotifications: vi.fn().mockImplementation((batch: unknown[]): Promise<unknown[]> => {
      return Promise.resolve(batch.map(() => mockResult));
    }),

    updateUserPreferences: vi.fn().mockImplementation((): Promise<void> => {
      // No-op for tests
      return Promise.resolve();
    }),

    getUserPreferences: vi.fn().mockImplementation((): Promise<unknown> => {
      return Promise.resolve(null); // No preferences configured by default
    }),

    isChannelAvailable: vi.fn().mockImplementation((): Promise<boolean> => {
      return Promise.resolve(true); // All channels available by default
    }),

    notifyGameStarted: vi.fn().mockImplementation((gameDetails: unknown): Promise<void> => {
      notifications.push({ type: 'gameStarted', data: gameDetails });
      return Promise.resolve();
    }),

    notifyGameEnded: vi
      .fn()
      .mockImplementation((gameId: string, gameResult: unknown): Promise<void> => {
        notifications.push({ type: 'gameEnded', data: { gameId, gameResult } });
        return Promise.resolve();
      }),

    notifyScoreUpdate: vi
      .fn()
      .mockImplementation((gameId: string, scoreUpdate: unknown): Promise<void> => {
        notifications.push({ type: 'scoreUpdate', data: { gameId, scoreUpdate } });
        return Promise.resolve();
      }),

    // Helper methods
    getNotifications: (): Array<{ type: string; data: unknown }> => {
      return [...notifications];
    },

    clear: (): void => {
      notifications.length = 0;
    },
  };
}

/**
 * Creates a complete set of mocked dependencies for use cases.
 *
 * @remarks
 * This convenience function creates all commonly used mocks in a single call,
 * reducing boilerplate in test setup. Individual mocks can still be customized
 * after creation.
 *
 * @returns Object containing all mocked dependencies
 *
 * @example
 * ```typescript
 * describe('UseCase Tests', () => {
 *   let mocks: ReturnType<typeof createMockDependencies>;
 *
 *   beforeEach(() => {
 *     mocks = createMockDependencies();
 *   });
 *
 *   it('should work with all dependencies', async () => {
 *     const useCase = new MyUseCase(
 *       mocks.gameRepository,
 *       mocks.eventStore,
 *       mocks.logger
 *     );
 *     // ... test implementation
 *   });
 * });
 * ```
 */
export function createMockDependencies(): {
  gameRepository: ReturnType<typeof createMockGameRepository>;
  inningStateRepository: ReturnType<typeof createMockInningStateRepository>;
  teamLineupRepository: ReturnType<typeof createMockTeamLineupRepository>;
  eventStore: ReturnType<typeof createMockEventStore>;
  logger: ReturnType<typeof createMockLogger>;
  notificationService: ReturnType<typeof createMockNotificationService>;
} {
  return {
    gameRepository: createMockGameRepository(),
    inningStateRepository: createMockInningStateRepository(),
    teamLineupRepository: createMockTeamLineupRepository(),
    eventStore: createMockEventStore(),
    logger: createMockLogger(),
    notificationService: createMockNotificationService(),
  };
}

/**
 * Type definitions for enhanced mock instances with helper methods.
 */
export type EnhancedMockGameRepository = ReturnType<typeof createMockGameRepository>;
export type EnhancedMockInningStateRepository = ReturnType<typeof createMockInningStateRepository>;
export type EnhancedMockTeamLineupRepository = ReturnType<typeof createMockTeamLineupRepository>;
export type EnhancedMockEventStore = ReturnType<typeof createMockEventStore>;
export type EnhancedMockLogger = ReturnType<typeof createMockLogger>;
export type EnhancedMockNotificationService = ReturnType<typeof createMockNotificationService>;
