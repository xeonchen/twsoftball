/**
 * @file Memory Infrastructure Factory
 * Concrete factory implementation for in-memory infrastructure services.
 *
 * @remarks
 * This factory implements the InfrastructureFactory interface to provide
 * in-memory persistence services. Ideal for testing, development, and
 * scenarios where persistence is not required.
 *
 * **Architecture Compliance:**
 * - Infrastructure layer implements Application interface
 * - Web layer imports and injects into Application
 * - No Application→Infrastructure dependencies
 * - Clean dependency inversion pattern
 *
 * **Usage:**
 * ```typescript
 * // In Web layer or tests
 * import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const infraFactory = createMemoryFactory();
 * const services = await createApplicationServices(config, infraFactory);
 * ```
 */

import type {
  Logger,
  LogLevel,
  LogContext,
  InfrastructureFactory,
  InfrastructureConfig,
  InfrastructureServices,
} from '@twsoftball/application';

import {
  InMemoryEventStore,
  EventSourcedGameRepository,
  EventSourcedTeamLineupRepository,
  EventSourcedInningStateRepository,
} from '../persistence/index.js';

/**
 * Memory logger implementation for testing and development.
 */
class MemoryLogger implements Logger {
  private readonly logs: Array<{
    level: string;
    message: string;
    context?: LogContext;
    timestamp: Date;
  }> = [];

  constructor(
    private readonly debugEnabled: boolean = false,
    private readonly storeInMemory: boolean = false
  ) {}

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    this.addLog(level, message, context);
    if (this.debugEnabled) {
      const logFn = this.getConsoleFn(level);
      logFn('[TW Softball]', message, context || '', error || '');
    }
  }

  isLevelEnabled(_level: LogLevel): boolean {
    // In memory logger, we always accept all log levels
    return true;
  }

  private addLog(level: string, message: string, context?: LogContext): void {
    if (this.storeInMemory) {
      this.logs.push({
        level,
        message,
        ...(context && { context }),
        timestamp: new Date(),
      });
    }
  }

  private getConsoleFn(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Gets all stored logs (only if storeInMemory is enabled).
   */
  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  /**
   * Clears all stored logs.
   */
  clearLogs(): void {
    this.logs.length = 0;
  }
}

/**
 * Memory Infrastructure Factory implementation.
 *
 * @remarks
 * Provides in-memory persistence services perfect for testing and development.
 * All services are created synchronously but wrapped in Promise for interface
 * compatibility with persistent implementations.
 */
class MemoryInfrastructureFactory implements InfrastructureFactory {
  /**
   * Validates the configuration for memory infrastructure.
   *
   * @param config - Infrastructure configuration to validate
   * @throws {Error} If configuration is invalid
   */
  private validateConfig(config: InfrastructureConfig): void {
    if (!config) {
      throw new Error('Infrastructure configuration is required');
    }

    if (typeof config.environment !== 'string' || config.environment.trim() === '') {
      throw new Error('Valid environment is required in configuration');
    }

    if (typeof config.debug !== 'boolean') {
      throw new Error('Debug flag must be a boolean value');
    }
  }

  /**
   * Validates memory environment (no specific requirements).
   *
   * @remarks
   * Memory infrastructure has no specific environment requirements,
   * but this method is provided for consistency with other factory implementations.
   */
  private validateEnvironment(): void {
    // Memory infrastructure works in any JavaScript environment
    // No specific validation required
  }
  /**
   * Creates in-memory infrastructure services.
   *
   * @param config - Infrastructure configuration
   * @returns Promise resolving to configured infrastructure services
   */
  createServices(config: InfrastructureConfig): Promise<InfrastructureServices> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Validate environment
      this.validateEnvironment();

      // Create in-memory EventStore (no initialization required)
      const eventStore = new InMemoryEventStore();

      // Create logger with memory storage for tests
      const logger = new MemoryLogger(config.debug, config.environment === 'test');

      // Create repositories using EventSourcing pattern
      const gameRepository = new EventSourcedGameRepository(eventStore);
      const teamLineupRepository = new EventSourcedTeamLineupRepository(eventStore, gameRepository);
      const inningStateRepository = new EventSourcedInningStateRepository(eventStore);

      logger.info('In-memory infrastructure services initialized successfully', {
        environment: config.environment,
        debug: config.debug,
        storageType: this.getStorageType(),
      });

      return Promise.resolve({
        gameRepository,
        teamLineupRepository,
        inningStateRepository,
        eventStore,
        logger,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const contextualError = new Error(
        `Failed to initialize in-memory infrastructure services: ${errorMessage}`
      );

      // Preserve original error for debugging
      if (error instanceof Error) {
        contextualError.cause = error;
      }

      return Promise.reject(contextualError);
    }
  }

  /**
   * Gets the storage type identifier.
   */
  getStorageType(): string {
    return 'memory';
  }

  /**
   * Gets a human-readable description.
   */
  getDescription(): string {
    return 'In-memory implementations for testing and development environments';
  }
}

/**
 * Creates a memory infrastructure factory.
 *
 * @returns Memory infrastructure factory instance
 *
 * @example
 * ```typescript
 * import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const infraFactory = createMemoryFactory();
 * const services = await createApplicationServices({
 *   environment: 'test',
 *   storage: 'memory'
 * }, infraFactory);
 * ```
 */
export function createMemoryFactory(): InfrastructureFactory {
  return new MemoryInfrastructureFactory();
}
