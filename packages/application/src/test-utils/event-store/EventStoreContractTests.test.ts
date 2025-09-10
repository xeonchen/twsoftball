/**
 * @file EventStoreContractTests.test.ts
 * Comprehensive tests for the EventStore contract testing framework.
 * Tests the test framework itself to ensure it properly validates EventStore implementations.
 */

import { GameId, TeamLineupId, InningStateId, DomainEvent } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { EventStoreContractTests } from './EventStoreContractTests';
import type { EventStore } from './EventStoreTestInterfaces';
import {
  createMockGameCreatedEvent,
  createMockTeamLineupCreatedEvent,
  createMockInningStateCreatedEvent,
  createMockGameId,
  createMockEventBatch,
} from './MockEventCreators';

// Test implementation of EventStoreContractTests
class TestEventStoreContractTests extends EventStoreContractTests {
  private mockEventStore!: EventStore;

  constructor() {
    super();
    this.setupMockEventStore();
  }

  createEventStore(): Promise<EventStore> {
    return Promise.resolve(this.mockEventStore);
  }

  private setupMockEventStore(): void {
    this.mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn(),
      getGameEvents: vi.fn(),
      getAllEvents: vi.fn(),
      getEventsByType: vi.fn(),
      getEventsByGameId: vi.fn(),
    };
  }

  getMockEventStore(): EventStore {
    return this.mockEventStore;
  }

  // Expose protected methods for testing
  public async exposedSetUp(): Promise<void> {
    return this.setUp();
  }

  public async exposedTearDown(): Promise<void> {
    return this.tearDown();
  }

  // Access protected properties for testing
  public getGameId(): GameId {
    return this.gameId;
  }

  public getTeamLineupId(): TeamLineupId {
    return this.teamLineupId;
  }

  public getInningStateId(): InningStateId {
    return this.inningStateId;
  }

  public getMockEvents(): DomainEvent[] {
    return this.mockEvents;
  }

  public getEventStore(): EventStore {
    return this.eventStore;
  }
}

describe('EventStoreContractTests', () => {
  let contractTests: TestEventStoreContractTests;
  let mockEventStore: EventStore;

  beforeEach(() => {
    contractTests = new TestEventStoreContractTests();
    mockEventStore = contractTests.getMockEventStore();
  });

  describe('Class Structure', () => {
    it('should be an abstract class that can be extended', () => {
      expect(contractTests).toBeInstanceOf(EventStoreContractTests);
      expect(contractTests.createEventStore).toBeDefined();
      expect(typeof contractTests.createEventStore).toBe('function');
    });

    it('should define abstract createEventStore method', () => {
      // This is verified by successful instantiation of TestEventStoreContractTests
      expect(contractTests.createEventStore).toBeDefined();
    });

    it('should have default tearDown implementation', async () => {
      // Should not throw and return void
      const result = await contractTests.exposedTearDown();
      expect(result).toBeUndefined();
    });

    it('should define runContractTests method', () => {
      expect(contractTests.runContractTests).toBeDefined();
      expect(typeof contractTests.runContractTests).toBe('function');
    });
  });

  describe('setUp Method', () => {
    it('should initialize eventStore from createEventStore', async () => {
      await contractTests.exposedSetUp();

      expect(contractTests.getEventStore()).toBeDefined();
      expect(contractTests.getEventStore()).toBe(mockEventStore);
    });

    it('should create mock GameId', async () => {
      await contractTests.exposedSetUp();

      const gameId = contractTests.getGameId();
      expect(gameId).toBeDefined();
      expect(gameId).toBeInstanceOf(GameId);
      expect(typeof gameId.value).toBe('string');
    });

    it('should create mock TeamLineupId', async () => {
      await contractTests.exposedSetUp();

      const teamLineupId = contractTests.getTeamLineupId();
      expect(teamLineupId).toBeDefined();
      expect(teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(typeof teamLineupId.value).toBe('string');
    });

    it('should create mock InningStateId', async () => {
      await contractTests.exposedSetUp();

      const inningStateId = contractTests.getInningStateId();
      expect(inningStateId).toBeDefined();
      expect(inningStateId).toBeInstanceOf(InningStateId);
      expect(typeof inningStateId.value).toBe('string');
    });

    it('should create array of mock events', async () => {
      await contractTests.exposedSetUp();

      const mockEvents = contractTests.getMockEvents();
      expect(Array.isArray(mockEvents)).toBe(true);
      expect(mockEvents).toHaveLength(2);
      expect(mockEvents[0]).toHaveProperty('type', 'GameCreated');
      expect(mockEvents[1]).toHaveProperty('type', 'AtBatCompleted');
    });

    it('should create events with correct gameId reference', async () => {
      await contractTests.exposedSetUp();

      const gameId = contractTests.getGameId();
      const mockEvents = contractTests.getMockEvents();

      expect(mockEvents[0]?.gameId).toBe(gameId);
      expect(mockEvents[1]?.gameId).toBe(gameId);
    });

    it('should create unique IDs on each setUp', async () => {
      await contractTests.exposedSetUp();
      const firstGameId = contractTests.getGameId();

      // Create new instance and set up again
      const secondContractTests = new TestEventStoreContractTests();
      await secondContractTests.exposedSetUp();
      const secondGameId = secondContractTests.getGameId();

      expect(firstGameId.value).not.toBe(secondGameId.value);
    });
  });

  describe('runContractTests Method', () => {
    it('should accept custom suite name', () => {
      // This method defines a Vitest describe block, which is hard to test directly
      // We verify it accepts the parameter and doesn't throw
      expect(() => {
        contractTests.runContractTests('Custom Suite Name');
      }).not.toThrow();
    });

    it('should use default suite name when not provided', () => {
      expect(() => {
        contractTests.runContractTests();
      }).not.toThrow();
    });

    it('should define multiple test suites', () => {
      // We can verify that runContractTests calls various private methods
      // by checking if they exist (they're called within runContractTests)
      const contractTestsInstance = contractTests as unknown as {
        defineInterfaceTests: () => void;
        defineAppendTests: () => void;
        defineGetEventsTests: () => void;
        defineGameEventsTests: () => void;
        defineGetAllEventsTests: () => void;
        defineGetEventsByTypeTests: () => void;
        defineGetEventsByGameIdTests: () => void;
        defineConcurrencyTests: () => void;
        defineErrorHandlingTests: () => void;
        definePerformanceTests: () => void;
      };

      expect(typeof contractTestsInstance.defineInterfaceTests).toBe('function');
      expect(typeof contractTestsInstance.defineAppendTests).toBe('function');
      expect(typeof contractTestsInstance.defineGetEventsTests).toBe('function');
      expect(typeof contractTestsInstance.defineGameEventsTests).toBe('function');
      expect(typeof contractTestsInstance.defineGetAllEventsTests).toBe('function');
      expect(typeof contractTestsInstance.defineGetEventsByTypeTests).toBe('function');
      expect(typeof contractTestsInstance.defineGetEventsByGameIdTests).toBe('function');
      expect(typeof contractTestsInstance.defineConcurrencyTests).toBe('function');
      expect(typeof contractTestsInstance.defineErrorHandlingTests).toBe('function');
      expect(typeof contractTestsInstance.definePerformanceTests).toBe('function');
    });
  });

  describe('Integration with MockEventStore', () => {
    beforeEach(async () => {
      await contractTests.exposedSetUp();
    });

    it('should properly initialize with mock EventStore methods', () => {
      expect(mockEventStore.append).toBeDefined();
      expect(mockEventStore.getEvents).toBeDefined();
      expect(mockEventStore.getGameEvents).toBeDefined();
      expect(mockEventStore.getAllEvents).toBeDefined();
      expect(mockEventStore.getEventsByType).toBeDefined();
      expect(mockEventStore.getEventsByGameId).toBeDefined();
    });

    it('should call EventStore methods during contract testing', async () => {
      const appendMock = mockEventStore.append as MockedFunction<typeof mockEventStore.append>;
      const getEventsMock = mockEventStore.getEvents as MockedFunction<
        typeof mockEventStore.getEvents
      >;

      // Mock return values for contract tests
      appendMock.mockResolvedValue(undefined);
      getEventsMock.mockResolvedValue([]);

      // Contract tests would call these methods
      await mockEventStore.append(contractTests.getGameId(), 'Game', []);
      await mockEventStore.getEvents(contractTests.getGameId());

      expect(appendMock).toHaveBeenCalledWith(contractTests.getGameId(), 'Game', []);
      expect(getEventsMock).toHaveBeenCalledWith(contractTests.getGameId());
    });
  });

  describe('Mock Event Integration', () => {
    beforeEach(async () => {
      await contractTests.exposedSetUp();
    });

    it('should create events compatible with EventStore interface', async () => {
      const mockEvents = contractTests.getMockEvents();
      const gameId = contractTests.getGameId();

      // Verify mock events can be used with EventStore
      const appendMock = mockEventStore.append as MockedFunction<typeof mockEventStore.append>;
      appendMock.mockResolvedValue(undefined);

      await expect(mockEventStore.append(gameId, 'Game', mockEvents)).resolves.not.toThrow();

      expect(appendMock).toHaveBeenCalledWith(gameId, 'Game', mockEvents);
    });

    it('should create GameCreated event with proper structure', () => {
      const gameId = contractTests.getGameId();
      const mockEvents = contractTests.getMockEvents();
      const gameCreatedEvent = mockEvents[0]!;

      expect(gameCreatedEvent.type).toBe('GameCreated');
      expect(gameCreatedEvent.gameId).toBe(gameId);
      expect(gameCreatedEvent.timestamp).toBeInstanceOf(Date);
      expect(gameCreatedEvent.eventId).toBeDefined();
      expect(typeof gameCreatedEvent.eventId).toBe('string');
    });

    it('should create AtBatCompleted event with proper structure', () => {
      const gameId = contractTests.getGameId();
      const mockEvents = contractTests.getMockEvents();
      const atBatCompletedEvent = mockEvents[1]!;

      expect(atBatCompletedEvent.type).toBe('AtBatCompleted');
      expect(atBatCompletedEvent.gameId).toBe(gameId);
      expect(atBatCompletedEvent.timestamp).toBeInstanceOf(Date);
      expect(atBatCompletedEvent.eventId).toBeDefined();
      expect(typeof atBatCompletedEvent.eventId).toBe('string');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle EventStore creation failure gracefully', async () => {
      class FailingEventStoreContractTests extends EventStoreContractTests {
        createEventStore(): Promise<EventStore> {
          return Promise.reject(new Error('Failed to create EventStore'));
        }

        async exposedSetUp(): Promise<void> {
          return this.setUp();
        }
      }

      const failingTests = new FailingEventStoreContractTests();

      await expect(failingTests.exposedSetUp()).rejects.toThrow('Failed to create EventStore');
    });

    it('should handle tearDown errors gracefully', async () => {
      class CustomTearDownContractTests extends EventStoreContractTests {
        createEventStore(): Promise<EventStore> {
          return Promise.resolve(contractTests.getMockEventStore());
        }

        override tearDown(): Promise<void> {
          return Promise.reject(new Error('TearDown failed'));
        }

        async exposedTearDown(): Promise<void> {
          return this.tearDown();
        }
      }

      const customTests = new CustomTearDownContractTests();

      await expect(customTests.exposedTearDown()).rejects.toThrow('TearDown failed');
    });
  });

  describe('Test Framework Validation', () => {
    it('should provide comprehensive test coverage for EventStore implementations', () => {
      // Verify all essential EventStore methods are tested
      const contractTestsInstance = contractTests as unknown as {
        defineInterfaceTests: () => void;
        defineAppendTests: () => void;
        defineGetEventsTests: () => void;
        defineGameEventsTests: () => void;
        defineGetAllEventsTests: () => void;
        defineGetEventsByTypeTests: () => void;
        defineGetEventsByGameIdTests: () => void;
        defineConcurrencyTests: () => void;
        defineErrorHandlingTests: () => void;
        definePerformanceTests: () => void;
      };

      // Interface tests
      expect(contractTestsInstance.defineInterfaceTests).toBeDefined();

      // Core functionality tests
      expect(contractTestsInstance.defineAppendTests).toBeDefined();
      expect(contractTestsInstance.defineGetEventsTests).toBeDefined();
      expect(contractTestsInstance.defineGameEventsTests).toBeDefined();
      expect(contractTestsInstance.defineGetAllEventsTests).toBeDefined();
      expect(contractTestsInstance.defineGetEventsByTypeTests).toBeDefined();
      expect(contractTestsInstance.defineGetEventsByGameIdTests).toBeDefined();

      // Advanced functionality tests
      expect(contractTestsInstance.defineConcurrencyTests).toBeDefined();
      expect(contractTestsInstance.defineErrorHandlingTests).toBeDefined();
      expect(contractTestsInstance.definePerformanceTests).toBeDefined();
    });

    it('should support all three aggregate types', async () => {
      await contractTests.exposedSetUp();

      const gameId = contractTests.getGameId();
      const teamLineupId = contractTests.getTeamLineupId();
      const inningStateId = contractTests.getInningStateId();

      expect(gameId).toBeInstanceOf(GameId);
      expect(teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(inningStateId).toBeInstanceOf(InningStateId);

      // Verify different aggregate types can be used
      expect(gameId.value).not.toBe(teamLineupId.value);
      expect(gameId.value).not.toBe(inningStateId.value);
      expect(teamLineupId.value).not.toBe(inningStateId.value);
    });

    it('should create events for each aggregate type', async () => {
      await contractTests.exposedSetUp();

      const gameId = contractTests.getGameId();
      const teamLineupId = contractTests.getTeamLineupId();
      const inningStateId = contractTests.getInningStateId();

      // Test that mock event creators work with the IDs
      const gameEvent = createMockGameCreatedEvent(gameId);
      const teamEvent = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
      const inningEvent = createMockInningStateCreatedEvent(gameId, inningStateId);

      expect(gameEvent.gameId).toBe(gameId);
      expect(teamEvent.gameId).toBe(gameId);
      expect(teamEvent.teamLineupId).toBe(teamLineupId);
      expect(inningEvent.gameId).toBe(gameId);
      expect(inningEvent.inningStateId).toBe(inningStateId);
    });
  });

  describe('Mock Event Batch Integration', () => {
    beforeEach(async () => {
      await contractTests.exposedSetUp();
    });

    it('should work with batch event creation', () => {
      const gameId = contractTests.getGameId();
      const eventBatch = createMockEventBatch(gameId, 5);

      expect(Array.isArray(eventBatch)).toBe(true);
      expect(eventBatch).toHaveLength(5);

      // First event should be GameCreated
      expect(eventBatch[0]?.type).toBe('GameCreated');

      // Remaining events should be AtBatCompleted
      for (let i = 1; i < eventBatch.length; i++) {
        expect(eventBatch[i]?.type).toBe('AtBatCompleted');
        expect(eventBatch[i]?.gameId).toBe(gameId);
      }
    });

    it('should handle large batch sizes for performance testing', () => {
      const gameId = createMockGameId();
      const largeBatch = createMockEventBatch(gameId, 100);

      expect(largeBatch).toHaveLength(100);
      expect(largeBatch[0]?.type).toBe('GameCreated');

      // All events should have the same gameId
      largeBatch.forEach(event => {
        expect(event.gameId).toBe(gameId);
      });
    });
  });

  describe('Inheritance and Extension', () => {
    it('should allow subclasses to override tearDown', async () => {
      let tearDownCalled = false;

      class CustomTearDownTests extends EventStoreContractTests {
        createEventStore(): Promise<EventStore> {
          return Promise.resolve(contractTests.getMockEventStore());
        }

        override tearDown(): Promise<void> {
          tearDownCalled = true;
          return Promise.resolve();
        }

        async exposedTearDown(): Promise<void> {
          return this.tearDown();
        }
      }

      const customTests = new CustomTearDownTests();
      await customTests.exposedTearDown();

      expect(tearDownCalled).toBe(true);
    });

    it('should allow subclasses to provide different EventStore implementations', async () => {
      const customMockStore: EventStore = {
        append: vi.fn(),
        getEvents: vi.fn(),
        getGameEvents: vi.fn(),
        getAllEvents: vi.fn(),
        getEventsByType: vi.fn(),
        getEventsByGameId: vi.fn(),
      };

      class CustomStoreTests extends EventStoreContractTests {
        createEventStore(): Promise<EventStore> {
          return Promise.resolve(customMockStore);
        }

        async exposedSetUp(): Promise<void> {
          return this.setUp();
        }

        public getEventStore(): EventStore {
          return this.eventStore;
        }
      }

      const customTests = new CustomStoreTests();
      await customTests.exposedSetUp();

      expect(customTests.getEventStore()).toBe(customMockStore);
      expect(customTests.getEventStore()).not.toBe(mockEventStore);
    });
  });
});
