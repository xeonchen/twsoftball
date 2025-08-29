/**
 * Enumeration of all possible at-bat result types in slow-pitch softball.
 *
 * @remarks
 * AtBatResultType defines the complete set of outcomes when a batter completes
 * an at-bat. Each result type affects game state differently:
 *
 * **Hits** (count toward batting average):
 * - SINGLE, DOUBLE, TRIPLE, HOME_RUN: Batter reaches base safely via hit
 *
 * **On-Base Results** (not counted as hits):
 * - WALK: Batter reaches first base via 4 balls
 * - ERROR: Batter reaches base due to fielding error
 * - FIELDERS_CHOICE: Batter reaches base but another runner is out
 *
 * **Outs** (batter is retired):
 * - STRIKEOUT: Batter fails to put ball in play
 * - GROUND_OUT/FLY_OUT: Batter makes contact but is retired
 * - DOUBLE_PLAY/TRIPLE_PLAY: Multiple runners retired on single play
 *
 * **Sacrifice** (special scoring rules):
 * - SACRIFICE_FLY: Out that advances runner(s), not counted against batting average
 *
 * @example
 * ```typescript
 * // Recording different at-bat results
 * const hit = AtBatResultType.SINGLE;
 * const walk = AtBatResultType.WALK;
 * const out = AtBatResultType.GROUND_OUT;
 *
 * // Results can be used in switch statements for game logic
 * switch (result) {
 *   case AtBatResultType.HOME_RUN:
 *     // Clear all bases and score all runners
 *     break;
 *   case AtBatResultType.WALK:
 *     // Advance batter to first, force other runners if needed
 *     break;
 * }
 * ```
 */
export enum AtBatResultType {
  /** Batter safely reaches first base via hit (1 base) */
  SINGLE = '1B',
  /** Batter safely reaches second base via hit (2 bases) */
  DOUBLE = '2B',
  /** Batter safely reaches third base via hit (3 bases) */
  TRIPLE = '3B',
  /** Batter circles all bases and scores via hit (4 bases) */
  HOME_RUN = 'HR',

  /** Batter reaches first base via 4 balls (walk/base on balls) */
  WALK = 'BB',
  /** Batter reaches base safely due to defensive error */
  ERROR = 'E',
  /** Batter reaches base but forces out another runner */
  FIELDERS_CHOICE = 'FC',

  /** Batter fails to put ball in play (struck out swinging/looking) */
  STRIKEOUT = 'SO',
  /** Batter makes contact but is retired on ground ball */
  GROUND_OUT = 'GO',
  /** Batter makes contact but is retired on fly ball */
  FLY_OUT = 'FO',
  /** Two runners retired on single play */
  DOUBLE_PLAY = 'DP',
  /** Three runners retired on single play */
  TRIPLE_PLAY = 'TP',

  /** Batter makes out but advances runner(s) - doesn't count against average */
  SACRIFICE_FLY = 'SF',
}
