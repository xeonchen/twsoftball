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
 *
 * **Usage Examples:**
 * ```typescript
 * // Basic usage with in-memory implementations
 * import { InMemoryEventStore, IndexedDBEventStore } from '@twsoftball/infrastructure';
 *
 * const eventStore = new InMemoryEventStore();
 * // or
 * const persistentEventStore = new IndexedDBEventStore();
 * ```
 */

export * from './persistence';

// Note: Config exports will be added when DependencyContainer is implemented
// export * from './config';
