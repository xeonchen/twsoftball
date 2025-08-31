/**
 * @file RecordAtBatCommand
 * Command DTO for recording an at-bat result with all associated runner movements.
 *
 * @remarks
 * This command captures the complete outcome of a plate appearance, including
 * the batter's result and all resulting base runner movements. It serves as
 * the primary input for the RecordAtBat use case, which updates game state
 * and calculates derived statistics.
 *
 * The command supports all standard softball outcomes (hits, walks, outs) and
 * tracks the movement of every affected base runner. This comprehensive
 * approach enables accurate game state management and statistical calculations.
 *
 * Runner advances are specified explicitly rather than calculated automatically,
 * allowing for unusual plays, errors, and strategic decisions that may deviate
 * from standard advancement patterns.
 *
 * @example
 * ```typescript
 * // RBI double that scores a runner from second base
 * const command: RecordAtBatCommand = {
 *   gameId: GameId.generate(),
 *   batterId: PlayerId.generate(),
 *   result: AtBatResultType.DOUBLE,
 *   runnerAdvances: [
 *     {
 *       playerId: batterId,
 *       fromBase: null, // Batter starts at home
 *       toBase: 'SECOND',
 *       advanceReason: 'HIT'
 *     },
 *     {
 *       playerId: runnerId,
 *       fromBase: 'SECOND',
 *       toBase: 'HOME', // Runner scores
 *       advanceReason: 'HIT'
 *     }
 *   ],
 *   notes: 'Line drive to left-center gap',
 *   timestamp: new Date()
 * };
 * ```
 */

import { GameId, PlayerId, AtBatResultType } from '@twsoftball/domain';
import { RunnerAdvanceDTO } from './RunnerAdvanceDTO';

/**
 * Command to record an at-bat result and all associated base runner movements.
 *
 * @remarks
 * This interface defines the complete information needed to record a plate
 * appearance outcome. It includes the direct result (hit, walk, out, etc.)
 * and the specific movement of every affected runner.
 *
 * The explicit tracking of runner advances allows for accurate handling of:
 * - Standard plays (hits, walks, outs)
 * - Error situations with unusual advancement patterns
 * - Strategic plays (sacrifice flies, intentional advances)
 * - Complex plays (double plays, fielder's choice)
 *
 * Optional fields (notes, timestamp) provide additional context for
 * scorekeeping and game reconstruction purposes.
 */
export interface RecordAtBatCommand {
  /** Game where this at-bat is occurring */
  readonly gameId: GameId;

  /** Player having this at-bat */
  readonly batterId: PlayerId;

  /** The specific outcome of this plate appearance */
  readonly result: AtBatResultType;

  /**
   * All base runner movements resulting from this at-bat
   * Includes the batter and any existing runners who moved
   * Empty array if no runners moved (rare, e.g., strikeout with no base runners)
   */
  readonly runnerAdvances?: RunnerAdvanceDTO[];

  /**
   * Optional descriptive notes about the play
   * Useful for detailed scorekeeping and unusual situations
   */
  readonly notes?: string;

  /**
   * When this at-bat occurred
   * Optional - system can generate if not provided
   */
  readonly timestamp?: Date;
}
