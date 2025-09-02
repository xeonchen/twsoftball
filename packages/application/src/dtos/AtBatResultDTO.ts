/**
 * @file AtBatResultDTO
 * DTO representing an individual at-bat result with context and runner movements.
 *
 * @remarks
 * This DTO captures the complete outcome of a single plate appearance,
 * including the batter's result, any runs batted in, and all resulting
 * base runner movements. It serves as the atomic unit for recording
 * game events and calculating statistics.
 *
 * The DTO combines the at-bat result (hit, walk, out, etc.) with its
 * broader impact on the game state (runner advances, scoring plays).
 * This enables comprehensive event sourcing and accurate statistical
 * calculations.
 *
 * Runner advances are tracked for all players affected by the at-bat:
 * - The batter (fromBase: null indicates batter)
 * - Existing base runners who advance or are forced out
 * - All movements are recorded for complete game reconstruction
 *
 * @example
 * ```typescript
 * // RBI double that scores a runner from second
 * const atBatResult: AtBatResultDTO = {
 *   batterId: PlayerId.create(),
 *   result: AtBatResultType.DOUBLE,
 *   inning: 3,
 *   rbi: 1,
 *   runnerAdvances: [
 *     {
 *       playerId: batterId,
 *       fromBase: null, // Batter
 *       toBase: 'SECOND',
 *       advanceReason: 'HIT'
 *     },
 *     {
 *       playerId: runnerId,
 *       fromBase: 'SECOND',
 *       toBase: 'HOME',
 *       advanceReason: 'HIT'
 *     }
 *   ],
 *   timestamp: new Date()
 * };
 * ```
 */

import { PlayerId, AtBatResultType } from '@twsoftball/domain';

import { RunnerAdvanceDTO } from './RunnerAdvanceDTO';

/**
 * DTO representing an individual at-bat result with complete context.
 *
 * @remarks
 * This interface captures all information needed to understand the complete
 * impact of a single plate appearance. It includes the direct result (hit,
 * walk, out) and all secondary effects (runner advances, scoring).
 *
 * The RBI calculation follows standard softball rules:
 * - Runs scored due to hits, walks with bases loaded, sacrifice flies
 * - Does not include runs scored on errors or fielder's choice
 * - Includes the batter if they hit a home run
 *
 * Timing information enables proper event ordering and game reconstruction.
 */
export interface AtBatResultDTO {
  /** Player who had this at-bat */
  readonly batterId: PlayerId;

  /** The specific outcome of this plate appearance */
  readonly result: AtBatResultType;

  /** Inning number when this at-bat occurred (1-based) */
  readonly inning: number;

  /**
   * Runs batted in by this at-bat
   * Calculated according to official softball RBI rules
   */
  readonly rbi: number;

  /**
   * All base runner movements resulting from this at-bat
   * Includes the batter and any existing runners who moved
   */
  readonly runnerAdvances: RunnerAdvanceDTO[];

  /** Exact time when this at-bat was completed */
  readonly timestamp: Date;
}
