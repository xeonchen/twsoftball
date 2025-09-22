/**
 * @file Mock Factories Tests
 * Comprehensive test coverage for mock factory functions.
 *
 * @remarks
 * These tests validate the behavior and configuration of mock factory functions
 * used throughout the test suite. They ensure consistent mock creation,
 * proper method behavior, and helper function functionality.
 *
 * **Test Coverage Areas**:
 * - Factory function creation and default behavior
 * - Mock method configuration and verification
 * - Helper method functionality (setMockGame, clear, etc.)
 * - Type safety and return value validation
 * - Edge cases and error scenarios
 */

import {
  Game,
  GameId,
  GameStatus,
  TeamLineupId,
  InningStateId,
  DomainEvent,
} from '@twsoftball/domain';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  createMockGameRepository,
  createMockEventStore,
  createMockLogger,
  createMockNotificationService,
  createMockDependencies,
  EnhancedMockGameRepository,
  EnhancedMockEventStore,
  EnhancedMockLogger,
  EnhancedMockNotificationService,
} from './mock-factories.js';

// Test utilities
function createTestGame(): Game {
  return Game.createNew(new GameId('test-game-123'), 'Home Team', 'Away Team');
}

function createTestDomainEvent(): DomainEvent {
  return {
    eventId: 'event-123',
    type: 'GameStarted',
    gameId: new GameId('game-123'),
    version: 1,
    timestamp: new Date('2024-01-01T10:00:00Z'),
  } as DomainEvent;
}

describe('Mock Factories', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMockGameRepository', () => {
    let mockRepo: EnhancedMockGameRepository;

    beforeEach(() => {
      mockRepo = createMockGameRepository();
    });

    it('should create repository with all methods as mocks', () => {
      expect(vi.isMockFunction(mockRepo.findById)).toBe(true);

      expect(vi.isMockFunction(mockRepo.save)).toBe(true);

      expect(vi.isMockFunction(mockRepo.findByStatus)).toBe(true);

      expect(vi.isMockFunction(mockRepo.findByDateRange)).toBe(true);

      expect(vi.isMockFunction(mockRepo.exists)).toBe(true);

      expect(vi.isMockFunction(mockRepo.delete)).toBe(true);
    });

    it('should have helper methods available', () => {
      expect(
        typeof (mockRepo as unknown as { setMockGame: (game: Game) => void }).setMockGame
      ).toBe('function');
      expect(typeof (mockRepo as unknown as { clear: () => void }).clear).toBe('function');
    });

    describe('default behavior', () => {
      it('should return null for findById by default', async () => {
        const result = await mockRepo.findById(new GameId('non-existent'));
        expect(result).toBe(null);
      });

      it('should return empty array for findByStatus', async () => {
        const result = await mockRepo.findByStatus(GameStatus.IN_PROGRESS);
        expect(result).toEqual([]);
      });

      it('should return empty array for findByDateRange', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const result = await mockRepo.findByDateRange(startDate, endDate);
        expect(result).toEqual([]);
      });

      it('should return false for exists by default', async () => {
        const result = await mockRepo.exists(new GameId('any-game'));
        expect(result).toBe(false);
      });

      it('should resolve for save operations', async () => {
        const game = createTestGame();
        await expect(mockRepo.save(game)).resolves.toBeUndefined();
      });

      it('should resolve for delete operations', async () => {
        const gameId = new GameId('test-game');
        await expect(mockRepo.delete(gameId)).resolves.toBeUndefined();
      });
    });

    describe('in-memory storage functionality', () => {
      it('should store and retrieve games via save/findById', async () => {
        const game = createTestGame();

        // Save the game
        await mockRepo.save(game);

        // Should now be found
        const foundGame = await mockRepo.findById(game.id);
        expect(foundGame).toBe(game);
      });

      it('should update exists() behavior after saving', async () => {
        const game = createTestGame();

        // Initially should not exist
        expect(await mockRepo.exists(game.id)).toBe(false);

        // Save the game
        await mockRepo.save(game);

        // Now should exist
        expect(await mockRepo.exists(game.id)).toBe(true);
      });

      it('should remove games via delete', async () => {
        const game = createTestGame();

        // Save and verify existence
        await mockRepo.save(game);
        expect(await mockRepo.exists(game.id)).toBe(true);

        // Delete and verify removal
        await mockRepo.delete(game.id);
        expect(await mockRepo.exists(game.id)).toBe(false);
        expect(await mockRepo.findById(game.id)).toBe(null);
      });
    });

    describe('helper methods', () => {
      it('should pre-populate games via setMockGame', async () => {
        const game = createTestGame();

        // Set mock game directly
        (mockRepo as unknown as { setMockGame: (game: Game) => void }).setMockGame(game);

        // Should be immediately available
        await expect(mockRepo.findById(game.id)).resolves.toBe(game);
        await expect(mockRepo.exists(game.id)).resolves.toBe(true);
      });

      it('should clear all games via clear method', async () => {
        const game1 = createTestGame();
        const game2 = Game.createNew(new GameId('game-2'), 'Team A', 'Team B');

        // Add multiple games
        await mockRepo.save(game1);
        await mockRepo.save(game2);

        // Verify they exist
        expect(await mockRepo.exists(game1.id)).toBe(true);
        expect(await mockRepo.exists(game2.id)).toBe(true);

        // Clear all
        (mockRepo as unknown as { clear: () => void }).clear();

        // Verify they're gone
        expect(await mockRepo.exists(game1.id)).toBe(false);
        expect(await mockRepo.exists(game2.id)).toBe(false);
      });
    });

    describe('mock customization', () => {
      it('should allow overriding mock behavior', async () => {
        const customGame = createTestGame();

        // Override findById behavior

        vi.mocked(mockRepo.findById).mockResolvedValue(customGame);

        const result = await mockRepo.findById(new GameId('any-id'));
        expect(result).toBe(customGame);
      });

      it('should allow simulating repository errors', async () => {
        const error = new Error('Database connection failed');

        // Configure save to throw error

        vi.mocked(mockRepo.save).mockRejectedValue(error);

        const game = createTestGame();
        await expect(mockRepo.save(game)).rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('createMockEventStore', () => {
    let mockEventStore: EnhancedMockEventStore;

    beforeEach(() => {
      mockEventStore = createMockEventStore();
    });

    it('should create event store with all methods as mocks', () => {
      expect(vi.isMockFunction(mockEventStore.getGameEvents)).toBe(true);

      expect(vi.isMockFunction(mockEventStore.getEvents)).toBe(true);

      expect(vi.isMockFunction(mockEventStore.getAllEvents)).toBe(true);

      expect(vi.isMockFunction(mockEventStore.getEventsByType)).toBe(true);

      expect(vi.isMockFunction(mockEventStore.getEventsByGameId)).toBe(true);

      expect(vi.isMockFunction(mockEventStore.append)).toBe(true);
    });

    it('should have helper methods available', () => {
      expect(typeof mockEventStore.setMockEvents).toBe('function');
      expect(typeof mockEventStore.setMockUndoHistory).toBe('function');
      expect(typeof mockEventStore.clear).toBe('function');
    });

    describe('default behavior', () => {
      it('should return empty array for getGameEvents', async () => {
        const gameId = new GameId('test-game');
        const result = await mockEventStore.getGameEvents(gameId);
        expect(result).toEqual([]);
      });

      it('should return empty array for getEvents', async () => {
        const streamId = new GameId('test-stream');
        const result = await mockEventStore.getEvents(streamId);
        expect(result).toEqual([]);
      });

      it('should return empty array for getAllEvents', async () => {
        const result = await mockEventStore.getAllEvents();
        expect(result).toEqual([]);
      });

      it('should return empty array for getEventsByType', async () => {
        const result = await mockEventStore.getEventsByType('GameStarted');
        expect(result).toEqual([]);
      });

      it('should resolve append operations', async () => {
        const gameId = new GameId('test-game');
        const events = [createTestDomainEvent()];

        await expect(mockEventStore.append(gameId, 'Game', events)).resolves.toBeUndefined();
      });
    });

    describe('in-memory event storage', () => {
      it('should store and retrieve events via append/getGameEvents', async () => {
        const gameId = new GameId('test-game');
        const event = createTestDomainEvent();

        // Append event
        await mockEventStore.append(gameId, 'Game', [event]);

        // Retrieve events
        const storedEvents = await mockEventStore.getGameEvents(gameId);
        expect(storedEvents).toHaveLength(1);
        expect(storedEvents[0]).toMatchObject({
          streamId: gameId.value,
          eventType: event.type,
          aggregateType: 'Game',
        });
      });

      it('should handle multiple events in getGameEvents', async () => {
        const gameId = new GameId('test-game');
        const events = [
          createTestDomainEvent(),
          { ...createTestDomainEvent(), eventId: 'event-2' },
          { ...createTestDomainEvent(), eventId: 'event-3' },
        ];

        // Append multiple events
        await mockEventStore.append(gameId, 'Game', events);

        // Get all events (3 events were added)
        const allEvents = await mockEventStore.getGameEvents(gameId);
        expect(allEvents).toHaveLength(3);
        expect(allEvents[0]?.eventId).toBe('event-0'); // First event (index 0)
        expect(allEvents[1]?.eventId).toBe('event-1'); // Second event (index 1)
        expect(allEvents[2]?.eventId).toBe('event-2'); // Third event (index 2)
      });

      it('should handle fromVersion parameter in getEvents', async () => {
        const streamId = new TeamLineupId('lineup-123');
        const events = [
          createTestDomainEvent(),
          { ...createTestDomainEvent(), eventId: 'event-2' },
        ];

        // Append events
        await mockEventStore.append(streamId, 'TeamLineup', events);

        // Get events from version 1 (should skip first event at index 0)
        const fromVersionEvents = await mockEventStore.getEvents(streamId, 1);
        expect(fromVersionEvents).toHaveLength(1);
        expect(fromVersionEvents[0]?.eventId).toBe('event-1'); // Second event
      });

      it('should filter events by timestamp in getAllEvents', async () => {
        const gameId = new GameId('test-game');
        const oldDate = new Date('2023-01-01');
        const newDate = new Date('2024-01-01');

        const oldEvent = { ...createTestDomainEvent(), timestamp: oldDate };
        const newEvent = { ...createTestDomainEvent(), timestamp: newDate, eventId: 'new-event' };

        // Set events directly
        mockEventStore.setMockEvents(gameId, [oldEvent, newEvent]);

        // Filter by timestamp
        const filteredEvents = await mockEventStore.getAllEvents(new Date('2023-12-01'));
        expect(filteredEvents).toHaveLength(1);
        expect(filteredEvents[0]?.eventId).toBe('event-test-game-1'); // The new event
      });
    });

    describe('helper methods', () => {
      it('should set events directly via setMockEvents', async () => {
        const gameId = new GameId('test-game');
        const testEvent = createTestDomainEvent();

        // Set mock events directly
        mockEventStore.setMockEvents(gameId, [testEvent]);

        // Should be immediately available
        const events = await mockEventStore.getGameEvents(gameId);
        expect(events).toHaveLength(1);
        expect(events[0]?.eventType).toBe(testEvent.type);
      });

      it('should handle both DomainEvent and MockDomainEvent in setMockEvents', async () => {
        const gameId = new GameId('test-game');
        const domainEvent = createTestDomainEvent();
        const mockEvent = {
          type: 'TestEvent',
          eventType: 'TestEvent',
          eventData: { test: true },
          timestamp: new Date(),
        };

        // Set mixed event types
        mockEventStore.setMockEvents(gameId, [domainEvent, mockEvent]);

        const events = await mockEventStore.getGameEvents(gameId);
        expect(events).toHaveLength(2);
        expect(events[0]?.eventType).toBe(domainEvent.type);
        expect(events[1]?.eventType).toBe(mockEvent.eventType);
      });

      it('should set undo history via setMockUndoHistory', () => {
        const gameId = new GameId('test-game');
        const undoEvent = createTestDomainEvent();

        // Set undo history
        mockEventStore.setMockUndoHistory(gameId, [undoEvent]);

        // This is an internal helper - we can't directly test the undo history
        // but we can verify the method doesn't throw
        expect(() => {
          mockEventStore.setMockUndoHistory(gameId, [undoEvent]);
        }).not.toThrow();
      });

      it('should clear all events and history', async () => {
        const gameId = new GameId('test-game');
        const testEvent = createTestDomainEvent();

        // Set up events
        mockEventStore.setMockEvents(gameId, [testEvent]);
        mockEventStore.setMockUndoHistory(gameId, [testEvent]);

        // Verify events exist
        expect(await mockEventStore.getGameEvents(gameId)).toHaveLength(1);

        // Clear everything
        mockEventStore.clear();

        // Verify events are gone
        expect(await mockEventStore.getGameEvents(gameId)).toHaveLength(0);
      });
    });

    describe('complex query methods', () => {
      it('should filter events by type in getEventsByType', async () => {
        const gameId = new GameId('test-game');
        const event1 = { ...createTestDomainEvent(), type: 'GameStarted' };
        const event2 = { ...createTestDomainEvent(), type: 'AtBatCompleted', eventId: 'event-2' };

        mockEventStore.setMockEvents(gameId, [event1, event2]);

        const gameStartedEvents = await mockEventStore.getEventsByType('GameStarted');
        expect(gameStartedEvents).toHaveLength(1);
        expect(gameStartedEvents[0]?.eventType).toBe('GameStarted');
      });

      it('should filter by aggregate types in getEventsByGameId', async () => {
        const gameId = new GameId('test-game');
        const testEvent = createTestDomainEvent();

        mockEventStore.setMockEvents(gameId, [testEvent]);

        // Filter by aggregate type
        const gameEvents = await mockEventStore.getEventsByGameId(gameId, ['Game']);
        expect(gameEvents).toHaveLength(1);

        // Filter by non-matching aggregate type
        const lineupEvents = await mockEventStore.getEventsByGameId(gameId, ['TeamLineup']);
        expect(lineupEvents).toHaveLength(0);
      });
    });
  });

  describe('createMockLogger', () => {
    let mockLogger: EnhancedMockLogger;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    it('should create logger with all methods as mocks', () => {
      expect(vi.isMockFunction(mockLogger.debug)).toBe(true);

      expect(vi.isMockFunction(mockLogger.info)).toBe(true);

      expect(vi.isMockFunction(mockLogger.warn)).toBe(true);

      expect(vi.isMockFunction(mockLogger.error)).toBe(true);

      expect(vi.isMockFunction(mockLogger.log)).toBe(true);

      expect(vi.isMockFunction(mockLogger.isLevelEnabled)).toBe(true);
    });

    it('should have helper methods available', () => {
      expect(typeof mockLogger.getLogs).toBe('function');
      expect(typeof mockLogger.clear).toBe('function');
    });

    describe('log capturing', () => {
      it('should capture debug logs', () => {
        const message = 'Debug message';
        const context = { userId: 'user-123' };

        mockLogger.debug(message, context);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level: 'debug',
          message,
          context,
        });
      });

      it('should capture info logs', () => {
        const message = 'Info message';
        const context = { operation: 'test' };

        mockLogger.info(message, context);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level: 'info',
          message,
          context,
        });
      });

      it('should capture warn logs', () => {
        const message = 'Warning message';

        mockLogger.warn(message);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level: 'warn',
          message,
        });
      });

      it('should capture error logs with error object', () => {
        const message = 'Error occurred';
        const error = new Error('Test error');
        const context = { operation: 'failed' };

        mockLogger.error(message, error, context);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level: 'error',
          message,
          context,
          error,
        });
      });

      it('should capture error logs without error object', () => {
        const message = 'Error message only';
        const context = { operation: 'failed' };

        mockLogger.error(message, undefined, context);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level: 'error',
          message,
          context,
        });
      });

      it('should capture generic log entries', () => {
        const level = 'warn';
        const message = 'Generic log';
        const context = { test: true };
        const error = new Error('Test');

        mockLogger.log(level, message, context, error);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level,
          message,
          context,
          error,
        });
      });

      it('should handle log method without error', () => {
        const level = 'info';
        const message = 'Log without error';
        const context = { test: true };

        mockLogger.log(level, message, context);

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual({
          level,
          message,
          context,
        });
      });
    });

    describe('utility methods', () => {
      it('should always return true for isLevelEnabled', () => {
        expect(mockLogger.isLevelEnabled('debug')).toBe(true);
        expect(mockLogger.isLevelEnabled('info')).toBe(true);
        expect(mockLogger.isLevelEnabled('warn')).toBe(true);
        expect(mockLogger.isLevelEnabled('error')).toBe(true);
      });

      it('should return copy of logs from getLogs', () => {
        mockLogger.info('Test message');

        const logs1 = mockLogger.getLogs();
        const logs2 = mockLogger.getLogs();

        expect(logs1).toEqual(logs2);
        expect(logs1).not.toBe(logs2); // Different array references
      });

      it('should clear logs via clear method', () => {
        mockLogger.info('Message 1');
        mockLogger.warn('Message 2');

        expect(mockLogger.getLogs()).toHaveLength(2);

        mockLogger.clear();

        expect(mockLogger.getLogs()).toHaveLength(0);
      });
    });

    describe('sequential logging', () => {
      it('should maintain log order', () => {
        mockLogger.debug('First');
        mockLogger.info('Second');
        mockLogger.warn('Third');
        mockLogger.error('Fourth');

        const logs = mockLogger.getLogs();
        expect(logs).toHaveLength(4);
        expect(logs[0]?.message).toBe('First');
        expect(logs[1]?.message).toBe('Second');
        expect(logs[2]?.message).toBe('Third');
        expect(logs[3]?.message).toBe('Fourth');
      });
    });
  });

  describe('createMockNotificationService', () => {
    let mockNotificationService: EnhancedMockNotificationService;

    beforeEach(() => {
      mockNotificationService = createMockNotificationService();
    });

    it('should create notification service with all methods as mocks', () => {
      expect(vi.isMockFunction(mockNotificationService.sendUserNotification)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.sendSystemNotification)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.sendBatchNotifications)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.updateUserPreferences)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.getUserPreferences)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.isChannelAvailable)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.notifyGameStarted)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.notifyGameEnded)).toBe(true);

      expect(vi.isMockFunction(mockNotificationService.notifyScoreUpdate)).toBe(true);
    });

    it('should have helper methods available', () => {
      expect(typeof mockNotificationService.getNotifications).toBe('function');
      expect(typeof mockNotificationService.clear).toBe('function');
    });

    describe('default behavior', () => {
      it('should return success result for user notifications', async () => {
        const result = await mockNotificationService.sendUserNotification(
          'info',
          'Test Title',
          'Test Message'
        );

        expect(result).toMatchObject({
          notificationId: 'test-notification-id',
          success: true,
          deliveredChannels: ['ui'],
          failedChannels: [],
        });
        expect(result).toHaveProperty('timestamp');
      });

      it('should return success result for system notifications', async () => {
        const result = await mockNotificationService.sendSystemNotification(
          'warning',
          'System Alert',
          'System message'
        );

        expect(result).toMatchObject({
          success: true,
          deliveredChannels: ['ui'],
        });
      });

      it('should handle batch notifications', async () => {
        const batch = [
          { level: 'info' as const, title: 'Test 1', message: 'Message 1' },
          { level: 'warning' as const, title: 'Test 2', message: 'Message 2' },
        ];
        const results = await mockNotificationService.sendBatchNotifications(batch);

        expect(results).toHaveLength(2);
        expect(results[0]?.success).toBe(true);
        expect(results[1]?.success).toBe(true);
      });

      it('should resolve preference updates', async () => {
        await expect(
          mockNotificationService.updateUserPreferences('user-123', {
            enabledChannels: ['email', 'ui'],
            enabledLevels: ['info', 'warning', 'error'],
          })
        ).resolves.toBeUndefined();
      });

      it('should return null for user preferences', async () => {
        const preferences = await mockNotificationService.getUserPreferences('user-123');
        expect(preferences).toBe(null);
      });

      it('should return true for channel availability', async () => {
        const available = await mockNotificationService.isChannelAvailable('email');
        expect(available).toBe(true);
      });
    });

    describe('notification tracking', () => {
      it('should track user notifications', async () => {
        await mockNotificationService.sendUserNotification('info', 'Title', 'Message');

        const notifications = (
          mockNotificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications();
        expect(notifications).toHaveLength(1);
        expect(notifications[0]).toEqual({
          type: 'userNotification',
          data: {},
        });
      });

      it('should track system notifications', async () => {
        await mockNotificationService.sendSystemNotification('warning', 'System', 'Alert');

        const notifications = (
          mockNotificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications();
        expect(notifications).toHaveLength(1);
        expect(notifications[0]).toEqual({
          type: 'systemNotification',
          data: {},
        });
      });

      it('should track game-specific notifications', async () => {
        const gameDetails = {
          gameId: new GameId('game-123'),
          homeTeam: 'Eagles',
          awayTeam: 'Hawks',
          startTime: new Date('2024-01-01T10:00:00Z'),
        };
        const gameId = 'game-456';
        const gameResult = { homeScore: 5, awayScore: 3 };
        const scoreUpdate = { inning: 3, homeScore: 2, awayScore: 1 };

        await mockNotificationService.notifyGameStarted(gameDetails);
        await mockNotificationService.notifyGameEnded(gameId, gameResult);
        await mockNotificationService.notifyScoreUpdate(gameId, scoreUpdate);

        const notifications = (
          mockNotificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications();
        expect(notifications).toHaveLength(3);

        expect(notifications[0]).toEqual({
          type: 'gameStarted',
          data: gameDetails,
        });

        expect(notifications[1]).toEqual({
          type: 'gameEnded',
          data: { gameId, gameResult },
        });

        expect(notifications[2]).toEqual({
          type: 'scoreUpdate',
          data: { gameId, scoreUpdate },
        });
      });

      it('should clear notifications via clear method', async () => {
        await mockNotificationService.sendUserNotification('info', 'Title', 'Message');
        await mockNotificationService.sendSystemNotification('warning', 'System', 'Alert');

        expect(
          (
            mockNotificationService as unknown as {
              getNotifications: () => Array<{ type: string; data: unknown }>;
            }
          ).getNotifications()
        ).toHaveLength(2);

        (mockNotificationService as unknown as { clear: () => void }).clear();

        expect(
          (
            mockNotificationService as unknown as {
              getNotifications: () => Array<{ type: string; data: unknown }>;
            }
          ).getNotifications()
        ).toHaveLength(0);
      });

      it('should return copy of notifications from getNotifications', async () => {
        await mockNotificationService.sendUserNotification('info', 'Title', 'Message');

        const notifications1 = (
          mockNotificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications();
        const notifications2 = (
          mockNotificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications();

        expect(notifications1).toEqual(notifications2);
        expect(notifications1).not.toBe(notifications2); // Different array references
      });
    });
  });

  describe('createMockDependencies', () => {
    let mockDependencies: ReturnType<typeof createMockDependencies>;

    beforeEach(() => {
      mockDependencies = createMockDependencies();
    });

    it('should create all mock dependencies', () => {
      expect(mockDependencies.gameRepository).toBeDefined();
      expect(mockDependencies.eventStore).toBeDefined();
      expect(mockDependencies.logger).toBeDefined();
      expect(mockDependencies.notificationService).toBeDefined();
    });

    it('should create properly typed mock instances', () => {
      // Verify repository methods

      expect(vi.isMockFunction(mockDependencies.gameRepository.findById)).toBe(true);
      expect(
        typeof (mockDependencies.gameRepository as unknown as { setMockGame: (game: Game) => void })
          .setMockGame
      ).toBe('function');

      // Verify event store methods

      expect(vi.isMockFunction(mockDependencies.eventStore.append)).toBe(true);
      expect(
        typeof (
          mockDependencies.eventStore as unknown as {
            setMockEvents: (
              streamId: GameId | TeamLineupId | InningStateId,
              events: DomainEvent[]
            ) => void;
          }
        ).setMockEvents
      ).toBe('function');

      // Verify logger methods

      expect(vi.isMockFunction(mockDependencies.logger.info)).toBe(true);
      expect(
        typeof (
          mockDependencies.logger as unknown as {
            getLogs: () => Array<{
              level: string;
              message: string;
              context?: unknown;
              error?: Error;
            }>;
          }
        ).getLogs
      ).toBe('function');

      // Verify notification service methods

      expect(vi.isMockFunction(mockDependencies.notificationService.sendUserNotification)).toBe(
        true
      );
      expect(
        typeof (
          mockDependencies.notificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications
      ).toBe('function');
    });

    it('should create independent mock instances', () => {
      const deps1 = createMockDependencies();
      const deps2 = createMockDependencies();

      expect(deps1.gameRepository).not.toBe(deps2.gameRepository);
      expect(deps1.eventStore).not.toBe(deps2.eventStore);
      expect(deps1.logger).not.toBe(deps2.logger);
      expect(deps1.notificationService).not.toBe(deps2.notificationService);
    });

    it('should work together for integration scenarios', async () => {
      const game = createTestGame();
      const testEvent = createTestDomainEvent();

      // Configure repository
      (
        mockDependencies.gameRepository as unknown as { setMockGame: (game: Game) => void }
      ).setMockGame(game);

      // Configure event store
      (
        mockDependencies.eventStore as unknown as {
          setMockEvents: (
            streamId: GameId | TeamLineupId | InningStateId,
            events: DomainEvent[]
          ) => void;
        }
      ).setMockEvents(game.id, [testEvent]);

      // Execute operations
      await mockDependencies.gameRepository.save(game);
      await mockDependencies.eventStore.append(game.id, 'Game', [testEvent]);
      mockDependencies.logger.info('Integration test', { gameId: game.id.value });
      await mockDependencies.notificationService.notifyGameStarted({
        gameId: game.id,
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        startTime: new Date(),
      });

      // Verify all components captured the interactions
      expect(await mockDependencies.gameRepository.findById(game.id)).toBe(game);
      expect(await mockDependencies.eventStore.getGameEvents(game.id)).toHaveLength(2); // Two events: setMockEvents + append
      expect(
        (
          mockDependencies.logger as unknown as {
            getLogs: () => Array<{
              level: string;
              message: string;
              context?: unknown;
              error?: Error;
            }>;
          }
        ).getLogs()
      ).toHaveLength(1);
      expect(
        (
          mockDependencies.notificationService as unknown as {
            getNotifications: () => Array<{ type: string; data: unknown }>;
          }
        ).getNotifications()
      ).toHaveLength(1);
    });
  });

  describe('type safety and edge cases', () => {
    it('should handle different stream ID types in event store', async () => {
      const mockEventStore = createMockEventStore();
      const gameId = new GameId('game-123');
      const teamLineupId = new TeamLineupId('lineup-456');
      const inningStateId = new InningStateId('inning-789');

      const testEvent = createTestDomainEvent();

      // Should work with all stream ID types
      await expect(mockEventStore.append(gameId, 'Game', [testEvent])).resolves.toBeUndefined();

      await expect(
        mockEventStore.append(teamLineupId, 'TeamLineup', [testEvent])
      ).resolves.toBeUndefined();

      await expect(
        mockEventStore.append(inningStateId, 'InningState', [testEvent])
      ).resolves.toBeUndefined();
    });

    it('should handle empty arrays and null values gracefully', async () => {
      const mockEventStore = createMockEventStore();
      const mockRepo = createMockGameRepository();
      const gameId = new GameId('test-game');

      // Empty event arrays
      await expect(mockEventStore.append(gameId, 'Game', [])).resolves.toBeUndefined();

      // Clear methods with empty state
      expect(() => (mockRepo as unknown as { clear: () => void }).clear()).not.toThrow();
      expect(() => (mockEventStore as unknown as { clear: () => void }).clear()).not.toThrow();

      // Multiple clears should be safe
      (mockRepo as unknown as { clear: () => void }).clear();
      (mockRepo as unknown as { clear: () => void }).clear();

      expect(await mockRepo.findById(gameId)).toBe(null);
    });

    it('should maintain proper mock function behavior after operations', async () => {
      const mockRepo = createMockGameRepository();

      // Perform operations
      const game = createTestGame();
      await mockRepo.save(game);
      (mockRepo as unknown as { clear: () => void }).clear();

      // Mock function should still work properly
      expect(typeof mockRepo.findById).toBe('function');
      expect(await mockRepo.findById(game.id)).toBe(null); // Cleared, so no game
    });
  });
});
