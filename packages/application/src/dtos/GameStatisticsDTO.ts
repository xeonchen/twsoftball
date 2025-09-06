/**
 * @file GameStatisticsDTO
 * DTOs representing comprehensive game statistics and team performance analysis.
 *
 * @remarks
 * These DTOs encapsulate calculated game and team statistics from the
 * domain layer's StatisticsCalculator service. They provide comprehensive
 * metrics for game analysis, reporting, and performance tracking.
 *
 * Game statistics include:
 * - Team-level performance (runs, hits, errors, left on base)
 * - Individual player contributions and achievements
 * - Inning-by-inning breakdowns and significant events
 * - Comparative analysis between teams
 * - Game flow metrics and timing information
 *
 * The structure supports both live game analysis and post-game reporting,
 * with different levels of detail based on the analysis requirements.
 *
 * @example
 * ```typescript
 * const gameStats: GameStatisticsDTO = {
 *   gameId: GameId.create(),
 *   gameStatus: 'COMPLETED',
 *   finalScore: { home: 8, away: 5 },
 *   teamStatistics: {
 *     home: {
 *       runs: 8,
 *       hits: 12,
 *       errors: 1,
 *       leftOnBase: 6,
 *       battingAverage: 0.324
 *     },
 *     away: {
 *       runs: 5,
 *       hits: 9,
 *       errors: 3,
 *       leftOnBase: 8,
 *       battingAverage: 0.243
 *     }
 *   },
 *   playerPerformances: [
 *     {
 *       playerId: PlayerId.create(),
 *       name: 'John Smith',
 *       atBats: 4,
 *       hits: 3,
 *       runs: 2,
 *       rbis: 2,
 *       battingAverage: 0.750
 *     }
 *   ],
 *   significantEvents: [
 *     {
 *       inning: 7,
 *       description: 'Two-run homer by #15',
 *       impact: 'game_tying'
 *     }
 *   ]
 * };
 * ```
 */

import { GameId, GameStatus, PlayerId, JerseyNumber } from '@twsoftball/domain';

/**
 * Comprehensive game statistics including team and player performance.
 *
 * @remarks
 * This DTO provides a complete statistical analysis of a softball game,
 * including team-level metrics, individual player performances, and
 * significant game events. It's designed to support both real-time
 * analysis during games and comprehensive post-game reporting.
 *
 * The statistics include:
 * - Overall game information and final outcomes
 * - Detailed team performance comparisons
 * - Individual player contributions and achievements
 * - Inning-by-inning breakdowns for timeline analysis
 * - Significant events that influenced the game outcome
 * - Performance metrics and calculated statistics
 *
 * This DTO serves as the primary data structure for game analysis,
 * reporting systems, and performance tracking applications.
 */
export interface GameStatisticsDTO {
  /** Unique identifier for the game */
  readonly gameId: GameId;

  /** Current status of the game */
  readonly gameStatus: GameStatus;

  /** Final or current score */
  readonly finalScore: {
    readonly home: number;
    readonly away: number;
  };

  /** When the game was completed (null if still in progress) */
  readonly completedAt: Date | null;

  /** Total game duration in minutes */
  readonly durationMinutes: number | null;

  /** Team names for identification */
  readonly teams: {
    readonly home: string;
    readonly away: string;
  };

  /** Comprehensive team statistics */
  readonly teamStatistics: {
    readonly home: TeamStatisticsDTO;
    readonly away: TeamStatisticsDTO;
  };

  /** Individual player performances in this game */
  readonly playerPerformances: readonly GamePlayerPerformanceDTO[];

  /** Inning-by-inning score breakdown */
  readonly inningScores: readonly InningScoreDTO[];

  /** Significant events and milestones during the game */
  readonly significantEvents: readonly SignificantGameEventDTO[];

  /** Game-level performance metrics */
  readonly gameMetrics: GameMetricsDTO;

  /** When these statistics were calculated */
  readonly calculatedAt: Date;
}

/**
 * Team-level statistics for a single game.
 *
 * @remarks
 * Comprehensive team performance metrics including offensive and
 * defensive statistics. These metrics provide insight into team
 * effectiveness and can be used for comparative analysis.
 */
export interface TeamStatisticsDTO {
  /** Total runs scored */
  readonly runs: number;

  /** Total hits achieved */
  readonly hits: number;

  /** Total errors committed */
  readonly errors: number;

  /** Runners left on base */
  readonly leftOnBase: number;

  /** Team batting average for this game */
  readonly battingAverage: number;

  /** Team on-base percentage */
  readonly onBasePercentage: number;

  /** Team slugging percentage */
  readonly sluggingPercentage: number;

  /** Total strikeouts by team batters */
  readonly strikeouts: number;

  /** Total walks drawn */
  readonly walks: number;

  /** Extra base hits (doubles, triples, home runs) */
  readonly extraBaseHits: number;

  /** Runs batted in total for the team */
  readonly rbis: number;

  /** Two-out RBIs (clutch hitting metric) */
  readonly twoOutRbis: number;

  /** Runners in scoring position batting average */
  readonly rispBattingAverage: number;
}

/**
 * Individual player performance within a specific game.
 *
 * @remarks
 * Detailed batting and fielding statistics for a single player
 * in one game. This provides granular analysis of individual
 * contributions to the team's overall performance.
 */
export interface GamePlayerPerformanceDTO {
  /** Player identifier */
  readonly playerId: PlayerId;

  /** Player name for display */
  readonly name: string;

  /** Jersey number worn during this game */
  readonly jerseyNumber: JerseyNumber;

  /** Primary position played (may have played multiple) */
  readonly primaryPosition: string;

  /** Batting statistics for this game */
  readonly batting: {
    readonly plateAppearances: number;
    readonly atBats: number;
    readonly hits: number;
    readonly singles: number;
    readonly doubles: number;
    readonly triples: number;
    readonly homeRuns: number;
    readonly runs: number;
    readonly rbis: number;
    readonly walks: number;
    readonly strikeouts: number;
    readonly battingAverage: number;
    readonly onBasePercentage: number;
    readonly sluggingPercentage: number;
  };

  /** Fielding statistics for this game (if applicable) */
  readonly fielding: {
    readonly putouts: number;
    readonly assists: number;
    readonly errors: number;
    readonly fieldingPercentage: number;
  } | null;

  /** Notable achievements in this game */
  readonly achievements: readonly string[];
}

/**
 * Score breakdown for a single inning.
 *
 * @remarks
 * Tracks runs scored by each team in each inning, providing
 * a timeline view of game progression and momentum shifts.
 */
export interface InningScoreDTO {
  /** Inning number (1-based) */
  readonly inning: number;

  /** Runs scored by home team in this inning */
  readonly homeRuns: number;

  /** Runs scored by away team in this inning */
  readonly awayRuns: number;

  /** Cumulative score after this inning */
  readonly cumulativeScore: {
    readonly home: number;
    readonly away: number;
  };

  /** Notable events in this inning */
  readonly notableEvents: readonly string[];
}

/**
 * Significant events that occurred during the game.
 *
 * @remarks
 * Captures important moments, milestones, and turning points
 * that influenced the game outcome or represent notable
 * achievements by players.
 */
export interface SignificantGameEventDTO {
  /** Inning when the event occurred */
  readonly inning: number;

  /** Which half of the inning (top/bottom) */
  readonly half: 'top' | 'bottom';

  /** Description of the event */
  readonly description: string;

  /** Impact level of the event */
  readonly impact: 'routine' | 'notable' | 'significant' | 'game_changing' | 'game_winning';

  /** Player(s) involved in the event */
  readonly playersInvolved: readonly {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly role: 'batter' | 'pitcher' | 'fielder' | 'runner';
  }[];

  /** When the event occurred */
  readonly timestamp: Date;
}

/**
 * Overall game performance metrics and analysis.
 *
 * @remarks
 * High-level metrics that provide insights into game quality,
 * competitiveness, and notable characteristics.
 */
export interface GameMetricsDTO {
  /** Total runs scored by both teams */
  readonly totalRuns: number;

  /** Total hits by both teams */
  readonly totalHits: number;

  /** Total errors by both teams */
  readonly totalErrors: number;

  /** Largest lead during the game */
  readonly largestLead: number;

  /** Number of lead changes during the game */
  readonly leadChanges: number;

  /** Number of times the game was tied */
  readonly ties: number;

  /** Whether the game went to extra innings */
  readonly extraInnings: boolean;

  /** Game quality rating (1-10) based on various factors */
  readonly competitivenessRating: number;

  /** Average runs per inning */
  readonly runsPerInning: number;

  /** Time between each inning (performance metric) */
  readonly averageInningDuration: number | null;
}
