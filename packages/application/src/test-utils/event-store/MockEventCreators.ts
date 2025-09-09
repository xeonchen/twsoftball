/**
 * @file Mock Event Creators
 * Centralized factory functions for creating mock domain events in tests.
 * Eliminates duplication across test files.
 */

import {
  GameId,
  TeamLineupId,
  InningStateId,
  DomainEvent,
  GameCreated,
  AtBatCompleted,
  TeamLineupCreated,
  InningStateCreated,
  PlayerId,
  AtBatResultType,
} from '@twsoftball/domain';

/**
 * Creates a mock GameCreated event for testing
 */
export const createMockGameCreatedEvent = (gameId: GameId): GameCreated => {
  return new GameCreated(gameId, 'Mock Home Team', 'Mock Away Team');
};

/**
 * Creates a mock AtBatCompleted event for testing
 */
export const createMockAtBatCompletedEvent = (gameId: GameId): AtBatCompleted => {
  return new AtBatCompleted(
    gameId,
    PlayerId.generate(),
    3, // batting slot
    AtBatResultType.SINGLE,
    3, // inning
    1 // outs (valid range 0-2)
  );
};

/**
 * Creates a mock TeamLineupCreated event for testing
 */
export const createMockTeamLineupCreatedEvent = (
  gameId: GameId,
  teamLineupId: TeamLineupId
): TeamLineupCreated => {
  return new TeamLineupCreated(teamLineupId, gameId, 'Mock Team Name');
};

/**
 * Creates a mock InningStateCreated event for testing
 */
export const createMockInningStateCreatedEvent = (
  gameId: GameId,
  inningStateId: InningStateId
): InningStateCreated => {
  return new InningStateCreated(inningStateId, gameId, 1, true);
};

/**
 * Helper functions to create mock IDs using actual domain value objects
 * These maintain consistency with domain layer patterns
 */
export const createMockGameId = (): GameId => GameId.generate();

export const createMockTeamLineupId = (): TeamLineupId => TeamLineupId.generate();

export const createMockInningStateId = (): InningStateId => InningStateId.generate();

/**
 * Creates a batch of mock events for testing large datasets
 */
export const createMockEventBatch = (gameId: GameId, count: number): DomainEvent[] => {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return createMockGameCreatedEvent(gameId);
    }
    return createMockAtBatCompletedEvent(gameId);
  });
};
