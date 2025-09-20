/**
 * @file Infrastructure Factory Interface
 * Abstract factory pattern for Infrastructure dependency injection without architecture violations.
 *
 * @remarks
 * This interface defines the contract for Infrastructure factories without importing
 * from Infrastructure layer. The Web layer provides concrete implementations
 * and injects them into the Application layer, maintaining clean architecture boundaries.
 *
 * **Architecture Compliance:**
 * - Application Layer: Defines abstract factory interface (this file)
 * - Infrastructure Layer: Implements factory interface
 * - Web Layer: Creates concrete factory and injects it into Application
 * - No Application→Infrastructure dependencies
 * - No circular dependencies
 *
 * **Pattern Benefits:**
 * - Clean dependency inversion
 * - Multiple implementations support
 * - Testable with mock factories
 * - Respects hexagonal architecture principles
 *
 * @example
 * ```typescript
 * // In Web layer
 * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const infraFactory = createIndexedDBFactory();
 * const services = await createApplicationServices(config, infraFactory);
 * ```
 */

import type { EventStore } from '../ports/out/EventStore.js';
import type {
  GameRepository,
  TeamLineupRepository,
  InningStateRepository,
} from '../ports/out/index.js';
import type { Logger } from '../ports/out/Logger.js';

/**
 * Configuration for infrastructure service creation.
 */
export interface InfrastructureConfig {
  /** Runtime environment */
  environment: 'development' | 'production' | 'test';
  /** Enable debug logging */
  debug?: boolean;
  /** Custom storage configuration */
  storageConfig?: Record<string, unknown>;
}

/**
 * Infrastructure services provided by implementations.
 */
export interface InfrastructureServices {
  readonly gameRepository: GameRepository;
  readonly teamLineupRepository: TeamLineupRepository;
  readonly inningStateRepository: InningStateRepository;
  readonly eventStore: EventStore;
  readonly logger: Logger;
}

/**
 * Abstract factory interface for creating infrastructure services.
 *
 * @remarks
 * This interface allows the Application layer to receive infrastructure
 * services without directly importing Infrastructure implementations.
 * Concrete factories are created by Infrastructure layer and injected
 * by Web layer.
 *
 * **Implementation Requirements:**
 * - Must be stateless (no instance variables)
 * - Must handle initialization failures gracefully
 * - Must provide appropriate logger for environment
 * - Must ensure repository consistency (same EventStore instance)
 *
 * **Error Handling:**
 * - Configuration validation errors
 * - Storage initialization failures (IndexedDB, etc.)
 * - Resource unavailability (storage quota, permissions)
 */
export interface InfrastructureFactory {
  /**
   * Creates and configures infrastructure services.
   *
   * @param config - Infrastructure configuration
   * @returns Promise resolving to configured services
   *
   * @throws {Error} If services cannot be created or initialized
   */
  createServices(config: InfrastructureConfig): Promise<InfrastructureServices>;

  /**
   * Gets a human-readable description of this factory implementation.
   *
   * @returns Description string (e.g., "IndexedDB-based persistence for web browsers")
   */
  getDescription(): string;

  /**
   * Gets the storage type identifier for this factory.
   *
   * @returns Storage type (e.g., "indexeddb", "memory", "sqlite")
   */
  getStorageType(): string;
}
