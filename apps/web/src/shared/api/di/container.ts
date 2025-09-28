/**
 * @file Shared DI Container
 * Pure infrastructure-level dependency injection utilities for the shared layer.
 *
 * @remarks
 * This container provides shared infrastructure utilities that can be used
 * across different layers of the application. It follows Feature-Sliced Design
 * principles by staying within the shared layer boundaries.
 *
 * **Architecture Compliance**:
 * - Shared layer utilities only
 * - No imports from features/entities/widgets/pages layers
 * - Provides reusable DI patterns and utilities
 * - Can be imported by higher layers (features, widgets, pages, app)
 *
 * **Key Responsibilities**:
 * - Provide shared DI utility types and interfaces
 * - Export configuration types for type sharing
 * - Provide testing utilities for DI patterns
 * - Maintain backward compatibility for existing imports
 *
 * **Migration Note**:
 * Application-level initialization has been moved to:
 * - `app/providers/appServices.tsx` - React provider for app-level DI
 * - `features/app-initialization/` - Feature-level initialization logic
 *
 * This file now serves as a shared utility layer only.
 *
 * @example
 * ```typescript
 * // For shared utilities and types
 * import { ContainerConfig } from 'shared/api/di';
 *
 * // For app-level services (new pattern)
 * import { useAppServices } from 'app/providers';
 * const { services } = useAppServices();
 * ```
 */

import type { ApplicationServices } from '@twsoftball/application';

/**
 * Configuration interface for dependency container initialization.
 *
 * @remarks
 * This interface is maintained in the shared layer for type compatibility
 * across the application. The actual initialization is now handled by the
 * app layer using the app-initialization feature.
 *
 * @deprecated Use AppInitializationConfig from features/app-initialization
 * and AppServicesProvider from app/providers instead.
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
 * This interface is maintained in the shared layer for type compatibility.
 * For actual service access, use the new app-level pattern with useAppServices hook.
 *
 * @deprecated Use useAppServices hook from app/providers instead.
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
  readonly gameAdapter: unknown; // Avoiding import from features layer
}

/**
 * Initializes the dependency injection container with the specified configuration.
 *
 * @remarks
 * **DEPRECATED**: This function has been moved to the app layer for proper
 * Feature-Sliced Design compliance.
 *
 * **Migration Path**:
 * 1. Remove calls to this function
 * 2. Use AppServicesProvider in app layer instead
 * 3. Access services through useAppServices hook
 *
 * @deprecated Use AppServicesProvider from app/providers instead
 * @param config - Container configuration options
 * @throws Error indicating migration is required
 *
 * @example
 * ```typescript
 * // OLD (deprecated):
 * await initializeContainer(config);
 * const container = getContainer();
 *
 * // NEW (FSD compliant):
 * // In App.tsx
 * <AppServicesProvider config={config}>
 *   <YourApp />
 * </AppServicesProvider>
 *
 * // In components
 * const { services } = useAppServices();
 * await services.gameAdapter.startNewGame(data);
 * ```
 */
export function initializeContainer(_config: ContainerConfig): Promise<void> {
  throw new Error(
    'initializeContainer has been deprecated and moved to app layer. ' +
      'Use AppServicesProvider from app/providers instead. ' +
      'See migration guide in container.ts for details.'
  );
}

/**
 * Gets the initialized dependency container instance.
 *
 * @remarks
 * **DEPRECATED**: This function has been moved to the app layer for proper
 * Feature-Sliced Design compliance.
 *
 * **Migration Path**:
 * 1. Remove calls to this function
 * 2. Use useAppServices hook instead
 * 3. Access services through the hook's return value
 *
 * @deprecated Use useAppServices hook from app/providers instead
 * @throws Error indicating migration is required
 * @returns Never returns, always throws
 *
 * @example
 * ```typescript
 * // OLD (deprecated):
 * const container = getContainer();
 * await container.gameAdapter.startNewGame(data);
 *
 * // NEW (FSD compliant):
 * const { services } = useAppServices();
 * await services.gameAdapter.startNewGame(data);
 * ```
 */
export function getContainer(): DependencyContainer {
  throw new Error(
    'getContainer has been deprecated and moved to app layer. ' +
      'Use useAppServices hook from app/providers instead. ' +
      'See migration guide in container.ts for details.'
  );
}

/**
 * Resets the container instance - used for testing and cleanup.
 *
 * @remarks
 * **DEPRECATED**: This function is no longer needed with the new React-based
 * service management pattern.
 *
 * @deprecated No longer needed with React-based service management
 * @internal
 */
export function resetContainer(): void {
  // No-op for backward compatibility in tests
  // The new React-based pattern handles cleanup automatically
}
