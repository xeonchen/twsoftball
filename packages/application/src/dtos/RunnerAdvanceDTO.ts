/**
 * @file RunnerAdvanceDTO
 * Data Transfer Object for runner movement during an at-bat.
 *
 * @remarks
 * RunnerAdvanceDTO represents how a baserunner moved as a result of
 * a batting play. It captures the complete state transition for each
 * runner, including the batter who becomes a runner.
 *
 * **Movement Types**:
 * - Normal advances: Runner moves to next base(s)
 * - Scored runs: Runner reaches HOME
 * - Put outs: Runner is tagged or forced OUT
 * - Multiple bases: Runner advances more than one base
 *
 * **Critical for Statistics**:
 * - RBI calculations depend on runs scored via this movement
 * - Error attribution requires knowing which advances were earned
 * - Stolen base tracking uses advance reasons
 *
 * **Usage Patterns**:
 * - Commands use this to specify intended runner movement
 * - Results use this to report actual runner movement that occurred
 * - Event sourcing preserves complete movement history
 *
 * @example
 * ```typescript
 * // Batter hits single, advances runner from second to home
 * const advances: RunnerAdvanceDTO[] = [
 *   {
 *     playerId: runnerOnSecondId,
 *     fromBase: 'SECOND',
 *     toBase: 'HOME',
 *     reason: 'BATTED_BALL'
 *   },
 *   {
 *     playerId: batterId,
 *     fromBase: null, // Batter starts at home plate
 *     toBase: 'FIRST',
 *     reason: 'BATTED_BALL'
 *   }
 * ];
 * ```
 */

import { PlayerId } from '@twsoftball/domain';

/**
 * Data Transfer Object representing a single runner's movement during a play.
 *
 * @remarks
 * This DTO captures the complete state transition for one baserunner,
 * including where they started, where they ended up, and why they moved.
 *
 * **Base Representation**:
 * - fromBase: 'FIRST', 'SECOND', 'THIRD' for runners already on base
 * - fromBase: null for the batter (who conceptually starts at home plate)
 * - toBase: 'FIRST', 'SECOND', 'THIRD', 'HOME' for successful advances
 * - toBase: 'OUT' for runners who are put out during the play
 *
 * **Advance Reasons**:
 * - BATTED_BALL: Movement caused by the batter putting ball in play
 * - WALK: Movement due to batter drawing a walk (forces runners)
 * - ERROR: Movement caused by defensive error
 * - STOLEN_BASE: Movement due to successful steal attempt
 * - WILD_PITCH: Movement caused by wild pitch or passed ball
 *
 * Advance reasons are critical for proper statistical attribution and
 * help distinguish between earned and unearned runs for pitching stats.
 */
export interface RunnerAdvanceDTO {
  /** Player who moved during this play */
  readonly playerId: PlayerId;

  /**
   * Base the runner started from before the play
   * null indicates the batter (who starts at home plate conceptually)
   */
  readonly fromBase: 'FIRST' | 'SECOND' | 'THIRD' | null;

  /**
   * Where the runner ended up after the play
   * 'HOME' indicates the runner scored a run
   * 'OUT' indicates the runner was put out during the play
   */
  readonly toBase: 'FIRST' | 'SECOND' | 'THIRD' | 'HOME' | 'OUT';

  /**
   * Why this runner moved (for statistical attribution)
   * Helps distinguish between earned movement (hits) vs unearned (errors)
   */
  readonly advanceReason: string;
}
