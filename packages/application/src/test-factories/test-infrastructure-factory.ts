/**
 * @file Test Infrastructure Factory
 * Mock infrastructure factory for testing DI Container without circular dependencies.
 *
 * @remarks
 * This factory creates mock infrastructure services that can be used for testing
 * the DI Container functionality without requiring actual infrastructure implementations.
 * This approach eliminates circular dependency issues while maintaining test coverage.
 */

import type {
  InfrastructureFactory,
  InfrastructureServices,
  InfrastructureConfig,
} from '../services/InfrastructureFactory.js';

import {
  createMockGameRepository,
  createMockInningStateRepository,
  createMockTeamLineupRepository,
  createMockEventStore,
  createMockLogger,
} from './mock-factories.js';

/**
 * Creates a mock infrastructure factory suitable for testing environments.
 *
 * @remarks
 * This factory provides fully functional mock implementations of all infrastructure
 * services, allowing integration tests to run without dependencies on actual
 * infrastructure packages. The mocks maintain the same interface contracts as
 * real implementations.
 *
 * **Test Benefits:**
 * - No circular dependency issues
 * - Fast test execution (no I/O operations)
 * - Predictable behavior for test scenarios
 * - Full control over mock responses
 *
 * @returns Mock infrastructure factory for testing
 */
export function createTestInfrastructureFactory(): InfrastructureFactory {
  return {
    createServices(_config: InfrastructureConfig): Promise<InfrastructureServices> {
      const mockGameRepo = createMockGameRepository();
      const mockTeamLineupRepo = createMockTeamLineupRepository();
      const mockInningStateRepo = createMockInningStateRepository();
      const mockEventStore = createMockEventStore();
      const mockLogger = createMockLogger();

      return Promise.resolve({
        gameRepository: mockGameRepo,
        teamLineupRepository: mockTeamLineupRepo,
        inningStateRepository: mockInningStateRepo,
        eventStore: mockEventStore,
        logger: mockLogger,
      });
    },

    getDescription(): string {
      return 'Mock infrastructure factory for testing environments';
    },

    getStorageType(): string {
      return 'test-memory';
    },
  };
}
