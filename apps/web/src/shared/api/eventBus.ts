/**
 * @file Event Bus
 * Handles domain event subscription and publishing for the web application.
 *
 * @remarks
 * This Event Bus implementation follows the observer pattern and provides
 * a centralized mechanism for handling domain events across the application.
 * It ensures loose coupling between components while maintaining reliable
 * event delivery and proper error handling.
 *
 * Key Features:
 * - Type-safe event subscription and publishing
 * - Automatic retry mechanism for failed handlers
 * - Comprehensive error handling and logging
 * - Support for multiple handlers per event type
 * - Configurable logging and retry behavior
 * - Memory-efficient subscription management
 *
 * Architecture Integration:
 * - Acts as infrastructure for domain event handling
 * - Maintains hexagonal architecture boundaries
 * - Provides debugging and monitoring capabilities
 * - Supports both synchronous and asynchronous handlers
 *
 * @example
 * ```typescript
 * // Initialize event bus
 * const eventBus = new EventBus({
 *   logger: console,
 *   enableLogging: true,
 *   maxRetries: 3
 * });
 *
 * // Subscribe to events
 * eventBus.subscribe('GameStarted', async (event) => {
 *   console.log(`Game ${event.eventData.gameId} started!`);
 * });
 *
 * // Publish events
 * await eventBus.publish(gameStartedEvent);
 * ```
 */

import type { Logger } from '@twsoftball/application';

/**
 * Generic domain event interface.
 */
export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  version: number;
  occurredAt: Date;
  eventData: Record<string, unknown>;
}

/**
 * Event handler function type.
 */
export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => Promise<void> | void;

/**
 * Event bus configuration options.
 */
export interface EventBusConfig {
  /** Logger instance for debugging and monitoring */
  logger: Logger;
  /** Whether to enable event logging */
  enableLogging?: boolean;
  /** Maximum number of retry attempts for failed handlers */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds */
  retryDelayMs?: number;
}

/**
 * Event Bus for domain event handling.
 *
 * @remarks
 * Provides a centralized, type-safe event system for the web application.
 * Handles subscription management, event publishing, error recovery, and
 * comprehensive logging for debugging and monitoring.
 *
 * Design Principles:
 * - Fail-safe: Individual handler failures don't stop other handlers
 * - Observable: Comprehensive logging for debugging and monitoring
 * - Recoverable: Automatic retry mechanism for transient failures
 * - Efficient: Memory-conscious subscription management
 * - Type-safe: Strong typing for event types and handlers
 *
 * The event bus maintains internal state for subscriptions and provides
 * methods for introspection and management. It's designed to be used as
 * a singleton within the application.
 */
export class EventBus {
  private readonly subscriptions = new Map<string, Set<DomainEventHandler>>();
  private readonly config: Required<EventBusConfig>;

  /**
   * Creates a new EventBus instance.
   *
   * @param config - Configuration options for the event bus
   */
  constructor(config: EventBusConfig) {
    this.config = {
      enableLogging: true,
      maxRetries: 3,
      retryDelayMs: 100,
      ...config,
    };

    if (this.config.enableLogging) {
      this.config.logger.info('EventBus initialized', {
        enableLogging: this.config.enableLogging,
        maxRetries: this.config.maxRetries,
        retryDelayMs: this.config.retryDelayMs,
      });
    }
  }

  /**
   * Subscribes a handler to a specific event type.
   *
   * @remarks
   * Adds an event handler for the specified event type. Multiple handlers
   * can be registered for the same event type. Duplicate registrations of
   * the same handler are ignored to prevent duplicate invocations.
   *
   * @param eventType - The type of event to subscribe to
   * @param handler - The handler function to invoke when the event is published
   *
   * @example
   * ```typescript
   * eventBus.subscribe('GameStarted', async (event) => {
   *   await updateGameUI(event.eventData.gameId);
   * });
   * ```
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    const handlers = this.subscriptions.get(eventType)!;
    const initialSize = handlers.size;
    handlers.add(handler as DomainEventHandler);

    if (this.config.enableLogging && handlers.size > initialSize) {
      this.config.logger.debug(`Handler subscribed to event type: ${eventType}`, {
        eventType,
        totalHandlers: handlers.size,
      });
    }
  }

  /**
   * Unsubscribes a handler from a specific event type.
   *
   * @remarks
   * Removes the specified handler from the event type's subscription list.
   * If this was the only handler for the event type, the event type entry
   * is cleaned up to prevent memory leaks.
   *
   * @param eventType - The type of event to unsubscribe from
   * @param handler - The handler function to remove
   *
   * @example
   * ```typescript
   * eventBus.unsubscribe('GameStarted', myGameHandler);
   * ```
   */
  unsubscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void {
    const handlers = this.subscriptions.get(eventType);
    if (!handlers) {
      return;
    }

    const wasRemoved = handlers.delete(handler as DomainEventHandler);

    if (handlers.size === 0) {
      this.subscriptions.delete(eventType);
    }

    if (this.config.enableLogging && wasRemoved) {
      this.config.logger.debug(`Handler unsubscribed from event type: ${eventType}`, {
        eventType,
        remainingHandlers: handlers.size,
      });
    }
  }

  /**
   * Publishes an event to all subscribed handlers.
   *
   * @remarks
   * Invokes all handlers registered for the event's type. Handlers are
   * called in parallel for performance, and individual handler failures
   * do not prevent other handlers from executing. Failed handlers are
   * automatically retried according to the configured retry policy.
   *
   * @param event - The domain event to publish
   *
   * @example
   * ```typescript
   * const gameStartedEvent = {
   *   eventType: 'GameStarted',
   *   aggregateId: 'game-123',
   *   version: 1,
   *   occurredAt: new Date(),
   *   eventData: { gameId: 'game-123', homeTeam: 'Eagles' }
   * };
   *
   * await eventBus.publish(gameStartedEvent);
   * ```
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const { eventType } = event;
    const handlers = this.subscriptions.get(eventType);

    if (this.config.enableLogging) {
      this.config.logger.debug(`Publishing event: ${eventType}`, {
        eventType,
        aggregateId: event.aggregateId,
        version: event.version,
        subscriberCount: handlers?.size || 0,
      });
    }

    if (!handlers || handlers.size === 0) {
      if (this.config.enableLogging) {
        this.config.logger.debug(`No subscribers for event type: ${eventType}`, {
          eventType,
        });
      }
      return;
    }

    // Execute all handlers in parallel
    const handlerPromises = Array.from(handlers).map(handler =>
      this.executeHandlerWithRetry(handler, event)
    );

    await Promise.allSettled(handlerPromises);
  }

  /**
   * Gets the number of subscribers for a specific event type.
   *
   * @param eventType - The event type to check
   * @returns The number of subscribers for the event type
   */
  getSubscribersCount(eventType: string): number {
    return this.subscriptions.get(eventType)?.size || 0;
  }

  /**
   * Gets the total number of event types with subscriptions.
   *
   * @returns The number of different event types with active subscriptions
   */
  getTotalEventTypes(): number {
    return this.subscriptions.size;
  }

  /**
   * Clears all subscriptions.
   *
   * @remarks
   * Removes all event handlers and cleans up internal state. This is
   * primarily useful for testing scenarios or application shutdown.
   */
  clear(): void {
    const eventTypes = this.subscriptions.size;
    this.subscriptions.clear();

    if (this.config.enableLogging) {
      this.config.logger.info(`EventBus cleared: removed ${eventTypes} event types`);
    }
  }

  /**
   * Executes a handler with automatic retry on failure.
   *
   * @param handler - The event handler to execute
   * @param event - The event to pass to the handler
   * @private
   */
  private async executeHandlerWithRetry<T extends DomainEvent>(
    handler: DomainEventHandler<T>,
    event: T
  ): Promise<void> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= this.config.maxRetries) {
      try {
        await handler(event);
        return; // Success - exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;

        if (attempts <= this.config.maxRetries) {
          if (this.config.enableLogging) {
            this.config.logger.warn(
              `Retrying handler for event: ${event.eventType} (attempt ${attempts}/${this.config.maxRetries})`,
              {
                eventType: event.eventType,
                attempt: attempts,
                maxRetries: this.config.maxRetries,
                errorMessage: lastError.message,
              }
            );
          }

          // Wait before retry
          await this.delay(this.config.retryDelayMs);
        }
      }
    }

    // All retries exhausted - log error but don't throw
    if (this.config.enableLogging && lastError) {
      this.config.logger.error(
        `Error handling event: ${event.eventType} (all retries exhausted)`,
        lastError,
        {
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          attempts,
        }
      );
    }
  }

  /**
   * Creates a promise that resolves after the specified delay.
   *
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after the delay
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
