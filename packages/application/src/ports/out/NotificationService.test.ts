/**
 * @file NotificationService.test.ts
 * Comprehensive tests for the NotificationService outbound port interface.
 *
 * @remarks
 * These tests validate the NotificationService interface contract and ensure
 * that any infrastructure implementation correctly handles all notification
 * scenarios required by the TW Softball application.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type {
  NotificationService,
  NotificationLevel,
  NotificationChannel,
  NotificationPayload,
  UserNotificationPreferences,
  NotificationResult,
  NotificationMetadata,
} from './NotificationService';

/**
 * Mock implementation of NotificationService for testing interface contracts.
 */
class MockNotificationService implements NotificationService {
  private notifications: Array<{
    level: NotificationLevel;
    title: string;
    message: string;
    payload?: NotificationPayload;
    metadata?: NotificationMetadata;
  }> = [];

  private readonly userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private readonly deliveryResults: Map<string, boolean> = new Map();

  sendUserNotification(
    level: NotificationLevel,
    title: string,
    message: string,
    payload?: NotificationPayload,
    metadata?: NotificationMetadata
  ): Promise<NotificationResult> {
    this.notifications.push({
      level,
      title,
      message,
      ...(payload && { payload }),
      ...(metadata && { metadata }),
    });

    const notificationId = `notification-${Date.now()}`;
    const success = this.deliveryResults.get('user') ?? true;

    return Promise.resolve({
      notificationId,
      success,
      deliveredChannels: success ? ['ui'] : [],
      failedChannels: success ? [] : ['ui'],
      timestamp: new Date(),
    });
  }

  sendSystemNotification(
    level: NotificationLevel,
    title: string,
    message: string,
    payload?: NotificationPayload,
    metadata?: NotificationMetadata
  ): Promise<NotificationResult> {
    this.notifications.push({
      level,
      title,
      message,
      ...(payload && { payload }),
      ...(metadata && { metadata }),
    });

    const notificationId = `system-${Date.now()}`;
    const success = this.deliveryResults.get('system') ?? true;

    return Promise.resolve({
      notificationId,
      success,
      deliveredChannels: success ? ['ui'] : [],
      failedChannels: success ? [] : ['ui'],
      timestamp: new Date(),
    });
  }

  async sendBatchNotifications(
    notifications: Array<{
      level: NotificationLevel;
      title: string;
      message: string;
      payload?: NotificationPayload;
      metadata?: NotificationMetadata;
      isSystem?: boolean;
    }>
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const notification of notifications) {
      const result = notification.isSystem
        ? await this.sendSystemNotification(
            notification.level,
            notification.title,
            notification.message,
            notification.payload,
            notification.metadata
          )
        : await this.sendUserNotification(
            notification.level,
            notification.title,
            notification.message,
            notification.payload,
            notification.metadata
          );

      results.push(result);
    }

    return results;
  }

  updateUserPreferences(userId: string, preferences: UserNotificationPreferences): Promise<void> {
    this.userPreferences.set(userId, preferences);
    return Promise.resolve();
  }

  getUserPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    return Promise.resolve(this.userPreferences.get(userId) ?? null);
  }

  isChannelAvailable(channel: NotificationChannel): Promise<boolean> {
    // Mock availability - ui is always available, others depend on configuration
    switch (channel) {
      case 'ui':
        return Promise.resolve(true);
      case 'push':
        return Promise.resolve(this.deliveryResults.get('push') ?? false);
      case 'email':
        return Promise.resolve(this.deliveryResults.get('email') ?? false);
      default:
        return Promise.resolve(false);
    }
  }

  // Test helper methods
  getNotifications(): Array<{
    level: NotificationLevel;
    title: string;
    message: string;
    payload?: NotificationPayload;
    metadata?: NotificationMetadata;
  }> {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  setDeliveryResult(type: string, success: boolean): void {
    this.deliveryResults.set(type, success);
  }

  setChannelAvailability(channel: string, available: boolean): void {
    this.deliveryResults.set(channel, available);
  }

  async notifyGameStarted(gameDetails: {
    gameId: import('@twsoftball/domain').GameId;
    homeTeam: string;
    awayTeam: string;
    startTime: Date;
  }): Promise<void> {
    this.notifications.push({
      level: 'info',
      title: 'Game Started',
      message: `${gameDetails.homeTeam} vs ${gameDetails.awayTeam} has started`,
      payload: {
        gameId: gameDetails.gameId,
        homeTeam: gameDetails.homeTeam,
        awayTeam: gameDetails.awayTeam,
        startTime: gameDetails.startTime,
      },
    });
    return Promise.resolve();
  }

  async notifyGameEnded(
    gameId: string,
    gameResult: { homeScore: number; awayScore: number; winner?: string }
  ): Promise<void> {
    this.notifications.push({
      level: 'info',
      title: 'Game Ended',
      message: `Final Score: ${gameResult.homeScore}-${gameResult.awayScore}${gameResult.winner ? ` (Winner: ${gameResult.winner})` : ''}`,
      payload: {
        gameId,
        ...gameResult,
      },
    });
    return Promise.resolve();
  }

  async notifyScoreUpdate(
    gameId: string,
    scoreUpdate: { homeScore: number; awayScore: number; inning: number; scoringPlay?: string }
  ): Promise<void> {
    this.notifications.push({
      level: 'info',
      title: 'Score Update',
      message: `Inning ${scoreUpdate.inning}: ${scoreUpdate.homeScore}-${scoreUpdate.awayScore}${scoreUpdate.scoringPlay ? ` (${scoreUpdate.scoringPlay})` : ''}`,
      payload: {
        gameId,
        ...scoreUpdate,
      },
    });
    return Promise.resolve();
  }
}

describe('NotificationService Interface', () => {
  let notificationService: MockNotificationService;

  beforeEach(() => {
    notificationService = new MockNotificationService();
  });

  describe('User Notifications', () => {
    it('should send basic user notification successfully', async () => {
      const result = await notificationService.sendUserNotification(
        'info',
        'At-Bat Recorded',
        'Successfully recorded single for Player #12'
      );

      expect(result).toMatchObject({
        success: true,
        deliveredChannels: ['ui'],
        failedChannels: [],
      });
      expect(result.notificationId).toBeTruthy();
      expect(result.timestamp).toBeInstanceOf(Date);

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        level: 'info',
        title: 'At-Bat Recorded',
        message: 'Successfully recorded single for Player #12',
      });
    });

    it('should send user notification with payload and metadata', async () => {
      const payload: NotificationPayload = {
        gameId: 'game-123',
        playerId: 'player-456',
        atBatResult: 'SINGLE',
        rbiCount: 1,
      };

      const metadata: NotificationMetadata = {
        source: 'game-recorder',
        correlationId: 'req-789',
        userId: 'user-123',
        priority: 'normal',
        expiresAt: new Date(Date.now() + 300000), // 5 minutes
      };

      const result = await notificationService.sendUserNotification(
        'success',
        'RBI Single!',
        'Player #12 drives in a run with a single to center field',
        payload,
        metadata
      );

      expect(result.success).toBe(true);

      const notifications = notificationService.getNotifications();
      expect(notifications[0]).toMatchObject({
        level: 'success',
        title: 'RBI Single!',
        message: 'Player #12 drives in a run with a single to center field',
        payload,
        metadata,
      });
    });

    it('should handle user notification with all supported levels', async () => {
      const levels: NotificationLevel[] = ['info', 'success', 'warning', 'error'];

      for (const level of levels) {
        await notificationService.sendUserNotification(
          level,
          `${level.toUpperCase()} Title`,
          `Test message for ${level} level`
        );
      }

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(4);

      levels.forEach((level, index) => {
        expect(notifications[index]?.level).toBe(level);
        expect(notifications[index]?.title).toBe(`${level.toUpperCase()} Title`);
      });
    });

    it('should handle user notification delivery failure', async () => {
      notificationService.setDeliveryResult('user', false);

      const result = await notificationService.sendUserNotification(
        'error',
        'Delivery Test',
        'This notification should fail'
      );

      expect(result).toMatchObject({
        success: false,
        deliveredChannels: [],
        failedChannels: ['ui'],
      });
    });
  });

  describe('System Notifications', () => {
    it('should send system notification successfully', async () => {
      const result = await notificationService.sendSystemNotification(
        'info',
        'Game Started',
        'Dragons vs Tigers game has begun'
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toContain('system-');

      const notifications = notificationService.getNotifications();
      expect(notifications[0]).toMatchObject({
        level: 'info',
        title: 'Game Started',
        message: 'Dragons vs Tigers game has begun',
      });
    });

    it('should send system notification with game context', async () => {
      const payload: NotificationPayload = {
        gameId: 'game-456',
        homeTeam: 'Dragons',
        awayTeam: 'Tigers',
        gameStatus: 'IN_PROGRESS',
        inning: 1,
      };

      await notificationService.sendSystemNotification(
        'info',
        'Game Update',
        'First inning is now in progress',
        payload
      );

      const notifications = notificationService.getNotifications();
      expect(notifications[0]?.payload).toEqual(payload);
    });
  });

  describe('Batch Notifications', () => {
    it('should send multiple notifications in batch', async () => {
      const batchNotifications = [
        {
          level: 'info' as NotificationLevel,
          title: 'First Notification',
          message: 'First message',
          isSystem: false,
        },
        {
          level: 'warning' as NotificationLevel,
          title: 'Second Notification',
          message: 'Second message',
          isSystem: true,
        },
        {
          level: 'error' as NotificationLevel,
          title: 'Third Notification',
          message: 'Third message',
          isSystem: false,
        },
      ];

      const results = await notificationService.sendBatchNotifications(batchNotifications);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.notificationId).toBeTruthy();
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(3);
      expect(notifications[0]?.title).toBe('First Notification');
      expect(notifications[1]?.title).toBe('Second Notification');
      expect(notifications[2]?.title).toBe('Third Notification');
    });

    it('should handle mixed success/failure in batch notifications', async () => {
      // First notification succeeds, second fails
      notificationService.setDeliveryResult('user', true);
      notificationService.setDeliveryResult('system', false);

      const batchNotifications = [
        {
          level: 'info' as NotificationLevel,
          title: 'Success Notification',
          message: 'This should succeed',
          isSystem: false,
        },
        {
          level: 'error' as NotificationLevel,
          title: 'Failure Notification',
          message: 'This should fail',
          isSystem: true,
        },
      ];

      const results = await notificationService.sendBatchNotifications(batchNotifications);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(false);
    });

    it('should handle empty batch notifications', async () => {
      const results = await notificationService.sendBatchNotifications([]);

      expect(results).toHaveLength(0);
      expect(notificationService.getNotifications()).toHaveLength(0);
    });
  });

  describe('User Preferences Management', () => {
    it('should update user notification preferences', async () => {
      const userId = 'user-123';
      const preferences: UserNotificationPreferences = {
        enabledChannels: ['ui', 'push'],
        enabledLevels: ['info', 'warning', 'error'],
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'America/New_York',
        },
        gameNotifications: {
          atBatResults: true,
          scoreUpdates: true,
          gameEvents: false,
          errors: true,
        },
        systemNotifications: {
          gameStart: true,
          gameEnd: true,
          maintenanceAlerts: true,
        },
      };

      await notificationService.updateUserPreferences(userId, preferences);

      const retrieved = await notificationService.getUserPreferences(userId);
      expect(retrieved).toEqual(preferences);
    });

    it('should return null for non-existent user preferences', async () => {
      const preferences = await notificationService.getUserPreferences('non-existent-user');

      expect(preferences).toBeNull();
    });

    it('should handle preferences with minimal configuration', async () => {
      const userId = 'user-456';
      const minimalPreferences: UserNotificationPreferences = {
        enabledChannels: ['ui'],
        enabledLevels: ['error'],
      };

      await notificationService.updateUserPreferences(userId, minimalPreferences);

      const retrieved = await notificationService.getUserPreferences(userId);
      expect(retrieved).toEqual(minimalPreferences);
    });
  });

  describe('Channel Availability', () => {
    it('should check UI channel availability', async () => {
      const isAvailable = await notificationService.isChannelAvailable('ui');

      expect(isAvailable).toBe(true);
    });

    it('should check push notification availability', async () => {
      notificationService.setChannelAvailability('push', true);

      const isAvailable = await notificationService.isChannelAvailable('push');

      expect(isAvailable).toBe(true);
    });

    it('should check email notification availability', async () => {
      notificationService.setChannelAvailability('email', false);

      const isAvailable = await notificationService.isChannelAvailable('email');

      expect(isAvailable).toBe(false);
    });

    it('should handle unknown channel types', async () => {
      const isAvailable = await notificationService.isChannelAvailable(
        'sms' as NotificationChannel
      );

      expect(isAvailable).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle notifications with empty titles', async () => {
      const result = await notificationService.sendUserNotification(
        'warning',
        '',
        'Message without title'
      );

      expect(result.success).toBe(true);

      const notifications = notificationService.getNotifications();
      expect(notifications[0]).toMatchObject({
        title: '',
        message: 'Message without title',
      });
    });

    it('should handle notifications with empty messages', async () => {
      const result = await notificationService.sendUserNotification(
        'info',
        'Title without message',
        ''
      );

      expect(result.success).toBe(true);

      const notifications = notificationService.getNotifications();
      expect(notifications[0]).toMatchObject({
        title: 'Title without message',
        message: '',
      });
    });

    it('should handle complex payload data types', async () => {
      const complexPayload: NotificationPayload = {
        gameData: {
          id: 'game-789',
          teams: ['Dragons', 'Tigers'],
          score: { home: 5, away: 3 },
          inning: 7,
          nested: {
            deep: {
              value: 'test',
            },
          },
        },
        timestamp: new Date(),
        isImportant: true,
        count: 42,
        tags: ['urgent', 'game-event'],
        metadata: {
          version: '1.0',
          format: 'json',
        },
      };

      const result = await notificationService.sendUserNotification(
        'info',
        'Complex Data',
        'Testing complex payload',
        complexPayload
      );

      expect(result.success).toBe(true);

      const notifications = notificationService.getNotifications();
      expect(notifications[0]?.payload).toEqual(complexPayload);
    });

    it('should handle metadata with expiration times', async () => {
      const futureTime = new Date(Date.now() + 600000); // 10 minutes
      const metadata: NotificationMetadata = {
        source: 'test-service',
        expiresAt: futureTime,
        priority: 'high',
        correlationId: 'test-123',
      };

      await notificationService.sendUserNotification(
        'warning',
        'Time-sensitive Alert',
        'This notification expires soon',
        undefined,
        metadata
      );

      const notifications = notificationService.getNotifications();
      expect(notifications[0]?.metadata?.expiresAt).toEqual(futureTime);
      expect(notifications[0]?.metadata?.priority).toBe('high');
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('should enforce NotificationLevel type constraints', () => {
      // This test verifies TypeScript compilation with correct types
      const validLevels: NotificationLevel[] = ['info', 'success', 'warning', 'error'];

      validLevels.forEach(level => {
        expect(['info', 'success', 'warning', 'error']).toContain(level);
      });
    });

    it('should enforce NotificationChannel type constraints', () => {
      // This test verifies TypeScript compilation with correct types
      const validChannels: NotificationChannel[] = ['ui', 'push', 'email'];

      validChannels.forEach(channel => {
        expect(['ui', 'push', 'email']).toContain(channel);
      });
    });

    it('should handle all required NotificationResult properties', async () => {
      const result = await notificationService.sendUserNotification(
        'info',
        'Type Test',
        'Testing result structure'
      );

      // Verify all required properties exist
      expect(result).toHaveProperty('notificationId');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('deliveredChannels');
      expect(result).toHaveProperty('failedChannels');
      expect(result).toHaveProperty('timestamp');

      // Verify property types
      expect(typeof result.notificationId).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.deliveredChannels)).toBe(true);
      expect(Array.isArray(result.failedChannels)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
