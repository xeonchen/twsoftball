/**
 * @file Application Factory
 * Factory for creating application services with dynamic infrastructure loading.
 *
 * @remarks
 * This factory is specifically excluded from circular dependency rules in
 * dependency-cruiser.cjs because it uses dynamic imports to load infrastructure
 * modules at runtime. This maintains hexagonal architecture principles while
 * allowing the Application layer to create infrastructure services without
 * compile-time dependencies.
 *
 * **Architecture Compliance:**
 * - Uses dynamic imports to avoid compile-time dependencies
 * - Excluded from circular dependency detection
 * - Maintains clean separation between Application and Infrastructure layers
 * - Provides factory methods for different infrastructure implementations
 *
 * **Usage:**
 * ```typescript
 * import { createApplicationServicesWithContainer } from '@twsoftball/application';
 *
 * const services = await createApplicationServicesWithContainer({
 *   environment: 'production',
 *   storage: 'indexeddb'
 * });
 * ```
 */

import type { ApplicationConfig, ApplicationServices } from '../types/ApplicationTypes.js';

import { createInitializedContainer } from './DIContainer.js';
import type { InfrastructureFactory } from './InfrastructureFactory.js';

/**
 * Creates application services using the DI container approach with dynamic infrastructure loading.
 *
 * @param config - Application configuration
 * @returns Promise resolving to configured application services
 *
 * @remarks
 * This function provides a convenient way to create application services using
 * the DI container approach with automatic infrastructure factory selection based
 * on configuration. Infrastructure modules are loaded dynamically to maintain
 * proper architectural boundaries.
 *
 * @example
 * ```typescript
 * // Create application services with DI container (automatic factory selection)
 * const services = await createApplicationServicesWithContainer({
 *   environment: 'production',
 *   storage: 'indexeddb'
 * });
 * ```
 */
export async function createApplicationServicesWithContainer(
  config: ApplicationConfig
): Promise<ApplicationServices> {
  // Create infrastructure factory based on configuration
  const factory = await createInfrastructureFactory(config.storage);
  const container = await createInitializedContainer(config, factory);
  return await container.resolve<ApplicationServices>('applicationServices');
}

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

/**
 * Creates an infrastructure factory based on storage type.
 *
 * @param storage - Storage type configuration
 * @returns Promise resolving to infrastructure factory
 * @private
 *
 * @remarks
 * This function uses dynamic imports to load infrastructure modules at runtime,
 * maintaining clean architectural boundaries. It's excluded from circular
 * dependency detection in dependency-cruiser.cjs.
 */
async function createInfrastructureFactory(storage: string): Promise<InfrastructureFactory> {
  switch (storage) {
    case 'memory': {
      // @ts-expect-error Dynamic import resolved at runtime by bundler
      const module: unknown = await import('@twsoftball/infrastructure/memory');
      const { createMemoryFactory } = module as {
        createMemoryFactory: () => InfrastructureFactory;
      };
      return createMemoryFactory();
    }
    case 'indexeddb': {
      // @ts-expect-error Dynamic import resolved at runtime by bundler
      const module: unknown = await import('@twsoftball/infrastructure/web');
      const { createIndexedDBFactory } = module as {
        createIndexedDBFactory: () => InfrastructureFactory;
      };
      return createIndexedDBFactory();
    }
    default:
      throw new Error(`Unsupported storage: ${storage}`);
  }
}
