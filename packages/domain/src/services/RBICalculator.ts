import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';
import { BasesState } from '../value-objects/BasesState.js';

/**
 * Domain service responsible for calculating RBIs (Runs Batted In) based on at-bat results and game state.
 *
 * @remarks
 * **RBI Definition**: An RBI is credited to a batter when their action directly causes a run to score.
 * This is one of the most important offensive statistics in softball, measuring a player's ability
 * to drive in runs when opportunities arise.
 *
 * **Core RBI Rules**:
 * - **Home Runs**: Always award RBI for batter plus all baserunners who score
 * - **Sacrifice Flies**: Award RBI only if runner scores from third base
 * - **Base Hits**: Award RBI for each runner who scores as direct result of the hit
 * - **Force Plays**: May still award RBI if runner would score anyway (from third with <2 outs)
 * - **Walks**: Award RBI only when bases loaded and runner forced home
 * - **Errors**: Never award RBI - defensive mistakes don't count as offensive achievement
 * - **Third Out Rule**: No RBI if the out that drives in run is the third out of inning
 *
 * **Scoring Position Context**:
 * - Runners on 2nd/3rd base are in "scoring position" (can score on most base hits)
 * - Runner on 1st typically cannot score on single, so no RBI for single with runner on 1st
 * - Doubles and triples typically score all runners regardless of starting base
 *
 * **Business Context**:
 * RBI calculation affects player statistics, team offensive metrics, and game situation analysis.
 * Critical for determining clutch hitting performance and offensive productivity.
 *
 * @example
 * ```typescript
 * // Home run with bases loaded
 * const basesLoaded = BasesState.empty()
 *   .withRunnerOn('FIRST', runner1)
 *   .withRunnerOn('SECOND', runner2)
 *   .withRunnerOn('THIRD', runner3);
 *
 * const rbis = RBICalculator.calculateRBIs(
 *   AtBatResultType.HOME_RUN,
 *   basesLoaded,
 *   0 // outs before at-bat
 * );
 * console.log(rbis); // 4 (batter + 3 runners)
 *
 * // Sacrifice fly scoring runner from third
 * const runnerOnThird = BasesState.empty().withRunnerOn('THIRD', runner);
 * const sacFlyRBIs = RBICalculator.calculateRBIs(
 *   AtBatResultType.SACRIFICE_FLY,
 *   runnerOnThird,
 *   1 // 1 out before at-bat
 * );
 * console.log(sacFlyRBIs); // 1
 * ```
 */
export class RBICalculator {
  /**
   * Calculates the number of RBIs earned by a batter based on the at-bat result and game state.
   *
   * @remarks
   * This method implements the complete set of softball RBI rules, considering:
   * - The type of at-bat result (hit, walk, out, etc.)
   * - Current baserunner positions before the at-bat
   * - Number of outs before the at-bat (affects whether runs count)
   * - Special cases like sacrifice flies, force plays, and errors
   *
   * **Algorithm Overview**:
   * 1. Validate input parameters (outs must be 0-2)
   * 2. Determine scoring pattern based on at-bat result type
   * 3. Calculate which runners would score given the result
   * 4. Apply third-out rule if applicable
   * 5. Apply special rules (no RBI for errors, etc.)
   * 6. Return total RBI count
   *
   * **Third Out Rule**: If the at-bat result causes the third out of the inning,
   * runs only count if they score before the out is made. For most ground outs
   * and force plays, this prevents RBI credit.
   *
   * @param result - The at-bat result type that determines scoring potential
   * @param basesBeforeAtBat - The base state before the at-bat occurred
   * @param outsBeforeAtBat - Number of outs before the at-bat (0-2)
   * @returns The number of RBIs earned by the batter
   *
   * @throws {DomainError} When outsBeforeAtBat is not between 0 and 2
   *
   * @example
   * ```typescript
   * // Single with runner in scoring position
   * const bases = BasesState.empty()
   *   .withRunnerOn('SECOND', runnerId);
   *
   * const rbis = RBICalculator.calculateRBIs(
   *   AtBatResultType.SINGLE,
   *   bases,
   *   0
   * );
   * console.log(rbis); // 1 - runner scores from second on single
   *
   * // Force out with runner on third and 2 outs
   * const rbisWithTwoOuts = RBICalculator.calculateRBIs(
   *   AtBatResultType.FIELDERS_CHOICE,
   *   BasesState.empty().withRunnerOn('THIRD', runnerId),
   *   2 // Third out ends inning
   * );
   * console.log(rbisWithTwoOuts); // 0 - third out prevents run from scoring
   * ```
   */
  static calculateRBIs(
    result: AtBatResultType,
    basesBeforeAtBat: BasesState,
    outsBeforeAtBat: number
  ): number {
    // Input validation
    if (outsBeforeAtBat < 0 || outsBeforeAtBat > 2) {
      throw new DomainError(`Outs before at-bat must be between 0 and 2, got ${outsBeforeAtBat}`);
    }

    // Get current runners in scoring positions for analysis
    const runnersInScoringPosition = basesBeforeAtBat.getRunnersInScoringPosition();
    const runnerOnFirst = basesBeforeAtBat.getRunner('FIRST');
    const runnerOnSecond = basesBeforeAtBat.getRunner('SECOND');
    const runnerOnThird = basesBeforeAtBat.getRunner('THIRD');

    let rbis = 0;

    switch (result) {
      case AtBatResultType.HOME_RUN:
        // Home run: batter scores plus all runners on base
        rbis = 1 + basesBeforeAtBat.getOccupiedBases().length;
        break;

      case AtBatResultType.SACRIFICE_FLY:
        // Sacrifice fly: only scores runner from third base
        if (runnerOnThird && outsBeforeAtBat < 2) {
          rbis = 1;
        }
        break;

      case AtBatResultType.SINGLE:
        // Single: typically scores runners in scoring position (2nd and 3rd)
        // Runner on first usually doesn't score on single
        rbis = runnersInScoringPosition.length;
        break;

      case AtBatResultType.DOUBLE:
        // Double: scores all runners (they can all advance 2 bases)
        rbis = basesBeforeAtBat.getOccupiedBases().length;
        break;

      case AtBatResultType.TRIPLE:
        // Triple: scores all runners (they can all advance 3+ bases)
        rbis = basesBeforeAtBat.getOccupiedBases().length;
        break;

      case AtBatResultType.WALK:
        // Walk: only scores runs when bases loaded (forces runner from third)
        if (runnerOnFirst && runnerOnSecond && runnerOnThird) {
          rbis = 1; // Forces runner from third home
        }
        break;

      case AtBatResultType.ERROR:
        // Errors never award RBIs - defensive mistake, not offensive achievement
        rbis = 0;
        break;

      case AtBatResultType.FIELDERS_CHOICE:
      case AtBatResultType.GROUND_OUT:
      case AtBatResultType.FLY_OUT:
        // Contact plays: may score runner from third with less than 2 outs
        if (runnerOnThird && outsBeforeAtBat < 2) {
          rbis = 1;
        }
        break;

      case AtBatResultType.DOUBLE_PLAY:
      case AtBatResultType.TRIPLE_PLAY:
        // Multiple out plays: may still score runner from third if not third out
        if (runnerOnThird && outsBeforeAtBat < 2) {
          // Check if the multiple outs would end the inning
          const outsCreated = result === AtBatResultType.DOUBLE_PLAY ? 2 : 3;
          const totalOuts = outsBeforeAtBat + outsCreated;

          if (totalOuts < 3) {
            rbis = 1; // Run scores before third out
          }
          // If totalOuts >= 3, inning ends and run doesn't count
        }
        break;

      case AtBatResultType.STRIKEOUT:
        // Strikeout: no contact, no runs score
        rbis = 0;
        break;

      default:
        rbis = 0;
        break;
    }

    return rbis;
  }
}
