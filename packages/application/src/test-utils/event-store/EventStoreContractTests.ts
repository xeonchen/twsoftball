/**
 * @file EventStore Contract Tests
 * Abstract test suite that defines the standard behavior tests for EventStore implementations.
 * Concrete test files can extend this to get comprehensive test coverage with no duplication.
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { EventStore } from '../../ports/out/EventStore';

import {
  createMockGameCreatedEvent,
  createMockAtBatCompletedEvent,
  createMockTeamLineupCreatedEvent,
  createMockInningStateCreatedEvent,
  createMockGameId,
  createMockTeamLineupId,
  createMockInningStateId,
  createMockEventBatch,
} from './MockEventCreators';

/**
 * Abstract test suite providing comprehensive contract tests for EventStore implementations.
 *
 * Defines a complete test specification that any EventStore implementation must pass
 * to ensure compliance with the TW Softball application's persistence requirements.
 * Eliminates test duplication while ensuring consistent behavior across all EventStore
 * adapters (IndexedDB, SQLite, in-memory, etc.).
 *
 * @remarks
 * **Test Coverage Areas:**
 * - Interface compliance and method signatures
 * - Event appending with proper serialization and versioning
 * - Event retrieval across all query patterns
 * - Cross-aggregate game event querying
 * - Optimistic concurrency control and conflict detection
 * - Error handling and edge case scenarios
 * - Performance requirements and batch operations
 *
 * **Usage Pattern:**
 * Concrete EventStore test classes extend this abstract class and implement
 * the `createEventStore()` factory method. The contract tests are then executed
 * via `runContractTests()` to ensure implementation compliance.
 *
 * **Event Sourcing Requirements:**
 * Tests validate critical event sourcing patterns including:
 * - Stream versioning and concurrency control
 * - Event ordering and temporal consistency
 * - Cross-aggregate querying for game state reconstruction
 * - Serialization fidelity for domain events
 *
 * @example
 * ```typescript
 * class IndexedDBEventStoreContractTests extends EventStoreContractTests {
 *   async createEventStore(): Promise<EventStore> {
 *     const mockDB = createEventStoreMockDatabase();
 *     return new IndexedDBEventStore(mockDB);
 *   }
 * }
 *
 * const contractTests = new IndexedDBEventStoreContractTests();
 * contractTests.runContractTests('IndexedDB EventStore');
 * ```
 */
export abstract class EventStoreContractTests {
  protected eventStore!: EventStore;
  protected gameId!: GameId;
  protected teamLineupId!: TeamLineupId;
  protected inningStateId!: InningStateId;
  protected mockEvents!: DomainEvent[];

  /**
   * Factory method that subclasses must implement to provide fresh EventStore instances.
   *
   * Each test requires a clean EventStore instance to ensure test isolation
   * and prevent data pollution between test cases. Implementations should
   * return a fully configured EventStore ready for testing.
   *
   * @returns Promise resolving to a fresh, empty EventStore instance
   *
   * @example
   * ```typescript
   * async createEventStore(): Promise<EventStore> {
   *   // Setup clean database
   *   const mockDB = createEventStoreMockDatabase();
   *
   *   // Return configured EventStore
   *   return new IndexedDBEventStore(mockDB);
   * }
   * ```
   */
  abstract createEventStore(): Promise<EventStore>;

  /**
   * Optional cleanup hook that subclasses can override for resource cleanup.
   *
   * Called after each test to clean up any resources, close connections,
   * or reset state. Default implementation does nothing, but subclasses
   * can override to provide specific cleanup logic.
   *
   * @example
   * ```typescript
   * async tearDown(): Promise<void> {
   *   await this.eventStore.close();
   *   await cleanupTestDatabase();
   * }
   * ```
   */
  async tearDown(): Promise<void> {
    // Default: no cleanup needed
  }

  /**
   * Initializes common test data and fixtures for all contract tests.
   *
   * Creates fresh EventStore instance and generates mock domain objects
   * (GameId, TeamLineupId, InningStateId) and events used across all test cases.
   * Ensures consistent test data setup for repeatable test execution.
   *
   * @remarks
   * Test fixtures include:
   * - Fresh EventStore instance via createEventStore()
   * - Mock aggregate IDs for all three aggregate types
   * - Sample domain events for testing serialization and storage
   *
   * Called automatically before each test via beforeEach hook.
   */
  async setUp(): Promise<void> {
    this.eventStore = await this.createEventStore();
    this.gameId = createMockGameId();
    this.teamLineupId = createMockTeamLineupId();
    this.inningStateId = createMockInningStateId();
    this.mockEvents = [
      createMockGameCreatedEvent(this.gameId),
      createMockAtBatCompletedEvent(this.gameId),
    ];
  }

  /**
   * Executes the complete EventStore contract test suite.
   *
   * Runs all contract tests organized into logical test groups covering
   * every aspect of EventStore behavior required by the TW Softball application.
   * Ensures comprehensive validation of EventStore implementation compliance.
   *
   * @param suiteName - Descriptive name for the test suite (used in test output)
   *
   * @remarks
   * Test groups executed:
   * 1. Interface Contract - Method presence and return types
   * 2. Append Operations - Event storage and versioning
   * 3. Event Retrieval - Stream-based queries
   * 4. Game Events - Cross-aggregate queries
   * 5. Global Queries - All events and type-specific queries
   * 6. Concurrency Control - Optimistic locking validation
   * 7. Error Handling - Edge cases and failure scenarios
   * 8. Performance - Batch operations and scalability
   *
   * @example
   * ```typescript
   * const contractTests = new MyEventStoreTests();
   * contractTests.runContractTests('MyEventStore Implementation');
   * ```
   */
  runContractTests(suiteName: string = 'EventStore Contract'): void {
    describe(suiteName, () => {
      beforeEach(async () => {
        await this.setUp();
      });

      this.defineInterfaceTests();
      this.defineAppendTests();
      this.defineGetEventsTests();
      this.defineGameEventsTests();
      this.defineGetAllEventsTests();
      this.defineGetEventsByTypeTests();
      this.defineGetEventsByGameIdTests();
      this.defineConcurrencyTests();
      this.defineErrorHandlingTests();
      this.definePerformanceTests();
    });
  }

  /**
   * Validates EventStore interface compliance and method signatures.
   *
   * Ensures the EventStore implementation provides all required methods
   * with correct signatures and return types. Critical for maintaining
   * consistent API contracts across different persistence adapters.
   */
  private defineInterfaceTests(): void {
    describe('Interface Contract', () => {
      it('should define all required methods', () => {
        expect(typeof this.eventStore.append).toBe('function');
        expect(typeof this.eventStore.getEvents).toBe('function');
        expect(typeof this.eventStore.getGameEvents).toBe('function');
        expect(typeof this.eventStore.getAllEvents).toBe('function');
        expect(typeof this.eventStore.getEventsByType).toBe('function');
        expect(typeof this.eventStore.getEventsByGameId).toBe('function');
      });

      it('should return promises for all methods', () => {
        expect(this.eventStore.append(this.gameId, 'Game', this.mockEvents)).toBeInstanceOf(
          Promise
        );
        expect(this.eventStore.getEvents(this.gameId)).toBeInstanceOf(Promise);
        expect(this.eventStore.getGameEvents(this.gameId)).toBeInstanceOf(Promise);
        expect(this.eventStore.getAllEvents()).toBeInstanceOf(Promise);
        expect(this.eventStore.getEventsByType('GameCreated')).toBeInstanceOf(Promise);
        expect(this.eventStore.getEventsByGameId(this.gameId)).toBeInstanceOf(Promise);
      });
    });
  }

  /**
   * Tests event appending functionality across all aggregate types.
   *
   * Validates proper event storage, serialization, versioning, and ordering
   * for Game, TeamLineup, and InningState aggregates. Ensures events are
   * stored with correct metadata and can be retrieved accurately.
   */
  private defineAppendTests(): void {
    describe('append Method', () => {
      it('should append events to Game aggregate stream', async () => {
        await this.eventStore.append(this.gameId, 'Game', this.mockEvents);

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        expect(storedEvents).toHaveLength(2);
        expect(storedEvents[0]?.aggregateType).toBe('Game');
        expect(storedEvents[0]?.streamId).toBe(this.gameId.value);
      });

      it('should append events to TeamLineup aggregate stream', async () => {
        const teamEvent = createMockTeamLineupCreatedEvent(this.gameId, this.teamLineupId);
        await this.eventStore.append(this.teamLineupId, 'TeamLineup', [teamEvent]);

        const storedEvents = await this.eventStore.getEvents(this.teamLineupId);
        expect(storedEvents).toHaveLength(1);
        expect(storedEvents[0]?.aggregateType).toBe('TeamLineup');
        expect(storedEvents[0]?.streamId).toBe(this.teamLineupId.value);
      });

      it('should append events to InningState aggregate stream', async () => {
        const inningEvent = createMockInningStateCreatedEvent(this.gameId, this.inningStateId);
        await this.eventStore.append(this.inningStateId, 'InningState', [inningEvent]);

        const storedEvents = await this.eventStore.getEvents(this.inningStateId);
        expect(storedEvents).toHaveLength(1);
        expect(storedEvents[0]?.aggregateType).toBe('InningState');
        expect(storedEvents[0]?.streamId).toBe(this.inningStateId.value);
      });

      it('should maintain event order within stream', async () => {
        await this.eventStore.append(this.gameId, 'Game', this.mockEvents);

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        expect(storedEvents[0]?.eventType).toBe('GameCreated');
        expect(storedEvents[1]?.eventType).toBe('AtBatCompleted');
        expect(storedEvents[0]?.streamVersion).toBe(1);
        expect(storedEvents[1]?.streamVersion).toBe(2);
      });

      it('should handle empty event arrays gracefully', async () => {
        await expect(this.eventStore.append(this.gameId, 'Game', [])).resolves.not.toThrow();

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        expect(storedEvents).toHaveLength(0);
      });

      it('should serialize domain events correctly', async () => {
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[0]!]);

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        const eventData = JSON.parse(storedEvents[0]!.eventData);

        expect(eventData.type).toBe('GameCreated');
        expect(eventData.gameId.value).toBe(this.gameId.value);
      });
    });
  }

  /**
   * Tests stream-based event retrieval functionality.
   *
   * Validates retrieval of events from specific aggregate streams,
   * including version-based filtering and proper StoredEvent structure.
   * Essential for aggregate reconstruction in event sourcing.
   */
  private defineGetEventsTests(): void {
    describe('getEvents Method', () => {
      beforeEach(async () => {
        await this.eventStore.append(this.gameId, 'Game', this.mockEvents);
      });

      it('should retrieve all events from stream', async () => {
        const events = await this.eventStore.getEvents(this.gameId);

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(2);
        expect(events[0]!).toHaveProperty('eventId');
        expect(events[0]!).toHaveProperty('streamId');
        expect(events[0]!).toHaveProperty('eventType');
        expect(events[0]!).toHaveProperty('eventData');
      });

      it('should retrieve events from specific version', async () => {
        const events = await this.eventStore.getEvents(this.gameId, 2);

        expect(events).toHaveLength(1);
        expect(events[0]!.streamVersion).toBe(2);
        expect(events[0]!.eventType).toBe('AtBatCompleted');
      });

      it('should return empty array for non-existent stream', async () => {
        const nonExistentId = createMockGameId();
        const events = await this.eventStore.getEvents(nonExistentId);

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(0);
      });

      it('should maintain StoredEvent structure', async () => {
        const events = await this.eventStore.getEvents(this.gameId);
        const event = events[0]!;

        expect(event.eventId).toBeDefined();
        expect(event.streamId).toBe(this.gameId.value);
        expect(event.eventType).toBe('GameCreated');
        expect(typeof event.eventData).toBe('string');
        expect(typeof event.eventVersion).toBe('number');
        expect(typeof event.streamVersion).toBe('number');
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.metadata).toBeDefined();
        expect(event.metadata.source).toBeDefined();
        expect(event.metadata.createdAt).toBeInstanceOf(Date);
      });
    });
  }

  /**
   * Tests cross-aggregate game event querying functionality.
   *
   * Validates retrieval of all events related to a specific game across
   * all aggregate types (Game, TeamLineup, InningState). Critical for
   * complete game state reconstruction and consistency validation.
   */
  private defineGameEventsTests(): void {
    describe('getGameEvents Method', () => {
      beforeEach(async () => {
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[0]!]);
        await this.eventStore.append(this.teamLineupId, 'TeamLineup', [this.mockEvents[0]!]);
        await this.eventStore.append(this.inningStateId, 'InningState', [this.mockEvents[1]!]);
      });

      it('should retrieve events from all aggregates for a game', async () => {
        const events = await this.eventStore.getGameEvents(this.gameId);

        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThan(0);

        // All events should be related to the game
        events.forEach(event => {
          const eventData = JSON.parse(event.eventData);
          expect(eventData.gameId.value).toBe(this.gameId.value);
        });
      });

      it('should return events in chronological order', async () => {
        const events = await this.eventStore.getGameEvents(this.gameId);

        for (let i = 1; i < events.length; i++) {
          expect(events[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
            events[i - 1]!.timestamp.getTime()
          );
        }
      });

      it('should return empty array for game with no events', async () => {
        const emptyGameId = createMockGameId();
        const events = await this.eventStore.getGameEvents(emptyGameId);

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(0);
      });
    });
  }

  /**
   * Tests global event retrieval across all streams and aggregates.
   *
   * Validates retrieval of all events in the EventStore with optional
   * timestamp filtering. Important for audit trails, debugging, and
   * system-wide event processing scenarios.
   */
  private defineGetAllEventsTests(): void {
    describe('getAllEvents Method', () => {
      beforeEach(async () => {
        await this.eventStore.append(this.gameId, 'Game', this.mockEvents);
      });

      it('should retrieve all events across all streams', async () => {
        const events = await this.eventStore.getAllEvents();

        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by timestamp when provided', async () => {
        const futureTime = new Date(Date.now() + 10000);
        const events = await this.eventStore.getAllEvents(futureTime);

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(0);
      });

      it('should return events in chronological order', async () => {
        const events = await this.eventStore.getAllEvents();

        for (let i = 1; i < events.length; i++) {
          expect(events[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
            events[i - 1]!.timestamp.getTime()
          );
        }
      });
    });
  }

  /**
   * Tests event type-based filtering and retrieval functionality.
   *
   * Validates filtering of events by specific event types across all
   * streams. Essential for event processing scenarios that need to
   * handle specific event types (e.g., all GameCreated events).
   */
  private defineGetEventsByTypeTests(): void {
    describe('getEventsByType Method', () => {
      beforeEach(async () => {
        await this.eventStore.append(this.gameId, 'Game', this.mockEvents);
      });

      it('should filter events by type', async () => {
        const events = await this.eventStore.getEventsByType('GameCreated');

        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThan(0);
        events.forEach(event => {
          expect(event.eventType).toBe('GameCreated');
        });
      });

      it('should return empty array for non-existent event type', async () => {
        const events = await this.eventStore.getEventsByType('NonExistentEvent');

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(0);
      });

      it('should filter by timestamp when provided', async () => {
        const futureTime = new Date(Date.now() + 10000);
        const events = await this.eventStore.getEventsByType('GameCreated', futureTime);

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(0);
      });
    });
  }

  /**
   * Tests game-specific event retrieval with aggregate type filtering.
   *
   * Validates retrieval of events for a specific game with optional
   * filtering by aggregate types. Critical for focused game state
   * queries and selective event processing.
   */
  private defineGetEventsByGameIdTests(): void {
    describe('getEventsByGameId Method', () => {
      beforeEach(async () => {
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[0]!]);
        await this.eventStore.append(this.teamLineupId, 'TeamLineup', [this.mockEvents[0]!]);
        await this.eventStore.append(this.inningStateId, 'InningState', [this.mockEvents[1]!]);
      });

      it('should retrieve all events for a game', async () => {
        const events = await this.eventStore.getEventsByGameId(this.gameId);

        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThan(0);
      });

      it('should filter by aggregate types when specified', async () => {
        const events = await this.eventStore.getEventsByGameId(this.gameId, ['Game']);

        expect(Array.isArray(events)).toBe(true);
        events.forEach(event => {
          expect(event.aggregateType).toBe('Game');
        });
      });

      it('should filter by multiple aggregate types', async () => {
        const events = await this.eventStore.getEventsByGameId(this.gameId, ['Game', 'TeamLineup']);

        expect(Array.isArray(events)).toBe(true);
        events.forEach(event => {
          expect(['Game', 'TeamLineup']).toContain(event.aggregateType);
        });
      });

      it('should filter by timestamp when provided', async () => {
        const futureTime = new Date(Date.now() + 10000);
        const events = await this.eventStore.getEventsByGameId(this.gameId, undefined, futureTime);

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(0);
      });
    });
  }

  /**
   * Tests optimistic concurrency control and version conflict detection.
   *
   * Validates proper handling of concurrent modifications to the same
   * event stream, ensuring data consistency and proper conflict resolution
   * in multi-user softball game scenarios.
   */
  private defineConcurrencyTests(): void {
    describe('Concurrency Control', () => {
      it('should handle expected version for optimistic concurrency', async () => {
        // First append
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[0]!], 0);

        // Second append with correct expected version
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[1]!], 1);

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        expect(storedEvents).toHaveLength(2);
      });

      it('should throw error on version conflict', async () => {
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[0]!]);

        // Try to append with incorrect expected version
        await expect(
          this.eventStore.append(this.gameId, 'Game', [this.mockEvents[1]!], 0)
        ).rejects.toThrow();
      });
    });
  }

  /**
   * Tests error handling and edge case scenarios.
   *
   * Validates proper behavior with large datasets, edge cases,
   * and boundary conditions that could occur in production
   * softball game event storage scenarios.
   */
  private defineErrorHandlingTests(): void {
    describe('Error Handling', () => {
      it('should handle large event batches', async () => {
        const largeBatch = createMockEventBatch(this.gameId, 100);

        await expect(
          this.eventStore.append(this.gameId, 'Game', largeBatch)
        ).resolves.not.toThrow();

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        expect(storedEvents).toHaveLength(100);

        // Verify sequential version numbers
        storedEvents.forEach((event, index) => {
          expect(event.streamVersion).toBe(index + 1);
        });
      });
    });
  }

  /**
   * Tests performance requirements and sequential operation handling.
   *
   * Validates that the EventStore can handle multiple sequential
   * operations correctly and maintains proper versioning under
   * typical usage patterns in softball game management.
   */
  private definePerformanceTests(): void {
    describe('Performance Requirements', () => {
      it('should handle multiple sequential appends correctly', async () => {
        // First append
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[0]!]);

        // Second append
        await this.eventStore.append(this.gameId, 'Game', [this.mockEvents[1]!]);

        const storedEvents = await this.eventStore.getEvents(this.gameId);
        expect(storedEvents).toHaveLength(2);
        expect(storedEvents[0]?.streamVersion).toBe(1);
        expect(storedEvents[1]?.streamVersion).toBe(2);
        expect(storedEvents[0]?.eventType).toBe('GameCreated');
        expect(storedEvents[1]?.eventType).toBe('AtBatCompleted');
      });
    });
  }
}
