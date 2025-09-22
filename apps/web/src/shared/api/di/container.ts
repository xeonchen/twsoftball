/**
 * @file Dependency Injection Container
 * Central dependency injection container for the Web layer following Hexagonal Architecture.
 *
 * @remarks
 * This container provides centralized dependency injection using the new DIContainer
 * pattern with Dynamic Import. It maintains strict architectural boundaries and uses
 * the clean Application-only approach to avoid any Infrastructure dependencies.
 *
 * **Architectural Compliance**:
 * - Web layer only imports from Application layer
 * - Uses DIContainer with dynamic imports for service creation
 * - No Web layer Infrastructure dependencies whatsoever
 * - Clean hexagonal architecture compliance
 * - No dependency-cruiser exceptions needed
 *
 * **Key Responsibilities**:
 * - Use DIContainer for enhanced dependency injection
 * - Add web-specific adapters (GameAdapter)
 * - Handle initialization errors gracefully
 * - Ensure thread-safe singleton access
 *
 * **Design Patterns**:
 * - DI Container pattern with service registry and lazy loading
 * - Singleton pattern for container instance
 * - Adapter pattern for web layer integration
 *
 * **Initialization Flow**:
 * 1. Validate configuration parameters
 * 2. Create ApplicationServices using DIContainer (which dynamically imports Infrastructure)
 * 3. Wire GameAdapter with application services
 * 4. Store container instance for singleton access
 *
 * @example
 * ```typescript
 * // Initialize container at app startup
 * await initializeContainer({
 *   environment: 'development',
 *   storage: 'memory',
 *   debug: true
 * });
 *
 * // Access container in components/services
 * const container = getContainer();
 * const gameResult = await container.gameAdapter.startNewGame(gameData);
 *
 * // Access individual services
 * const logger = container.logger;
 * logger.info('Game operation completed', { gameId: 'game-123' });
 * ```
 */

import {
  createApplicationServicesWithContainer,
  type ApplicationServices,
  type ApplicationConfig,
} from '@twsoftball/application';

import { GameAdapter, type GameAdapterConfig } from '../adapters';
import { wizardToCommand } from '../mappers/wizardToCommand';

/**
 * Configuration interface for dependency container initialization.
 */
export interface ContainerConfig {
  /** Runtime environment (development/production) */
  environment: 'development' | 'production';
  /** Storage implementation to use */
  storage: 'memory' | 'indexeddb';
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Complete dependency container interface providing all application services.
 *
 * @remarks
 * The container wraps ApplicationServices and adds web-specific adapters.
 * It maintains singleton instances and ensures proper dependency injection
 * throughout the application using the enhanced DIContainer pattern.
 */
export interface DependencyContainer {
  // Use Cases (from ApplicationServices)
  readonly startNewGame: ApplicationServices['startNewGame'];
  readonly recordAtBat: ApplicationServices['recordAtBat'];
  readonly substitutePlayer: ApplicationServices['substitutePlayer'];
  readonly undoLastAction: ApplicationServices['undoLastAction'];
  readonly redoLastAction: ApplicationServices['redoLastAction'];
  readonly endInning: ApplicationServices['endInning'];

  // Repositories (from ApplicationServices)
  readonly gameRepository: ApplicationServices['gameRepository'];
  readonly teamLineupRepository: ApplicationServices['teamLineupRepository'];
  readonly inningStateRepository: ApplicationServices['inningStateRepository'];
  readonly eventStore: ApplicationServices['eventStore'];

  // Supporting Services (from ApplicationServices)
  readonly logger: ApplicationServices['logger'];

  // Configuration (from ApplicationServices)
  readonly config: ApplicationServices['config'];

  // Web Layer Adapters
  readonly gameAdapter: GameAdapter;
}

// Internal container storage
let containerInstance: DependencyContainer | null = null;
let applicationServices: ApplicationServices | null = null;

/**
 * Initializes the dependency injection container with the specified configuration.
 *
 * @remarks
 * This function creates and configures all services, repositories, and adapters
 * needed by the Web layer. It follows a specific initialization order to ensure
 * proper dependency resolution and handles errors gracefully.
 *
 * **Initialization Steps**:
 * 1. **Configuration Validation**: Verify all required parameters
 * 2. **Application Services Creation**: Create ApplicationServices using DIContainer with dynamic imports
 * 3. **Adapter Wiring**: Configure GameAdapter with all services
 * 4. **Container Assembly**: Build final container instance
 *
 * **Error Handling**:
 * - Configuration validation errors
 * - Application service creation failures (dynamic import errors, storage initialization)
 * - Adapter configuration issues
 *
 * The function is idempotent - calling it multiple times will re-initialize
 * the container with the new configuration.
 *
 * @param config - Container configuration options
 * @param serviceCreator - Optional service creator function for testing (internal use)
 * @throws Error if container initialization fails
 *
 * @example
 * ```typescript
 * // Development setup with in-memory storage
 * await initializeContainer({
 *   environment: 'development',
 *   storage: 'memory',
 *   debug: true
 * });
 *
 * // Production setup with persistent IndexedDB storage
 * await initializeContainer({
 *   environment: 'production',
 *   storage: 'indexeddb',
 *   debug: false
 * });
 * ```
 */
export async function initializeContainer(
  config: ContainerConfig,
  serviceCreator: (
    config: ApplicationConfig
  ) => Promise<ApplicationServices> = createApplicationServicesWithContainer
): Promise<void> {
  try {
    // Step 1: Validate configuration
    validateConfiguration(config);

    // Step 2: Create application configuration
    const applicationConfig: ApplicationConfig = {
      environment: config.environment,
      storage: config.storage,
      debug: config.debug ?? false,
    };

    // Step 3: Create application services using DIContainer with dynamic imports
    applicationServices = await serviceCreator(applicationConfig);

    // Step 4: Create GameAdapter configuration
    const gameAdapterConfig: GameAdapterConfig = {
      startNewGame: applicationServices.startNewGame,
      recordAtBat: applicationServices.recordAtBat,
      substitutePlayer: applicationServices.substitutePlayer,
      undoLastAction: applicationServices.undoLastAction,
      redoLastAction: applicationServices.redoLastAction,
      endInning: applicationServices.endInning,
      gameRepository: applicationServices.gameRepository,
      eventStore: applicationServices.eventStore,
      logger: applicationServices.logger,
      wizardToCommand,
    };

    // Step 5: Create GameAdapter
    const gameAdapter = new GameAdapter(gameAdapterConfig);

    // Step 6: Assemble final container
    containerInstance = {
      ...applicationServices,
      gameAdapter,
    };

    applicationServices.logger.info('Dependency container initialized successfully', {
      environment: config.environment,
      storage: config.storage,
      debug: config.debug,
    });
  } catch (error) {
    // Clean up on failure
    containerInstance = null;
    applicationServices = null;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to initialize dependency container: ${errorMessage}`);
  }
}

/**
 * Gets the initialized dependency container instance.
 *
 * @remarks
 * Provides singleton access to the dependency container. This is the primary
 * way for Web layer components to access application services and repositories.
 *
 * The container provides type-safe access to all services and ensures that
 * dependencies are properly initialized before use.
 *
 * @throws Error if container hasn't been initialized
 * @returns Initialized dependency container
 *
 * @example
 * ```typescript
 * // Access container in React components
 * function GameComponent() {
 *   const container = getContainer();
 *
 *   const startGame = async () => {
 *     const result = await container.gameAdapter.startNewGame(gameData);
 *     container.logger.info('Game started', { gameId: result.gameId });
 *   };
 *
 *   return <button onClick={startGame}>Start Game</button>;
 * }
 *
 * // Access in service classes
 * class GameService {
 *   private readonly container = getContainer();
 *
 *   async processGameAction(action: GameAction) {
 *     return this.container.recordAtBat.execute(action.command);
 *   }
 * }
 * ```
 */
export function getContainer(): DependencyContainer {
  if (!containerInstance) {
    throw new Error('Dependency container not initialized. Call initializeContainer first.');
  }
  return containerInstance;
}

/**
 * Resets the container instance - used for testing and cleanup.
 *
 * @remarks
 * Internal function for resetting container state, primarily used in test
 * scenarios to ensure clean test isolation. This should not be used in
 * production code except for controlled shutdown scenarios.
 *
 * @internal
 */
export function resetContainer(): void {
  containerInstance = null;
  applicationServices = null;
}

/**
 * Validates container configuration parameters.
 *
 * @remarks
 * Ensures that all required configuration properties are present and valid
 * before attempting container initialization. This prevents partial
 * initialization failures and provides clear error messages.
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfiguration(config: ContainerConfig): void {
  if (!config) {
    throw new Error('Container configuration is required');
  }

  if (!config.environment || !['development', 'production'].includes(config.environment)) {
    throw new Error('Invalid environment. Must be "development" or "production"');
  }

  if (!config.storage || !['memory', 'indexeddb'].includes(config.storage)) {
    throw new Error('Invalid storage type. Must be "memory" or "indexeddb"');
  }
}
