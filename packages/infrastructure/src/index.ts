/**
 * @file Infrastructure Package Main Entry Point
 * Centralized exports for all infrastructure implementations.
 *
 * @remarks
 * This package provides concrete implementations of application layer ports
 * following the hexagonal architecture pattern. It includes both persistent
 * (IndexedDB) and in-memory implementations for flexibility across different
 * deployment scenarios.
 *
 * **Available Implementations:**
 * - Event Store: IndexedDB and In-Memory variants
 * - Web Adapters: Repository initialization and DI container for web applications
 *
 * **Usage Examples:**
 * ```typescript
 * // Basic usage with in-memory implementations
 * import { InMemoryEventStore, IndexedDBEventStore } from '@twsoftball/infrastructure';
 *
 * const eventStore = new InMemoryEventStore();
 * // or
 * const persistentEventStore = new IndexedDBEventStore();
 *
 * // Web adapter usage
 * import { initializeContainer, getContainer } from '@twsoftball/infrastructure/web';
 * await initializeContainer({ environment: 'development', useInMemoryStore: true });
 * const container = getContainer();
 * ```
 */

export * from './persistence';
export * from './web';

// Export factory functions for DI container
export { createIndexedDBFactory } from './web/factory';
export { createMemoryFactory } from './memory/factory';

// Note: Self-registration modules (./web/register.js, ./memory/register.js) are not
// automatically imported here to avoid side effects. They are imported by the
// Application layer's BootstrapRegistry when needed.
