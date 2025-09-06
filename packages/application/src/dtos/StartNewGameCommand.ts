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
 *     maxPlayersInLineup: 12  // 10-player standard, 11-12 players common
 *   }
 * };
 * ```
 */

import { GameId, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';

import { ValidationError } from '../errors/ValidationError';

/**
 * Validation error for StartNewGameCommand
 */
export class StartNewGameCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'StartNewGameCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, StartNewGameCommandValidationError.prototype);
  }
}

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
 * Batting order positions typically range 1-10 for the 10-player standard lineup,
 * with positions 11-12 commonly used for extra players (EP) in 11-12 player games,
 * and up to 20 available for larger lineups in some league formats.
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
   * 10 players (standard), 11-12 players (common with EPs), up to 20 (extended lineups)
   */
  readonly maxPlayersInLineup: number;
}

/**
 * Validation functions for StartNewGameCommand
 */
export const StartNewGameCommandValidator = {
  /**
   * Validates a StartNewGameCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {StartNewGameCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   StartNewGameCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: StartNewGameCommand): void {
    this.validateBasicFields(command);
    this.validateLineup(command.initialLineup);
    if (command.gameRules) {
      this.validateGameRules(command.gameRules);
    }
  },

  /**
   * Validates basic command fields (team names, dates, etc.)
   */
  validateBasicFields(command: StartNewGameCommand): void {
    if (!command.homeTeamName?.trim()) {
      throw new StartNewGameCommandValidationError(
        'Home team name is required and cannot be empty',
        'homeTeamName',
        command.homeTeamName
      );
    }

    if (!command.awayTeamName?.trim()) {
      throw new StartNewGameCommandValidationError(
        'Away team name is required and cannot be empty'
      );
    }

    if (command.homeTeamName === command.awayTeamName) {
      throw new StartNewGameCommandValidationError('Home and away team names must be different');
    }

    if (command.ourTeamSide !== 'HOME' && command.ourTeamSide !== 'AWAY') {
      throw new StartNewGameCommandValidationError('Our team side must be either HOME or AWAY');
    }

    if (!(command.gameDate instanceof Date) || isNaN(command.gameDate.getTime())) {
      throw new StartNewGameCommandValidationError(
        'Game date must be a valid Date object',
        'gameDate',
        command.gameDate
      );
    }

    // Optional location validation - if provided, must not be empty
    if (command.location !== undefined && !command.location.trim()) {
      throw new StartNewGameCommandValidationError('Location cannot be empty if provided');
    }
  },

  /**
   * Validates the initial lineup for completeness and business rules
   */
  validateLineup(lineup: LineupPlayerDTO[]): void {
    if (!Array.isArray(lineup)) {
      throw new StartNewGameCommandValidationError('Initial lineup must be an array');
    }

    if (lineup.length < 9) {
      throw new StartNewGameCommandValidationError(
        'Initial lineup must have at least 9 players (10-player standard lineup recommended)'
      );
    }

    if (lineup.length > 20) {
      throw new StartNewGameCommandValidationError('Initial lineup cannot exceed 20 players');
    }

    // Validate each player
    lineup.forEach((player, index) => {
      this.validateLineupPlayer(player, index);
    });

    // Check for uniqueness constraints
    this.validateUniqueConstraints(lineup);

    // Validate batting order sequence
    this.validateBattingOrder(lineup);
  },

  /**
   * Validates individual lineup player data
   */
  validateLineupPlayer(player: LineupPlayerDTO, index: number): void {
    if (!player.playerId) {
      throw new StartNewGameCommandValidationError(
        `Player at index ${index}: playerId is required`
      );
    }

    if (!player.name?.trim()) {
      throw new StartNewGameCommandValidationError(
        `Player at index ${index}: name is required and cannot be empty`
      );
    }

    if (!player.jerseyNumber) {
      throw new StartNewGameCommandValidationError(
        `Player at index ${index}: jerseyNumber is required`
      );
    }

    if (player.battingOrderPosition < 1 || player.battingOrderPosition > 20) {
      throw new StartNewGameCommandValidationError(
        `Player at index ${index}: battingOrderPosition must be between 1 and 20`,
        `initialLineup[${index}].battingOrderPosition`,
        player.battingOrderPosition
      );
    }

    if (!Object.values(FieldPosition).includes(player.fieldPosition)) {
      throw new StartNewGameCommandValidationError(
        `Player at index ${index}: invalid fieldPosition`,
        `initialLineup[${index}].fieldPosition`,
        player.fieldPosition
      );
    }

    if (!Array.isArray(player.preferredPositions)) {
      throw new StartNewGameCommandValidationError(
        `Player at index ${index}: preferredPositions must be an array`
      );
    }

    // Validate preferred positions are valid field positions
    player.preferredPositions.forEach(position => {
      if (!Object.values(FieldPosition).includes(position)) {
        throw new StartNewGameCommandValidationError(
          `Player at index ${index}: invalid preferred position ${position}`
        );
      }
    });
  },

  /**
   * Validates uniqueness constraints across the lineup
   */
  validateUniqueConstraints(lineup: LineupPlayerDTO[]): void {
    // Check unique player IDs
    const playerIds = lineup.map(p => p.playerId.value);
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== playerIds.length) {
      throw new StartNewGameCommandValidationError(
        'All players must have unique player IDs',
        'initialLineup',
        playerIds
      );
    }

    // Check unique jersey numbers
    const jerseyNumbers = lineup.map(p => p.jerseyNumber.value);
    const uniqueJerseyNumbers = new Set(jerseyNumbers);
    if (uniqueJerseyNumbers.size !== jerseyNumbers.length) {
      throw new StartNewGameCommandValidationError(
        'All players must have unique jersey numbers',
        'initialLineup',
        jerseyNumbers
      );
    }

    // Check unique batting order positions
    const battingPositions = lineup.map(p => p.battingOrderPosition);
    const uniqueBattingPositions = new Set(battingPositions);
    if (uniqueBattingPositions.size !== battingPositions.length) {
      throw new StartNewGameCommandValidationError(
        'All players must have unique batting order positions'
      );
    }
  },

  /**
   * Validates batting order sequence requirements
   */
  validateBattingOrder(lineup: LineupPlayerDTO[]): void {
    const sortedPositions = lineup.map(p => p.battingOrderPosition).sort((a, b) => a - b);

    // Check for consecutive sequence starting at 1
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i] !== i + 1) {
        throw new StartNewGameCommandValidationError(
          `Batting order must be consecutive starting from 1. Missing position ${i + 1}`
        );
      }
    }
  },

  /**
   * Validates game rules configuration
   */
  validateGameRules(rules: GameRulesDTO): void {
    if (typeof rules.mercyRuleEnabled !== 'boolean') {
      throw new StartNewGameCommandValidationError('mercyRuleEnabled must be a boolean');
    }

    if (rules.mercyRuleEnabled) {
      if (rules.mercyRuleInning4 < 0 || rules.mercyRuleInning4 > 50) {
        throw new StartNewGameCommandValidationError('mercyRuleInning4 must be between 0 and 50');
      }

      if (rules.mercyRuleInning5 < 0 || rules.mercyRuleInning5 > 50) {
        throw new StartNewGameCommandValidationError('mercyRuleInning5 must be between 0 and 50');
      }

      // Business rule: inning 5 mercy should be less than or equal to inning 4
      if (rules.mercyRuleInning5 > rules.mercyRuleInning4) {
        throw new StartNewGameCommandValidationError(
          'mercyRuleInning5 cannot be greater than mercyRuleInning4'
        );
      }
    }

    if (rules.timeLimitMinutes !== undefined) {
      if (rules.timeLimitMinutes <= 0 || rules.timeLimitMinutes > 300) {
        throw new StartNewGameCommandValidationError('timeLimitMinutes must be between 1 and 300');
      }
    }

    if (typeof rules.extraPlayerAllowed !== 'boolean') {
      throw new StartNewGameCommandValidationError('extraPlayerAllowed must be a boolean');
    }

    if (rules.maxPlayersInLineup < 9 || rules.maxPlayersInLineup > 20) {
      throw new StartNewGameCommandValidationError(
        'maxPlayersInLineup must be between 9 and 20 (10-player standard, 11-12 common)',
        'maxPlayersInLineup',
        rules.maxPlayersInLineup
      );
    }
  },
};

/**
 * Factory functions for creating StartNewGameCommand instances
 */
export const StartNewGameCommandFactory = {
  /**
   * Creates a StartNewGameCommand with default game rules
   */
  createWithDefaults(
    gameId: GameId,
    homeTeamName: string,
    awayTeamName: string,
    ourTeamSide: 'HOME' | 'AWAY',
    gameDate: Date,
    initialLineup: LineupPlayerDTO[],
    location?: string
  ): StartNewGameCommand {
    const command: StartNewGameCommand = {
      gameId,
      homeTeamName,
      awayTeamName,
      ourTeamSide,
      gameDate,
      ...(location !== undefined && { location }),
      initialLineup,
      gameRules: this.getDefaultGameRules(),
    };

    StartNewGameCommandValidator.validate(command);
    return command;
  },

  /**
   * Gets default game rules for 10-player standard league play
   */
  getDefaultGameRules(): GameRulesDTO {
    return {
      mercyRuleEnabled: true,
      mercyRuleInning4: 15,
      mercyRuleInning5: 10,
      extraPlayerAllowed: true,
      maxPlayersInLineup: 12,
    };
  },

  /**
   * Creates game rules for 9-player tournament play (stricter mercy rules, less common format)
   */
  getTournamentGameRules(): GameRulesDTO {
    return {
      mercyRuleEnabled: true,
      mercyRuleInning4: 12,
      mercyRuleInning5: 7,
      timeLimitMinutes: 75,
      extraPlayerAllowed: false,
      maxPlayersInLineup: 9,
    };
  },
};
