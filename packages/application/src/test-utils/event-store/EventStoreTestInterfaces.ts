/**
 * @file EventStore Test Interfaces
 * Shared interface definitions for EventStore testing to eliminate duplication
 * across test files.
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';

// Re-export domain types for consistent usage across tests
export { GameId, TeamLineupId, InningStateId, DomainEvent };

// Domain identifier union type for test interfaces
export type DomainId = GameId | TeamLineupId | InningStateId;

// Valid aggregate type literals
export type AggregateType = 'Game' | 'TeamLineup' | 'InningState';

export interface StoredEventMetadata {
  readonly source: string;
  readonly createdAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
}

export interface StoredEvent {
  readonly eventId: string;
  readonly streamId: string;
  readonly aggregateType: AggregateType;
  readonly eventType: string;
  readonly eventData: string;
  readonly eventVersion: number;
  readonly streamVersion: number;
  readonly timestamp: Date;
  readonly metadata: StoredEventMetadata;
}

export interface EventStore {
  append(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: AggregateType,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
  getEvents(
    streamId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]>;
  getGameEvents(gameId: GameId): Promise<StoredEvent[]>;
  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]>;
  getEventsByType(eventType: string, fromTimestamp?: Date): Promise<StoredEvent[]>;
  getEventsByGameId(
    gameId: GameId,
    aggregateTypes?: AggregateType[],
    fromTimestamp?: Date
  ): Promise<StoredEvent[]>;
}

// Domain types are now imported from actual domain layer - no local aliases needed
