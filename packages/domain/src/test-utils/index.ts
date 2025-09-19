/**
 * Test utilities for domain layer testing.
 *
 * @remarks
 * This module exports test utilities to eliminate code duplication across test files.
 * These utilities are internal to the domain package and should NOT be exported
 * from the main domain index.ts file as they are testing-only utilities.
 *
 * **Key Benefits:**
 * - Eliminates test code duplication identified by SonarQube
 * - Provides consistent test data creation patterns
 * - Improves test maintainability and readability
 * - Ensures standardized assertion patterns
 *
 * **Usage Pattern:**
 * ```typescript
 * // In test files, import specific utilities needed
 * import {
 *   TestPlayerFactory,
 *   TeamStrategyTestHelper,
 *   EventTestHelper,
 *   ValueObjectTestHelper
 * } from '../test-utils.js';
 *
 * // Create test data
 * const players = TestPlayerFactory.createPlayers(9);
 * const gameId = EventTestHelper.createGameId('test-game');
 *
 * // Setup team strategy testing
 * TeamStrategyTestHelper.setupBasicLineup(strategy);
 * TeamStrategyTestHelper.assertLineupValid(strategy);
 *
 * // Test value object validation
 * ValueObjectTestHelper.assertValidConstructor(Score, 10);
 * ValueObjectTestHelper.assertInvalidConstructor(Score, -1, 'Score must be a non-negative integer');
 * ```
 *
 * @packageDocumentation
 */

// Player creation utilities
export { TestPlayerFactory } from './TestPlayerFactory.js';

// Team strategy testing utilities
export { TeamStrategyTestHelper } from './TeamStrategyTestHelper.js';

// Event and score testing utilities
export { EventTestHelper } from './EventTestHelper.js';

// Value object validation testing utilities
export { ValueObjectTestHelper } from './ValueObjectTestHelper.js';

// Lineup construction utilities
export { TestLineupBuilder } from './TestLineupBuilder.js';

// Game-related test data creation
export { TestGameFactory } from './TestGameFactory.js';

// Common assertion helpers
export { AssertionHelpers } from './AssertionHelpers.js';

/**
 * Re-export commonly used types for convenience in tests.
 * These are already part of the domain public API but grouped here
 * for easy access in test utilities.
 */
export type { TeamPlayer, BattingSlotState } from '../strategies/TeamStrategy.js';
export { FieldPosition } from '../constants/FieldPosition.js';
export { DomainError } from '../errors/DomainError.js';

// Re-export core value objects commonly used in tests
export { PlayerId } from '../value-objects/PlayerId.js';
export { JerseyNumber } from '../value-objects/JerseyNumber.js';
export { GameId } from '../value-objects/GameId.js';
export { Score } from '../value-objects/Score.js';
export { GameScore } from '../value-objects/GameScore.js';
export { SoftballRules } from '../rules/SoftballRules.js';
