/**
 * @file Application Factory
 * Factory for creating application services using the DI Container with Composition Root pattern.
 *
 * @remarks
 * This factory implements the **Composition Root pattern** to eliminate circular dependencies
 * between Application and Infrastructure packages while maintaining hexagonal architecture.
 *
 * **Architecture Compliance:**
 * - Application layer NO LONGER imports Infrastructure (no circular dependency)
 * - Web layer (composition root) selects and injects infrastructure factories
 * - Maintains clean separation between Application and Infrastructure layers
 * - Infrastructure selection happens at the highest layer (Web/entry point)
 *
 * **Composition Root Pattern:**
 * The Web layer (entry point) is responsible for:
 * 1. Importing infrastructure factories (createIndexedDBFactory, createMemoryFactory)
 * 2. Selecting the appropriate factory based on configuration
 * 3. Passing the factory to createApplicationServicesWithContainerAndFactory
 *
 * **Usage:**
 * ```typescript
 * // In Web layer (apps/web/src/app/providers/appServices.tsx)
 * import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application';
 * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
 * import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
 *
 * // Composition root: Select infrastructure at Web layer
 * const factory = config.storage === 'memory'
 *   ? createMemoryFactory()
 *   : createIndexedDBFactory();
 *
 * // Pass explicit factory (no infrastructure import in Application layer)
 * const services = await createApplicationServicesWithContainerAndFactory(config, factory);
 * ```
 */

import type { ApplicationConfig, ApplicationServices } from '../types/ApplicationTypes.js';

import { createInitializedContainer } from './DIContainer.js';
import type { InfrastructureFactory } from './InfrastructureFactory.js';

/**
 * Creates application services using the DI container approach with explicit factory.
 *
 * @param config - Application configuration
 * @param factory - Infrastructure factory instance
 * @returns Promise resolving to configured application services
 *
 * @remarks
 * This function variant allows passing an explicit infrastructure factory,
 * which is useful for testing or when using custom infrastructure implementations.
 *
 * @example
 * ```typescript
 * import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
 *
 * // Create application services with explicit factory
 * const factory = createIndexedDBFactory();
 * const services = await createApplicationServicesWithContainerAndFactory({
 *   environment: 'production',
 *   storage: 'indexeddb'
 * }, factory);
 * ```
 */
export async function createApplicationServicesWithContainerAndFactory(
  config: ApplicationConfig,
  factory: InfrastructureFactory
): Promise<ApplicationServices> {
  const container = await createInitializedContainer(config, factory);
  return await container.resolve<ApplicationServices>('applicationServices');
}
