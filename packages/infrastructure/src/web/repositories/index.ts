/**
 * @file Repository Initialization Module
 * Provides centralized initialization and access to repositories following hexagonal architecture.
 *
 * @remarks
 * This module acts as a dependency injection container for repositories,
 * ensuring proper separation between Application and Infrastructure layers.
 * The Web layer NEVER imports directly from @twsoftball/domain, only from
 * @twsoftball/application and @twsoftball/infrastructure.
 *
 * Key Design Principles:
 * - Hexagonal Architecture compliance - Web layer only depends on Application ports
 * - Singleton pattern for repository instances within initialization scope
 * - Environment-based configuration (development vs production storage)
 * - Graceful error handling for infrastructure failures
 *
 * @example
 * ```typescript
 * // Initialize repositories at app startup
 * await initializeRepositories({
 *   environment: 'development',
 *   useInMemoryStore: true
 * });
 *
 * // Access repositories in components/services
 * const gameRepository = getGameRepository();
 * const game = await gameRepository.findById(gameId);
 * ```
 */

import type { GameRepository, EventStore } from '@twsoftball/application';
import type { InningStateRepository } from '@twsoftball/application/ports/out/InningStateRepository';
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';

import {
  InMemoryEventStore,
  IndexedDBEventStore,
  EventSourcedGameRepository,
  EventSourcedTeamLineupRepository,
  EventSourcedInningStateRepository,
} from '../../persistence';

/**
 * Configuration options for repository initialization.
 */
export interface RepositoryConfig {
  /** Runtime environment (development/production) */
  environment: 'development' | 'production';
  /** Whether to use in-memory storage (typically for dev/testing) */
  useInMemoryStore: boolean;
}

// Internal repository storage
let gameRepository: GameRepository | null = null;
let teamLineupRepository: TeamLineupRepository | null = null;
let inningStateRepository: InningStateRepository | null = null;
let eventStore: EventStore | null = null;
let isInitialized = false;

/**
 * Resets repository state - used for testing
 * @internal
 */
export function resetRepositories(): void {
  gameRepository = null;
  teamLineupRepository = null;
  inningStateRepository = null;
  eventStore = null;
  isInitialized = false;
}

/**
 * Initializes all repositories with the specified configuration.
 *
 * @remarks
 * This function creates and configures all repositories needed by the application.
 * It uses the appropriate EventStore implementation based on the environment
 * configuration and creates EventSourced repositories for each aggregate root.
 *
 * The function is idempotent - calling it multiple times will re-initialize
 * the repositories with the new configuration.
 *
 * Error Handling:
 * - IndexedDB availability issues in browsers
 * - Storage quota limitations
 * - Configuration validation errors
 *
 * @param config - Repository configuration options
 * @throws Error if repository initialization fails
 *
 * @example
 * ```typescript
 * // Development setup with in-memory storage
 * await initializeRepositories({
 *   environment: 'development',
 *   useInMemoryStore: true
 * });
 *
 * // Production setup with persistent storage
 * await initializeRepositories({
 *   environment: 'production',
 *   useInMemoryStore: false
 * });
 * ```
 */
export async function initializeRepositories(config: RepositoryConfig): Promise<void> {
  try {
    // Create EventStore instance based on configuration
    eventStore = config.useInMemoryStore ? new InMemoryEventStore() : new IndexedDBEventStore();

    // Initialize EventStore if needed (for IndexedDB)
    if ('initialize' in eventStore && typeof eventStore.initialize === 'function') {
      await (eventStore.initialize as () => Promise<void>)();
    }

    // Create repository instances using EventSourced implementations
    gameRepository = new EventSourcedGameRepository(eventStore); // No snapshot store for now
    teamLineupRepository = new EventSourcedTeamLineupRepository(eventStore, gameRepository);
    inningStateRepository = new EventSourcedInningStateRepository(eventStore);

    isInitialized = true;
  } catch (error) {
    // Reset state on failure
    gameRepository = null;
    teamLineupRepository = null;
    inningStateRepository = null;
    eventStore = null;
    isInitialized = false;

    throw new Error(
      `Failed to initialize repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets the initialized Game repository instance.
 *
 * @throws Error if repositories haven't been initialized
 * @returns Game repository instance
 */
export function getGameRepository(): GameRepository {
  if (!isInitialized || !gameRepository) {
    throw new Error('Repositories not initialized. Call initializeRepositories first.');
  }
  return gameRepository;
}

/**
 * Gets the initialized TeamLineup repository instance.
 *
 * @throws Error if repositories haven't been initialized
 * @returns TeamLineup repository instance
 */
export function getTeamLineupRepository(): TeamLineupRepository {
  if (!isInitialized || !teamLineupRepository) {
    throw new Error('Repositories not initialized. Call initializeRepositories first.');
  }
  return teamLineupRepository;
}

/**
 * Gets the initialized InningState repository instance.
 *
 * @throws Error if repositories haven't been initialized
 * @returns InningState repository instance
 */
export function getInningStateRepository(): InningStateRepository {
  if (!isInitialized || !inningStateRepository) {
    throw new Error('Repositories not initialized. Call initializeRepositories first.');
  }
  return inningStateRepository;
}

/**
 * Gets the initialized EventStore instance.
 *
 * @remarks
 * Provides access to the shared EventStore instance used by all repositories.
 * This ensures consistent event storage across the application and prevents
 * creating duplicate EventStore instances.
 *
 * @throws Error if repositories haven't been initialized
 * @returns EventStore instance
 *
 * @example
 * ```typescript
 * // Access shared EventStore in DI container
 * const eventStore = getEventStore();
 * const startNewGame = new StartNewGameUseCase(gameRepository, eventStore, logger);
 * ```
 */
export function getEventStore(): EventStore {
  if (!isInitialized || !eventStore) {
    throw new Error('Repositories not initialized. Call initializeRepositories first.');
  }
  return eventStore;
}
