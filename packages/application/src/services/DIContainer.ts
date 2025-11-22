/**
 * @file Dependency Injection Container
 * Enterprise-grade DI container for managing service lifecycle and dependencies.
 *
 * @remarks
 * This DI Container provides comprehensive dependency injection capabilities while
 * maintaining all architectural benefits including dynamic Infrastructure imports,
 * clean hexagonal architecture compliance, and singleton management. The container
 * provides standard DI functionality with lazy loading, dependency resolution,
 * and lifecycle management.
 *
 * **Key Features:**
 * - Service registry with lazy loading capabilities
 * - Dynamic Infrastructure imports based on configuration
 * - Singleton management with proper lifecycle control
 * - Circular dependency detection and resolution
 * - Type-safe service resolution with dependency injection
 * - Clean separation between Application and Infrastructure layers
 * - Support for factory functions and async service creation
 *
 * **Architecture Compliance:**
 * - Application Layer: Defines service contracts and registration patterns
 * - Infrastructure Layer: Provides concrete service implementations
 * - Web Layer: Configures container and resolves services
 * - Domain Layer: No dependencies on DI container
 *
 * **Design Patterns:**
 * - **Dependency Injection**: Automatic dependency resolution and injection
 * - **Abstract Factory**: Dynamic Infrastructure factory loading
 * - **Singleton**: Controlled instance lifecycle management
 * - **Registry**: Centralized service definition storage
 * - **Lazy Loading**: Services created only when needed
 *
 * @example
 * ```typescript
 * // Basic container setup
 * const container = new DIContainer();
 *
 * // Register services
 * container.register('logger', async () => {
 *   const { ConsoleLogger } = await import('@twsoftball/infrastructure/logging');
 *   return new ConsoleLogger();
 * });
 *
 * // Register with dependencies
 * container.register('startNewGame', async () => {
 *   const { StartNewGame } = await import('../use-cases/StartNewGame.js');
 *   const gameRepo = await container.resolve<GameRepository>('gameRepository');
 *   const eventStore = await container.resolve<EventStore>('eventStore');
 *   const logger = await container.resolve<Logger>('logger');
 *   return new StartNewGame(gameRepo, eventStore, logger);
 * }, ['gameRepository', 'eventStore', 'logger']);
 *
 * // Resolve services
 * const startNewGame = await container.resolve<StartNewGame>('startNewGame');
 * ```
 *
 * @example
 * ```typescript
 * // Container initialization with configuration
 * const container = new DIContainer();
 * await container.initialize({
 *   environment: 'production',
 *   storage: 'indexeddb',
 *   debug: false
 * });
 *
 * // Services are automatically registered and ready to use
 * const services = await container.resolve<ApplicationServices>('applicationServices');
 * ```
 */

/* eslint-env node -- Enable Node.js globals like console for debug logging */

import type {
  GameRepository,
  TeamLineupRepository,
  InningStateRepository,
  EventStore,
  Logger,
} from '../ports/out/index.js';
import type { ApplicationConfig, ApplicationServices } from '../types/ApplicationTypes.js';
import type { EndInning } from '../use-cases/EndInning.js';
import type { RecordAtBat } from '../use-cases/RecordAtBat.js';
import type { RedoLastAction } from '../use-cases/RedoLastAction.js';
import type { StartNewGame } from '../use-cases/StartNewGame.js';
import type { SubstitutePlayer } from '../use-cases/SubstitutePlayer.js';
import type { UndoLastAction } from '../use-cases/UndoLastAction.js';

import type { InfrastructureFactory, InfrastructureServices } from './InfrastructureFactory.js';

// Re-export types for external consumption
export type { ApplicationConfig, ApplicationServices };

/**
 * Service definition for dependency injection container.
 *
 * @template T - The service type this definition creates
 */
export interface ServiceDefinition<T = unknown> {
  /** Factory function that creates the service instance */
  factory: () => Promise<T>;
  /** Cached singleton instance (undefined until first resolution) */
  singleton?: T;
  /** Array of service names this service depends on */
  dependencies?: string[];
  /** Whether this service should be treated as a singleton (default: true) */
  isSingleton?: boolean;
  /** Human-readable description for debugging */
  description?: string;
}

/**
 * Container configuration options.
 */
export interface ContainerConfig {
  /** Enable debug logging for container operations */
  debug?: boolean;
  /** Maximum dependency resolution depth (prevents infinite loops) */
  maxResolutionDepth?: number;
}

/**
 * Error thrown when circular dependencies are detected.
 */
export class CircularDependencyError extends Error {
  constructor(
    public readonly dependencyChain: string[],
    message?: string
  ) {
    super(message || `Circular dependency detected: ${dependencyChain.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Error thrown when a required service is not registered.
 */
export class ServiceNotFoundError extends Error {
  constructor(
    public readonly serviceName: string,
    message?: string
  ) {
    super(message || `Service not found: ${serviceName}`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Error thrown when dependency resolution fails.
 */
export class DependencyResolutionError extends Error {
  constructor(
    public readonly serviceName: string,
    public override readonly cause: Error,
    message?: string
  ) {
    super(message || `Failed to resolve dependencies for service: ${serviceName}`);
    this.name = 'DependencyResolutionError';
    this.cause = cause;
  }
}

/**
 * Enterprise-grade Dependency Injection Container.
 *
 * @remarks
 * This container provides comprehensive dependency injection capabilities while
 * maintaining clean hexagonal architecture principles. It supports lazy loading,
 * singleton management, circular dependency detection, and dynamic Infrastructure
 * imports based on configuration.
 *
 * **Core Responsibilities:**
 * - **Service Registry**: Centralized storage of service definitions
 * - **Dependency Resolution**: Automatic resolution of service dependencies
 * - **Lifecycle Management**: Singleton creation and caching
 * - **Error Handling**: Comprehensive error detection and reporting
 * - **Architecture Compliance**: Maintains clean layer boundaries
 * - **Performance Optimization**: Lazy loading and efficient caching
 *
 * **Thread Safety:**
 * The container is designed for single-threaded JavaScript environments but
 * provides proper async handling for service creation and dependency resolution.
 *
 * **Memory Management:**
 * Singletons are held in memory until container disposal. Use `dispose()` method
 * to clean up resources when the container is no longer needed.
 */
export class DIContainer {
  private readonly services = new Map<string, ServiceDefinition>();
  private readonly config: Required<ContainerConfig>;
  private readonly resolutionStack: string[] = [];
  private readonly resolvingPromises = new Map<string, Promise<unknown>>();
  private disposed = false;

  /**
   * Creates a new DI container instance.
   *
   * @param config - Container configuration options
   */
  constructor(config: ContainerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      maxResolutionDepth: config.maxResolutionDepth ?? 50,
    };

    if (this.config.debug) {
      // eslint-disable-next-line no-console, no-undef -- Debug logging for DI container configuration
      console.log(`[DIContainer] Container created with config: ${JSON.stringify(this.config)}`);
    }
  }

  /**
   * Registers a service with the container.
   *
   * @template T - The service type
   * @param name - Unique service name identifier
   * @param factory - Async factory function that creates the service
   * @param dependencies - Array of service names this service depends on
   * @param options - Additional service options
   *
   * @throws {Error} If container is disposed or service name is already registered
   *
   * @example
   * ```typescript
   * // Register a simple service
   * container.register('logger', async () => {
   *   return new ConsoleLogger();
   * });
   *
   * // Register with dependencies
   * container.register('gameService', async () => {
   *   const repo = await container.resolve<GameRepository>('gameRepository');
   *   const logger = await container.resolve<Logger>('logger');
   *   return new GameService(repo, logger);
   * }, ['gameRepository', 'logger']);
   * ```
   */
  register<T>(
    name: string,
    factory: () => Promise<T>,
    dependencies: string[] = [],
    options: {
      isSingleton?: boolean;
      description?: string;
    } = {}
  ): void {
    this.ensureNotDisposed();

    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const serviceDefinition: ServiceDefinition<T> = {
      factory,
      dependencies,
      isSingleton: options.isSingleton ?? true,
      description: options.description || `Service: ${name}`,
    };

    this.services.set(name, serviceDefinition);

    if (this.config.debug) {
      // eslint-disable-next-line no-console, no-undef -- Debug logging for service registration
      console.log(
        `[DIContainer] Registered service '${name}' with dependencies: ${JSON.stringify(dependencies)}`
      );
    }
  }

  /**
   * Resolves a service by name, creating it if necessary.
   *
   * @template T - The expected service type
   * @param name - Service name to resolve
   * @returns Promise resolving to the service instance
   *
   * @throws {ServiceNotFoundError} If service is not registered
   * @throws {CircularDependencyError} If circular dependencies are detected
   * @throws {DependencyResolutionError} If dependency resolution fails
   *
   * @example
   * ```typescript
   * const logger = await container.resolve<Logger>('logger');
   * const gameService = await container.resolve<GameService>('gameService');
   * ```
   */
  async resolve<T>(name: string): Promise<T> {
    this.ensureNotDisposed();

    const definition = this.services.get(name);
    if (!definition) {
      throw new ServiceNotFoundError(name);
    }

    // Return cached singleton if available
    if (definition.isSingleton && definition.singleton !== undefined) {
      if (this.config.debug) {
        // eslint-disable-next-line no-console, no-undef -- Debug logging for singleton cache hit
        console.log(`[DIContainer] Returning cached singleton for '${name}'`);
      }
      return definition.singleton as T;
    }

    // For singletons, check if already being resolved to handle concurrent access
    if (definition.isSingleton && this.resolvingPromises.has(name)) {
      if (this.config.debug) {
        // eslint-disable-next-line no-console, no-undef -- Debug logging for concurrent singleton resolution
        console.log(`[DIContainer] Waiting for concurrent singleton resolution of '${name}'`);
      }
      return this.resolvingPromises.get(name) as Promise<T>;
    }

    // Check for circular dependencies
    if (this.resolutionStack.includes(name)) {
      const chain = [...this.resolutionStack, name];
      throw new CircularDependencyError(chain);
    }

    // Check resolution depth
    if (this.resolutionStack.length >= this.config.maxResolutionDepth) {
      const depthError = new Error(
        `Maximum resolution depth (${this.config.maxResolutionDepth}) exceeded. ` +
          `Current stack: ${this.resolutionStack.join(' -> ')}`
      );
      throw new DependencyResolutionError(name, depthError);
    }

    // Add to resolution stack
    this.resolutionStack.push(name);

    // Create the resolution promise
    const resolutionPromise = (async (): Promise<T> => {
      try {
        if (this.config.debug) {
          // eslint-disable-next-line no-console, no-undef -- Debug logging for dependency resolution
          console.log(
            `[DIContainer] Resolving service '${name}' with dependencies: ${JSON.stringify(definition.dependencies)}`
          );
        }

        // Dependencies are resolved within the factory function itself
        // The dependencies array is used for documentation and dependency tracking only

        // Create the service instance
        const instance = await definition.factory();

        // Cache as singleton if configured
        if (definition.isSingleton) {
          definition.singleton = instance;
          if (this.config.debug) {
            // eslint-disable-next-line no-console, no-undef -- Debug logging for singleton caching
            console.log(`[DIContainer] Cached singleton for '${name}'`);
          }
        }

        return instance as T;
      } catch (error) {
        throw new DependencyResolutionError(
          name,
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        // Remove from resolution stack and resolving promises
        this.resolutionStack.pop();
        this.resolvingPromises.delete(name);
      }
    })();

    // For singletons, track the resolution promise to handle concurrent access
    if (definition.isSingleton) {
      this.resolvingPromises.set(name, resolutionPromise);
    }

    return resolutionPromise;
  }

  /**
   * Checks if a service is registered.
   *
   * @param name - Service name to check
   * @returns True if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Gets the list of registered service names.
   *
   * @returns Array of all registered service names
   */
  getRegisteredServices(): string[] {
    this.ensureNotDisposed();
    return Array.from(this.services.keys());
  }

  /**
   * Gets service definition information (for debugging).
   *
   * @param name - Service name
   * @returns Service definition information or undefined if not found
   */
  getServiceInfo(name: string):
    | {
        name: string;
        dependencies: string[];
        isSingleton: boolean;
        hasInstance: boolean;
        description: string;
      }
    | undefined {
    const definition = this.services.get(name);
    if (!definition) {
      return undefined;
    }

    return {
      name,
      dependencies: definition.dependencies || [],
      isSingleton: definition.isSingleton ?? true,
      hasInstance: definition.singleton !== undefined,
      description: definition.description || `Service: ${name}`,
    };
  }

  /**
   * Initializes the container with application configuration and infrastructure factory.
   *
   * @param config - Application configuration
   * @param factory - Infrastructure factory instance
   * @returns Promise that resolves when initialization is complete
   *
   * @remarks
   * This method registers all core application services including:
   * - Infrastructure services using provided factory
   * - Domain use cases with proper dependency injection
   * - Complete ApplicationServices interface
   *
   * After initialization, the container is ready to resolve any application service.
   *
   * @example
   * ```typescript
   * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
   *
   * const container = new DIContainer();
   * const factory = createIndexedDBFactory();
   * await container.initialize({
   *   environment: 'production',
   *   storage: 'indexeddb'
   * }, factory);
   *
   * const services = await container.resolve<ApplicationServices>('applicationServices');
   * ```
   */
  initialize(config: ApplicationConfig, factory: InfrastructureFactory): Promise<void> {
    this.ensureNotDisposed();

    if (this.config.debug) {
      // eslint-disable-next-line no-console, no-undef -- Debug logging for container initialization
      console.log(`[DIContainer] Initializing container with config: ${JSON.stringify(config)}`);
    }

    try {
      // Validate config early
      if (!['memory', 'indexeddb'].includes(config.storage)) {
        throw new Error(`Unsupported storage: ${config.storage}`);
      }

      // Register Infrastructure services using provided factory
      this.registerInfrastructureServices(config, factory);

      // Register Application use cases
      this.registerApplicationUseCases();

      // Register the complete ApplicationServices interface
      this.registerApplicationServices(config);

      if (this.config.debug) {
        // eslint-disable-next-line no-console, no-undef -- Debug logging for successful initialization
        console.log('[DIContainer] Container initialized successfully');
      }

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(
        new Error(
          `Failed to initialize DI container: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Disposes the container and cleans up resources.
   *
   * @remarks
   * After disposal, the container cannot be used for service registration or resolution.
   * This method should be called when the container is no longer needed to free memory.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.config.debug) {
      // eslint-disable-next-line no-console, no-undef -- Debug logging for container disposal
      console.log('[DIContainer] Disposing container and cleaning up resources');
    }

    // Clear all service definitions and singletons
    this.services.clear();
    this.resolutionStack.length = 0;
    this.resolvingPromises.clear();
    this.disposed = true;
  }

  /**
   * Registers Infrastructure services using provided factory.
   *
   * @param config - Application configuration
   * @param factory - Infrastructure factory instance
   * @private
   */
  private registerInfrastructureServices(
    config: ApplicationConfig,
    factory: InfrastructureFactory
  ): void {
    // Register Infrastructure factory (only if not already registered for testing)
    if (!this.has('infrastructureFactory')) {
      this.register(
        'infrastructureFactory',
        (): Promise<InfrastructureFactory> => {
          return Promise.resolve(factory);
        },
        [],
        { description: `Infrastructure factory for ${factory.getStorageType()} storage` }
      );
    }

    // Register Infrastructure services
    this.register(
      'infrastructureServices',
      async (): Promise<InfrastructureServices> => {
        const factory = await this.resolve<InfrastructureFactory>('infrastructureFactory');
        return factory.createServices({
          environment: config.environment,
          debug: config.debug ?? false,
          storageConfig: config.storageConfig ?? {},
        });
      },
      ['infrastructureFactory'],
      { description: 'Infrastructure services container' }
    );

    // Register individual Infrastructure services for direct access
    this.register(
      'gameRepository',
      async (): Promise<GameRepository> => {
        const infraServices = await this.resolve<InfrastructureServices>('infrastructureServices');
        return infraServices.gameRepository;
      },
      ['infrastructureServices'],
      { description: 'Game repository from infrastructure' }
    );

    this.register(
      'teamLineupRepository',
      async (): Promise<TeamLineupRepository> => {
        const infraServices = await this.resolve<InfrastructureServices>('infrastructureServices');
        return infraServices.teamLineupRepository;
      },
      ['infrastructureServices'],
      { description: 'Team lineup repository from infrastructure' }
    );

    this.register(
      'inningStateRepository',
      async (): Promise<InningStateRepository> => {
        const infraServices = await this.resolve<InfrastructureServices>('infrastructureServices');
        return infraServices.inningStateRepository;
      },
      ['infrastructureServices'],
      { description: 'Inning state repository from infrastructure' }
    );

    this.register(
      'eventStore',
      async (): Promise<EventStore> => {
        const infraServices = await this.resolve<InfrastructureServices>('infrastructureServices');
        return infraServices.eventStore;
      },
      ['infrastructureServices'],
      { description: 'Event store from infrastructure' }
    );

    this.register(
      'logger',
      async (): Promise<Logger> => {
        const infraServices = await this.resolve<InfrastructureServices>('infrastructureServices');
        return infraServices.logger;
      },
      ['infrastructureServices'],
      { description: 'Logger from infrastructure' }
    );
  }

  /**
   * Registers Application use cases with proper dependency injection.
   *
   * @private
   */
  private registerApplicationUseCases(): void {
    // StartNewGame use case
    this.register(
      'startNewGame',
      async () => {
        const { StartNewGame } = await import('../use-cases/StartNewGame.js');
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const inningStateRepository =
          await this.resolve<InningStateRepository>('inningStateRepository');
        const teamLineupRepository =
          await this.resolve<TeamLineupRepository>('teamLineupRepository');
        const eventStore = await this.resolve<EventStore>('eventStore');
        const logger = await this.resolve<Logger>('logger');
        return new StartNewGame(
          gameRepository,
          inningStateRepository,
          teamLineupRepository,
          eventStore,
          logger
        );
      },
      ['gameRepository', 'inningStateRepository', 'teamLineupRepository', 'eventStore', 'logger'],
      { description: 'StartNewGame use case with dependencies' }
    );

    // RecordAtBat use case
    this.register(
      'recordAtBat',
      async () => {
        const { RecordAtBat } = await import('../use-cases/RecordAtBat.js');
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const inningStateRepository =
          await this.resolve<InningStateRepository>('inningStateRepository');
        const teamLineupRepository =
          await this.resolve<TeamLineupRepository>('teamLineupRepository');
        const logger = await this.resolve<Logger>('logger');
        return new RecordAtBat(gameRepository, inningStateRepository, teamLineupRepository, logger);
      },
      ['gameRepository', 'inningStateRepository', 'teamLineupRepository', 'logger'],
      { description: 'RecordAtBat use case with dependencies' }
    );

    // SubstitutePlayer use case
    this.register(
      'substitutePlayer',
      async () => {
        const { SubstitutePlayer } = await import('../use-cases/SubstitutePlayer.js');
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const eventStore = await this.resolve<EventStore>('eventStore');
        const logger = await this.resolve<Logger>('logger');
        return new SubstitutePlayer(gameRepository, eventStore, logger);
      },
      ['gameRepository', 'eventStore', 'logger'],
      { description: 'SubstitutePlayer use case with dependencies' }
    );

    // UndoLastAction use case
    this.register(
      'undoLastAction',
      async () => {
        const { UndoLastAction } = await import('../use-cases/UndoLastAction.js');
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const inningStateRepository =
          await this.resolve<InningStateRepository>('inningStateRepository');
        const teamLineupRepository =
          await this.resolve<TeamLineupRepository>('teamLineupRepository');
        const eventStore = await this.resolve<EventStore>('eventStore');
        const logger = await this.resolve<Logger>('logger');
        return new UndoLastAction(
          gameRepository,
          inningStateRepository,
          teamLineupRepository,
          eventStore,
          logger
        );
      },
      ['gameRepository', 'inningStateRepository', 'teamLineupRepository', 'eventStore', 'logger'],
      { description: 'UndoLastAction use case with dependencies' }
    );

    // RedoLastAction use case
    this.register(
      'redoLastAction',
      async () => {
        const { RedoLastAction } = await import('../use-cases/RedoLastAction.js');
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const inningStateRepository =
          await this.resolve<InningStateRepository>('inningStateRepository');
        const teamLineupRepository =
          await this.resolve<TeamLineupRepository>('teamLineupRepository');
        const eventStore = await this.resolve<EventStore>('eventStore');
        const logger = await this.resolve<Logger>('logger');
        return new RedoLastAction(
          gameRepository,
          inningStateRepository,
          teamLineupRepository,
          eventStore,
          logger
        );
      },
      ['gameRepository', 'inningStateRepository', 'teamLineupRepository', 'eventStore', 'logger'],
      { description: 'RedoLastAction use case with dependencies' }
    );

    // EndInning use case
    this.register(
      'endInning',
      async () => {
        const { EndInning } = await import('../use-cases/EndInning.js');
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const inningStateRepository =
          await this.resolve<InningStateRepository>('inningStateRepository');
        const teamLineupRepository =
          await this.resolve<TeamLineupRepository>('teamLineupRepository');
        const eventStore = await this.resolve<EventStore>('eventStore');
        const logger = await this.resolve<Logger>('logger');
        return new EndInning(
          gameRepository,
          inningStateRepository,
          teamLineupRepository,
          eventStore,
          logger
        );
      },
      ['gameRepository', 'inningStateRepository', 'teamLineupRepository', 'eventStore', 'logger'],
      { description: 'EndInning use case with dependencies' }
    );
  }

  /**
   * Registers the complete ApplicationServices interface.
   *
   * @param config - Application configuration
   * @private
   */
  private registerApplicationServices(config: ApplicationConfig): void {
    this.register(
      'applicationServices',
      async (): Promise<ApplicationServices> => {
        if (this.config.debug) {
          // eslint-disable-next-line no-console, no-undef -- Debug logging for application services resolution
          console.log('[DIContainer] Starting application services resolution...');
        }

        // Resolve all use cases
        if (this.config.debug) {
          // eslint-disable-next-line no-console, no-undef -- Debug logging for use case resolution
          console.log('[DIContainer] Resolving use cases...');
        }
        const startNewGame = await this.resolve<StartNewGame>('startNewGame');
        const recordAtBat = await this.resolve<RecordAtBat>('recordAtBat');
        const substitutePlayer = await this.resolve<SubstitutePlayer>('substitutePlayer');
        const undoLastAction = await this.resolve<UndoLastAction>('undoLastAction');
        const redoLastAction = await this.resolve<RedoLastAction>('redoLastAction');
        const endInning = await this.resolve<EndInning>('endInning');

        // Resolve repositories
        if (this.config.debug) {
          // eslint-disable-next-line no-console, no-undef -- Debug logging for repository resolution
          console.log('[DIContainer] Resolving repositories...');
        }
        const gameRepository = await this.resolve<GameRepository>('gameRepository');
        const teamLineupRepository =
          await this.resolve<TeamLineupRepository>('teamLineupRepository');
        const inningStateRepository =
          await this.resolve<InningStateRepository>('inningStateRepository');
        const eventStore = await this.resolve<EventStore>('eventStore');

        // Resolve supporting services
        if (this.config.debug) {
          // eslint-disable-next-line no-console, no-undef -- Debug logging for supporting services resolution
          console.log('[DIContainer] Resolving supporting services...');
        }
        const logger = await this.resolve<Logger>('logger');

        return {
          // Use Cases
          startNewGame,
          recordAtBat,
          substitutePlayer,
          undoLastAction,
          redoLastAction,
          endInning,

          // Repositories
          gameRepository,
          teamLineupRepository,
          inningStateRepository,
          eventStore,

          // Supporting Services
          logger,

          // Configuration
          config,
        };
      },
      [
        'startNewGame',
        'recordAtBat',
        'substitutePlayer',
        'undoLastAction',
        'redoLastAction',
        'endInning',
        'gameRepository',
        'teamLineupRepository',
        'inningStateRepository',
        'eventStore',
        'logger',
      ],
      { description: 'Complete ApplicationServices interface' }
    );
  }

  /**
   * Ensures the container is not disposed.
   *
   * @throws {Error} If container is disposed
   * @private
   */
  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error('DIContainer has been disposed and cannot be used');
    }
  }
}

/**
 * Creates a new DI container and initializes it with application configuration.
 *
 * @param config - Application configuration
 * @param factory - Infrastructure factory instance
 * @param containerConfig - Container-specific configuration options
 * @returns Promise resolving to initialized container
 *
 * @remarks
 * This is a convenience function that combines container creation and initialization
 * in a single call. The returned container is ready to resolve application services.
 *
 * @example
 * ```typescript
 * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
 *
 * const factory = createIndexedDBFactory();
 * const container = await createInitializedContainer({
 *   environment: 'production',
 *   storage: 'indexeddb'
 * }, factory);
 *
 * const services = await container.resolve<ApplicationServices>('applicationServices');
 * ```
 */
export async function createInitializedContainer(
  config: ApplicationConfig,
  factory: InfrastructureFactory,
  containerConfig?: ContainerConfig
): Promise<DIContainer> {
  const container = new DIContainer(containerConfig);
  await container.initialize(config, factory);
  return container;
}
