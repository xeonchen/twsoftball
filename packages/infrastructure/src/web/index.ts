/**
 * @file Web Infrastructure Adapters
 * Infrastructure adapters specifically for web applications.
 *
 * @remarks
 * This module provides web-specific infrastructure implementations that handle
 * the wiring between the application layer and concrete infrastructure services.
 * These adapters are designed to be used in web environments where they can
 * directly import infrastructure implementations.
 *
 * **Key Components:**
 * - Repository initialization and management
 * - Dependency injection container for web applications
 * - Environment-specific configuration handling
 *
 * **Architectural Compliance:**
 * - Located in Infrastructure layer (can import from any layer)
 * - Provides concrete implementations that Web layer can import
 * - Implements application layer ports with concrete infrastructure
 *
 * **Usage:**
 * ```typescript
 * // Initialize web infrastructure at app startup
 * import { initializeRepositories } from '@twsoftball/infrastructure/web';
 *
 * await initializeRepositories({
 *   environment: 'production',
 *   useInMemoryStore: false
 * });
 *
 * // Access repositories from dependency injection container
 * import { gameRepository } from '@twsoftball/infrastructure/web';
 * const game = await gameRepository.findById(gameId);
 * ```
 *
 * @note
 * Web adapters and mappers have been moved back to the Web layer (apps/web/src/shared/api/)
 * as they belong in the Web layer according to Hexagonal Architecture principles.
 */

// Repository initialization system
export * from './repositories';

// Infrastructure factory for dependency injection
export * from './factory';
