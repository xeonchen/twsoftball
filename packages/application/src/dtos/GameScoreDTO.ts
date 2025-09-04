/**
 * @file GameScoreDTO
 * DTO representing current game score with calculated leader and difference.
 *
 * @remarks
 * This DTO encapsulates the score information from the Game aggregate,
 * including derived calculations for the current leader and score difference.
 * These calculations are performed at the domain level and passed through
 * to provide a complete score picture.
 *
 * The leader field indicates which team is currently ahead:
 * - 'HOME': Home team is winning
 * - 'AWAY': Away team is winning
 * - 'TIE': Game is tied
 *
 * The difference field shows the absolute difference in runs between teams.
 * This is always non-negative and represents the margin of victory.
 *
 * @example
 * ```typescript
 * // Home team leading by 2 runs
 * const score: GameScoreDTO = {
 *   home: 5,
 *   away: 3,
 *   leader: 'HOME',
 *   difference: 2
 * };
 *
 * // Tied game
 * const tiedScore: GameScoreDTO = {
 *   home: 4,
 *   away: 4,
 *   leader: 'TIE',
 *   difference: 0
 * };
 * ```
 */

/**
 * DTO representing current game score with calculated fields.
 *
 * @remarks
 * This interface represents the score state derived from the Game aggregate's
 * GameScore value object. The leader and difference fields are calculated
 * fields that provide immediate insight into the competitive state of the game.
 *
 * All scores must be non-negative integers. The difference must always be
 * the absolute difference between home and away scores, ensuring consistency
 * with the leader designation.
 */
export interface GameScoreDTO {
  /** Home team's current run total */
  readonly home: number;

  /** Away team's current run total */
  readonly away: number;

  /**
   * Which team is currently leading or if tied
   * - 'HOME': Home team has more runs
   * - 'AWAY': Away team has more runs
   * - 'TIE': Both teams have equal runs
   */
  readonly leader: 'HOME' | 'AWAY' | 'TIE';

  /**
   * Absolute difference in runs between teams
   * Always non-negative, represents margin of victory
   * 0 when game is tied
   */
  readonly difference: number;
}
