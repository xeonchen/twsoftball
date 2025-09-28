/**
 * @file App Initialization Model
 * Core application initialization logic that was moved from shared/di/container
 * to comply with Feature-Sliced Design architecture.
 *
 * @remarks
 * This module handles the initialization of application services and adapters
 * while maintaining proper FSD layer boundaries. It serves as a feature-level
 * coordinator for app startup without violating architecture principles.
 *
 * Key Responsibilities:
 * - Initialize ApplicationServices through dependency injection
 * - Create and configure GameAdapter with proper dependencies
 * - Validate configuration parameters
 * - Handle initialization errors gracefully
 * - Provide type-safe access to initialized services
 *
 * Architecture Compliance:
 * - Features layer can import from shared layer (wizardToCommand mapper)
 * - Features layer can import from application layer (ApplicationServices)
 * - Features layer CANNOT import from entities layer (maintains FSD compliance)
 * - Provides clean public API through index.ts exports
 *
 * @example
 * ```typescript
 * // Initialize application services
 * const result = await initializeApplicationServices({
 *   environment: 'development',
 *   storage: 'memory',
 *   debug: true
 * });
 *
 * // Access services and adapters
 * const gameResult = await result.gameAdapter.startNewGameFromWizard(wizardData);
 * result.applicationServices.logger.info('Game started successfully');
 * ```
 */

import type { ApplicationServices, ApplicationConfig } from '@twsoftball/application';

import { wizardToCommand } from '../../../shared/api';
import { GameAdapter, type GameAdapterConfig } from '../api/gameAdapter';

/**
 * Configuration interface for app initialization.
 */
export interface AppInitializationConfig {
  /** Runtime environment (development/production) */
  environment: 'development' | 'production';
  /** Storage implementation to use */
  storage: 'memory' | 'indexeddb';
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result of successful app initialization.
 */
export interface AppInitializationResult {
  /** Initialized application services */
  applicationServices: ApplicationServices;
  /** Game adapter configured with all dependencies */
  gameAdapter: GameAdapter;
}

/**
 * Type for application services factory function.
 */
export type ApplicationServicesFactory = (
  config: ApplicationConfig
) => Promise<ApplicationServices>;

/**
 * Initializes application services and creates configured GameAdapter.
 *
 * @remarks
 * This function serves as the main entry point for application initialization.
 * It follows the dependency injection pattern by accepting a factory function
 * for creating ApplicationServices, making it testable and flexible.
 *
 * **Initialization Flow**:
 * 1. **Configuration Validation**: Verify all required parameters
 * 2. **Application Services Creation**: Use factory to create services with DI container
 * 3. **GameAdapter Configuration**: Wire GameAdapter with all required dependencies
 * 4. **Success Logging**: Log successful initialization for debugging
 *
 * **Error Handling**:
 * - Configuration validation errors
 * - Application service creation failures
 * - Adapter configuration issues
 *
 * @param config - App initialization configuration
 * @param serviceFactory - Factory function for creating ApplicationServices
 * @returns Promise resolving to initialized services and adapters
 * @throws Error if initialization fails
 *
 * @example
 * ```typescript
 * // Development setup with in-memory storage
 * const result = await initializeApplicationServices({
 *   environment: 'development',
 *   storage: 'memory',
 *   debug: true
 * });
 *
 * // Production setup with persistent IndexedDB storage
 * const result = await initializeApplicationServices({
 *   environment: 'production',
 *   storage: 'indexeddb',
 *   debug: false
 * });
 * ```
 */
export async function initializeApplicationServices(
  config: AppInitializationConfig,
  serviceFactory: ApplicationServicesFactory
): Promise<AppInitializationResult> {
  // Step 1: Validate configuration
  validateConfiguration(config);

  // Step 2: Create application configuration
  const applicationConfig: ApplicationConfig = {
    environment: config.environment,
    storage: config.storage,
    debug: config.debug ?? false,
  };

  // Step 3: Create application services using factory (DI container with dynamic imports)
  const applicationServices = await serviceFactory(applicationConfig);

  // Step 4: Create GameAdapter configuration
  const gameAdapterConfig: GameAdapterConfig = {
    startNewGame: applicationServices.startNewGame,
    recordAtBat: applicationServices.recordAtBat,
    substitutePlayer: applicationServices.substitutePlayer,
    undoLastAction: applicationServices.undoLastAction,
    redoLastAction: applicationServices.redoLastAction,
    endInning: applicationServices.endInning,
    gameRepository: applicationServices.gameRepository,
    teamLineupRepository: applicationServices.teamLineupRepository,
    eventStore: applicationServices.eventStore,
    logger: applicationServices.logger,
    wizardToCommand,
  };

  // Step 5: Create GameAdapter instance
  const gameAdapter = new GameAdapter(gameAdapterConfig);

  // Step 6: Log successful initialization
  applicationServices.logger.info(
    'App initialization: Application services initialized successfully',
    {
      environment: config.environment,
      storage: config.storage,
      debug: config.debug,
    }
  );

  // Step 7: Return initialized services
  return {
    applicationServices,
    gameAdapter,
  };
}

/**
 * Validates app initialization configuration parameters.
 *
 * @remarks
 * Ensures that all required configuration properties are present and valid
 * before attempting initialization. This prevents partial initialization
 * failures and provides clear error messages.
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfiguration(config: AppInitializationConfig): void {
  if (!config) {
    throw new Error('Configuration is required');
  }

  if (!config.environment || !['development', 'production'].includes(config.environment)) {
    throw new Error('Invalid environment. Must be "development" or "production"');
  }

  if (!config.storage || !['memory', 'indexeddb'].includes(config.storage)) {
    throw new Error('Invalid storage type. Must be "memory" or "indexeddb"');
  }
}
