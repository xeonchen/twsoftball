import type { GameId } from '@twsoftball/domain';

/**
 * @file NotificationService
 * Outbound port interface for user and system notifications in the TW Softball application.
 *
 * @remarks
 * This interface defines the driven port for notification operations in the hexagonal
 * architecture. It abstracts all notification concerns from the application core,
 * enabling different notification implementations without affecting business logic.
 *
 * The notification service provides comprehensive notification capabilities supporting:
 * - Multi-level user notifications (info, success, warning, error)
 * - System-wide notifications for operational events
 * - Multiple delivery channels (UI, push notifications, email)
 * - User preference management and customization
 * - Batch notification processing for efficiency
 * - Rich contextual data and metadata support
 *
 * Design principles:
 * - Channel-agnostic: Supports multiple delivery mechanisms
 * - User-centric: Respects user preferences and quiet hours
 * - Context-aware: Rich payload and metadata for business intelligence
 * - Performance-oriented: Batch operations and async processing
 * - Failure-resilient: Graceful degradation and retry capabilities
 *
 * The interface supports two primary notification types:
 * - **User Notifications**: Game events, at-bat results, personal alerts
 * - **System Notifications**: Game status changes, maintenance alerts, system events
 *
 * Notification levels provide appropriate urgency categorization:
 * - **info**: General information and successful operations
 * - **success**: Positive outcomes and achievements
 * - **warning**: Attention-required situations that don't block operation
 * - **error**: Critical issues requiring immediate user attention
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class WebNotificationService implements NotificationService {
 *   private toastService: ToastService;
 *   private pushService: PushNotificationService;
 *   private preferences: Map<string, UserNotificationPreferences> = new Map();
 *
 *   async sendUserNotification(
 *     level: NotificationLevel,
 *     title: string,
 *     message: string,
 *     payload?: NotificationPayload,
 *     metadata?: NotificationMetadata
 *   ): Promise<NotificationResult> {
 *     const notificationId = generateId();
 *     const deliveredChannels: NotificationChannel[] = [];
 *     const failedChannels: NotificationChannel[] = [];
 *
 *     // Check user preferences
 *     const userPrefs = await this.getUserPreferences(metadata?.userId);
 *     const enabledChannels = userPrefs?.enabledChannels ?? ['ui'];
 *
 *     // Deliver to UI (toast)
 *     if (enabledChannels.includes('ui')) {
 *       try {
 *         await this.toastService.show(level, title, message);
 *         deliveredChannels.push('ui');
 *       } catch (error) {
 *         failedChannels.push('ui');
 *       }
 *     }
 *
 *     // Deliver via push notifications
 *     if (enabledChannels.includes('push') && await this.isChannelAvailable('push')) {
 *       try {
 *         await this.pushService.send({
 *           title,
 *           body: message,
 *           data: payload,
 *           badge: this.getBadgeCount(level)
 *         });
 *         deliveredChannels.push('push');
 *       } catch (error) {
 *         failedChannels.push('push');
 *       }
 *     }
 *
 *     return {
 *       notificationId,
 *       success: deliveredChannels.length > 0,
 *       deliveredChannels,
 *       failedChannels,
 *       timestamp: new Date()
 *     };
 *   }
 * }
 *
 * // Usage in application service
 * class AtBatApplicationService {
 *   constructor(
 *     private notificationService: NotificationService,
 *     private logger: Logger
 *   ) {}
 *
 *   async recordAtBat(command: RecordAtBatCommand): Promise<void> {
 *     try {
 *       const result = await this.gameService.recordAtBat(command);
 *
 *       // Notify user of successful at-bat
 *       await this.notificationService.sendUserNotification(
 *         'success',
 *         'At-Bat Recorded',
 *         `${result.playerName} recorded a ${result.resultType}`,
 *         {
 *           gameId: command.gameId,
 *           playerId: command.playerId,
 *           atBatResult: result.resultType,
 *           rbiCount: result.rbis,
 *           runsScored: result.runsScored
 *         },
 *         {
 *           source: 'at-bat-recorder',
 *           correlationId: command.correlationId,
 *           userId: command.userId,
 *           priority: 'normal'
 *         }
 *       );
 *
 *       // System notification for significant events
 *       if (result.isSignificant) {
 *         await this.notificationService.sendSystemNotification(
 *           'info',
 *           'Game Event',
 *           `Significant play: ${result.description}`,
 *           {
 *             gameId: command.gameId,
 *             eventType: 'significant_play',
 *             description: result.description
 *           }
 *         );
 *       }
 *     } catch (error) {
 *       // Error notification
 *       await this.notificationService.sendUserNotification(
 *         'error',
 *         'Recording Failed',
 *         'Unable to record at-bat. Please try again.',
 *         {
 *           gameId: command.gameId,
 *           error: error.message
 *         },
 *         {
 *           source: 'at-bat-recorder',
 *           correlationId: command.correlationId,
 *           userId: command.userId,
 *           priority: 'high'
 *         }
 *       );
 *       throw error;
 *     }
 *   }
 * }
 * ```
 */

/**
 * Notification severity levels for appropriate categorization and user experience.
 *
 * @remarks
 * Hierarchical notification levels that enable appropriate visual treatment,
 * filtering, and user attention management. Each level corresponds to specific
 * use cases and visual representations in the user interface.
 *
 * Level guidelines:
 * - **info**: Neutral information, game flow updates, general notifications
 * - **success**: Positive outcomes, successful operations, achievements
 * - **warning**: Attention-required situations, potential issues, advisories
 * - **error**: Critical problems, failures, issues requiring immediate action
 *
 * Visual treatment varies by level:
 * - Info: Blue color scheme, standard duration display
 * - Success: Green color scheme, positive feedback indicators
 * - Warning: Yellow/orange color scheme, extended display duration
 * - Error: Red color scheme, persistent display until dismissed
 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * Available notification delivery channels for multi-platform support.
 *
 * @remarks
 * Different delivery mechanisms provide flexibility for user preferences
 * and technical capabilities. Each channel has different characteristics:
 *
 * - **ui**: In-application toast notifications, immediate visual feedback
 * - **push**: Browser/mobile push notifications, works when app is backgrounded
 * - **email**: Email delivery for important events (future expansion)
 *
 * Channel availability depends on:
 * - Browser/platform support (push notifications)
 * - User permissions and consent
 * - Infrastructure configuration
 * - User preference settings
 */
export type NotificationChannel = 'ui' | 'push' | 'email';

/**
 * Flexible payload structure for notification context and business data.
 *
 * @remarks
 * NotificationPayload provides a flexible container for business-specific
 * data that enhances notifications with relevant context. The structure
 * supports various data types to accommodate different notification scenarios.
 *
 * Common payload patterns:
 * - Game identifiers and status information
 * - Player data and statistics
 * - Event details and outcomes
 * - Error information and context
 * - Performance metrics and timings
 *
 * The flexible structure allows for evolution without breaking interface contracts,
 * supporting both current softball game data and future extensions.
 *
 * @example
 * ```typescript
 * // At-bat notification payload
 * const atBatPayload: NotificationPayload = {
 *   gameId: 'game-123',
 *   playerId: 'player-456',
 *   playerName: 'John Smith',
 *   jerseyNumber: 12,
 *   atBatResult: 'SINGLE',
 *   rbiCount: 1,
 *   inning: 7,
 *   outs: 1,
 *   basesSituation: 'runner_on_first'
 * };
 *
 * // Game event payload
 * const gamePayload: NotificationPayload = {
 *   gameId: 'game-789',
 *   homeTeam: 'Dragons',
 *   awayTeam: 'Tigers',
 *   gameStatus: 'IN_PROGRESS',
 *   currentInning: 5,
 *   score: {
 *     home: 7,
 *     away: 4
 *   },
 *   lastPlay: 'Two-run double by #23'
 * };
 *
 * // System maintenance payload
 * const maintenancePayload: NotificationPayload = {
 *   maintenanceType: 'scheduled',
 *   startTime: '2024-06-15T02:00:00Z',
 *   estimatedDuration: 120, // minutes
 *   affectedServices: ['scoring', 'statistics'],
 *   alternativeActions: ['offline_mode_available']
 * };
 * ```
 */
export interface NotificationPayload {
  /** Flexible payload data supporting various types and nested structures */
  [key: string]: unknown;
}

/**
 * Metadata attached to notifications for operational and analytical purposes.
 *
 * @remarks
 * NotificationMetadata provides contextual information about notification
 * creation, routing, and operational environment. Essential for debugging,
 * auditing, correlation tracking, and system monitoring.
 *
 * Metadata supports:
 * - Request correlation and tracing
 * - User identification and audit trails
 * - Priority and urgency classification
 * - Expiration and lifecycle management
 * - Source system identification
 *
 * Priority levels influence delivery behavior:
 * - **low**: Background notifications, can be delayed
 * - **normal**: Standard delivery, typical user notifications
 * - **high**: Urgent notifications, immediate delivery attempts
 * - **critical**: Emergency notifications, multiple delivery attempts
 */
export interface NotificationMetadata {
  /** System or component that generated this notification */
  readonly source: string;

  /** Optional correlation ID for request tracing and debugging */
  readonly correlationId?: string;

  /** Optional user ID for personalization and audit trails */
  readonly userId?: string;

  /** Priority level affecting delivery behavior and user attention */
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';

  /** Optional expiration time for time-sensitive notifications */
  readonly expiresAt?: Date;

  /** Optional additional context for infrastructure operations */
  readonly context?: Record<string, unknown>;
}

/**
 * User-specific notification preferences for personalized experience.
 *
 * @remarks
 * Comprehensive preference structure that allows users to customize their
 * notification experience across different channels, levels, and content types.
 * Supports fine-grained control over notification behavior while maintaining
 * system flexibility.
 *
 * Preference categories:
 * - **Channel preferences**: Which delivery methods to use
 * - **Level filtering**: Which severity levels to receive
 * - **Quiet hours**: Time-based notification management
 * - **Content filtering**: Category-specific notification control
 *
 * The structure balances user control with system needs, allowing critical
 * notifications to override certain preferences when necessary.
 */
export interface UserNotificationPreferences {
  /** Enabled delivery channels for this user */
  readonly enabledChannels: NotificationChannel[];

  /** Enabled notification levels (lower levels may be filtered out) */
  readonly enabledLevels: NotificationLevel[];

  /** Optional quiet hours configuration for time-based filtering */
  readonly quietHours?: {
    /** Whether quiet hours are enabled */
    readonly enabled: boolean;
    /** Start time in HH:MM format (24-hour) */
    readonly startTime: string;
    /** End time in HH:MM format (24-hour) */
    readonly endTime: string;
    /** Timezone for quiet hours calculation */
    readonly timezone: string;
  };

  /** Game-specific notification preferences */
  readonly gameNotifications?: {
    /** Enable at-bat result notifications */
    readonly atBatResults: boolean;
    /** Enable score update notifications */
    readonly scoreUpdates: boolean;
    /** Enable general game event notifications */
    readonly gameEvents: boolean;
    /** Enable error and problem notifications */
    readonly errors: boolean;
  };

  /** System-level notification preferences */
  readonly systemNotifications?: {
    /** Enable game start/end notifications */
    readonly gameStart: boolean;
    readonly gameEnd: boolean;
    /** Enable maintenance and system alert notifications */
    readonly maintenanceAlerts: boolean;
  };
}

/**
 * Result of a notification delivery attempt with detailed outcome information.
 *
 * @remarks
 * NotificationResult provides comprehensive feedback about notification delivery,
 * enabling applications to track success rates, diagnose delivery issues, and
 * implement appropriate fallback strategies.
 *
 * The result includes:
 * - Overall success status for quick checks
 * - Channel-specific delivery outcomes
 * - Timing information for performance monitoring
 * - Unique identifier for tracking and correlation
 *
 * Applications can use this information for:
 * - Retry logic for failed deliveries
 * - User feedback about notification status
 * - Analytics and monitoring of notification effectiveness
 * - Debugging delivery issues
 */
export interface NotificationResult {
  /** Unique identifier for this notification delivery attempt */
  readonly notificationId: string;

  /** Overall success status (true if at least one channel succeeded) */
  readonly success: boolean;

  /** Channels that successfully delivered the notification */
  readonly deliveredChannels: NotificationChannel[];

  /** Channels that failed to deliver the notification */
  readonly failedChannels: NotificationChannel[];

  /** When the delivery attempt was completed */
  readonly timestamp: Date;

  /** Optional error information for failed deliveries */
  readonly error?: string;

  /** Optional metadata about the delivery process */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Notification service interface for user and system notifications.
 *
 * @remarks
 * This interface provides comprehensive notification capabilities for the TW Softball
 * application, supporting both user-focused notifications (at-bat results, game events)
 * and system-wide notifications (game status, operational alerts).
 *
 * Design principles:
 * - **Multi-channel**: Supports UI, push, and email delivery
 * - **User-centric**: Respects preferences and customization
 * - **Contextual**: Rich payload and metadata support
 * - **Resilient**: Graceful failure handling and retry capabilities
 * - **Efficient**: Batch processing for high-volume scenarios
 * - **Traceable**: Comprehensive result tracking and correlation
 *
 * The service handles two primary notification categories:
 *
 * **User Notifications**: Personal alerts related to game participation
 * - At-bat results and performance feedback
 * - Score updates and game milestones
 * - Error conditions and recovery guidance
 * - Achievement notifications and statistics
 *
 * **System Notifications**: Operational and administrative alerts
 * - Game status changes (started, paused, completed)
 * - System maintenance and downtime notices
 * - Infrastructure alerts and health monitoring
 * - Batch processing and scheduled operations
 *
 * Notification delivery considers:
 * - User preferences and enabled channels
 * - Quiet hours and do-not-disturb settings
 * - Channel availability and technical capabilities
 * - Message priority and urgency levels
 * - Expiration times and lifecycle management
 *
 * All operations are asynchronous to support various delivery mechanisms
 * without blocking application flow. Results provide detailed feedback
 * for monitoring, debugging, and user experience optimization.
 */
export interface NotificationService {
  /**
   * Sends a notification to the current user with personalized delivery.
   *
   * @remarks
   * Primary method for delivering user-focused notifications that respect
   * individual preferences, quiet hours, and channel availability. The
   * notification is delivered through the user's preferred channels with
   * appropriate fallback handling.
   *
   * User notification scenarios:
   * - At-bat results and game participation feedback
   * - Personal statistics and achievement notifications
   * - Error messages and recovery instructions
   * - Game event updates relevant to the user's participation
   *
   * The service considers user preferences including:
   * - Enabled notification channels (UI, push, email)
   * - Severity level filtering (info, success, warning, error)
   * - Quiet hours and do-not-disturb periods
   * - Content category preferences (game events, errors, etc.)
   *
   * Delivery is attempted across all enabled and available channels,
   * with graceful degradation if some channels fail. At least one
   * successful delivery is required for overall success.
   *
   * @param level - Notification severity level for appropriate treatment
   * @param title - Brief, descriptive title for the notification
   * @param message - Detailed message content for user display
   * @param payload - Optional structured data with business context
   * @param metadata - Optional operational metadata for tracking and correlation
   * @returns Promise resolving to delivery result with success status and details
   *
   * @example
   * ```typescript
   * // At-bat success notification
   * const result = await notificationService.sendUserNotification(
   *   'success',
   *   'Great Hit!',
   *   'Your single drove in 2 runs and tied the game!',
   *   {
   *     gameId: 'game-123',
   *     playerId: 'player-456',
   *     atBatResult: 'SINGLE',
   *     rbiCount: 2,
   *     gameScore: { home: 5, away: 5 },
   *     inning: 9,
   *     significance: 'game_tying_hit'
   *   },
   *   {
   *     source: 'at-bat-recorder',
   *     correlationId: 'req-789',
   *     userId: 'user-123',
   *     priority: 'high'
   *   }
   * );
   *
   * if (result.success) {
   *   logger.info('User notified of at-bat result', {
   *     notificationId: result.notificationId,
   *     channels: result.deliveredChannels
   *   });
   * }
   *
   * // Error notification with recovery guidance
   * await notificationService.sendUserNotification(
   *   'error',
   *   'Recording Failed',
   *   'Unable to save your at-bat. Check your connection and try again.',
   *   {
   *     gameId: 'game-456',
   *     errorType: 'network_timeout',
   *     retryAvailable: true,
   *     offlineModeAvailable: true
   *   },
   *   {
   *     source: 'data-persistence',
   *     userId: 'user-123',
   *     priority: 'high',
   *     expiresAt: new Date(Date.now() + 300000) // 5 minutes
   *   }
   * );
   * ```
   */
  sendUserNotification(
    level: NotificationLevel,
    title: string,
    message: string,
    payload?: NotificationPayload,
    metadata?: NotificationMetadata
  ): Promise<NotificationResult>;

  /**
   * Sends a system-wide notification for operational and administrative purposes.
   *
   * @remarks
   * System notifications communicate operational events, status changes, and
   * administrative information that affects the overall application or game
   * environment. These notifications typically have broader scope than user
   * notifications and may use different delivery channels.
   *
   * System notification scenarios:
   * - Game lifecycle events (started, paused, completed, cancelled)
   * - System maintenance and downtime notifications
   * - Infrastructure health alerts and monitoring
   * - Batch processing results and scheduled operation outcomes
   * - Security alerts and access control events
   *
   * System notifications may bypass certain user preferences for critical
   * operational information, but should still respect basic delivery settings
   * and channel availability.
   *
   * These notifications are often used for:
   * - Administrative dashboards and monitoring interfaces
   * - Operator notifications and alert systems
   * - Automated system integration and webhooks
   * - Audit trails and compliance reporting
   *
   * @param level - Notification severity level for appropriate routing
   * @param title - System event title for identification and categorization
   * @param message - Detailed system message with operational context
   * @param payload - Optional structured data with system and business context
   * @param metadata - Optional operational metadata for tracking and auditing
   * @returns Promise resolving to delivery result with system notification outcomes
   *
   * @example
   * ```typescript
   * // Game status change notification
   * await notificationService.sendSystemNotification(
   *   'info',
   *   'Game Started',
   *   'Dragons vs Tigers game has begun at Municipal Stadium',
   *   {
   *     gameId: 'game-123',
   *     homeTeam: 'Dragons',
   *     awayTeam: 'Tigers',
   *     gameStatus: 'IN_PROGRESS',
   *     venue: 'Municipal Stadium',
   *     startTime: new Date(),
   *     scheduledStartTime: '2024-06-15T19:00:00Z',
   *     weather: {
   *       condition: 'clear',
   *       temperature: 75,
   *       windSpeed: 5
   *     }
   *   },
   *   {
   *     source: 'game-coordinator',
   *     correlationId: 'game-start-123',
   *     priority: 'normal'
   *   }
   * );
   *
   * // System maintenance alert
   * await notificationService.sendSystemNotification(
   *   'warning',
   *   'Scheduled Maintenance',
   *   'System will be unavailable for 30 minutes starting at 2:00 AM EST',
   *   {
   *     maintenanceType: 'database_upgrade',
   *     startTime: '2024-06-16T02:00:00Z',
   *     estimatedDuration: 30,
   *     affectedServices: ['scoring', 'statistics', 'reporting'],
   *     alternativeActions: ['offline_mode', 'manual_backup'],
   *     contactInfo: 'support@twsoftball.com'
   *   },
   *   {
   *     source: 'system-administrator',
   *     priority: 'high',
   *     expiresAt: new Date('2024-06-16T03:00:00Z')
   *   }
   * );
   *
   * // Infrastructure health alert
   * await notificationService.sendSystemNotification(
   *   'error',
   *   'Database Performance Alert',
   *   'Query response times exceeded normal thresholds',
   *   {
   *     alertType: 'performance_degradation',
   *     service: 'database',
   *     metrics: {
   *       avgResponseTime: 2500,
   *       threshold: 1000,
   *       affectedQueries: 45,
   *       timeWindow: '5_minutes'
   *     },
   *     possibleCauses: ['high_load', 'resource_contention'],
   *     automatedActions: ['query_optimization', 'connection_pooling']
   *   },
   *   {
   *     source: 'monitoring-system',
   *     priority: 'critical',
   *     correlationId: 'alert-456'
   *   }
   * );
   * ```
   */
  sendSystemNotification(
    level: NotificationLevel,
    title: string,
    message: string,
    payload?: NotificationPayload,
    metadata?: NotificationMetadata
  ): Promise<NotificationResult>;

  /**
   * Sends multiple notifications efficiently in a single batch operation.
   *
   * @remarks
   * Batch notification processing provides efficient delivery of multiple
   * notifications while maintaining individual delivery tracking and error
   * handling. This method is essential for high-volume scenarios like
   * game event processing, statistical updates, or system-wide alerts.
   *
   * Batch processing benefits:
   * - **Performance**: Reduced overhead for multiple notifications
   * - **Efficiency**: Optimized channel utilization and connection pooling
   * - **Consistency**: Coordinated delivery timing for related notifications
   * - **Resource management**: Better control over system resource usage
   *
   * Common batch scenarios:
   * - End-of-inning statistics and updates
   * - Multi-player achievement notifications
   * - System status updates across multiple games
   * - Scheduled maintenance notifications to multiple users
   *
   * Each notification in the batch is processed individually with its own
   * result tracking, allowing for mixed success/failure scenarios and
   * detailed outcome analysis.
   *
   * The batch maintains the distinction between user and system notifications,
   * applying appropriate preference filtering and channel selection for each type.
   *
   * @param notifications - Array of notifications to send with mixed types
   * @returns Promise resolving to array of results corresponding to input notifications
   *
   * @example
   * ```typescript
   * // End-of-inning batch notifications
   * const inningResults = await notificationService.sendBatchNotifications([
   *   {
   *     level: 'info',
   *     title: 'Inning Complete',
   *     message: 'Top of 7th inning completed',
   *     payload: {
   *       gameId: 'game-123',
   *       inning: 7,
   *       half: 'top',
   *       runs: 2,
   *       hits: 3,
   *       errors: 0
   *     },
   *     isSystem: true
   *   },
   *   {
   *     level: 'success',
   *     title: 'Great Inning!',
   *     message: 'Your team scored 2 runs with solid hitting',
   *     payload: {
   *       gameId: 'game-123',
   *       teamId: 'team-home',
   *       runsScored: 2,
   *       batting: { hits: 3, strikeouts: 1 }
   *     },
   *     metadata: {
   *       userId: 'user-123',
   *       source: 'inning-processor'
   *     },
   *     isSystem: false
   *   }
   * ]);
   *
   * // Process results
   * inningResults.forEach((result, index) => {
   *   if (!result.success) {
   *     logger.warn('Batch notification failed', {
   *       notificationIndex: index,
   *       notificationId: result.notificationId,
   *       failedChannels: result.failedChannels
   *     });
   *   }
   * });
   *
   * // Multi-player achievement notifications
   * const playerAchievements = players.map(player => ({
   *   level: 'success' as NotificationLevel,
   *   title: 'Season Milestone!',
   *   message: `Congratulations on reaching ${player.milestone}!`,
   *   payload: {
   *     playerId: player.id,
   *     milestone: player.milestone,
   *     statistics: player.seasonStats,
   *     nextGoal: player.nextMilestone
   *   },
   *   metadata: {
   *     userId: player.userId,
   *     source: 'achievement-processor',
   *     priority: 'normal' as const
   *   },
   *   isSystem: false
   * }));
   *
   * const achievementResults = await notificationService.sendBatchNotifications(
   *   playerAchievements
   * );
   *
   * const successCount = achievementResults.filter(r => r.success).length;
   * logger.info('Achievement notifications sent', {
   *   totalPlayers: players.length,
   *   successCount,
   *   failureCount: achievementResults.length - successCount
   * });
   * ```
   */
  sendBatchNotifications(
    notifications: Array<{
      level: NotificationLevel;
      title: string;
      message: string;
      payload?: NotificationPayload;
      metadata?: NotificationMetadata;
      isSystem?: boolean;
    }>
  ): Promise<NotificationResult[]>;

  /**
   * Updates notification preferences for a specific user.
   *
   * @remarks
   * User preference management enables personalized notification experiences
   * by allowing fine-grained control over delivery channels, content types,
   * and timing restrictions. This method supports the complete lifecycle
   * of preference management from initial setup to ongoing customization.
   *
   * Preference management features:
   * - **Channel control**: Enable/disable UI, push, email notifications
   * - **Level filtering**: Control which severity levels are received
   * - **Content filtering**: Category-specific notification preferences
   * - **Timing control**: Quiet hours and do-not-disturb periods
   * - **Game-specific**: Specialized preferences for softball game events
   *
   * The preference system balances user control with system needs,
   * allowing critical notifications to override certain preferences
   * when necessary for safety or operational requirements.
   *
   * Preference changes take effect immediately for new notifications,
   * but do not affect notifications already in the delivery pipeline.
   *
   * @param userId - Unique identifier for the user
   * @param preferences - Complete preference configuration for the user
   * @returns Promise that resolves when preferences are successfully updated
   *
   * @example
   * ```typescript
   * // Comprehensive user preferences
   * await notificationService.updateUserPreferences('user-123', {
   *   enabledChannels: ['ui', 'push'],
   *   enabledLevels: ['success', 'warning', 'error'], // No info-level notifications
   *   quietHours: {
   *     enabled: true,
   *     startTime: '22:00',
   *     endTime: '07:00',
   *     timezone: 'America/New_York'
   *   },
   *   gameNotifications: {
   *     atBatResults: true,
   *     scoreUpdates: true,
   *     gameEvents: false, // Only personal at-bats, not all game events
   *     errors: true
   *   },
   *   systemNotifications: {
   *     gameStart: true,
   *     gameEnd: true,
   *     maintenanceAlerts: true
   *   }
   * });
   *
   * // Minimal preferences for critical-only notifications
   * await notificationService.updateUserPreferences('user-456', {
   *   enabledChannels: ['ui'],
   *   enabledLevels: ['error'] // Only error notifications
   * });
   *
   * // Mobile-focused preferences with push priority
   * await notificationService.updateUserPreferences('user-789', {
   *   enabledChannels: ['push', 'ui'],
   *   enabledLevels: ['info', 'success', 'warning', 'error'],
   *   gameNotifications: {
   *     atBatResults: true,
   *     scoreUpdates: true,
   *     gameEvents: true,
   *     errors: true
   *   },
   *   systemNotifications: {
   *     gameStart: true,
   *     gameEnd: false, // Will get game results via at-bat notifications
   *     maintenanceAlerts: true
   *   }
   * });
   * ```
   */
  updateUserPreferences(userId: string, preferences: UserNotificationPreferences): Promise<void>;

  /**
   * Retrieves current notification preferences for a specific user.
   *
   * @remarks
   * Preference retrieval supports user interface customization, preference
   * validation, and administrative oversight of notification configuration.
   * This method provides access to the complete preference structure for
   * display, editing, and debugging purposes.
   *
   * Use cases for preference retrieval:
   * - **User interface**: Populating preference forms and settings screens
   * - **Validation**: Checking current settings before notification delivery
   * - **Debugging**: Troubleshooting notification delivery issues
   * - **Administrative**: User support and preference management
   * - **Analytics**: Understanding user notification patterns and preferences
   *
   * The method returns null for users who haven't configured preferences,
   * allowing applications to apply appropriate defaults or prompt for
   * initial preference setup.
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to user preferences or null if not configured
   *
   * @example
   * ```typescript
   * // Check user preferences before sending notification
   * const userPrefs = await notificationService.getUserPreferences('user-123');
   *
   * if (userPrefs && userPrefs.enabledLevels.includes('info')) {
   *   await notificationService.sendUserNotification(
   *     'info',
   *     'Game Update',
   *     'Your team is now batting in the 5th inning'
   *   );
   * } else {
   *   logger.debug('Skipping info notification due to user preferences', {
   *     userId: 'user-123',
   *     enabledLevels: userPrefs?.enabledLevels
   *   });
   * }
   *
   * // User interface preference loading
   * const loadUserSettings = async (userId: string) => {
   *   const preferences = await notificationService.getUserPreferences(userId);
   *
   *   if (!preferences) {
   *     // First-time user - show preference setup wizard
   *     return showPreferenceSetup({
   *       defaultChannels: ['ui'],
   *       defaultLevels: ['success', 'warning', 'error'],
   *       suggestedGameNotifications: {
   *         atBatResults: true,
   *         scoreUpdates: false,
   *         gameEvents: false,
   *         errors: true
   *       }
   *     });
   *   }
   *
   *   // Existing user - populate current settings
   *   return populateSettingsForm(preferences);
   * };
   *
   * // Administrative preference review
   * const reviewUserPreferences = async (userId: string) => {
   *   const preferences = await notificationService.getUserPreferences(userId);
   *
   *   if (preferences) {
   *     logger.info('User notification preferences', {
   *       userId,
   *       channels: preferences.enabledChannels.length,
   *       levels: preferences.enabledLevels.length,
   *       hasQuietHours: !!preferences.quietHours?.enabled,
   *       gameNotifications: Object.values(preferences.gameNotifications || {})
   *         .filter(Boolean).length
   *     });
   *   } else {
   *     logger.info('User has no notification preferences configured', { userId });
   *   }
   * };
   * ```
   */
  getUserPreferences(userId: string): Promise<UserNotificationPreferences | null>;

  /**
   * Checks if a specific notification channel is available for delivery.
   *
   * @remarks
   * Channel availability checking enables intelligent notification routing
   * and graceful degradation when certain delivery mechanisms are unavailable.
   * This method supports proactive channel management and user experience
   * optimization.
   *
   * Availability factors vary by channel:
   * - **UI**: Application state, user interface visibility
   * - **Push**: Browser support, user permissions, service worker status
   * - **Email**: SMTP configuration, user email verification status
   *
   * Channel availability can change during application runtime due to:
   * - User permission changes (push notification consent)
   * - Network connectivity issues
   * - Infrastructure service availability
   * - Browser capabilities and security policies
   *
   * Applications should check availability before attempting delivery
   * of critical notifications, and implement appropriate fallback
   * strategies for unavailable channels.
   *
   * @param channel - Notification channel to check for availability
   * @returns Promise resolving to true if channel is available, false otherwise
   *
   * @example
   * ```typescript
   * // Pre-delivery channel verification
   * const sendCriticalNotification = async (
   *   title: string,
   *   message: string,
   *   payload: NotificationPayload
   * ) => {
   *   const availableChannels: NotificationChannel[] = [];
   *
   *   // Check all channels
   *   const channels: NotificationChannel[] = ['ui', 'push', 'email'];
   *   for (const channel of channels) {
   *     if (await notificationService.isChannelAvailable(channel)) {
   *       availableChannels.push(channel);
   *     }
   *   }
   *
   *   if (availableChannels.length === 0) {
   *     logger.error('No notification channels available for critical message', {
   *       title,
   *       requestedChannels: channels
   *     });
   *     throw new Error('Unable to deliver critical notification');
   *   }
   *
   *   logger.info('Delivering critical notification', {
   *     title,
   *     availableChannels
   *   });
   *
   *   return await notificationService.sendSystemNotification(
   *     'error',
   *     title,
   *     message,
   *     payload,
   *     {
   *       source: 'critical-notification-service',
   *       priority: 'critical'
   *     }
   *   );
   * };
   *
   * // Progressive enhancement for notification delivery
   * const sendEnhancedNotification = async (
   *   level: NotificationLevel,
   *   title: string,
   *   message: string
   * ) => {
   *   let enhancedMessage = message;
   *
   *   // Enhance message for push notifications if available
   *   if (await notificationService.isChannelAvailable('push')) {
   *     enhancedMessage += ' (Tap to view details in app)';
   *   }
   *
   *   // Use email fallback for important messages if push unavailable
   *   if (level === 'error' &&
   *       !await notificationService.isChannelAvailable('push') &&
   *       await notificationService.isChannelAvailable('email')) {
   *     enhancedMessage += ' This message was sent via email due to push notification unavailability.';
   *   }
   *
   *   return await notificationService.sendUserNotification(
   *     level,
   *     title,
   *     enhancedMessage
   *   );
   * };
   *
   * // Channel status monitoring
   * const monitorChannelHealth = async () => {
   *   const channels: NotificationChannel[] = ['ui', 'push', 'email'];
   *   const status = {};
   *
   *   for (const channel of channels) {
   *     status[channel] = await notificationService.isChannelAvailable(channel);
   *   }
   *
   *   logger.info('Notification channel status', status);
   *
   *   // Alert if critical channels are down
   *   if (!status['ui'] && !status['push']) {
   *     logger.error('Primary notification channels unavailable', {
   *       uiAvailable: status['ui'],
   *       pushAvailable: status['push'],
   *       emailAvailable: status['email']
   *     });
   *   }
   *
   *   return status;
   * };
   * ```
   */
  isChannelAvailable(channel: NotificationChannel): Promise<boolean>;

  /**
   * Sends a notification when a game is started.
   *
   * @remarks
   * Notifies relevant users (players, coaches, scorekeepers) that a game
   * has officially started. This includes game details like team names,
   * start time, and any other relevant game information.
   *
   * @param gameId - Unique identifier for the started game
   * @param gameDetails - Basic game information for the notification
   */
  notifyGameStarted(gameDetails: {
    gameId: GameId;
    homeTeam: string;
    awayTeam: string;
    startTime: Date;
  }): Promise<void>;

  /**
   * Sends a notification when a game is completed.
   *
   * @remarks
   * Notifies relevant users that a game has ended with the final score
   * and result. This includes final score, game duration, and other
   * game completion details.
   *
   * @param gameId - Unique identifier for the completed game
   * @param gameResult - Final game result information
   */
  notifyGameEnded(
    gameId: string,
    gameResult: { homeScore: number; awayScore: number; winner?: string }
  ): Promise<void>;

  /**
   * Sends a notification when the score is updated during a game.
   *
   * @remarks
   * Notifies relevant users of score changes during game play. This includes
   * current inning, updated scores, and context about the scoring play.
   *
   * @param gameId - Unique identifier for the game
   * @param scoreUpdate - Current score and update information
   */
  notifyScoreUpdate(
    gameId: string,
    scoreUpdate: { homeScore: number; awayScore: number; inning: number; scoringPlay?: string }
  ): Promise<void>;
}
