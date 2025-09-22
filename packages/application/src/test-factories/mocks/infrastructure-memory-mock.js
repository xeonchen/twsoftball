/**
 * @file Infrastructure Memory Mock
 * Mock implementation for infrastructure/memory module in test environment.
 *
 * @remarks
 * This mock provides the same exports as the real infrastructure/memory module
 * but uses test-friendly mock implementations instead of actual infrastructure.
 * Used by Vitest aliases to avoid circular dependencies during testing.
 */

import { createTestInfrastructureFactory } from '../test-infrastructure-factory.js';

/**
 * Mock implementation of createMemoryFactory.
 * Returns a test infrastructure factory instead of real memory infrastructure.
 */
export function createMemoryFactory() {
  return createTestInfrastructureFactory();
}

// Re-export mock implementations that match the real module interface
export * from '../mock-factories.js';
