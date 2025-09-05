/**
 * @file Test Factories Index
 * Central export point for all test utility modules.
 *
 * @remarks
 * This module provides a single import point for all test utilities,
 * making it easy to import commonly used test functions and types
 * across the test suite.
 *
 * **Exported Modules**:
 * - Mock Factories: Reusable mock implementations
 * - Test Builders: Fluent API builders for test data
 * - Test Scenarios: Common test setup patterns
 *
 * @example
 * ```typescript
 * import {
 *   createMockDependencies,
 *   GameTestBuilder,
 *   CommandTestBuilder,
 *   setupSuccessfulAtBatScenario,
 *   setupRepositoryFailureScenario
 * } from '../test-factories';
 *
 * describe('My Use Case', () => {
 *   it('should handle success case', async () => {
 *     const scenario = setupSuccessfulAtBatScenario();
 *     // ... test implementation
 *   });
 * });
 * ```
 */

// Export all mock factories
export {
  createMockGameRepository,
  createMockEventStore,
  createMockLogger,
  createMockNotificationService,
  createMockDependencies,
  type EnhancedMockGameRepository,
  type EnhancedMockEventStore,
  type EnhancedMockLogger,
  type EnhancedMockNotificationService,
} from './mock-factories';

// Export all test builders
export {
  GameTestBuilder,
  CommandTestBuilder,
  RecordAtBatCommandBuilder,
  StartNewGameCommandBuilder,
  SubstitutePlayerCommandBuilder,
  EndInningCommandBuilder,
  UndoCommandBuilder,
  RedoCommandBuilder,
  EventTestBuilder,
} from './test-builders';

// Export all test scenarios
export {
  setupSuccessfulAtBatScenario,
  setupSuccessfulGameStartScenario,
  setupSuccessfulSubstitutionScenario,
  setupSuccessfulUndoScenario,
  setupSuccessfulRedoScenario,
  setupRepositoryFailureScenario,
  setupEventStoreFailureScenario,
  setupDomainErrorScenario,
  setupConcurrencyConflictScenario,
  setupGameNotFoundScenario,
  setupCustomScenario,
  type TestScenario,
} from './test-scenarios';

// Re-export secure test utils for convenience
export { SecureTestUtils } from '../test-utils/secure-test-utils';
