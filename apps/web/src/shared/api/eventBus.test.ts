/**
 * @file Event Bus Tests
 * Tests for Event Bus that handles domain event subscription and publishing following TDD approach.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

import { EventBus, type DomainEventHandler, type EventBusConfig } from './eventBus';

// Mock domain event types
interface MockDomainEvent {
  eventType: string;
  aggregateId: string;
  version: number;
  occurredAt: Date;
  eventData: Record<string, unknown>;
}

interface GameStartedEvent extends MockDomainEvent {
  eventType: 'GameStarted';
  eventData: {
    gameId: string;
    homeTeam: string;
    awayTeam: string;
  };
}

interface AtBatCompletedEvent extends MockDomainEvent {
  eventType: 'AtBatCompleted';
  eventData: {
    gameId: string;
    batterId: string;
    result: string;
    runsScored: number;
  };
}

interface PlayerSubstitutedEvent extends MockDomainEvent {
  eventType: 'PlayerSubstituted';
  eventData: {
    gameId: string;
    outgoingPlayerId: string;
    incomingPlayerId: string;
  };
}

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  let config: EventBusConfig;

  // Mock handlers
  let gameStartedHandler: MockedFunction<DomainEventHandler<GameStartedEvent>>;
  let atBatHandler: MockedFunction<DomainEventHandler<AtBatCompletedEvent>>;
  let playerSubstitutedHandler: MockedFunction<DomainEventHandler<PlayerSubstitutedEvent>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    config = {
      logger: mockLogger,
      enableLogging: true,
      maxRetries: 3,
      retryDelayMs: 100,
    };

    eventBus = new EventBus(config);

    // Create mock handlers
    gameStartedHandler = vi.fn();
    atBatHandler = vi.fn();
    playerSubstitutedHandler = vi.fn();
  });

  describe('Event Subscription', () => {
    it('should allow subscribing to specific event types', () => {
      eventBus.subscribe('GameStarted', gameStartedHandler);
      eventBus.subscribe('AtBatCompleted', atBatHandler);

      // Verify handlers are stored
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(1);
      expect(eventBus.getSubscribersCount('AtBatCompleted')).toBe(1);
      expect(eventBus.getSubscribersCount('PlayerSubstituted')).toBe(0);
    });

    it('should allow multiple handlers for the same event type', () => {
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.subscribe('GameStarted', gameStartedHandler);
      eventBus.subscribe('GameStarted', handler2);
      eventBus.subscribe('GameStarted', handler3);

      expect(eventBus.getSubscribersCount('GameStarted')).toBe(3);
    });

    it('should prevent duplicate handler registrations', () => {
      eventBus.subscribe('GameStarted', gameStartedHandler);
      eventBus.subscribe('GameStarted', gameStartedHandler); // Same handler again

      expect(eventBus.getSubscribersCount('GameStarted')).toBe(1);
    });

    it('should handle subscription to non-existent event types', () => {
      const genericHandler: DomainEventHandler = vi.fn();
      eventBus.subscribe('NonExistentEvent', genericHandler);

      expect(eventBus.getSubscribersCount('NonExistentEvent')).toBe(1);
    });
  });

  describe('Event Unsubscription', () => {
    beforeEach(() => {
      eventBus.subscribe('GameStarted', gameStartedHandler);
      eventBus.subscribe('AtBatCompleted', atBatHandler);
    });

    it('should allow unsubscribing specific handlers', () => {
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(1);

      eventBus.unsubscribe('GameStarted', gameStartedHandler);

      expect(eventBus.getSubscribersCount('GameStarted')).toBe(0);
      expect(eventBus.getSubscribersCount('AtBatCompleted')).toBe(1); // Other handlers unaffected
    });

    it('should handle unsubscribing non-existent handlers gracefully', () => {
      const nonExistentHandler = vi.fn();

      expect(() => {
        eventBus.unsubscribe('GameStarted', nonExistentHandler);
      }).not.toThrow();

      expect(eventBus.getSubscribersCount('GameStarted')).toBe(1); // Original handler still there
    });

    it('should handle unsubscribing from non-existent event types gracefully', () => {
      expect(() => {
        const genericHandler: DomainEventHandler = gameStartedHandler;
        eventBus.unsubscribe('NonExistentEvent', genericHandler);
      }).not.toThrow();
    });
  });

  describe('Event Publishing', () => {
    beforeEach(() => {
      eventBus.subscribe('GameStarted', gameStartedHandler);
      eventBus.subscribe('AtBatCompleted', atBatHandler);
      eventBus.subscribe('PlayerSubstituted', playerSubstitutedHandler);
    });

    it('should publish events to correct handlers', async () => {
      const gameStartedEvent: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: {
          gameId: 'game-123',
          homeTeam: 'Eagles',
          awayTeam: 'Hawks',
        },
      };

      await eventBus.publish(gameStartedEvent);

      expect(gameStartedHandler).toHaveBeenCalledWith(gameStartedEvent);
      expect(atBatHandler).not.toHaveBeenCalled();
      expect(playerSubstitutedHandler).not.toHaveBeenCalled();
    });

    it('should publish events to multiple handlers of same type', async () => {
      const handler2 = vi.fn();
      eventBus.subscribe('GameStarted', handler2);

      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await eventBus.publish(event);

      expect(gameStartedHandler).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should handle publishing events with no subscribers', async () => {
      const event: MockDomainEvent = {
        eventType: 'UnknownEvent',
        aggregateId: 'aggregate-123',
        version: 1,
        occurredAt: new Date(),
        eventData: {},
      };

      await expect(eventBus.publish(event)).resolves.not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith('No subscribers for event type: UnknownEvent', {
        eventType: 'UnknownEvent',
      });
    });

    it('should log published events when logging is enabled', async () => {
      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await eventBus.publish(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Publishing event: GameStarted',
        expect.objectContaining({
          eventType: 'GameStarted',
          aggregateId: 'game-123',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      eventBus.subscribe('GameStarted', gameStartedHandler);
    });

    it('should handle handler errors gracefully', async () => {
      const error = new Error('Handler failed');
      gameStartedHandler.mockRejectedValue(error);

      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await expect(eventBus.publish(event)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error handling event: GameStarted (all retries exhausted)'),
        error,
        expect.objectContaining({
          eventType: 'GameStarted',
          aggregateId: 'game-123',
          attempts: expect.any(Number),
        })
      );
    });

    it('should continue processing other handlers when one fails', async () => {
      const handler2 = vi.fn().mockResolvedValue(undefined);
      const handler3 = vi.fn().mockRejectedValue(new Error('Handler 3 failed'));

      eventBus.subscribe('GameStarted', handler2);
      eventBus.subscribe('GameStarted', handler3);

      gameStartedHandler.mockRejectedValue(new Error('Handler 1 failed'));

      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await eventBus.publish(event);

      // All handlers should be called despite failures
      expect(gameStartedHandler).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();

      // Errors should be logged
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should retry failed handlers when retry is configured', async () => {
      const error = new Error('Temporary failure');
      gameStartedHandler
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(undefined); // Succeeds on third attempt

      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await eventBus.publish(event);

      expect(gameStartedHandler).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying handler for event: GameStarted (attempt 1/3)',
        expect.objectContaining({
          eventType: 'GameStarted',
          attempt: 1,
        })
      );
    });
  });

  describe('Event Bus Configuration', () => {
    it('should disable logging when configured', async () => {
      const quietEventBus = new EventBus({
        ...config,
        enableLogging: false,
      });

      quietEventBus.subscribe('GameStarted', gameStartedHandler);

      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await quietEventBus.publish(event);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should use custom retry configuration', async () => {
      const customEventBus = new EventBus({
        ...config,
        maxRetries: 1,
      });

      customEventBus.subscribe('GameStarted', gameStartedHandler);
      gameStartedHandler.mockRejectedValue(new Error('Always fails'));

      const event: GameStartedEvent = {
        eventType: 'GameStarted',
        aggregateId: 'game-123',
        version: 1,
        occurredAt: new Date(),
        eventData: { gameId: 'game-123', homeTeam: 'Home', awayTeam: 'Away' },
      };

      await customEventBus.publish(event);

      expect(gameStartedHandler).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Event Bus State', () => {
    it('should track subscriber counts accurately', () => {
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(0);

      eventBus.subscribe('GameStarted', gameStartedHandler);
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(1);

      const handler2 = vi.fn();
      eventBus.subscribe('GameStarted', handler2);
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(2);

      eventBus.unsubscribe('GameStarted', gameStartedHandler);
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(1);
    });

    it('should provide total event types count', () => {
      expect(eventBus.getTotalEventTypes()).toBe(0);

      eventBus.subscribe('GameStarted', gameStartedHandler);
      expect(eventBus.getTotalEventTypes()).toBe(1);

      eventBus.subscribe('AtBatCompleted', atBatHandler);
      expect(eventBus.getTotalEventTypes()).toBe(2);

      // Adding another handler to same event doesn't increase count
      const handler2 = vi.fn();
      eventBus.subscribe('GameStarted', handler2);
      expect(eventBus.getTotalEventTypes()).toBe(2);
    });

    it('should clear all subscribers', () => {
      eventBus.subscribe('GameStarted', gameStartedHandler);
      eventBus.subscribe('AtBatCompleted', atBatHandler);
      eventBus.subscribe('PlayerSubstituted', playerSubstitutedHandler);

      expect(eventBus.getTotalEventTypes()).toBe(3);

      eventBus.clear();

      expect(eventBus.getTotalEventTypes()).toBe(0);
      expect(eventBus.getSubscribersCount('GameStarted')).toBe(0);
    });
  });
});
