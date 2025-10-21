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
 * } from '../test-factories/index.js';
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
  createMockInningStateRepository,
  createMockTeamLineupRepository,
  createMockEventStore,
  createMockLogger,
  createMockNotificationService,
  createMockDependencies,
  type EnhancedMockGameRepository,
  type EnhancedMockInningStateRepository,
  type EnhancedMockTeamLineupRepository,
  type EnhancedMockEventStore,
  type EnhancedMockLogger,
  type EnhancedMockNotificationService,
} from './mock-factories.js';

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
} from './test-builders.js';

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
} from './test-scenarios.js';

// Export all event factories
export {
  createActionUndoneEvent,
  createAtBatCompletedEvent,
  createSubstitutionEvent,
  createInningEndEvent,
  createGameStartedEvent,
  createGameCompletedEvent,
  createEventSequence,
} from './event-factories.js';

// Export all DTO factories
export {
  createLineupDTO,
  createGameStateDTO,
  createLineupPlayerDTO,
  createFullLineup,
  createRealisticLineup,
} from './dto-factories.js';

// Export command factories
export {
  createEndGameCommand,
  createCompleteGameWorkflowCommand,
  createCompleteAtBatSequenceCommand,
  createStartNewGameCommand,
  createRecordAtBatCommand,
  createSubstitutePlayerCommand,
  createEndInningCommand,
} from './command-factories.js';

// Export mock service factories
export {
  createMockUseCases,
  createMockPorts,
  createGameApplicationServiceMocks,
  createUseCaseMocks,
  type MockedUseCases,
  type MockedPorts,
} from './mock-service-factories.js';

// Re-export secure test utils for convenience
export { SecureTestUtils } from '../test-utils/secure-test-utils.js';

// Export test infrastructure factory
export { createTestInfrastructureFactory } from './test-infrastructure-factory.js';
