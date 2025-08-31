/**
 * @file EventStore
 * Outbound port interface for multi-aggregate event persistence and retrieval.
 *
 * @remarks
 * This interface defines the driven port for event sourcing operations across
 * all aggregates in the hexagonal architecture. It provides a unified event
 * store that can handle events from Game, TeamLineup, and InningState aggregates
 * while maintaining proper isolation and consistency.
 *
 * The event store is the foundation of the event sourcing pattern, enabling:
 * - Complete audit trails of all domain changes
 * - State reconstruction from event history
 * - Time travel and state analysis capabilities
 * - Distributed system event sharing and synchronization
 *
 * The interface supports both individual aggregate event streams and
 * cross-aggregate queries needed for complex business operations that
 * span multiple aggregate boundaries.
 *
 * Concurrency control is provided through optimistic locking with expected
 * version parameters, preventing lost updates and maintaining consistency
 * in multi-user scenarios.
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class IndexedDBEventStore implements EventStore {
 *   async append(
 *     streamId: GameId,
 *     aggregateType: 'Game',
 *     events: DomainEvent[]
 *   ): Promise<void> {
 *     const storedEvents = events.map(event => ({
 *       eventId: event.eventId,
 *       streamId: streamId.value,
 *       aggregateType,
 *       eventType: event.eventType,
 *       eventData: JSON.stringify(event),
 *       eventVersion: 1,
 *       streamVersion: await this.getNextVersion(streamId),
 *       timestamp: event.timestamp,
 *       metadata: { source: 'web-app', createdAt: new Date() }
 *     }));
 *
 *     await this.saveToIndexedDB(storedEvents);
 *   }
 * }
 *
 * // Usage in domain service
 * class GameCoordinator {
 *   constructor(private eventStore: EventStore) {}
 *
 *   async recordAtBat(...): Promise<void> {
 *     const events = this.calculateEvents(...);
 *     await this.eventStore.append(gameId, 'Game', events);
 *   }
 * }
 * ```
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';

/**
 * Event store interface for multi-aggregate event persistence and retrieval.
 *
 * @remarks
 * This interface provides comprehensive event storage capabilities supporting
 * the event sourcing pattern across multiple aggregate types. It handles
 * event persistence, retrieval, and querying with proper isolation and
 * consistency guarantees.
 *
 * Design principles:
 * - Multi-aggregate: Supports Game, TeamLineup, and InningState aggregates
 * - Type-safe: Strongly typed aggregate identifiers and event structures
 * - Consistent: Maintains event ordering and atomicity
 * - Queryable: Rich query capabilities for different access patterns
 * - Concurrent: Optimistic concurrency control for multi-user scenarios
 *
 * Event stream organization:
 * - Each aggregate instance has its own event stream
 * - Events within a stream are ordered by occurrence
 * - Cross-aggregate queries enable game-level reconstruction
 * - Event metadata supports debugging and analytics
 *
 * Query patterns supported:
 * - Single aggregate reconstruction (by stream ID)
 * - Game-level event timeline (all aggregates for one game)
 * - Event type filtering for specific analysis
 * - Time-based queries for historical analysis
 * - Cross-aggregate coordination queries
 */
export interface EventStore {
  /**
   * Appends domain events to an aggregate's event stream.
   *
   * @remarks
   * Atomically adds one or more events to the specified aggregate's stream.
   * Events are assigned sequential version numbers within the stream and
   * stored with complete metadata for debugging and analysis.
   *
   * Optimistic concurrency control prevents lost updates when multiple
   * processes attempt to modify the same aggregate simultaneously.
   *
   * Event serialization preserves all domain event data including:
   * - Event identity and type information
   * - Complete event payload data
   * - Timestamp and causality information
   * - Aggregate and game context
   *
   * @param streamId - Unique identifier for the aggregate instance
   * @param aggregateType - Type of aggregate for proper categorization
   * @param events - Domain events to append to the stream
   * @param expectedVersion - Expected current stream version for concurrency control
   * @returns Promise that resolves when events are successfully stored
   * @throws Error for concurrency conflicts or storage failures
   */
  append(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void>;

  /**
   * Retrieves events from a specific aggregate's stream.
   *
   * @remarks
   * Returns events in the order they were appended to the stream, enabling
   * proper aggregate reconstruction. Supports incremental loading by
   * specifying a starting version number.
   *
   * Used primarily for:
   * - Aggregate hydration from event history
   * - Incremental state updates after snapshots
   * - Event replay for debugging and analysis
   *
   * @param streamId - Unique identifier for the aggregate instance
   * @param fromVersion - Optional starting version for incremental loading
   * @returns Promise resolving to ordered array of stored events
   */
  getEvents(
    streamId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]>;

  /**
   * Retrieves all events related to a specific game across all aggregates.
   *
   * @remarks
   * Cross-aggregate query that returns events from all aggregate types
   * (Game, TeamLineup, InningState) that belong to the specified game.
   * Events are ordered chronologically to provide a complete game timeline.
   *
   * Essential for:
   * - Complete game reconstruction and analysis
   * - Cross-aggregate consistency checking
   * - Game-level reporting and statistics
   * - Event-based game state synchronization
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to chronologically ordered events for the game
   */
  getGameEvents(gameId: GameId): Promise<StoredEvent[]>;

  /**
   * Retrieves all events across all streams.
   *
   * @remarks
   * System-wide query that returns events from all aggregates and streams.
   * Primarily used for administrative purposes, analytics, and system-level
   * operations. Events are ordered chronologically.
   *
   * Use cases include:
   * - System-wide analytics and reporting
   * - Data migration and backup operations
   * - Cross-game analysis and statistics
   * - Administrative monitoring and debugging
   *
   * @param fromTimestamp - Optional timestamp filter for incremental queries
   * @returns Promise resolving to all events (filtered by timestamp if provided)
   */
  getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]>;

  /**
   * Retrieves events of a specific type across all streams.
   *
   * @remarks
   * Type-specific query that filters events by their domain event type.
   * Useful for analyzing patterns of specific business events across
   * the entire system.
   *
   * Common use cases:
   * - Analyzing specific event patterns (all AtBatCompleted events)
   * - Event type statistics and reporting
   * - Business intelligence queries
   * - System behavior analysis
   *
   * @param eventType - Domain event type to filter by
   * @param fromTimestamp - Optional timestamp filter for time-based analysis
   * @returns Promise resolving to events of the specified type
   */
  getEventsByType(eventType: string, fromTimestamp?: Date): Promise<StoredEvent[]>;

  /**
   * Retrieves events for a game with optional filtering by aggregate type and time.
   *
   * @remarks
   * Flexible cross-aggregate query that supports multiple filtering criteria
   * for complex analysis and reporting needs. Combines game-level scope
   * with aggregate-type and time-based filtering.
   *
   * Filtering options:
   * - Aggregate types: Limit to specific aggregate types
   * - Timestamp: Only events after specified time
   * - Combined filters: Apply multiple criteria simultaneously
   *
   * @param gameId - Unique identifier for the game
   * @param aggregateTypes - Optional aggregate types to include
   * @param fromTimestamp - Optional timestamp filter
   * @returns Promise resolving to filtered events for the game
   */
  getEventsByGameId(
    gameId: GameId,
    aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[],
    fromTimestamp?: Date
  ): Promise<StoredEvent[]>;
}

/**
 * Stored event structure for event store persistence.
 *
 * @remarks
 * This interface represents how domain events are stored in the event store,
 * including all necessary metadata for proper event management and querying.
 *
 * The structure preserves:
 * - Original domain event data through serialization
 * - Stream and version information for ordering
 * - Metadata for operational concerns
 * - Type information for proper deserialization
 *
 * Event versioning supports both:
 * - Event schema versioning (eventVersion)
 * - Stream position versioning (streamVersion)
 */
export interface StoredEvent {
  /** Unique identifier for this event instance */
  readonly eventId: string;

  /** Identifier of the aggregate stream this event belongs to */
  readonly streamId: string;

  /** Type of aggregate that generated this event */
  readonly aggregateType: 'Game' | 'TeamLineup' | 'InningState';

  /** Domain event type for proper deserialization */
  readonly eventType: string;

  /** Serialized domain event data */
  readonly eventData: string;

  /** Schema version of the event structure */
  readonly eventVersion: number;

  /** Position of this event within its stream */
  readonly streamVersion: number;

  /** When the event originally occurred */
  readonly timestamp: Date;

  /** Additional metadata for operational purposes */
  readonly metadata: StoredEventMetadata;
}

/**
 * Metadata attached to stored events for operational and analytical purposes.
 *
 * @remarks
 * Provides contextual information about event creation, source system,
 * and operational environment. Essential for debugging, auditing, and
 * system monitoring.
 */
export interface StoredEventMetadata {
  /** System or component that generated this event */
  readonly source: string;

  /** When this event was stored (may differ from occurrence time) */
  readonly createdAt: Date;

  /** Optional correlation ID for request tracing */
  readonly correlationId?: string;

  /** Optional causation ID linking to triggering event */
  readonly causationId?: string;

  /** Optional user ID for security and audit purposes */
  readonly userId?: string;
}
