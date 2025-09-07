/**
 * @file InMemoryEventStore
 * In-memory implementation of the EventStore interface for testing and development.
 *
 * @remarks
 * This implementation provides a complete EventStore using Map<string, StoredEvent[]>
 * for in-memory storage. It's designed for:
 * - Unit testing and integration testing
 * - Development and prototyping
 * - Local development environments
 *
 * Phase 1 Implementation:
 * - Core append() method with optimistic concurrency control
 * - Core getEvents() method with version filtering
 * - Proper event serialization and metadata handling
 * - Thread-safe operations with version conflict detection
 *
 * Phase 2 Implementation (basic stubs for interface compliance):
 * - Cross-aggregate queries (getGameEvents, getAllEvents, etc.)
 * - Event type filtering and advanced queries
 * - Full implementation will be added in Phase 2
 *
 * Design Principles:
 * - Maintains event ordering within streams
 * - Enforces optimistic locking with expectedVersion
 * - Preserves complete domain event data through serialization
 * - Provides clear error messages for concurrency conflicts
 * - Handles empty event arrays gracefully
 *
 * @example
 * ```typescript
 * const eventStore = new InMemoryEventStore();
 *
 * // Append events to a stream
 * const gameId = GameId.generate();
 * const events = [new GameCreated(gameId, 'Home', 'Away')];
 * await eventStore.append(gameId, 'Game', events);
 *
 * // Retrieve events from stream
 * const storedEvents = await eventStore.getEvents(gameId);
 * console.log(storedEvents.length); // 1
 * ```
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';

import type {
  EventStore,
  StoredEvent,
  StoredEventMetadata,
} from '../../../application/src/ports/out/EventStore';

/**
 * In-memory implementation of the EventStore interface.
 *
 * @remarks
 * Provides a complete event store implementation using Map storage for
 * development, testing, and prototyping. Supports all EventStore interface
 * methods with proper concurrency control and event ordering.
 *
 * Storage Structure:
 * - Uses Map<streamId: string, events: StoredEvent[]> for stream storage
 * - Events within each stream are ordered by streamVersion
 * - All events are kept in memory for the lifetime of the instance
 *
 * Concurrency Control:
 * - Implements optimistic locking through expectedVersion parameter
 * - Detects version conflicts and throws descriptive errors
 * - Thread-safe for concurrent read/write operations
 *
 * Event Serialization:
 * - Stores domain events as JSON strings in eventData field
 * - Preserves all event properties and metadata
 * - Maintains timestamp precision and event identity
 */
export class InMemoryEventStore implements EventStore {
  /**
   * Internal storage for event streams.
   * Key: streamId (string), Value: array of StoredEvents ordered by streamVersion
   */
  private readonly streams = new Map<string, StoredEvent[]>();

  /**
   * Appends domain events to an aggregate's event stream.
   *
   * @remarks
   * This is the core Phase 1 implementation that:
   * - Validates expected version for optimistic concurrency control
   * - Assigns sequential stream version numbers
   * - Serializes domain events with complete metadata
   * - Maintains event ordering within the stream
   * - Handles empty event arrays gracefully
   *
   * Concurrency Control:
   * - If expectedVersion is provided, verifies current stream length matches
   * - Throws descriptive error for version conflicts
   * - Atomic operation - either all events are added or none
   *
   * @param streamId - Unique identifier for the aggregate instance
   * @param aggregateType - Type of aggregate for proper categorization
   * @param events - Domain events to append to the stream
   * @param expectedVersion - Expected current stream version for concurrency control
   * @returns Promise that resolves when events are successfully stored
   * @throws Error for concurrency conflicts or validation failures
   */
  async append(
    streamId: GameId | TeamLineupId | InningStateId,
    aggregateType: 'Game' | 'TeamLineup' | 'InningState',
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const streamKey = streamId.value;
        const existingEvents = this.streams.get(streamKey) || [];

        // Optimistic concurrency control
        if (expectedVersion !== undefined && existingEvents.length !== expectedVersion) {
          throw new Error(
            `Concurrency conflict: expected version ${expectedVersion}, actual ${existingEvents.length}`
          );
        }

        // Handle empty event arrays
        if (events.length === 0) {
          resolve();
          return;
        }

        // Convert domain events to stored events with proper metadata
        const currentTime = new Date();
        const storedEvents: StoredEvent[] = events.map((event, index) => ({
          eventId: event.eventId,
          streamId: streamKey,
          aggregateType,
          eventType: event.type,
          eventData: JSON.stringify(event),
          eventVersion: 1, // Event schema version
          streamVersion: existingEvents.length + index + 1,
          timestamp: event.timestamp,
          metadata: this.createEventMetadata(currentTime),
        }));

        // Atomically update the stream
        this.streams.set(streamKey, [...existingEvents, ...storedEvents]);
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Retrieves events from a specific aggregate's stream.
   *
   * @remarks
   * This is the core Phase 1 implementation that:
   * - Returns events in stream version order
   * - Supports incremental loading with fromVersion parameter
   * - Returns empty array for non-existent streams
   * - Maintains complete StoredEvent structure integrity
   *
   * Version Filtering:
   * - If fromVersion is provided, returns events >= that version
   * - If fromVersion is 0 or negative, returns all events
   * - If fromVersion is beyond available events, returns empty array
   *
   * @param streamId - Unique identifier for the aggregate instance
   * @param fromVersion - Optional starting version for incremental loading
   * @returns Promise resolving to ordered array of stored events
   */
  async getEvents(
    streamId: GameId | TeamLineupId | InningStateId,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    return new Promise(resolve => {
      const streamKey = streamId.value;
      const events = this.streams.get(streamKey) || [];

      if (fromVersion === undefined || fromVersion <= 0) {
        resolve([...events]); // Return copy to prevent external mutation
        return;
      }

      resolve(events.filter(event => event.streamVersion >= fromVersion));
    });
  }

  /**
   * Retrieves all events related to a specific game across all aggregates.
   *
   * @remarks
   * Phase 2 implementation placeholder. Currently returns empty array.
   * Full cross-aggregate query implementation will be added in Phase 2.
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to empty array (Phase 1 placeholder)
   */
  async getGameEvents(_gameId: GameId): Promise<StoredEvent[]> {
    // Phase 2 implementation placeholder
    return Promise.resolve([]);
  }

  /**
   * Retrieves all events across all streams.
   *
   * @remarks
   * Phase 2 implementation placeholder. Currently returns empty array.
   * Full system-wide query implementation will be added in Phase 2.
   *
   * @param fromTimestamp - Optional timestamp filter for incremental queries
   * @returns Promise resolving to empty array (Phase 1 placeholder)
   */
  async getAllEvents(_fromTimestamp?: Date): Promise<StoredEvent[]> {
    // Phase 2 implementation placeholder
    return Promise.resolve([]);
  }

  /**
   * Retrieves events of a specific type across all streams.
   *
   * @remarks
   * Phase 2 implementation placeholder. Currently returns empty array.
   * Full event type filtering implementation will be added in Phase 2.
   *
   * @param eventType - Domain event type to filter by
   * @param fromTimestamp - Optional timestamp filter for time-based analysis
   * @returns Promise resolving to empty array (Phase 1 placeholder)
   */
  async getEventsByType(_eventType: string, _fromTimestamp?: Date): Promise<StoredEvent[]> {
    // Phase 2 implementation placeholder
    return Promise.resolve([]);
  }

  /**
   * Retrieves events for a game with optional filtering by aggregate type and time.
   *
   * @remarks
   * Phase 2 implementation placeholder. Currently returns empty array.
   * Full filtered cross-aggregate query implementation will be added in Phase 2.
   *
   * @param gameId - Unique identifier for the game
   * @param aggregateTypes - Optional aggregate types to include
   * @param fromTimestamp - Optional timestamp filter
   * @returns Promise resolving to empty array (Phase 1 placeholder)
   */
  async getEventsByGameId(
    _gameId: GameId,
    _aggregateTypes?: ('Game' | 'TeamLineup' | 'InningState')[],
    _fromTimestamp?: Date
  ): Promise<StoredEvent[]> {
    // Phase 2 implementation placeholder
    return Promise.resolve([]);
  }

  /**
   * Creates standardized metadata for stored events.
   *
   * @remarks
   * Generates consistent metadata for all stored events including:
   * - Source identification for debugging
   * - Storage timestamp for audit trails
   * - Extensible structure for future operational metadata
   *
   * @param createdAt - Timestamp when the event was stored
   * @returns Complete StoredEventMetadata with operational information
   */
  private createEventMetadata(createdAt: Date): StoredEventMetadata {
    return {
      source: 'InMemoryEventStore',
      createdAt,
      // Optional metadata fields can be added here as needed:
      // correlationId, causationId, userId
    };
  }
}
