/**
 * @file StartNewGameCommand
 * Command DTO for initiating a new softball game with complete setup information.
 *
 * @remarks
 * This command encapsulates all information needed to create and start a new
 * softball game, including team names, initial lineups, game rules, and
 * scheduling information. It serves as the input for the StartNewGame use case.
 *
 * The command includes comprehensive lineup configuration with batting order,
 * field positions, and player preferences. Game rules can be customized for
 * different league formats and tournament requirements.
 *
 * The "ourTeamSide" designation indicates which team (HOME or AWAY) is the
 * primary team being managed by this application instance. This affects
 * detailed tracking and statistics collection.
 *
 * @example
 * ```typescript
 * const command: StartNewGameCommand = {
 *   gameId: GameId.generate(),
 *   homeTeamName: 'Eagles',
 *   awayTeamName: 'Hawks',
 *   ourTeamSide: 'HOME',
 *   gameDate: new Date('2024-08-30T14:00:00Z'),
 *   location: 'City Park Field 1',
 *   initialLineup: [
 *     {
 *       playerId: PlayerId.generate(),
 *       name: 'John Smith',
 *       jerseyNumber: JerseyNumber.fromNumber(1),
 *       battingOrderPosition: 1,
 *       fieldPosition: FieldPosition.PITCHER,
 *       preferredPositions: [FieldPosition.PITCHER]
 *     }
 *     // ... more players
 *   ],
 *   gameRules: {
 *     mercyRuleEnabled: true,
 *     mercyRuleInning4: 15,
 *     mercyRuleInning5: 10,
 *     timeLimitMinutes: 60,
 *     extraPlayerAllowed: true,
 *     maxPlayersInLineup: 12
 *   }
 * };
 * ```
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';

/**
 * Command to start a new softball game with complete setup information.
 *
 * @remarks
 * This interface defines the contract for starting a new game, including
 * all necessary team information, player lineups, and game configuration.
 * The command supports both standard and customized game rules to accommodate
 * different league requirements.
 *
 * Team side designation (ourTeamSide) determines which team receives detailed
 * tracking and management features. The opposing team is typically tracked
 * with basic scoring information only.
 *
 * All lineup constraints (jersey number uniqueness, batting order sequence,
 * position assignments) should be validated by the use case implementation
 * using domain services.
 */
export interface StartNewGameCommand {
  /** Unique identifier for the game being created */
  readonly gameId: GameId;

  /** Name of the home team */
  readonly homeTeamName: string;

  /** Name of the away team */
  readonly awayTeamName: string;

  /**
   * Which team side this application instance is managing
   * Determines detailed tracking vs basic scoring
   */
  readonly ourTeamSide: 'HOME' | 'AWAY';

  /** Scheduled start date and time for the game */
  readonly gameDate: Date;

  /**
   * Physical location where game is played
   * Optional field for scheduling and record-keeping
   */
  readonly location?: string;

  /**
   * Complete initial lineup for our managed team
   * Must include all starting players with positions and batting order
   */
  readonly initialLineup: LineupPlayerDTO[];

  /**
   * Game rules configuration
   * Optional - defaults to standard league rules if not provided
   */
  readonly gameRules?: GameRulesDTO;
}

/**
 * DTO representing a player in the initial game lineup.
 *
 * @remarks
 * This interface defines player information needed for lineup creation,
 * including identity, batting order, defensive assignment, and position
 * preferences for strategic substitution planning.
 *
 * Batting order positions typically range 1-9 for starters, with positions
 * 10-20 available for extra players/designated hitters in some league formats.
 *
 * Preferred positions help coaches make informed substitution decisions
 * while maintaining defensive effectiveness.
 */
export interface LineupPlayerDTO {
  /** Unique identifier for this player */
  readonly playerId: PlayerId;

  /** Player's display name for roster and scorekeeping */
  readonly name: string;

  /** Player's uniform number (must be unique within team) */
  readonly jerseyNumber: JerseyNumber;

  /**
   * Player's position in batting order (1-20)
   * Determines when player bats during the game
   */
  readonly battingOrderPosition: number;

  /** Initial defensive field position assignment */
  readonly fieldPosition: FieldPosition;

  /**
   * Field positions where this player is most effective
   * Used for strategic substitution and position change decisions
   */
  readonly preferredPositions: FieldPosition[];
}

/**
 * DTO representing configurable game rules for different league formats.
 *
 * @remarks
 * This interface allows customization of game rules to accommodate different
 * league requirements, tournament formats, and local variations. Standard
 * softball rules are used as defaults when specific rules aren't provided.
 *
 * Mercy rule settings help prevent excessively one-sided games while
 * maintaining competitive balance. Time limits ensure games complete
 * within scheduled windows for league play.
 */
export interface GameRulesDTO {
  /** Whether mercy rule is enabled for this game */
  readonly mercyRuleEnabled: boolean;

  /**
   * Run difference required to trigger mercy rule after 4 innings
   * Common values: 15 (recreational), 10 (competitive)
   */
  readonly mercyRuleInning4: number;

  /**
   * Run difference required to trigger mercy rule after 5 innings
   * Common values: 10 (recreational), 7 (competitive)
   */
  readonly mercyRuleInning5: number;

  /**
   * Maximum game duration in minutes
   * Undefined means no time limit (play to completion)
   */
  readonly timeLimitMinutes?: number;

  /** Whether extra player/designated hitter is allowed */
  readonly extraPlayerAllowed: boolean;

  /**
   * Maximum number of players that can be in the lineup
   * Typically 9 (standard) to 20 (with extra players)
   */
  readonly maxPlayersInLineup: number;
}
