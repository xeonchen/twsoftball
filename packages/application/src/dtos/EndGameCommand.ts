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

import { ValidationError } from '../errors/ValidationError.js';

/**
 * Validation error for EndGameCommand
 */
export class EndGameCommandValidationError extends ValidationError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'EndGameCommandValidationError', field, value);
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, EndGameCommandValidationError.prototype);
  }
}

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

/**
 * Validation functions for EndGameCommand
 */
export const EndGameCommandValidator = {
  /**
   * Validates an EndGameCommand for business rule compliance.
   *
   * @param command - The command to validate
   * @throws {EndGameCommandValidationError} When validation fails
   *
   * @example
   * ```typescript
   * try {
   *   EndGameCommandValidator.validate(command);
   *   // Command is valid, proceed with use case
   * } catch (error) {
   *   // Handle validation error
   * }
   * ```
   */
  validate(command: EndGameCommand): void {
    this.validateBasicFields(command);
    this.validateGameState(command);
    this.validateEndReason(command);
    this.validateScore(command);
    if (command.weatherConditions) {
      this.validateWeatherConditions(command.weatherConditions);
    }
    if (command.forfeitDetails) {
      this.validateForfeitDetails(command.forfeitDetails);
    }
    if (command.ruleReference) {
      this.validateRuleReference(command.ruleReference);
    }
    if (command.notes) {
      this.validateNotes(command.notes);
    }
  },

  /**
   * Validates basic command fields
   */
  validateBasicFields(command: EndGameCommand): void {
    if (!command.gameId) {
      throw new EndGameCommandValidationError('gameId is required');
    }

    if (!command.description?.trim()) {
      throw new EndGameCommandValidationError('description is required and cannot be empty');
    }

    if (command.description.length > 500) {
      throw new EndGameCommandValidationError('description cannot exceed 500 characters');
    }

    if (!(command.endTime instanceof Date) || isNaN(command.endTime.getTime())) {
      throw new EndGameCommandValidationError('endTime must be a valid Date object');
    }

    if (!command.initiatedBy?.trim()) {
      throw new EndGameCommandValidationError('initiatedBy is required and cannot be empty');
    }

    if (command.initiatedBy.length > 50) {
      throw new EndGameCommandValidationError('initiatedBy cannot exceed 50 characters');
    }

    if (typeof command.officialGame !== 'boolean') {
      throw new EndGameCommandValidationError('officialGame must be a boolean');
    }
  },

  /**
   * Validates game state fields
   */
  validateGameState(command: EndGameCommand): void {
    if (!Number.isInteger(command.currentInning) || command.currentInning < 1) {
      throw new EndGameCommandValidationError('currentInning must be a positive integer');
    }

    if (command.currentInning > 20) {
      throw new EndGameCommandValidationError('currentInning cannot exceed 20');
    }

    if (!['top', 'bottom'].includes(command.currentHalf)) {
      throw new EndGameCommandValidationError('currentHalf must be either "top" or "bottom"');
    }

    if (
      !Number.isInteger(command.currentOuts) ||
      command.currentOuts < 0 ||
      command.currentOuts > 3
    ) {
      throw new EndGameCommandValidationError('currentOuts must be an integer between 0 and 3');
    }
  },

  /**
   * Validates end reason
   */
  validateEndReason(command: EndGameCommand): void {
    const validReasons: GameEndReason[] = [
      'mercy_rule',
      'time_limit',
      'weather',
      'forfeit',
      'administrative',
      'mutual_agreement',
      'facility_issue',
      'injury',
      'darkness',
      'curfew',
    ];

    if (!validReasons.includes(command.reason)) {
      throw new EndGameCommandValidationError(`reason must be one of: ${validReasons.join(', ')}`);
    }

    // Business rules for specific end reasons
    if (command.reason === 'forfeit' && !command.forfeitDetails) {
      throw new EndGameCommandValidationError('forfeitDetails is required when reason is forfeit');
    }

    if (command.reason === 'weather' && !command.weatherConditions) {
      throw new EndGameCommandValidationError(
        'weatherConditions is required when reason is weather'
      );
    }

    if (command.reason === 'mercy_rule' && !command.officialGame) {
      throw new EndGameCommandValidationError('mercy rule games should typically be official');
    }
  },

  /**
   * Validates score and winner
   */
  validateScore(command: EndGameCommand): void {
    if (!Number.isInteger(command.finalScore.home) || command.finalScore.home < 0) {
      throw new EndGameCommandValidationError('finalScore.home must be a non-negative integer');
    }

    if (!Number.isInteger(command.finalScore.away) || command.finalScore.away < 0) {
      throw new EndGameCommandValidationError('finalScore.away must be a non-negative integer');
    }

    if (command.finalScore.home > 100 || command.finalScore.away > 100) {
      throw new EndGameCommandValidationError('scores cannot exceed 100 runs');
    }

    // Validate winner consistency with score
    if (command.winner !== null) {
      if (!['home', 'away'].includes(command.winner)) {
        throw new EndGameCommandValidationError('winner must be "home", "away", or null');
      }

      if (command.officialGame) {
        const homeWinning = command.finalScore.home > command.finalScore.away;
        const awayWinning = command.finalScore.away > command.finalScore.home;
        const isTie = command.finalScore.home === command.finalScore.away;

        if (command.winner === 'home' && !homeWinning) {
          throw new EndGameCommandValidationError(
            'winner cannot be "home" if away team has higher score'
          );
        }

        if (command.winner === 'away' && !awayWinning) {
          throw new EndGameCommandValidationError(
            'winner cannot be "away" if home team has higher score'
          );
        }

        if (isTie && command.winner !== null) {
          throw new EndGameCommandValidationError('winner must be null when scores are tied');
        }
      }
    }
  },

  /**
   * Validates weather conditions if provided
   */
  validateWeatherConditions(weather: WeatherConditionsDTO): void {
    const validConditions = [
      'lightning',
      'heavy_rain',
      'hail',
      'high_winds',
      'tornado_warning',
      'extreme_heat',
    ];

    if (!validConditions.includes(weather.condition)) {
      throw new EndGameCommandValidationError(
        `weather.condition must be one of: ${validConditions.join(', ')}`
      );
    }

    if (!weather.description?.trim()) {
      throw new EndGameCommandValidationError(
        'weather.description is required and cannot be empty'
      );
    }

    if (
      weather.temperature !== undefined &&
      (weather.temperature < -50 || weather.temperature > 150)
    ) {
      throw new EndGameCommandValidationError(
        'weather.temperature must be between -50 and 150 degrees'
      );
    }

    if (weather.windSpeed !== undefined && (weather.windSpeed < 0 || weather.windSpeed > 200)) {
      throw new EndGameCommandValidationError('weather.windSpeed must be between 0 and 200 mph');
    }

    if (
      weather.estimatedClearance !== undefined &&
      (weather.estimatedClearance < 0 || weather.estimatedClearance > 1440)
    ) {
      throw new EndGameCommandValidationError(
        'weather.estimatedClearance must be between 0 and 1440 minutes (24 hours)'
      );
    }
  },

  /**
   * Validates forfeit details if provided
   */
  validateForfeitDetails(forfeit: ForfeitDetailsDTO): void {
    if (!['home', 'away'].includes(forfeit.forfeitingTeam)) {
      throw new EndGameCommandValidationError('forfeit.forfeitingTeam must be "home" or "away"');
    }

    const validReasons = [
      'insufficient_players',
      'multiple_ejections',
      'unsportsmanlike_conduct',
      'rule_violations',
      'safety_concerns',
      'other',
    ];

    if (!validReasons.includes(forfeit.forfeitReason)) {
      throw new EndGameCommandValidationError(
        `forfeit.forfeitReason must be one of: ${validReasons.join(', ')}`
      );
    }

    if (!forfeit.details?.trim()) {
      throw new EndGameCommandValidationError('forfeit.details is required and cannot be empty');
    }

    if (forfeit.details.length > 1000) {
      throw new EndGameCommandValidationError('forfeit.details cannot exceed 1000 characters');
    }
  },

  /**
   * Validates rule reference if provided
   */
  validateRuleReference(ruleReference: string): void {
    if (ruleReference.length > 100) {
      throw new EndGameCommandValidationError('ruleReference cannot exceed 100 characters');
    }

    if (!ruleReference.trim()) {
      throw new EndGameCommandValidationError('ruleReference cannot be only whitespace');
    }
  },

  /**
   * Validates notes if provided
   */
  validateNotes(notes: string): void {
    if (notes.length > 1000) {
      throw new EndGameCommandValidationError('notes cannot exceed 1000 characters');
    }

    if (notes.trim().length === 0 && notes.length > 0) {
      throw new EndGameCommandValidationError('notes cannot be only whitespace');
    }
  },
};

/**
 * Factory functions for creating EndGameCommand instances
 */
export const EndGameCommandFactory = {
  /**
   * Creates a mercy rule EndGameCommand
   */
  createMercyRule(
    gameId: GameId,
    currentInning: number,
    currentHalf: 'top' | 'bottom',
    currentOuts: number,
    finalScore: { home: number; away: number },
    initiatedBy: string,
    ruleReference?: string
  ): EndGameCommand {
    const winner = finalScore.home > finalScore.away ? 'home' : 'away';
    const runDifference = Math.abs(finalScore.home - finalScore.away);

    const command: EndGameCommand = {
      gameId,
      reason: 'mercy_rule',
      description: `Mercy rule applied: ${runDifference} run difference after ${currentInning} innings`,
      endTime: new Date(),
      currentInning,
      currentHalf,
      currentOuts,
      finalScore,
      winner,
      officialGame: true,
      initiatedBy,
      ...(ruleReference && { ruleReference }),
    };

    EndGameCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a weather-related EndGameCommand
   */
  createWeatherEnding(
    gameId: GameId,
    currentInning: number,
    currentHalf: 'top' | 'bottom',
    currentOuts: number,
    finalScore: { home: number; away: number },
    weatherConditions: WeatherConditionsDTO,
    initiatedBy: string,
    officialGame: boolean = false,
    resumptionPossible: boolean = true
  ): EndGameCommand {
    const command: EndGameCommand = {
      gameId,
      reason: 'weather',
      description: `Game suspended due to ${weatherConditions.condition}: ${weatherConditions.description}`,
      endTime: new Date(),
      currentInning,
      currentHalf,
      currentOuts,
      finalScore,
      winner:
        officialGame && finalScore.home !== finalScore.away
          ? finalScore.home > finalScore.away
            ? 'home'
            : 'away'
          : null,
      officialGame,
      initiatedBy,
      resumptionPossible,
      weatherConditions,
    };

    EndGameCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a forfeit EndGameCommand
   */
  createForfeit(
    gameId: GameId,
    currentInning: number,
    currentHalf: 'top' | 'bottom',
    currentOuts: number,
    finalScore: { home: number; away: number },
    forfeitDetails: ForfeitDetailsDTO,
    initiatedBy: string,
    ruleReference?: string
  ): EndGameCommand {
    const winner = forfeitDetails.forfeitingTeam === 'home' ? 'away' : 'home';

    const command: EndGameCommand = {
      gameId,
      reason: 'forfeit',
      description: `Game forfeited by ${forfeitDetails.forfeitingTeam} team: ${forfeitDetails.forfeitReason}`,
      endTime: new Date(),
      currentInning,
      currentHalf,
      currentOuts,
      finalScore,
      winner,
      officialGame: true,
      initiatedBy,
      ...(ruleReference && { ruleReference }),
      forfeitDetails,
    };

    EndGameCommandValidator.validate(command);
    return command;
  },

  /**
   * Creates a time limit EndGameCommand
   */
  createTimeLimit(
    gameId: GameId,
    currentInning: number,
    currentHalf: 'top' | 'bottom',
    currentOuts: number,
    finalScore: { home: number; away: number },
    initiatedBy: string,
    timeLimitMinutes: number
  ): EndGameCommand {
    const winner =
      finalScore.home === finalScore.away
        ? null
        : finalScore.home > finalScore.away
          ? 'home'
          : 'away';

    const command: EndGameCommand = {
      gameId,
      reason: 'time_limit',
      description: `Game ended due to ${timeLimitMinutes}-minute time limit`,
      endTime: new Date(),
      currentInning,
      currentHalf,
      currentOuts,
      finalScore,
      winner,
      officialGame: currentInning >= 5, // Games are official after 5 innings
      initiatedBy,
      ruleReference: 'Time Limit Rule',
    };

    EndGameCommandValidator.validate(command);
    return command;
  },
};
