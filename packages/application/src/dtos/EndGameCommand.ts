/**
 * @file EndGameCommand
 * Command DTO for ending a softball game before its natural completion.
 *
 * @remarks
 * This command encapsulates all information needed to end a game early
 * due to various circumstances such as weather delays, time limits,
 * forfeit conditions, mercy rule applications, or administrative decisions.
 * It serves as the input for the EndGame use case, which handles proper
 * game conclusion with appropriate state transitions and notifications.
 *
 * Game ending scenarios include:
 * - **Mercy Rule**: Large score differential triggers early end
 * - **Time Limit**: Game reaches maximum allowed duration
 * - **Weather**: Unsafe conditions prevent continuation
 * - **Forfeit**: Team inability to continue or rule violations
 * - **Administrative**: Official decision to end game
 * - **Agreement**: Mutual agreement between teams
 *
 * The command ensures proper game closure with final statistics
 * calculation, event generation, and state persistence.
 *
 * @example
 * ```typescript
 * // Mercy rule application
 * const mercyRuleCommand: EndGameCommand = {
 *   gameId: GameId.create(),
 *   reason: 'mercy_rule',
 *   description: 'Home team leads by 15 runs after 5 complete innings',
 *   endTime: new Date(),
 *   currentInning: 5,
 *   currentHalf: 'bottom',
 *   currentOuts: 1,
 *   finalScore: { home: 18, away: 3 },
 *   winner: 'home',
 *   officialGame: true,
 *   initiatedBy: 'umpire',
 *   ruleReference: 'Rule 4.10(c) - Mercy Rule'
 * };
 *
 * // Weather cancellation
 * const weatherCommand: EndGameCommand = {
 *   gameId: GameId.create(),
 *   reason: 'weather',
 *   description: 'Game suspended due to lightning in the area',
 *   endTime: new Date(),
 *   currentInning: 3,
 *   currentHalf: 'top',
 *   currentOuts: 2,
 *   finalScore: { home: 2, away: 4 },
 *   winner: null, // Game not official
 *   officialGame: false,
 *   initiatedBy: 'umpire',
 *   resumptionPossible: true
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

/**
 * Command to end a softball game before natural completion.
 *
 * @remarks
 * This command provides all necessary information to properly conclude
 * a softball game that ends before reaching its natural completion through
 * regulation play. It handles various ending scenarios while ensuring
 * proper game state management and statistical integrity.
 *
 * The command supports different ending reasons, each with specific
 * business rules and implications:
 *
 * **Mercy Rule**: Applied when score differential exceeds thresholds
 * **Time Limit**: Game reaches maximum allowed duration
 * **Weather**: Unsafe conditions prevent safe continuation
 * **Forfeit**: Team cannot continue due to ejections, injuries, or violations
 * **Administrative**: Official decision for various reasons
 * **Agreement**: Teams mutually agree to end the game
 *
 * The command ensures that:
 * - Game state is properly transitioned to completed
 * - Final statistics are calculated and recorded
 * - Appropriate domain events are generated
 * - Official game status is determined correctly
 * - Notifications are sent to relevant parties
 */
export interface EndGameCommand {
  /** Unique identifier for the game to end */
  readonly gameId: GameId;

  /** Primary reason for ending the game early */
  readonly reason: GameEndReason;

  /** Detailed description of why the game is being ended */
  readonly description: string;

  /** When the game is being officially ended */
  readonly endTime: Date;

  /** Current inning when the game is being ended */
  readonly currentInning: number;

  /** Current half of the inning (top/bottom) */
  readonly currentHalf: 'top' | 'bottom';

  /** Current number of outs in the half-inning */
  readonly currentOuts: number;

  /** Score at the time of game ending */
  readonly finalScore: {
    readonly home: number;
    readonly away: number;
  };

  /** Winner of the game (null if game is not official) */
  readonly winner: 'home' | 'away' | null;

  /** Whether this counts as an official game */
  readonly officialGame: boolean;

  /** Who initiated the game ending decision */
  readonly initiatedBy: string;

  /** Reference to specific rule or regulation (if applicable) */
  readonly ruleReference?: string;

  /** Whether the game could potentially be resumed later */
  readonly resumptionPossible?: boolean;

  /** Additional context or notes about the game ending */
  readonly notes?: string;

  /** Contact information for resumption coordination (if applicable) */
  readonly resumptionContact?: string;

  /** Weather conditions at time of ending (if weather-related) */
  readonly weatherConditions?: WeatherConditionsDTO;

  /** Forfeit details (if forfeit-related) */
  readonly forfeitDetails?: ForfeitDetailsDTO;
}

/**
 * Reasons why a game might be ended early.
 *
 * @remarks
 * Standardized set of reasons for game endings, each with specific
 * business rules and implications for game officiality and statistics.
 *
 * **mercy_rule**: Score differential exceeds league thresholds
 * **time_limit**: Game reaches maximum allowed duration
 * **weather**: Unsafe weather conditions (lightning, severe storms)
 * **forfeit**: Team cannot continue (insufficient players, ejections)
 * **administrative**: Official decision for various administrative reasons
 * **mutual_agreement**: Both teams agree to end the game
 * **facility_issue**: Field or facility problems prevent continuation
 * **injury**: Serious injury prevents safe continuation
 * **darkness**: Insufficient lighting for safe play
 * **curfew**: Local ordinances require game cessation
 */
export type GameEndReason =
  | 'mercy_rule'
  | 'time_limit'
  | 'weather'
  | 'forfeit'
  | 'administrative'
  | 'mutual_agreement'
  | 'facility_issue'
  | 'injury'
  | 'darkness'
  | 'curfew';

/**
 * Weather conditions information for weather-related game endings.
 *
 * @remarks
 * Detailed weather information when games are ended due to
 * weather conditions, used for documentation and potential
 * resumption planning.
 */
export interface WeatherConditionsDTO {
  /** Primary weather condition causing the game end */
  readonly condition:
    | 'lightning'
    | 'heavy_rain'
    | 'hail'
    | 'high_winds'
    | 'tornado_warning'
    | 'extreme_heat';

  /** Temperature at time of game end */
  readonly temperature?: number;

  /** Wind speed in mph */
  readonly windSpeed?: number;

  /** Description of conditions */
  readonly description: string;

  /** Whether conditions are expected to improve */
  readonly expectedImprovement?: boolean;

  /** Estimated time until safe conditions return */
  readonly estimatedClearance?: number; // minutes
}

/**
 * Forfeit-specific details when a game ends due to forfeit.
 *
 * @remarks
 * Additional information about forfeit situations, including
 * the reason, responsible party, and any relevant context
 * for official records and dispute resolution.
 */
export interface ForfeitDetailsDTO {
  /** Team that forfeited the game */
  readonly forfeitingTeam: 'home' | 'away';

  /** Specific reason for the forfeit */
  readonly forfeitReason:
    | 'insufficient_players'
    | 'multiple_ejections'
    | 'unsportsmanlike_conduct'
    | 'rule_violations'
    | 'safety_concerns'
    | 'other';

  /** Detailed description of the forfeit situation */
  readonly details: string;

  /** Players involved (if specific players caused forfeit) */
  readonly playersInvolved?: readonly string[];

  /** Whether an appeal is being filed */
  readonly appealPending?: boolean;

  /** League official overseeing the forfeit decision */
  readonly official?: string;
}
