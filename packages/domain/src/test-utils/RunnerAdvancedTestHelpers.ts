/**
 * @file RunnerAdvanced Test Helpers
 * Shared test utilities for RunnerAdvanced event testing
 */

import { RunnerAdvanced, AdvanceReason } from '../events/RunnerAdvanced';
import { Base } from '../value-objects/BasesState';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';

/**
 * Test scenario interface for valid runner advancement patterns in softball games.
 *
 * Defines the structure for data-driven tests that validate legal runner movement
 * scenarios according to softball rules. Used to create comprehensive test coverage
 * for all valid base-to-base advancement patterns in the TW Softball domain.
 */
export interface RunnerAdvancementScenario {
  from: Base | null;
  to: Base | 'HOME' | 'OUT';
  reason: AdvanceReason;
  description: string;
}

/**
 * Test scenario interface for validation error cases in runner advancement.
 *
 * Defines the structure for data-driven tests that validate proper error handling
 * when illegal runner movements are attempted. Ensures the RunnerAdvanced domain
 * event properly enforces softball rules and business constraints.
 */
export interface ValidationScenario {
  from: Base | null;
  to: Base | 'HOME' | 'OUT';
  reason: AdvanceReason;
  expectedError: string;
  description: string;
}

/**
 * Factory function for creating RunnerAdvanced domain events with realistic defaults.
 *
 * Provides a convenient way to create RunnerAdvanced events for testing scenarios
 * while maintaining consistency with domain layer patterns. Supports both explicit
 * ID specification and automatic generation for flexible test setup.
 *
 * @param from - Starting base position (null for batter)
 * @param to - Ending position (base, 'HOME', or 'OUT')
 * @param reason - Reason for advancement (defaults to HIT)
 * @param customGameId - Optional specific game ID (generates new if not provided)
 * @param customRunnerId - Optional specific runner ID (generates new if not provided)
 * @returns Properly constructed RunnerAdvanced domain event
 *
 * @remarks
 * This factory ensures:
 * - Consistent event creation patterns across tests
 * - Proper domain value object usage (real GameId/PlayerId instances)
 * - Flexible ID management for different test scenarios
 * - Default values that represent common softball situations
 *
 * @example
 * ```typescript
 * // Simple advancement with defaults
 * const event = createAdvanceEvent('FIRST', 'SECOND');
 *
 * // Specific game and player
 * const gameId = GameId.generate();
 * const playerId = PlayerId.generate();
 * const event = createAdvanceEvent('FIRST', 'HOME', AdvanceReason.HIT, gameId, playerId);
 * ```
 */
export const createAdvanceEvent = (
  from: Base | null,
  to: Base | 'HOME' | 'OUT',
  reason: AdvanceReason = AdvanceReason.HIT,
  customGameId?: GameId,
  customRunnerId?: PlayerId
): RunnerAdvanced => {
  const gameId = customGameId ?? GameId.generate();
  const runnerId = customRunnerId ?? PlayerId.generate();
  return new RunnerAdvanced(gameId, runnerId, from, to, reason);
};

/**
 * Comprehensive test scenarios for valid base-to-base runner advancements.
 *
 * Covers all legal runner movement patterns between bases according to softball rules.
 * Includes single-base advances, multiple-base advances, and scoring scenarios.
 * Essential for validating that RunnerAdvanced events properly represent all
 * possible legal movements during game play.
 *
 * @remarks
 * Scenarios include:
 * - **Single advances**: FIRST→SECOND, SECOND→THIRD, THIRD→HOME
 * - **Double advances**: FIRST→THIRD, SECOND→HOME
 * - **Triple advance**: FIRST→HOME
 * - **Various advance reasons**: HIT, SACRIFICE, etc.
 *
 * All scenarios represent realistic game situations and validate proper
 * business rule enforcement in the domain layer.
 */
export const baseToBaseScenarios: RunnerAdvancementScenario[] = [
  { from: 'FIRST', to: 'SECOND', reason: AdvanceReason.HIT, description: 'FIRST to SECOND' },
  { from: 'SECOND', to: 'THIRD', reason: AdvanceReason.SACRIFICE, description: 'SECOND to THIRD' },
  { from: 'THIRD', to: 'HOME', reason: AdvanceReason.HIT, description: 'THIRD to HOME' },
  {
    from: 'FIRST',
    to: 'THIRD',
    reason: AdvanceReason.HIT,
    description: 'FIRST to THIRD (double advance)',
  },
  {
    from: 'FIRST',
    to: 'HOME',
    reason: AdvanceReason.HIT,
    description: 'FIRST to HOME (triple advance)',
  },
  {
    from: 'SECOND',
    to: 'HOME',
    reason: AdvanceReason.HIT,
    description: 'SECOND to HOME (double advance)',
  },
];

/**
 * Test scenarios for batter advancement from home plate to bases.
 *
 * Covers all ways a batter can reach base according to softball rules,
 * from singles to home runs, including walks and other base-awarding scenarios.
 * Validates that RunnerAdvanced events properly handle batter-specific movements.
 *
 * @remarks
 * **Batter Scenarios:**
 * - **Hits**: Single (→FIRST), Double (→SECOND), Triple (→THIRD), Home Run (→HOME)
 * - **Walks**: Base on balls advancement to FIRST
 * - **Other**: Hit by pitch, errors, etc.
 *
 * The 'from: null' pattern represents the batter starting position and is
 * a critical domain concept that distinguishes batters from base runners.
 */
export const batterAdvancementScenarios: RunnerAdvancementScenario[] = [
  { from: null, to: 'FIRST', reason: AdvanceReason.HIT, description: 'batter to FIRST (single)' },
  { from: null, to: 'SECOND', reason: AdvanceReason.HIT, description: 'batter to SECOND (double)' },
  { from: null, to: 'THIRD', reason: AdvanceReason.HIT, description: 'batter to THIRD (triple)' },
  { from: null, to: 'HOME', reason: AdvanceReason.HIT, description: 'batter to HOME (home run)' },
  { from: null, to: 'FIRST', reason: AdvanceReason.WALK, description: 'batter to FIRST (walk)' },
];

/**
 * Test scenarios for runners being put out during play.
 *
 * Covers all situations where runners can be eliminated from bases,
 * including force outs, fielder's choice situations, and batter outs.
 * Essential for validating the complete lifecycle of runner positions.
 *
 * @remarks
 * **Out Scenarios:**
 * - **Base runners**: Runners eliminated from any base position
 * - **Batter outs**: Batter eliminated without reaching base
 * - **Common causes**: Fielder's choice, force plays, tagged out
 *
 * The 'to: OUT' destination represents elimination from play and is
 * a key domain concept for tracking game state changes.
 */
export const runnerOutScenarios: RunnerAdvancementScenario[] = [
  {
    from: 'FIRST',
    to: 'OUT',
    reason: AdvanceReason.FIELDERS_CHOICE,
    description: 'runner out from FIRST',
  },
  {
    from: 'SECOND',
    to: 'OUT',
    reason: AdvanceReason.FIELDERS_CHOICE,
    description: 'runner out from SECOND',
  },
  {
    from: 'THIRD',
    to: 'OUT',
    reason: AdvanceReason.FIELDERS_CHOICE,
    description: 'runner out from THIRD',
  },
  { from: null, to: 'OUT', reason: AdvanceReason.FIELDERS_CHOICE, description: 'batter out' },
];

/**
 * Test scenarios for validation errors in illegal runner movements.
 *
 * Defines comprehensive error cases that should be rejected by the RunnerAdvanced
 * domain event, ensuring proper business rule enforcement. Critical for validating
 * that the domain layer prevents impossible or illegal game state transitions.
 *
 * @remarks
 * **Error Categories:**
 * - **Same position errors**: Runner cannot stay on same base
 * - **Backward movement**: Runners cannot move backward on basepaths
 * - **Invalid transitions**: Movements that violate softball rules
 *
 * Each scenario includes the expected error message to validate that
 * meaningful error information is provided to users and calling code.
 */
export const validationErrorScenarios: ValidationScenario[] = [
  {
    from: 'FIRST',
    to: 'FIRST',
    reason: AdvanceReason.HIT,
    expectedError: 'Runner cannot advance from and to the same base',
    description: 'same base (FIRST to FIRST)',
  },
  {
    from: 'SECOND',
    to: 'SECOND',
    reason: AdvanceReason.WALK,
    expectedError: 'Runner cannot advance from and to the same base',
    description: 'same base (SECOND to SECOND)',
  },
  {
    from: 'THIRD',
    to: 'THIRD',
    reason: AdvanceReason.SACRIFICE,
    expectedError: 'Runner cannot advance from and to the same base',
    description: 'same base (THIRD to THIRD)',
  },
  {
    from: 'SECOND',
    to: 'FIRST',
    reason: AdvanceReason.HIT,
    expectedError: 'Runner cannot advance backward from SECOND to FIRST',
    description: 'backward movement (SECOND to FIRST)',
  },
  {
    from: 'THIRD',
    to: 'FIRST',
    reason: AdvanceReason.WALK,
    expectedError: 'Runner cannot advance backward from THIRD to FIRST',
    description: 'backward movement (THIRD to FIRST)',
  },
  {
    from: 'THIRD',
    to: 'SECOND',
    reason: AdvanceReason.SACRIFICE,
    expectedError: 'Runner cannot advance backward from THIRD to SECOND',
    description: 'backward movement (THIRD to SECOND)',
  },
];

/**
 * Test scenarios covering all valid advance reasons in softball gameplay.
 *
 * Comprehensive coverage of all AdvanceReason enum values to ensure each
 * reason type is properly supported by the RunnerAdvanced domain event.
 * Validates that the domain model accurately represents all ways runners
 * can advance during actual softball games.
 *
 * @remarks
 * **Advance Reasons Covered:**
 * - **WALK**: Base on balls advancement
 * - **STOLEN_BASE**: Runner steals next base
 * - **SACRIFICE**: Sacrifice fly or bunt advancement
 * - **FIELDERS_CHOICE**: Advancement due to fielding decisions
 * - **HIT**: Advancement due to batter hits
 * - **ERROR**: Advancement due to defensive errors
 * - **WILD_PITCH**: Advancement on wild pitches
 * - **BALK**: Advancement due to pitcher balk
 *
 * These scenarios ensure complete domain coverage and validate that
 * all real-world softball advancement scenarios are properly modeled.
 */
export const advanceReasonScenarios: RunnerAdvancementScenario[] = [
  { from: null, to: 'FIRST', reason: AdvanceReason.WALK, description: 'walk advancement' },
  {
    from: 'FIRST',
    to: 'SECOND',
    reason: AdvanceReason.STOLEN_BASE,
    description: 'stolen base advancement',
  },
  {
    from: 'SECOND',
    to: 'HOME',
    reason: AdvanceReason.SACRIFICE,
    description: 'sacrifice advancement',
  },
  {
    from: 'THIRD',
    to: 'OUT',
    reason: AdvanceReason.FIELDERS_CHOICE,
    description: 'fielders choice out',
  },
  { from: null, to: 'HOME', reason: AdvanceReason.HIT, description: 'hit advancement' },
  { from: 'FIRST', to: 'THIRD', reason: AdvanceReason.ERROR, description: 'error advancement' },
  {
    from: 'SECOND',
    to: 'THIRD',
    reason: AdvanceReason.WILD_PITCH,
    description: 'wild pitch advancement',
  },
  { from: 'FIRST', to: 'SECOND', reason: AdvanceReason.BALK, description: 'balk advancement' },
  { from: null, to: 'SECOND', reason: AdvanceReason.HIT, description: 'double hit advancement' },
];

/**
 * Executes parameterized tests for RunnerAdvanced event construction validation.
 *
 * Runs a series of event construction tests using the provided scenarios,
 * validating that each scenario results in properly constructed domain events
 * with correct properties and relationships. Essential for data-driven testing
 * of event creation patterns.
 *
 * @param scenarios - Array of test scenarios to execute
 * @param gameId - Game identifier to use for all test events
 * @param runnerId - Runner identifier to use for all test events
 *
 * @remarks
 * This helper validates:
 * - Event properties match scenario expectations
 * - Domain identifiers are properly assigned
 * - Event type is correctly set
 * - All scenario variations are tested consistently
 *
 * Used by test suites to avoid repetitive test code while ensuring
 * comprehensive coverage of all advancement scenarios.
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const runnerId = PlayerId.generate();
 *
 * runEventConstructionTests(baseToBaseScenarios, gameId, runnerId);
 * // Validates all base-to-base advancement scenarios
 * ```
 */
export const runEventConstructionTests = (
  scenarios: RunnerAdvancementScenario[],
  gameId: GameId,
  runnerId: PlayerId
): void => {
  scenarios.forEach(scenario => {
    const event = new RunnerAdvanced(gameId, runnerId, scenario.from, scenario.to, scenario.reason);

    expect(event.from).toBe(scenario.from);
    expect(event.to).toBe(scenario.to);
    expect(event.reason).toBe(scenario.reason);
    expect(event.gameId).toBe(gameId);
    expect(event.runnerId).toBe(runnerId);
    expect(event.type).toBe('RunnerAdvanced');
  });
};

/**
 * Executes parameterized tests for RunnerAdvanced validation error scenarios.
 *
 * Runs a series of validation tests using the provided error scenarios,
 * ensuring that each scenario properly throws the expected domain error
 * with correct error message and type. Critical for validating business
 * rule enforcement in the domain layer.
 *
 * @param scenarios - Array of validation error scenarios to test
 * @param gameId - Game identifier to use for all test events
 * @param runnerId - Runner identifier to use for all test events
 *
 * @remarks
 * This helper validates:
 * - Expected errors are thrown for invalid scenarios
 * - Error messages match expected business rule descriptions
 * - Error types are properly categorized as DomainError
 * - All validation scenarios are tested consistently
 *
 * Ensures that the RunnerAdvanced domain event properly enforces
 * softball rules and provides meaningful error feedback.
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const runnerId = PlayerId.generate();
 *
 * runValidationErrorTests(validationErrorScenarios, gameId, runnerId);
 * // Validates all error scenarios throw appropriate exceptions
 * ```
 */
export const runValidationErrorTests = (
  scenarios: ValidationScenario[],
  gameId: GameId,
  runnerId: PlayerId
): void => {
  scenarios.forEach(scenario => {
    expect(
      () => new RunnerAdvanced(gameId, runnerId, scenario.from, scenario.to, scenario.reason)
    ).toThrow(
      expect.objectContaining({
        message: scenario.expectedError,
        name: 'DomainError',
      }) as Error
    );
  });
};
