/**
 * @file RunnerAdvanced Test Helpers
 * Shared test utilities for RunnerAdvanced event testing
 */

import { RunnerAdvanced, AdvanceReason } from '../events/RunnerAdvanced';
import { Base } from '../value-objects/BasesState';
import { GameId } from '../value-objects/GameId';
import { PlayerId } from '../value-objects/PlayerId';

/**
 * Test data interface for runner advancement scenarios
 */
export interface RunnerAdvancementScenario {
  from: Base | null;
  to: Base | 'HOME' | 'OUT';
  reason: AdvanceReason;
  description: string;
}

/**
 * Test data interface for validation scenarios
 */
export interface ValidationScenario {
  from: Base | null;
  to: Base | 'HOME' | 'OUT';
  reason: AdvanceReason;
  expectedError: string;
  description: string;
}

/**
 * Helper function to create RunnerAdvanced events with consistent defaults
 * Note: This helper will use provided IDs or generate new ones if not provided
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
 * Data-driven test scenarios for valid base-to-base advancements
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
 * Data-driven test scenarios for batter advancement (from null)
 */
export const batterAdvancementScenarios: RunnerAdvancementScenario[] = [
  { from: null, to: 'FIRST', reason: AdvanceReason.HIT, description: 'batter to FIRST (single)' },
  { from: null, to: 'SECOND', reason: AdvanceReason.HIT, description: 'batter to SECOND (double)' },
  { from: null, to: 'THIRD', reason: AdvanceReason.HIT, description: 'batter to THIRD (triple)' },
  { from: null, to: 'HOME', reason: AdvanceReason.HIT, description: 'batter to HOME (home run)' },
  { from: null, to: 'FIRST', reason: AdvanceReason.WALK, description: 'batter to FIRST (walk)' },
];

/**
 * Data-driven test scenarios for runners getting out
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
 * Data-driven test scenarios for validation errors
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
 * Data-driven test scenarios for different advance reasons
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
 * Helper to run parameterized event construction tests
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
 * Helper to run parameterized validation error tests
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
