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
 * Phase 2 Implementation:
 * - Cross-aggregate queries (getGameEvents, getAllEvents, etc.)
 * - Event type filtering and advanced queries
 * - Complete implementation of all EventStore interface methods
 *
 * Phase 3 Implementation (Error Handling & Edge Cases):
 * - Comprehensive parameter validation for all methods
 * - Enhanced error messages with actionable guidance
 * - Memory management with configurable limits
 * - Graceful handling of malformed event data
 * - Thread-safe concurrent access protection
 * - Custom error types for better debugging
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

// Local interface definitions to avoid Architecture boundary violations
// These interfaces match the Application layer ports exactly

// Direct domain imports to resolve type conflicts
// This ensures we're using the exact same types as the domain layer
import type { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';
// Import shared test interfaces for EventStore types
import type { EventStore, AggregateType } from '@twsoftball/shared';

/** Metadata attached to stored events for operational purposes */
interface StoredEventMetadata {
  readonly source: string;
  readonly createdAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
}

/** Stored event structure for event store persistence */
interface StoredEvent {
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

// EventStore interface now imported from shared test utilities

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
/**
 * Phase 3 Error Types for InMemoryEventStore
 * Custom error types for better error handling and debugging
 */
class EventStoreParameterError extends Error {
  constructor(message: string) {
    super(`Parameter validation failed: ${message}`);
    this.name = 'EventStoreParameterError';
  }
}

class EventStoreConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventStoreConcurrencyError';
  }
}

class EventStoreSerializationError extends Error {
  constructor(message: string) {
    super(`Event serialization failed: ${message}`);
    this.name = 'EventStoreSerializationError';
  }
}

class EventStoreMemoryError extends Error {
  constructor(message: string) {
    super(`Memory limit exceeded: ${message}`);
    this.name = 'EventStoreMemoryError';
  }
}

export class InMemoryEventStore implements EventStore {
  /**
   * Internal storage for event streams.
   * Key: streamId (string), Value: array of StoredEvents ordered by streamVersion
   */
  private readonly streams = new Map<string, StoredEvent[]>();

  /**
   * Memory management constants for Phase 3
   */
  private static readonly MAX_EVENTS_PER_BATCH = 5000;
  private static readonly MAX_TOTAL_EVENTS = 100000;
  private static readonly LARGE_BATCH_WARNING_THRESHOLD = 500;

  /**
   * Phase 3: Parameter validation for streamId
   * @private
   */
  private validateStreamId(
    streamId: GameId | TeamLineupId | InningStateId | null | undefined
  ): void {
    if (streamId === null || streamId === undefined) {
      throw new EventStoreParameterError('streamId cannot be null or undefined');
    }
  }

  /**
   * Phase 3: Parameter validation for aggregateType
   * @private
   */
  private validateAggregateType(aggregateType: unknown): asserts aggregateType is AggregateType {
    const validTypes: AggregateType[] = ['Game', 'TeamLineup', 'InningState'];
    if (!validTypes.includes(aggregateType as AggregateType)) {
      throw new EventStoreParameterError(`aggregateType must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Phase 3: Parameter validation for events array
   * @private
   */
  private validateEventsArray(events: DomainEvent[] | null | undefined): void {
    if (events === null || events === undefined) {
      throw new EventStoreParameterError('events cannot be null or undefined');
    }
    if (!Array.isArray(events)) {
      throw new EventStoreParameterError('events must be an array');
    }
  }

  /**
   * Phase 3: Parameter validation for expectedVersion
   * @private
   */
  private validateExpectedVersion(expectedVersion: number | undefined): void {
    if (expectedVersion !== undefined) {
      if (
        typeof expectedVersion !== 'number' ||
        expectedVersion < 0 ||
        !Number.isInteger(expectedVersion)
      ) {
        throw new EventStoreParameterError('expectedVersion must be a non-negative integer');
      }
    }
  }

  /**
   * Phase 3: Parameter validation for fromVersion
   * @private
   */
  private validateFromVersion(fromVersion: number | undefined): void {
    if (fromVersion !== undefined) {
      if (typeof fromVersion !== 'number' || fromVersion < 0 || !Number.isInteger(fromVersion)) {
        throw new EventStoreParameterError('fromVersion must be a positive integer');
      }
    }
  }

  /**
   * Phase 3: Parameter validation for timestamp
   * @private
   */
  private validateTimestamp(timestamp: Date | undefined): void {
    if (timestamp !== undefined) {
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
        throw new EventStoreParameterError('fromTimestamp must be a valid Date object');
      }
    }
  }

  /**
   * Phase 3: Parameter validation for event type
   * @private
   */
  private validateEventType(eventType: unknown): void {
    if (typeof eventType !== 'string' || eventType.trim() === '') {
      throw new EventStoreParameterError('eventType must be a non-empty string');
    }
  }

  /**
   * Phase 3: Parameter validation for aggregate types array
   * @private
   */
  private validateAggregateTypesArray(
    aggregateTypes: unknown
  ): asserts aggregateTypes is AggregateType[] | undefined {
    if (aggregateTypes !== undefined) {
      if (!Array.isArray(aggregateTypes)) {
        throw new EventStoreParameterError('aggregateTypes must be an array or undefined');
      }
      const validTypes: AggregateType[] = ['Game', 'TeamLineup', 'InningState'];
      const invalidTypes = (aggregateTypes as string[]).filter(
        type => !validTypes.includes(type as AggregateType)
      );
      if (invalidTypes.length > 0) {
        throw new EventStoreParameterError(
          `aggregateTypes must only contain valid aggregate types: ${validTypes.join(', ')}`
        );
      }
    }
  }

  /**
   * Phase 3: Memory management validation
   * @private
   */
  private validateMemoryLimits(events: DomainEvent[]): void {
    // Check batch size limits
    if (events.length > InMemoryEventStore.MAX_EVENTS_PER_BATCH) {
      throw new EventStoreMemoryError(
        `Batch size ${events.length} exceeds maximum allowed ${InMemoryEventStore.MAX_EVENTS_PER_BATCH}`
      );
    }

    // Check total events limit
    const totalEvents = Array.from(this.streams.values()).reduce(
      (total, streamEvents) => total + streamEvents.length,
      0
    );
    if (totalEvents + events.length > InMemoryEventStore.MAX_TOTAL_EVENTS) {
      throw new EventStoreMemoryError(
        `Total events would exceed maximum allowed ${InMemoryEventStore.MAX_TOTAL_EVENTS}`
      );
    }

    // Log warning for large batches
    if (events.length > InMemoryEventStore.LARGE_BATCH_WARNING_THRESHOLD) {
      // eslint-disable-next-line no-console, no-undef -- Development warning for memory management
      console.warn(
        `InMemoryEventStore: Large batch size detected (${events.length} events). Consider breaking into smaller batches for better performance.`
      );
    }
  }

  /**
   * Phase 3: Event serialization with error handling
   * @private
   */
  private safeSerializeEvent(event: DomainEvent): string {
    try {
      return JSON.stringify(event);
    } catch (error) {
      throw new EventStoreSerializationError(
        `Failed to serialize event ${event.eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Phase 3: Enhanced concurrency error with detailed context
   * @private
   */
  private createConcurrencyError(
    expectedVersion: number,
    actualVersion: number,
    streamId: string
  ): EventStoreConcurrencyError {
    return new EventStoreConcurrencyError(
      `Concurrency conflict detected for stream '${streamId}': expected version ${expectedVersion}, actual ${actualVersion}. ` +
        `Please reload the aggregate and retry the operation with current version: ${actualVersion}.`
    );
  }

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
    aggregateType: AggregateType,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Phase 3: Comprehensive parameter validation
        this.validateStreamId(streamId);
        this.validateAggregateType(aggregateType);
        this.validateEventsArray(events);
        this.validateExpectedVersion(expectedVersion);
        this.validateMemoryLimits(events);

        const streamKey = streamId.value;
        const existingEvents = this.streams.get(streamKey) || [];

        // Phase 3: Enhanced optimistic concurrency control with detailed error
        if (expectedVersion !== undefined && existingEvents.length !== expectedVersion) {
          throw this.createConcurrencyError(expectedVersion, existingEvents.length, streamKey);
        }

        // Handle empty event arrays gracefully (no validation error)
        if (events.length === 0) {
          resolve();
          return;
        }

        // Phase 3: Convert domain events to stored events with safe serialization
        const currentTime = new Date();
        const storedEvents: StoredEvent[] = events.map((event, index) => ({
          eventId: event.eventId,
          streamId: streamKey,
          aggregateType,
          eventType: event.type || event.constructor?.name || 'UnknownEvent',
          eventData: this.safeSerializeEvent(event), // Phase 3: Safe serialization
          eventVersion: 1, // Event schema version
          streamVersion: existingEvents.length + index + 1,
          timestamp: event.timestamp,
          metadata: this.createEventMetadata(currentTime),
        }));

        // Atomically update the stream (thread-safe with single-threaded JS)
        this.streams.set(streamKey, [...existingEvents, ...storedEvents]);
        resolve();
      } catch (error) {
        // Phase 3: Preserve custom error types
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
    return new Promise((resolve, reject) => {
      try {
        // Phase 3: Parameter validation
        this.validateStreamId(streamId);
        this.validateFromVersion(fromVersion);

        const streamKey = streamId.value;
        const events = this.streams.get(streamKey) || [];

        if (fromVersion === undefined || fromVersion <= 0) {
          resolve([...events]); // Return copy to prevent external mutation
          return;
        }

        resolve(events.filter(event => event.streamVersion >= fromVersion));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Retrieves all events related to a specific game across all aggregates.
   *
   * @remarks
   * Phase 2 implementation that queries across all aggregates (Game, TeamLineup, InningState)
   * to find events related to the specified game. Events are returned in chronological order
   * by their timestamp to provide a complete game timeline.
   *
   * Implementation details:
   * - Searches all streams for events containing the gameId
   * - Extracts gameId from serialized event data
   * - Maintains chronological ordering across aggregates
   * - Supports cross-aggregate game reconstruction
   *
   * @param gameId - Unique identifier for the game
   * @returns Promise resolving to chronologically ordered events for the game
   */
  async getGameEvents(gameId: GameId): Promise<StoredEvent[]> {
    return new Promise((resolve, reject) => {
      try {
        // Phase 3: Parameter validation
        this.validateStreamId(gameId);

        const gameEvents: StoredEvent[] = [];
        const targetGameIdValue = gameId.value;

        // Search all streams for events related to this game
        for (const events of this.streams.values()) {
          for (const event of events) {
            try {
              const eventData = JSON.parse(event.eventData) as { gameId?: { value: string } };
              // Check if event has gameId property that matches target
              if (eventData.gameId && eventData.gameId.value === targetGameIdValue) {
                gameEvents.push(event);
              }
            } catch (_error) {
              // Phase 3: Skip events with invalid JSON gracefully (defensive programming)
              continue;
            }
          }
        }

        // Sort by timestamp to maintain chronological ordering across aggregates
        gameEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        resolve(gameEvents);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Retrieves all events across all streams.
   *
   * @remarks
   * Phase 2 implementation that returns all events from all streams in the event store.
   * Events are ordered chronologically by their timestamp to provide a system-wide timeline.
   * Supports optional timestamp filtering for incremental queries.
   *
   * Implementation details:
   * - Collects events from all streams in storage
   * - Applies optional timestamp filtering
   * - Maintains chronological ordering across all aggregates
   * - Efficient for system-wide analytics and monitoring
   *
   * @param fromTimestamp - Optional timestamp filter for incremental queries
   * @returns Promise resolving to all events (filtered by timestamp if provided)
   */
  async getAllEvents(fromTimestamp?: Date): Promise<StoredEvent[]> {
    return new Promise((resolve, reject) => {
      try {
        // Phase 3: Parameter validation
        this.validateTimestamp(fromTimestamp);

        const allEvents: StoredEvent[] = [];

        // Collect events from all streams
        for (const events of this.streams.values()) {
          allEvents.push(...events);
        }

        // Apply timestamp filtering if provided
        const filteredEvents = fromTimestamp
          ? allEvents.filter(event => event.timestamp.getTime() >= fromTimestamp.getTime())
          : allEvents;

        // Sort by timestamp to maintain chronological ordering
        filteredEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        resolve(filteredEvents);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Retrieves events of a specific type across all streams.
   *
   * @remarks
   * Phase 2 implementation that filters events by their domain event type across all streams.
   * Events are returned in chronological order by timestamp. Supports optional timestamp
   * filtering for time-based analysis and incremental queries.
   *
   * Implementation details:
   * - Searches all streams for events matching the specified type
   * - Applies case-sensitive event type matching
   * - Supports optional timestamp filtering
   * - Maintains chronological ordering in results
   *
   * @param eventType - Domain event type to filter by
   * @param fromTimestamp - Optional timestamp filter for time-based analysis
   * @returns Promise resolving to events of the specified type
   */
  async getEventsByType(eventType: string, fromTimestamp?: Date): Promise<StoredEvent[]> {
    return new Promise((resolve, reject) => {
      try {
        // Phase 3: Parameter validation
        this.validateEventType(eventType);
        this.validateTimestamp(fromTimestamp);

        const matchingEvents: StoredEvent[] = [];

        // Search all streams for events of the specified type
        for (const events of this.streams.values()) {
          for (const event of events) {
            // Apply event type filter
            if (event.eventType === eventType) {
              // Apply timestamp filter if provided
              if (!fromTimestamp || event.timestamp.getTime() >= fromTimestamp.getTime()) {
                matchingEvents.push(event);
              }
            }
          }
        }

        // Sort by timestamp to maintain chronological ordering
        matchingEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        resolve(matchingEvents);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Retrieves events for a game with optional filtering by aggregate type and time.
   *
   * @remarks
   * Phase 2 implementation that provides flexible cross-aggregate querying for a specific game
   * with optional filtering by aggregate types and timestamp. This method combines the
   * game-level scope of getGameEvents with additional filtering capabilities.
   *
   * Implementation details:
   * - Searches all streams for events related to the specified game
   * - Applies aggregate type filtering if provided
   * - Applies timestamp filtering if provided
   * - Maintains chronological ordering in results
   * - Returns empty array if no aggregate types provided in filter
   *
   * @param gameId - Unique identifier for the game
   * @param aggregateTypes - Optional aggregate types to include
   * @param fromTimestamp - Optional timestamp filter
   * @returns Promise resolving to filtered events for the game
   */
  async getEventsByGameId(
    gameId: GameId,
    aggregateTypes?: AggregateType[],
    fromTimestamp?: Date
  ): Promise<StoredEvent[]> {
    return new Promise((resolve, reject) => {
      try {
        // Phase 3: Parameter validation
        this.validateStreamId(gameId);
        this.validateAggregateTypesArray(aggregateTypes);
        this.validateTimestamp(fromTimestamp);

        // Handle empty aggregate types array
        if (aggregateTypes && aggregateTypes.length === 0) {
          resolve([]);
          return;
        }

        const gameEvents: StoredEvent[] = [];
        const targetGameIdValue = gameId.value;

        // Search all streams for events related to this game
        for (const events of this.streams.values()) {
          for (const event of events) {
            try {
              const eventData = JSON.parse(event.eventData) as { gameId?: { value: string } };
              // Check if event has gameId property that matches target
              if (eventData.gameId && eventData.gameId.value === targetGameIdValue) {
                // Apply aggregate type filter if provided
                if (aggregateTypes && !aggregateTypes.includes(event.aggregateType)) {
                  continue;
                }

                // Apply timestamp filter if provided
                if (fromTimestamp && event.timestamp.getTime() < fromTimestamp.getTime()) {
                  continue;
                }

                gameEvents.push(event);
              }
            } catch (_error) {
              // Phase 3: Skip events with invalid JSON gracefully (defensive programming)
              continue;
            }
          }
        }

        // Sort by timestamp to maintain chronological ordering
        gameEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        resolve(gameEvents);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
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
