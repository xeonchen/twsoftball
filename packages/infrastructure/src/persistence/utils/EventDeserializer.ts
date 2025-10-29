/**
 * @file EventDeserializer
 * Utility for deserializing domain events from stored JSON format.
 *
 * @remarks
 * When domain events are stored as JSON and parsed back, value objects lose
 * their prototype methods (like GameId.equals()). This deserializer properly
 * reconstructs domain events with their value objects restored.
 *
 * The deserializer handles all domain event types and ensures proper
 * reconstruction of embedded value objects like GameId, PlayerId, etc.
 */

import {
  GameId,
  PlayerId,
  DomainEvent,
  GameCreated,
  GameStarted,
  AtBatCompleted,
  RunScored,
  ScoreUpdated,
  GameCompleted,
  AtBatResultType,
} from '@twsoftball/domain';

/**
 * Raw event data structure as stored in JSON.
 */
interface RawEventData {
  eventId: string;
  type: string;
  timestamp: string | Date;
  aggregateVersion: number;
  version: number;
  gameId: string | { value: string };
  [key: string]: unknown;
}

/**
 * Deserializes a domain event from its stored JSON representation.
 *
 * @param rawData - The raw event data from JSON.parse()
 * @returns Properly reconstructed domain event with value objects
 * @throws {Error} When event type is unknown or data is invalid
 *
 * @example
 * ```typescript
 * const storedEvents = await eventStore.getEvents(gameId);
 * const domainEvents = storedEvents.map(stored =>
 *   deserializeEvent(JSON.parse(stored.eventData))
 * );
 * const game = Game.fromEvents(domainEvents);
 * ```
 */
export function deserializeEvent(rawData: unknown): DomainEvent {
  // Type guard and cast to ensure we have the expected structure
  const data = rawData as RawEventData;

  // Reconstruct GameId value object
  const gameId = reconstructGameId(data.gameId);

  // Convert timestamp to Date if it's a string
  const timestamp = typeof data.timestamp === 'string' ? new Date(data.timestamp) : data.timestamp;

  const baseEventData = {
    eventId: data.eventId,
    timestamp,
    aggregateVersion: data.aggregateVersion,
    version: data.version,
  };

  switch (data.type) {
    case 'GameCreated': {
      const rulesConfig = data['rulesConfig'] as {
        totalInnings: number;
        maxPlayersPerTeam: number;
        timeLimitMinutes: number | null;
        allowReEntry: boolean;
        mercyRuleEnabled: boolean;
        mercyRuleTiers: Array<{ differential: number; afterInning: number }>;
        maxExtraInnings: number | null;
        allowTieGames: boolean;
      };
      const event = new GameCreated(
        gameId,
        data['homeTeamName'] as string,
        data['awayTeamName'] as string,
        rulesConfig
      );
      Object.assign(event, baseEventData);
      return event;
    }

    case 'GameStarted': {
      const event = new GameStarted(gameId);
      Object.assign(event, baseEventData);
      return event;
    }

    case 'AtBatCompleted': {
      const batterId = reconstructPlayerId(data['batterId']);
      const result = data['result'] as AtBatResultType;

      const event = new AtBatCompleted(
        gameId,
        batterId,
        data['battingSlot'] as number,
        result,
        data['inning'] as number,
        data['outs'] as number
      );
      Object.assign(event, baseEventData);
      return event;
    }

    case 'RunScored': {
      const scorerId = reconstructPlayerId(data['scorerId']);

      const event = new RunScored(
        gameId,
        scorerId,
        data['battingTeam'] as 'HOME' | 'AWAY',
        data['rbiCreditedTo'] ? reconstructPlayerId(data['rbiCreditedTo']) : null,
        data['newScore'] as { home: number; away: number }
      );
      Object.assign(event, baseEventData);
      return event;
    }

    case 'ScoreUpdated': {
      const event = new ScoreUpdated(
        gameId,
        data['scoringTeam'] as 'HOME' | 'AWAY',
        data['runsAdded'] as number,
        data['newScore'] as { home: number; away: number }
      );
      Object.assign(event, baseEventData);
      return event;
    }

    case 'GameCompleted': {
      const event = new GameCompleted(
        gameId,
        data['endingType'] as 'REGULATION' | 'MERCY_RULE' | 'FORFEIT' | 'TIME_LIMIT',
        data['finalScore'] as { home: number; away: number },
        data['completedInning'] as number
      );
      Object.assign(event, baseEventData);
      return event;
    }

    default:
      throw new Error(`Unknown event type: ${data.type}`);
  }
}

/**
 * Reconstructs a GameId value object from stored data.
 */
function reconstructGameId(gameIdData: string | { value: string }): GameId {
  const value = typeof gameIdData === 'string' ? gameIdData : gameIdData.value;
  return new GameId(value);
}

/**
 * Reconstructs a PlayerId value object from stored data.
 */
function reconstructPlayerId(playerIdData: unknown): PlayerId {
  if (typeof playerIdData === 'string') {
    return new PlayerId(playerIdData);
  }
  if (playerIdData && typeof playerIdData === 'object' && 'value' in playerIdData) {
    return new PlayerId((playerIdData as { value: string }).value);
  }
  // Handle null/undefined case
  if (playerIdData === null || playerIdData === undefined) {
    throw new Error('PlayerId data is null or undefined');
  }
  throw new Error('Invalid PlayerId data format');
}

// Note: reconstructTeamLineupId and reconstructInningStateId functions
// removed as they are currently unused and causing TypeScript errors.
// They can be re-added when needed for future event types.
