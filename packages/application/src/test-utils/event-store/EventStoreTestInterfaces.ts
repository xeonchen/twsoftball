/**
 * @file EventStore Test Interfaces
 * Shared interface definitions for EventStore testing to eliminate duplication
 * across test files.
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';

import { AggregateType } from '../../ports/out/EventStore';

// Re-export domain types for consistent usage across tests
export { GameId, TeamLineupId, InningStateId, DomainEvent };

// Re-export EventStore port types for consistent usage across tests
export type { AggregateType };

/**
 * Union type representing all valid domain aggregate identifiers in the TW Softball system.
 *
 * Provides type safety for EventStore operations that accept any of the three
 * aggregate identifier types. Essential for ensuring test interfaces match
 * the actual domain model structure.
 */
export type DomainId = GameId | TeamLineupId | InningStateId;

/**
 * Metadata structure for stored events in the EventStore system.
 *
 * Provides audit trail and traceability information for every persisted event
 * in the softball application. Essential for debugging, compliance, and
 * understanding event causation chains across the system.
 *
 * @remarks
 * Metadata fields support:
 * - **Source tracking**: Identifies the system component that created the event
 * - **Temporal tracking**: Precise timestamp for event creation
 * - **Correlation tracking**: Links related events across different operations
 * - **Causation tracking**: Identifies the event that triggered this event
 * - **User tracking**: Associates events with specific user actions
 */
export interface StoredEventMetadata {
  /** Source system or component that generated this event */
  readonly source: string;
  /** Precise timestamp when the event was created */
  readonly createdAt: Date;
  /** Optional correlation ID linking related events across operations */
  readonly correlationId?: string;
  /** Optional ID of the event that caused this event to be created */
  readonly causationId?: string;
  /** Optional ID of the user who triggered the action that created this event */
  readonly userId?: string;
}

/**
 * Complete structure for events as they are stored in the EventStore persistence layer.
 *
 * Represents the full event envelope with all necessary information for event
 * sourcing operations including identification, versioning, content, and metadata.
 * Used by all EventStore implementations to ensure consistent event structure.
 *
 * @remarks
 * **Key Components:**
 * - **Identification**: Unique event ID and stream association
 * - **Categorization**: Aggregate and event type classification
 * - **Content**: Serialized domain event data
 * - **Versioning**: Event and stream version for ordering and concurrency
 * - **Temporal**: Timestamp for chronological ordering
 * - **Metadata**: Audit and traceability information
 *
 * **Event Sourcing Compliance:**
 * This structure ensures proper event sourcing patterns including:
 * - Immutable event records
 * - Stream-based organization
 * - Version-based concurrency control
 * - Complete audit trail
 */
export interface StoredEvent {
  /** Unique identifier for this specific event */
  readonly eventId: string;
  /** Stream identifier (aggregate ID) this event belongs to */
  readonly streamId: string;
  /** Type of aggregate this event belongs to */
  readonly aggregateType: AggregateType;
  /** Specific type/name of the domain event */
  readonly eventType: string;
  /** Serialized JSON string containing the domain event data */
  readonly eventData: string;
  /** Global version number for this event across all streams */
  readonly eventVersion: number;
  /** Version number of this event within its specific stream */
  readonly streamVersion: number;
  /** Timestamp when this event was stored */
  readonly timestamp: Date;
  /** Additional metadata for audit and traceability */
  readonly metadata: StoredEventMetadata;
}

/**
 * Core EventStore interface defining all persistence operations for the TW Softball event sourcing system.
 *
 * Provides a complete contract for event persistence that all EventStore implementations
 * must fulfill. Supports all query patterns required by the softball application
 * including single-stream, multi-stream, and cross-aggregate scenarios.
 *
 * @remarks
 * **Core Operations:**
 * - **Event Appending**: Store new events with concurrency control
 * - **Stream Queries**: Retrieve events from specific aggregate streams
 * - **Cross-Aggregate Queries**: Find events across multiple aggregates for a game
 * - **Global Queries**: Search across all events with filtering
 * - **Type-Based Queries**: Filter events by specific domain event types
 *
 * **Concurrency Control:**
 * The append operation supports optimistic concurrency control through
 * expectedVersion parameter, enabling safe concurrent modifications.
 *
 * **Query Flexibility:**
 * Multiple query methods support different access patterns required by
 * the softball application, from aggregate reconstruction to reporting.
 */
export interface EventStore {
  /**
   * Appends new events to an aggregate stream with optional concurrency control.
   *
   * @param streamId - Target aggregate identifier (GameId, TeamLineupId, or InningStateId)
   * @param aggregateType - Type of aggregate being appended to
   * @param events - Array of domain events to store
   * @param expectedVersion - Optional expected stream version for concurrency control
   * @throws Error if expectedVersion doesn't match current stream version
   */
  append(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: AggregateType,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;

  /**
   * Retrieves all events from a specific aggregate stream.
   *
   * @param streamId - Aggregate identifier to retrieve events from
   * @param fromVersion - Optional starting version number for partial retrieval
   * @returns Array of stored events in chronological order
   */
  getEvents(
    streamId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]>;

  /**
   * Retrieves all events related to a specific game across all aggregate types.
   *
   * @param gameId - Game identifier to find events for
   * @returns Array of stored events from all aggregates related to the game
   */
  getGameEvents(gameId: GameId): Promise<StoredEvent[]>;

  /**
   * Retrieves all events across all streams and aggregates.
   *
   * @param fromTimestamp - Optional timestamp filter for events after this time
   * @returns Array of all stored events in chronological order
   */
  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]>;

  /**
   * Retrieves events of a specific type across all streams.
   *
   * @param eventType - Domain event type to filter by
   * @param fromTimestamp - Optional timestamp filter for events after this time
   * @returns Array of matching stored events in chronological order
   */
  getEventsByType(eventType: string, fromTimestamp?: Date): Promise<StoredEvent[]>;

  /**
   * Retrieves events for a game with optional aggregate type filtering.
   *
   * @param gameId - Game identifier to find events for
   * @param aggregateTypes - Optional array of aggregate types to include
   * @param fromTimestamp - Optional timestamp filter for events after this time
   * @returns Array of matching stored events in chronological order
   */
  getEventsByGameId(
    gameId: GameId,
    aggregateTypes?: AggregateType[],
    fromTimestamp?: Date
  ): Promise<StoredEvent[]>;
}

/**
 * @remarks
 * This module re-exports domain types from the actual domain layer rather than
 * creating local test aliases. This approach ensures:
 *
 * - **Type Consistency**: Tests use the exact same types as production code
 * - **Refactoring Safety**: Domain type changes automatically propagate to tests
 * - **API Compliance**: Test interfaces match real implementation interfaces
 * - **Reduced Duplication**: No duplicate type definitions to maintain
 *
 * All EventStore test utilities should import domain types from this module
 * to maintain consistency across the test suite.
 */
