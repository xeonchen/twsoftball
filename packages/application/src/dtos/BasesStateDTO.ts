/**
 * @file BasesStateDTO
 * DTO representing current state of all bases and runners.
 *
 * @remarks
 * This DTO represents the bases state from the InningState aggregate's
 * BasesState value object. It provides a snapshot of which runners are
 * on which bases, along with derived calculations for strategic information.
 *
 * Scoring position in softball refers to runners on second or third base,
 * as these runners can typically score on a single hit. First base is not
 * considered scoring position as the runner needs multiple hits to score.
 *
 * Bases loaded is a special situation where all three bases are occupied,
 * creating maximum pressure and scoring opportunity for the batting team.
 *
 * @example
 * ```typescript
 * // Runner on second base (scoring position)
 * const bases: BasesStateDTO = {
 *   first: null,
 *   second: PlayerId.create(),
 *   third: null,
 *   runnersInScoringPosition: [secondBaseRunner],
 *   basesLoaded: false
 * };
 *
 * // Bases loaded situation
 * const basesLoaded: BasesStateDTO = {
 *   first: runner1,
 *   second: runner2,
 *   third: runner3,
 *   runnersInScoringPosition: [runner2, runner3],
 *   basesLoaded: true
 * };
 * ```
 */

import { PlayerId } from '@twsoftball/domain';

/**
 * DTO representing current state of all bases and runners.
 *
 * @remarks
 * This interface represents the base situation derived from the InningState
 * aggregate's BasesState value object. The derived fields (runnersInScoringPosition,
 * basesLoaded) provide immediate strategic insight without requiring additional
 * calculations by the consumer.
 *
 * Scoring position considerations:
 * - Second base: Runner can score on most hits to the outfield
 * - Third base: Runner can score on sacrifice flies, wild pitches, or passed balls
 * - First base: Not scoring position, requires multiple advances to score
 *
 * The runnersInScoringPosition array contains PlayerId instances of all runners
 * currently on second or third base, providing quick access for strategic decisions.
 */
export interface BasesStateDTO {
  /** Player currently on first base, null if empty */
  readonly first: PlayerId | null;

  /** Player currently on second base, null if empty */
  readonly second: PlayerId | null;

  /** Player currently on third base, null if empty */
  readonly third: PlayerId | null;

  /**
   * All runners currently in scoring position (2nd and 3rd base)
   * Provides quick access to runners who can score on a single hit
   */
  readonly runnersInScoringPosition: PlayerId[];

  /**
   * Whether all three bases are currently occupied
   * Creates maximum scoring pressure and strategic opportunities
   */
  readonly basesLoaded: boolean;
}
