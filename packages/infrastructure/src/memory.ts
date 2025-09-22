/**
 * @file Memory Infrastructure Entry Point
 * Provides in-memory infrastructure services for testing and development.
 *
 * @remarks
 * This entry point automatically registers in-memory implementation with the
 * Application layer's InfrastructureRegistry when imported. Use this for
 * testing, development, or scenarios where persistence is not required.
 *
 * **Usage:**
 * ```typescript
 * // In test setup or development
 * import '@twsoftball/infrastructure/memory';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const services = await createApplicationServices({
 *   storage: 'memory',
 *   environment: 'test'
 * });
 * ```
 */

// Import memory infrastructure exports
export * from './persistence/InMemoryEventStore.js';
export * from './persistence/EventSourcedGameRepository.js';
export * from './persistence/EventSourcedTeamLineupRepository.js';
export * from './persistence/EventSourcedInningStateRepository.js';

// Infrastructure factory for dependency injection
export * from './memory/factory.js';
export { createMemoryFactory } from './memory/factory.js';
