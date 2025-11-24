/**
 * @file IndexedDB Infrastructure Factory
 * Concrete factory implementation for IndexedDB-based infrastructure services.
 *
 * @remarks
 * This factory implements the InfrastructureFactory interface to provide
 * IndexedDB-based persistence services. It can be safely imported by the
 * Web layer and injected into the Application layer without violating
 * hexagonal architecture principles.
 *
 * **Architecture Compliance:**
 * - Infrastructure layer implements Application interface
 * - Web layer imports and injects into Application
 * - No Application→Infrastructure dependencies
 * - Clean dependency inversion pattern
 *
 * **Usage:**
 * ```typescript
 * // In Web layer
 * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const infraFactory = createIndexedDBFactory();
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
  IndexedDBEventStore,
  EventSourcedGameRepository,
  EventSourcedTeamLineupRepository,
  EventSourcedInningStateRepository,
  IndexedDBOfflineQueue,
} from '../persistence/index.js';

/**
 * Console logger implementation for web environments.
 */
class ConsoleLogger implements Logger {
  constructor(private readonly debugEnabled: boolean = false) {}

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
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const logFn = this.getConsoleFn(level);
    logFn('[TW Softball]', message, context || '', error || '');
  }

  isLevelEnabled(level: LogLevel): boolean {
    // For console logger, we respect debug flag for debug messages
    if (level === 'debug') {
      return this.debugEnabled;
    }
    // All other levels are always enabled
    return true;
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
}

/**
 * IndexedDB Infrastructure Factory implementation.
 *
 * @remarks
 * Provides IndexedDB-based persistence services with offline-first capabilities.
 * Handles IndexedDB initialization, repository creation with EventSourcing,
 * and environment-appropriate logging.
 */
class IndexedDBInfrastructureFactory implements InfrastructureFactory {
  /**
   * Validates the configuration for IndexedDB infrastructure.
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
   * Validates IndexedDB environment availability.
   *
   * @throws {Error} If IndexedDB is not available
   */
  private validateEnvironment(): void {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment');
    }

    if (typeof window === 'undefined') {
      throw new Error('Window object is not available - IndexedDB requires a browser environment');
    }
  }
  /**
   * Creates IndexedDB-based infrastructure services.
   *
   * @param config - Infrastructure configuration
   * @returns Promise resolving to configured infrastructure services
   *
   * @throws {Error} If IndexedDB is not available
   * @throws {Error} If initialization fails
   */
  createServices(config: InfrastructureConfig): Promise<InfrastructureServices> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Validate environment
      this.validateEnvironment();

      // Create EventStore (initializes automatically)
      const eventStore = new IndexedDBEventStore();

      // Create logger
      const logger = new ConsoleLogger(config.debug);

      // Create repositories using EventSourcing pattern
      const gameRepository = new EventSourcedGameRepository(eventStore);
      const teamLineupRepository = new EventSourcedTeamLineupRepository(eventStore);
      const inningStateRepository = new EventSourcedInningStateRepository(eventStore);

      // Create offline queue for PWA support
      const offlineQueue = new IndexedDBOfflineQueue();

      logger.info('IndexedDB infrastructure services initialized successfully', {
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
        offlineQueue,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const contextualError = new Error(
        `Failed to initialize IndexedDB infrastructure services: ${errorMessage}`
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
    return 'indexeddb';
  }

  /**
   * Gets a human-readable description.
   */
  getDescription(): string {
    return 'IndexedDB-based persistence for web browsers with offline-first capabilities';
  }
}

/**
 * Creates an IndexedDB infrastructure factory.
 *
 * @returns IndexedDB infrastructure factory instance
 *
 * @example
 * ```typescript
 * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const infraFactory = createIndexedDBFactory();
 * const services = await createApplicationServices({
 *   environment: 'production',
 *   storage: 'indexeddb'
 * }, infraFactory);
 * ```
 */
export function createIndexedDBFactory(): InfrastructureFactory {
  return new IndexedDBInfrastructureFactory();
}
