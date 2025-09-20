/**
 * @file Web Infrastructure Entry Point
 * Provides IndexedDB-based infrastructure services for web applications.
 *
 * @remarks
 * This entry point automatically registers IndexedDB implementation with the
 * Application layer's InfrastructureRegistry when imported. Use this for
 * web applications that need persistent storage.
 *
 * **Usage:**
 * ```typescript
 * // In Web layer bootstrap (e.g., main.tsx)
 * import '@twsoftball/infrastructure/web';
 * import { createApplicationServices } from '@twsoftball/application';
 *
 * const services = await createApplicationServices({
 *   storage: 'indexeddb',
 *   environment: 'production'
 * });
 * ```
 */

// Import web infrastructure exports
export * from './web/index.js';
export { createIndexedDBFactory } from './web/factory.js';
