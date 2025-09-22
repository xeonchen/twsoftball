/**
 * @file Event Factories
 * Factory functions for creating reusable domain events for testing.
 *
 * @remarks
 * This module provides centralized factory functions for creating domain events
 * commonly used across test files. These factories reduce code duplication and
 * ensure consistent event structure across tests.
 *
 * **Event Categories**:
 * - Undo/Redo Events: ActionUndone events for testing undo/redo functionality
 * - At-Bat Events: AtBatCompleted events for game flow testing
 * - Substitution Events: PlayerSubstitutedIntoGame events for lineup changes
 * - Inning Events: HalfInningEnded events for game progression
 * - Game Lifecycle Events: GameStarted, GameCompleted events
 *
 * @example
 * ```typescript
 * import { createActionUndoneEvent, createAtBatCompletedEvent } from '../test-factories/index.js';
 *
 * describe('Redo Tests', () => {
 *   it('should redo undone actions', () => {
 *     const undoEvent = createActionUndoneEvent('AtBatCompleted', 'game-123');
 *     const atBatEvent = createAtBatCompletedEvent('game-123', 'batter-456');
 *     // ... test implementation
 *   });
 * });
 * ```
 */

import { GameId, PlayerId, DomainEvent, AtBatResultType } from '@twsoftball/domain';

import { SecureTestUtils } from '../test-utils/secure-test-utils.js';

/**
 * Creates an ActionUndone event for testing undo/redo scenarios.
 *
 * @remarks
 * This factory is heavily used in redo and undo tests to simulate
 * events that have been undone and are available for redo operations.
 * The event includes all necessary properties for proper event sourcing.
 *
 * @param originalEventType - The type of event that was undone
 * @param gameId - The game ID (can be string or GameId instance)
 * @param options - Optional customization parameters
 * @returns ActionUndone domain event ready for testing
 *
 * @example
 * ```typescript
 * // Basic usage
 * const undoEvent = createActionUndoneEvent('AtBatCompleted', 'game-123');
 *
 * // With custom timestamp
 * const undoEvent = createActionUndoneEvent('PlayerSubstitutedIntoGame', gameId, {
 *   timestamp: new Date('2024-08-30T14:00:00Z'),
 *   undoReason: 'Incorrect substitution recorded'
 * });
 * ```
 */
export function createActionUndoneEvent(
  originalEventType: string,
  gameId: string | GameId,
  options?: {
    timestamp?: Date;
    undoReason?: string;
    version?: number;
    eventId?: string;
  }
): DomainEvent {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;

  return {
    eventId: options?.eventId || SecureTestUtils.generateEventId(),
    type: 'ActionUndone',
    gameId: gameIdInstance,
    version: options?.version || 1,
    timestamp: options?.timestamp || new Date(),
    originalEventType,
    undoReason: options?.undoReason || 'Test undo',
  } as DomainEvent;
}

/**
 * Creates an AtBatCompleted event for testing game flow scenarios.
 *
 * @remarks
 * Used extensively in tests that need to simulate completed at-bats.
 * Provides realistic at-bat data with customizable parameters for
 * various test scenarios.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param batterId - The batter's player ID (can be string or PlayerId instance)
 * @param options - Optional customization parameters
 * @returns AtBatCompleted domain event ready for testing
 *
 * @example
 * ```typescript
 * // Simple single
 * const atBatEvent = createAtBatCompletedEvent('game-123', 'batter-456');
 *
 * // Home run with custom details
 * const homeRunEvent = createAtBatCompletedEvent('game-123', 'slugger-789', {
 *   result: AtBatResultType.HOME_RUN,
 *   outs: 1,
 *   timestamp: new Date('2024-08-30T14:30:00Z')
 * });
 * ```
 */
export function createAtBatCompletedEvent(
  gameId: string | GameId,
  batterId: string | PlayerId,
  options?: {
    result?: AtBatResultType;
    outs?: number;
    timestamp?: Date;
    version?: number;
    eventId?: string;
  }
): DomainEvent {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;
  const batterIdInstance = typeof batterId === 'string' ? new PlayerId(batterId) : batterId;

  return {
    eventId: options?.eventId || SecureTestUtils.generateEventId(),
    timestamp: options?.timestamp || new Date(),
    version: options?.version || 1,
    type: 'AtBatCompleted',
    gameId: gameIdInstance,
    eventData: {
      batterId: batterIdInstance.value,
      result: options?.result || AtBatResultType.SINGLE,
      outs: options?.outs || 2,
    },
  } as DomainEvent;
}

/**
 * Creates a PlayerSubstitutedIntoGame event for testing lineup changes.
 *
 * @remarks
 * Used in substitution and undo tests to simulate player changes.
 * Includes both incoming and outgoing player information with
 * position details for realistic lineup management testing.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param incomingPlayerId - The incoming player's ID
 * @param outgoingPlayerId - The outgoing player's ID
 * @param options - Optional customization parameters
 * @returns PlayerSubstitutedIntoGame domain event ready for testing
 *
 * @example
 * ```typescript
 * // Basic substitution
 * const subEvent = createSubstitutionEvent('game-123', 'new-player', 'old-player');
 *
 * // Pitching change
 * const pitchingChange = createSubstitutionEvent('game-123', 'reliever-456', 'starter-789', {
 *   position: 'PITCHER',
 *   timestamp: new Date('2024-08-30T15:00:00Z')
 * });
 * ```
 */
export function createSubstitutionEvent(
  gameId: string | GameId,
  incomingPlayerId: string | PlayerId,
  outgoingPlayerId: string | PlayerId,
  options?: {
    position?: string;
    timestamp?: Date;
    version?: number;
    eventId?: string;
  }
): DomainEvent {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;
  const incomingPlayerIdInstance =
    typeof incomingPlayerId === 'string' ? new PlayerId(incomingPlayerId) : incomingPlayerId;
  const outgoingPlayerIdInstance =
    typeof outgoingPlayerId === 'string' ? new PlayerId(outgoingPlayerId) : outgoingPlayerId;

  return {
    eventId: options?.eventId || SecureTestUtils.generateEventId(),
    timestamp: options?.timestamp || new Date(),
    version: options?.version || 1,
    type: 'PlayerSubstitutedIntoGame',
    gameId: gameIdInstance,
    eventData: {
      incomingPlayerId: incomingPlayerIdInstance.value,
      outgoingPlayerId: outgoingPlayerIdInstance.value,
      position: options?.position || 'CENTER_FIELD',
    },
  } as DomainEvent;
}

/**
 * Creates a HalfInningEnded event for testing inning transitions.
 *
 * @remarks
 * Used in tests that need to simulate inning changes, which are
 * complex operations affecting multiple aggregates. These events
 * are often flagged as "dangerous" in undo operations.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param options - Optional customization parameters
 * @returns HalfInningEnded domain event ready for testing
 *
 * @example
 * ```typescript
 * // End of top 5th inning
 * const inningEndEvent = createInningEndEvent('game-123', {
 *   inning: 5,
 *   isTopHalf: true,
 *   finalOuts: 3
 * });
 * ```
 */
export function createInningEndEvent(
  gameId: string | GameId,
  options?: {
    inning?: number;
    isTopHalf?: boolean;
    finalOuts?: number;
    timestamp?: Date;
    version?: number;
    eventId?: string;
  }
): DomainEvent {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;

  return {
    eventId: options?.eventId || SecureTestUtils.generateEventId(),
    timestamp: options?.timestamp || new Date(),
    version: options?.version || 1,
    type: 'HalfInningEnded',
    gameId: gameIdInstance,
    eventData: {
      inning: options?.inning || 5,
      isTopHalf: options?.isTopHalf ?? true,
      finalOuts: options?.finalOuts || 3,
    },
  } as DomainEvent;
}

/**
 * Creates a GameStarted event for testing game lifecycle.
 *
 * @remarks
 * Used in tests that need to simulate game start events,
 * particularly useful for testing undo operations that
 * might affect game initialization.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param options - Optional customization parameters
 * @returns GameStarted domain event ready for testing
 */
export function createGameStartedEvent(
  gameId: string | GameId,
  options?: {
    homeTeamName?: string;
    awayTeamName?: string;
    timestamp?: Date;
    version?: number;
    eventId?: string;
  }
): DomainEvent {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;

  return {
    eventId: options?.eventId || SecureTestUtils.generateEventId(),
    timestamp: options?.timestamp || new Date(),
    version: options?.version || 1,
    type: 'GameStarted',
    gameId: gameIdInstance,
    eventData: {
      homeTeamName: options?.homeTeamName || 'Home Team',
      awayTeamName: options?.awayTeamName || 'Away Team',
    },
  } as DomainEvent;
}

/**
 * Creates a GameCompleted event for testing game completion scenarios.
 *
 * @remarks
 * Used in tests that simulate completed games, particularly
 * important for testing dangerous undo operations that might
 * affect game completion status.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param options - Optional customization parameters
 * @returns GameCompleted domain event ready for testing
 */
export function createGameCompletedEvent(
  gameId: string | GameId,
  options?: {
    finalScore?: { home: number; away: number };
    completionReason?: string;
    timestamp?: Date;
    version?: number;
    eventId?: string;
  }
): DomainEvent {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;

  return {
    eventId: options?.eventId || SecureTestUtils.generateEventId(),
    timestamp: options?.timestamp || new Date(),
    version: options?.version || 1,
    type: 'GameCompleted',
    gameId: gameIdInstance,
    eventData: {
      finalScore: options?.finalScore || { home: 5, away: 3 },
      completionReason: options?.completionReason || 'Normal completion',
    },
  } as DomainEvent;
}

/**
 * Creates multiple events of the same type for bulk testing scenarios.
 *
 * @remarks
 * Utility function for creating arrays of similar events with
 * different timestamps, useful for testing multi-action undo
 * scenarios and event ordering.
 *
 * @param count - Number of events to create
 * @param eventFactory - Factory function to create individual events
 * @param baseTimestamp - Starting timestamp (events will be spaced 1 minute apart)
 * @returns Array of domain events ready for testing
 *
 * @example
 * ```typescript
 * // Create 3 at-bat events spaced 1 minute apart
 * const events = createEventSequence(3,
 *   (timestamp) => createAtBatCompletedEvent('game-123', 'batter-456', { timestamp }),
 *   new Date('2024-08-30T14:00:00Z')
 * );
 * ```
 */
export function createEventSequence<T extends DomainEvent>(
  count: number,
  eventFactory: (timestamp: Date, index: number) => T,
  baseTimestamp: Date = new Date()
): T[] {
  return Array.from({ length: count }, (_, index) => {
    const eventTimestamp = new Date(baseTimestamp.getTime() - (index + 1) * 60 * 1000);
    return eventFactory(eventTimestamp, index);
  });
}
