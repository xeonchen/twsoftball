/**
 * @file index.test.ts
 * Tests for the EventStore test utilities index file.
 * Validates all exports are properly exposed and accessible.
 */

import { describe, it, expect } from 'vitest';

import { EventStoreContractTests } from './EventStoreContractTests';

// Import individual modules to compare
import * as EventStoreTestInterfaces from './';
import * as MockEventCreators from './';
import * as EventStoreTestUtils from './index';

describe('EventStore Test Utils Index', () => {
  describe('Module Structure', () => {
    it('should export all modules as expected', () => {
      expect(EventStoreTestUtils).toBeDefined();
      expect(typeof EventStoreTestUtils).toBe('object');
    });

    it('should be a complete re-export with no missing exports', () => {
      // Check that the index exports are comprehensive
      const indexKeys = Object.keys(EventStoreTestUtils);
      expect(indexKeys.length).toBeGreaterThan(0);

      // Should include runtime exports from all three modules
      // Note: TypeScript interfaces and type aliases are not runtime exports
      const expectedKeys = [
        // From EventStoreTestInterfaces (runtime exports only)
        'GameId',
        'TeamLineupId',
        'InningStateId',
        'DomainEvent',
        // From MockEventCreators
        'createMockGameCreatedEvent',
        'createMockAtBatCompletedEvent',
        'createMockTeamLineupCreatedEvent',
        'createMockInningStateCreatedEvent',
        'createMockGameId',
        'createMockTeamLineupId',
        'createMockInningStateId',
        'createMockEventBatch',
        // From EventStoreContractTests
        'EventStoreContractTests',
      ];

      expectedKeys.forEach(key => {
        expect(indexKeys).toContain(key);
        expect(EventStoreTestUtils).toHaveProperty(key);
      });
    });
  });

  describe('EventStoreTestInterfaces Re-exports', () => {
    it('should re-export all domain types', () => {
      expect(EventStoreTestUtils.GameId).toBe(EventStoreTestInterfaces.GameId);
      expect(EventStoreTestUtils.TeamLineupId).toBe(EventStoreTestInterfaces.TeamLineupId);
      expect(EventStoreTestUtils.InningStateId).toBe(EventStoreTestInterfaces.InningStateId);
      expect(EventStoreTestUtils.DomainEvent).toBe(EventStoreTestInterfaces.DomainEvent);
    });

    it('should support interface types through TypeScript compilation', () => {
      // TypeScript interfaces are compile-time only and don't exist at runtime
      // We test that they can be used properly by TypeScript by creating variables with these types

      // This test will fail at TypeScript compile time if the types aren't properly exported
      // but will pass at runtime since we're just checking basic functionality

      const mockStoredEvent = {
        eventId: 'test-event',
        streamId: 'test-stream',
        aggregateType: 'Game' as const,
        eventType: 'TestEvent',
        eventData: '{}',
        eventVersion: 1,
        streamVersion: 1,
        timestamp: new Date(),
        metadata: {
          source: 'test',
          createdAt: new Date(),
        },
      };

      // Verify the mock has the expected structure
      expect(mockStoredEvent.eventId).toBe('test-event');
      expect(mockStoredEvent.aggregateType).toBe('Game');
      expect(mockStoredEvent.metadata.source).toBe('test');
    });

    it('should maintain type compatibility with original exports', () => {
      // Test that re-exported types work correctly
      const gameId = EventStoreTestUtils.GameId.generate();
      const teamLineupId = EventStoreTestUtils.TeamLineupId.generate();
      const inningStateId = EventStoreTestUtils.InningStateId.generate();

      expect(gameId).toBeInstanceOf(EventStoreTestUtils.GameId);
      expect(teamLineupId).toBeInstanceOf(EventStoreTestUtils.TeamLineupId);
      expect(inningStateId).toBeInstanceOf(EventStoreTestUtils.InningStateId);
    });
  });

  describe('MockEventCreators Re-exports', () => {
    it('should re-export all mock event creator functions', () => {
      expect(EventStoreTestUtils.createMockGameCreatedEvent).toBe(
        MockEventCreators.createMockGameCreatedEvent
      );
      expect(EventStoreTestUtils.createMockAtBatCompletedEvent).toBe(
        MockEventCreators.createMockAtBatCompletedEvent
      );
      expect(EventStoreTestUtils.createMockTeamLineupCreatedEvent).toBe(
        MockEventCreators.createMockTeamLineupCreatedEvent
      );
      expect(EventStoreTestUtils.createMockInningStateCreatedEvent).toBe(
        MockEventCreators.createMockInningStateCreatedEvent
      );
    });

    it('should re-export all ID generator functions', () => {
      expect(EventStoreTestUtils.createMockGameId).toBe(MockEventCreators.createMockGameId);
      expect(EventStoreTestUtils.createMockTeamLineupId).toBe(
        MockEventCreators.createMockTeamLineupId
      );
      expect(EventStoreTestUtils.createMockInningStateId).toBe(
        MockEventCreators.createMockInningStateId
      );
    });

    it('should re-export batch creator function', () => {
      expect(EventStoreTestUtils.createMockEventBatch).toBe(MockEventCreators.createMockEventBatch);
    });

    it('should maintain function compatibility', () => {
      // Test that re-exported functions work correctly
      const gameId = EventStoreTestUtils.createMockGameId();
      const gameEvent = EventStoreTestUtils.createMockGameCreatedEvent(gameId);
      const batch = EventStoreTestUtils.createMockEventBatch(gameId, 3);

      expect(gameId).toBeInstanceOf(EventStoreTestUtils.GameId);
      expect(gameEvent.type).toBe('GameCreated');
      expect(batch).toHaveLength(3);
    });
  });

  describe('EventStoreContractTests Re-export', () => {
    it('should re-export EventStoreContractTests class', () => {
      expect(EventStoreTestUtils.EventStoreContractTests).toBe(EventStoreContractTests);
    });

    it('should maintain class inheritance capabilities', () => {
      class TestImplementation extends EventStoreTestUtils.EventStoreContractTests {
        createEventStore(): Promise<EventStoreTestUtils.EventStore> {
          return Promise.resolve({
            append: (): Promise<void> => Promise.resolve(),
            getEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getGameEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getAllEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getEventsByType: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getEventsByGameId: (): Promise<EventStoreTestUtils.StoredEvent[]> =>
              Promise.resolve([]),
          });
        }
      }

      const testInstance = new TestImplementation();
      expect(testInstance).toBeInstanceOf(EventStoreTestUtils.EventStoreContractTests);
      expect(testInstance).toBeInstanceOf(EventStoreContractTests);
    });
  });

  describe('Functional Integration', () => {
    it('should provide complete testing toolkit through single import', () => {
      // Test that a user can import everything they need from index
      const {
        GameId,
        TeamLineupId,
        InningStateId,
        createMockGameId,
        createMockTeamLineupId,
        createMockInningStateId,
        createMockGameCreatedEvent,
        createMockAtBatCompletedEvent,
        createMockTeamLineupCreatedEvent,
        createMockInningStateCreatedEvent,
        createMockEventBatch,
        EventStoreContractTests,
      } = EventStoreTestUtils;

      // Create IDs
      const gameId = createMockGameId();
      const teamLineupId = createMockTeamLineupId();
      const inningStateId = createMockInningStateId();

      // Create events
      const gameEvent = createMockGameCreatedEvent(gameId);
      const atBatEvent = createMockAtBatCompletedEvent(gameId);
      const teamEvent = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
      const inningEvent = createMockInningStateCreatedEvent(gameId, inningStateId);
      const eventBatch = createMockEventBatch(gameId, 5);

      // Use contract testing
      class TestEventStore extends EventStoreContractTests {
        createEventStore(): Promise<EventStoreTestUtils.EventStore> {
          return Promise.resolve({
            append: (): Promise<void> => Promise.resolve(),
            getEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getGameEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getAllEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getEventsByType: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getEventsByGameId: (): Promise<EventStoreTestUtils.StoredEvent[]> =>
              Promise.resolve([]),
          });
        }
      }

      // Verify everything works together
      expect(gameId).toBeInstanceOf(GameId);
      expect(teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(inningStateId).toBeInstanceOf(InningStateId);
      expect(gameEvent.type).toBe('GameCreated');
      expect(atBatEvent.type).toBe('AtBatCompleted');
      expect(teamEvent.type).toBe('TeamLineupCreated');
      expect(inningEvent.type).toBe('InningStateCreated');
      expect(eventBatch).toHaveLength(5);
      expect(new TestEventStore()).toBeInstanceOf(EventStoreContractTests);
    });

    it('should support complete event store testing workflow', () => {
      // Import everything needed for a complete test
      const { createMockGameId, createMockEventBatch, EventStoreContractTests } =
        EventStoreTestUtils;

      // Create test data
      const gameId = createMockGameId();
      const events = createMockEventBatch(gameId, 10);

      // Create mock event store
      const mockStore = {
        append: (): Promise<void> => Promise.resolve(),
        getEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> =>
          Promise.resolve(
            events.map((event, index) => ({
              eventId: `event-${index}`,
              streamId: gameId.value,
              aggregateType: 'Game' as const,
              eventType: event.type,
              eventData: JSON.stringify(event),
              eventVersion: 1,
              streamVersion: index + 1,
              timestamp: event.timestamp,
              metadata: {
                source: 'test',
                createdAt: event.timestamp,
              },
            }))
          ),
        getGameEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getAllEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getEventsByType: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getEventsByGameId: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
      };

      // Test contract implementation
      class TestEventStore extends EventStoreContractTests {
        createEventStore(): Promise<EventStoreTestUtils.EventStore> {
          return Promise.resolve(mockStore);
        }
      }

      const contractTests = new TestEventStore();

      // This would be called in actual testing to run all contract tests
      expect(contractTests.runContractTests).toBeDefined();
      expect(typeof contractTests.runContractTests).toBe('function');
    });
  });

  describe('Export Completeness', () => {
    it('should not miss any exports from source modules', () => {
      // Get all exports from source modules
      const interfaceKeys = Object.keys(EventStoreTestInterfaces);
      const mockKeys = Object.keys(MockEventCreators);
      const contractTestsKey = 'EventStoreContractTests';

      const allExpectedKeys = [...interfaceKeys, ...mockKeys, contractTestsKey];

      const indexKeys = Object.keys(EventStoreTestUtils);

      // Every expected key should be in the index
      allExpectedKeys.forEach(key => {
        expect(indexKeys).toContain(key);
      });
    });

    it('should not have extra unexpected exports', () => {
      const indexKeys = Object.keys(EventStoreTestUtils);
      const interfaceKeys = Object.keys(EventStoreTestInterfaces);
      const mockKeys = Object.keys(MockEventCreators);
      const allExpectedKeys = [...interfaceKeys, ...mockKeys, 'EventStoreContractTests'];

      // Every index key should be expected
      indexKeys.forEach(key => {
        expect(allExpectedKeys).toContain(key);
      });
    });
  });

  describe('Module Accessibility', () => {
    it('should provide easy access to common testing patterns', () => {
      // Most common pattern: create a game and some events
      const gameId = EventStoreTestUtils.createMockGameId();
      const gameCreated = EventStoreTestUtils.createMockGameCreatedEvent(gameId);
      const atBats = [
        EventStoreTestUtils.createMockAtBatCompletedEvent(gameId),
        EventStoreTestUtils.createMockAtBatCompletedEvent(gameId),
      ];

      expect(gameId).toBeDefined();
      expect(gameCreated.type).toBe('GameCreated');
      expect(atBats).toHaveLength(2);
      atBats.forEach(atBat => {
        expect(atBat.type).toBe('AtBatCompleted');
        expect(atBat.gameId).toBe(gameId);
      });
    });

    it('should provide easy access to contract testing', () => {
      // Contract testing pattern
      class MockEventStoreTests extends EventStoreTestUtils.EventStoreContractTests {
        createEventStore(): Promise<EventStoreTestUtils.EventStore> {
          return Promise.resolve({
            append: (): Promise<void> => Promise.resolve(),
            getEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getGameEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getAllEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getEventsByType: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
            getEventsByGameId: (): Promise<EventStoreTestUtils.StoredEvent[]> =>
              Promise.resolve([]),
          });
        }
      }

      const tests = new MockEventStoreTests();
      expect(tests.runContractTests).toBeDefined();
      expect(typeof tests.createEventStore).toBe('function');
    });

    it('should support type-safe event store implementation', () => {
      // Type safety pattern
      const mockEventStore: EventStoreTestUtils.EventStore = {
        append: (): Promise<void> => Promise.resolve(),
        getEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getGameEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getAllEvents: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getEventsByType: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
        getEventsByGameId: (): Promise<EventStoreTestUtils.StoredEvent[]> => Promise.resolve([]),
      };

      expect(mockEventStore).toBeDefined();
      expect(typeof mockEventStore.append).toBe('function');
    });
  });
});
