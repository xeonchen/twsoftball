/**
 * @file PlayerStatisticsDTO
 * DTOs representing player batting and fielding statistics.
 *
 * @remarks
 * These DTOs encapsulate calculated player performance statistics from the
 * domain layer's StatisticsCalculator service. They provide comprehensive
 * batting and fielding metrics that are commonly used in softball analysis.
 *
 * Batting statistics follow standard baseball/softball conventions:
 * - Batting Average = Hits / At-Bats
 * - On-Base Percentage = (Hits + Walks) / Plate Appearances
 * - Slugging Percentage = Total Bases / At-Bats
 *
 * Fielding statistics track defensive performance:
 * - Fielding Percentage = (Putouts + Assists) / (Putouts + Assists + Errors)
 * - Putouts: Getting an opposing player out directly
 * - Assists: Helping get an opposing player out
 * - Errors: Defensive mistakes that allow runners to advance
 *
 * @example
 * ```typescript
 * const playerStats: PlayerStatisticsDTO = {
 *   playerId: PlayerId.create(),
 *   name: 'John Smith',
 *   jerseyNumber: JerseyNumber.create(15),
 *   plateAppearances: 12,
 *   atBats: 10,
 *   hits: 7,
 *   singles: 4,
 *   doubles: 2,
 *   triples: 1,
 *   homeRuns: 0,
 *   walks: 2,
 *   strikeouts: 3,
 *   rbi: 5,
 *   runs: 4,
 *   battingAverage: 0.700, // 7/10
 *   onBasePercentage: 0.750, // (7+2)/12
 *   sluggingPercentage: 1.200, // (4+4+3+0)/10
 *   fielding: fieldingStats
 * };
 * ```
 */

import { PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';

/**
 * DTO representing comprehensive player batting and fielding statistics.
 *
 * @remarks
 * This interface combines all relevant player performance metrics for
 * statistical analysis and reporting. The statistics are calculated by
 * the domain layer's StatisticsCalculator service and represent current
 * game totals or season aggregates.
 *
 * Key statistical relationships:
 * - Plate Appearances ≥ At-Bats (walks don't count as at-bats)
 * - Hits ≤ At-Bats (can't get more hits than at-bats)
 * - Singles + Doubles + Triples + Home Runs = Hits
 * - On-Base Percentage ≥ Batting Average (walks increase OBP)
 *
 * All percentage statistics are expressed as decimals (0.300 = 30%).
 */
export interface PlayerStatisticsDTO {
  /** Unique identifier for this player */
  readonly playerId: PlayerId;

  /** Player's display name for statistics reporting */
  readonly name: string;

  /** Player's uniform number */
  readonly jerseyNumber: JerseyNumber;

  // Raw counting statistics
  /** Total number of plate appearances (includes walks, hits, outs) */
  readonly plateAppearances: number;

  /** Total at-bats (plate appearances minus walks and other non-at-bat outcomes) */
  readonly atBats: number;

  /** Total hits of all types */
  readonly hits: number;

  /** Single-base hits */
  readonly singles: number;

  /** Two-base hits (doubles) */
  readonly doubles: number;

  /** Three-base hits (triples) */
  readonly triples: number;

  /** Four-base hits (home runs) */
  readonly homeRuns: number;

  /** Base on balls (walks) */
  readonly walks: number;

  /** Strikeouts */
  readonly strikeouts: number;

  /** Runs batted in */
  readonly rbi: number;

  /** Runs scored */
  readonly runs: number;

  // Calculated percentage statistics
  /**
   * Batting average: hits per at-bat
   * Expressed as decimal (0.300 = .300 batting average)
   */
  readonly battingAverage: number;

  /**
   * On-base percentage: rate of reaching base safely
   * (Hits + Walks) / Plate Appearances
   */
  readonly onBasePercentage: number;

  /**
   * Slugging percentage: total bases per at-bat
   * Measures power hitting ability
   */
  readonly sluggingPercentage: number;

  /** Comprehensive fielding statistics */
  readonly fielding: FieldingStatisticsDTO;
}

/**
 * DTO representing player fielding/defensive statistics.
 *
 * @remarks
 * This interface tracks defensive performance across all positions a player
 * has played. Fielding statistics are cumulative across all games and
 * positions for the specified time period.
 *
 * Defensive plays classification:
 * - Putout: Directly getting an opponent out (catching fly ball, tagging runner)
 * - Assist: Helping get an opponent out (throwing to first base for groundout)
 * - Error: Defensive mistake that allows runner to advance or reach base safely
 *
 * Fielding percentage is the primary defensive metric, calculated as:
 * (Putouts + Assists) / (Putouts + Assists + Errors)
 *
 * A fielding percentage of 1.000 (perfect) means no errors were committed.
 */
export interface FieldingStatisticsDTO {
  /**
   * All field positions played by this player
   * Used to understand defensive versatility
   */
  readonly positions: FieldPosition[];

  /**
   * Number of putouts recorded
   * Direct outs made by this player (catches, tags, force outs)
   */
  readonly putouts: number;

  /**
   * Number of assists recorded
   * Helping other players make outs (throws, relays)
   */
  readonly assists: number;

  /**
   * Number of errors committed
   * Defensive mistakes that should have been successful plays
   */
  readonly errors: number;

  /**
   * Fielding percentage: successful defensive plays rate
   * (Putouts + Assists) / (Putouts + Assists + Errors)
   * Expressed as decimal (0.950 = 95.0% success rate)
   */
  readonly fieldingPercentage: number;
}
