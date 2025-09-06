/**
 * @file Command Factories
 * Factory functions for creating command DTOs used in tests, reducing duplication.
 *
 * @remarks
 * This module provides factory functions for creating command objects with sensible
 * defaults and customizable properties. It helps reduce test code duplication by
 * centralizing command creation patterns and providing preset configurations for
 * common test scenarios.
 */

import {
  GameId,
  PlayerId,
  TeamLineupId,
  JerseyNumber,
  FieldPosition,
  AtBatResultType,
} from '@twsoftball/domain';

import { CompleteAtBatSequenceCommand } from '../dtos/CompleteAtBatSequenceCommand';
import { CompleteGameWorkflowCommand } from '../dtos/CompleteGameWorkflowCommand';
import {
  EndGameCommand,
  GameEndReason,
  WeatherConditionsDTO,
  ForfeitDetailsDTO,
} from '../dtos/EndGameCommand';
import { EndInningCommand } from '../dtos/EndInningCommand';
import { RecordAtBatCommand } from '../dtos/RecordAtBatCommand';
import { StartNewGameCommand } from '../dtos/StartNewGameCommand';
import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand';

/**
 * Creates an EndGameCommand with preset configurations for different scenarios.
 */
export const createEndGameCommand = {
  /**
   * Creates a mercy rule end game command with default values.
   */
  mercyRule: (overrides: Partial<EndGameCommand> = {}): EndGameCommand => ({
    gameId: GameId.generate(),
    reason: 'mercy_rule' as GameEndReason,
    description: 'Home team leads by 15 runs after 5 complete innings',
    endTime: new Date('2024-06-15T20:30:00Z'),
    currentInning: 5,
    currentHalf: 'bottom',
    currentOuts: 1,
    finalScore: { home: 18, away: 3 },
    winner: 'home',
    officialGame: true,
    initiatedBy: 'umpire',
    ruleReference: 'Rule 4.10(c) - Mercy Rule',
    ...overrides,
  }),

  /**
   * Creates a weather cancellation end game command with default values.
   */
  weather: (overrides: Partial<EndGameCommand> = {}): EndGameCommand => ({
    gameId: GameId.generate(),
    reason: 'weather' as GameEndReason,
    description: 'Game cancelled due to severe thunderstorm',
    endTime: new Date('2024-06-15T19:45:00Z'),
    currentInning: 3,
    currentHalf: 'top',
    currentOuts: 2,
    finalScore: { home: 2, away: 1 },
    winner: null,
    officialGame: false,
    initiatedBy: 'umpire',
    weatherConditions: {
      condition: 'tornado_warning',
      description: 'Severe thunderstorm with tornado warning issued for area',
      temperature: 72,
      windSpeed: 25,
      expectedImprovement: false,
      estimatedClearance: 120,
    } as WeatherConditionsDTO,
    ...overrides,
  }),

  /**
   * Creates a forfeit end game command with default values.
   */
  forfeit: (overrides: Partial<EndGameCommand> = {}): EndGameCommand => ({
    gameId: GameId.generate(),
    reason: 'forfeit' as GameEndReason,
    description: 'Away team forfeited due to insufficient players',
    endTime: new Date('2024-06-15T19:15:00Z'),
    currentInning: 4,
    currentHalf: 'bottom',
    currentOuts: 0,
    finalScore: { home: 7, away: 0 },
    winner: 'home',
    officialGame: true,
    initiatedBy: 'umpire',
    forfeitDetails: {
      forfeitingTeam: 'away',
      forfeitReason: 'insufficient_players',
      details: 'Two players injured, one ejected - only 7 players available vs 8 minimum required',
      playersInvolved: ['player-1', 'player-2'],
      appealPending: false,
      official: 'umpire-123',
    } as ForfeitDetailsDTO,
    ruleReference: 'Rule 4.15 - Forfeited Games',
    ...overrides,
  }),

  /**
   * Creates a regulation completion end game command with default values.
   */
  regulation: (overrides: Partial<EndGameCommand> = {}): EndGameCommand => ({
    gameId: GameId.generate(),
    reason: 'regulation_complete' as GameEndReason,
    description: 'Game completed after 7 full innings',
    endTime: new Date('2024-06-15T21:00:00Z'),
    currentInning: 7,
    currentHalf: 'bottom',
    currentOuts: 3,
    finalScore: { home: 8, away: 5 },
    winner: 'home',
    officialGame: true,
    initiatedBy: 'automatic',
    ruleReference: 'Rule 4.10(a) - Regulation Game',
    ...overrides,
  }),

  /**
   * Creates a time limit end game command with default values.
   */
  timeLimit: (overrides: Partial<EndGameCommand> = {}): EndGameCommand => ({
    gameId: GameId.generate(),
    reason: 'time_limit' as GameEndReason,
    description: 'Game ended due to time limit after 6.5 innings',
    endTime: new Date('2024-06-15T22:00:00Z'),
    currentInning: 7,
    currentHalf: 'top',
    currentOuts: 2,
    finalScore: { home: 4, away: 6 },
    winner: 'away',
    officialGame: true,
    initiatedBy: 'umpire',
    ruleReference: 'League Rule - 2 Hour Time Limit',
    ...overrides,
  }),
};

/**
 * Creates a CompleteGameWorkflowCommand with default configuration.
 */
export function createCompleteGameWorkflowCommand(
  overrides: Partial<CompleteGameWorkflowCommand> = {}
): CompleteGameWorkflowCommand {
  const defaultGameId = GameId.generate();

  return {
    startGameCommand: {
      gameId: defaultGameId,
      homeTeamName: 'Tigers',
      awayTeamName: 'Lions',
      ourTeamSide: 'HOME',
      gameDate: new Date('2024-06-15T19:00:00Z'),
      location: 'Memorial Stadium',
      initialLineup: [
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 1',
          jerseyNumber: JerseyNumber.fromNumber(1),
          battingOrderPosition: 1,
          fieldPosition: FieldPosition.PITCHER,
          preferredPositions: [FieldPosition.PITCHER],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 2',
          jerseyNumber: JerseyNumber.fromNumber(2),
          battingOrderPosition: 2,
          fieldPosition: FieldPosition.CATCHER,
          preferredPositions: [FieldPosition.CATCHER],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 3',
          jerseyNumber: JerseyNumber.fromNumber(3),
          battingOrderPosition: 3,
          fieldPosition: FieldPosition.FIRST_BASE,
          preferredPositions: [FieldPosition.FIRST_BASE],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 4',
          jerseyNumber: JerseyNumber.fromNumber(4),
          battingOrderPosition: 4,
          fieldPosition: FieldPosition.SECOND_BASE,
          preferredPositions: [FieldPosition.SECOND_BASE],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 5',
          jerseyNumber: JerseyNumber.fromNumber(5),
          battingOrderPosition: 5,
          fieldPosition: FieldPosition.THIRD_BASE,
          preferredPositions: [FieldPosition.THIRD_BASE],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 6',
          jerseyNumber: JerseyNumber.fromNumber(6),
          battingOrderPosition: 6,
          fieldPosition: FieldPosition.SHORTSTOP,
          preferredPositions: [FieldPosition.SHORTSTOP],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 7',
          jerseyNumber: JerseyNumber.fromNumber(7),
          battingOrderPosition: 7,
          fieldPosition: FieldPosition.LEFT_FIELD,
          preferredPositions: [FieldPosition.LEFT_FIELD],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 8',
          jerseyNumber: JerseyNumber.fromNumber(8),
          battingOrderPosition: 8,
          fieldPosition: FieldPosition.CENTER_FIELD,
          preferredPositions: [FieldPosition.CENTER_FIELD],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 9',
          jerseyNumber: JerseyNumber.fromNumber(9),
          battingOrderPosition: 9,
          fieldPosition: FieldPosition.RIGHT_FIELD,
          preferredPositions: [FieldPosition.RIGHT_FIELD],
        },
        {
          playerId: PlayerId.generate(),
          name: 'Tiger Player 10',
          jerseyNumber: JerseyNumber.fromNumber(10),
          battingOrderPosition: 10,
          fieldPosition: FieldPosition.SHORT_FIELDER, // 10-player standard slow-pitch position
          preferredPositions: [FieldPosition.SHORT_FIELDER],
        },
      ],
    },
    atBatSequences: [
      {
        gameId: defaultGameId,
        batterId: PlayerId.generate(),
        result: AtBatResultType.SINGLE,
        runnerAdvances: [],
      },
      {
        gameId: defaultGameId,
        batterId: PlayerId.generate(),
        result: AtBatResultType.HOME_RUN,
        runnerAdvances: [],
      },
    ],
    substitutions: [],
    endGameNaturally: true,
    maxAttempts: 3,
    continueOnFailure: false,
    enableNotifications: false,
    operationDelay: 0,
    ...overrides,
  };
}

/**
 * Creates a CompleteAtBatSequenceCommand with default configuration.
 */
export function createCompleteAtBatSequenceCommand(
  overrides: Partial<CompleteAtBatSequenceCommand> = {}
): CompleteAtBatSequenceCommand {
  return {
    gameId: GameId.generate(),
    atBatCommand: {
      gameId: GameId.generate(),
      batterId: PlayerId.generate(),
      result: AtBatResultType.SINGLE,
      runnerAdvances: [],
    },
    checkInningEnd: true,
    handleSubstitutions: false,
    notifyScoreChanges: false,
    maxRetryAttempts: 1,
    ...overrides,
  };
}

/**
 * Creates commonly used StartNewGameCommand variants.
 */
export const createStartNewGameCommand = {
  /**
   * Creates a 10-player standard game command with default lineups.
   */
  standard: (overrides: Partial<StartNewGameCommand> = {}): StartNewGameCommand => ({
    gameId: GameId.generate(),
    homeTeamName: 'Tigers',
    awayTeamName: 'Lions',
    ourTeamSide: 'HOME',
    gameDate: new Date('2024-06-15T19:00:00Z'),
    location: 'Memorial Stadium',
    initialLineup: [
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 1',
        jerseyNumber: JerseyNumber.fromNumber(1),
        battingOrderPosition: 1,
        fieldPosition: FieldPosition.PITCHER,
        preferredPositions: [FieldPosition.PITCHER],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 2',
        jerseyNumber: JerseyNumber.fromNumber(2),
        battingOrderPosition: 2,
        fieldPosition: FieldPosition.CATCHER,
        preferredPositions: [FieldPosition.CATCHER],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 3',
        jerseyNumber: JerseyNumber.fromNumber(3),
        battingOrderPosition: 3,
        fieldPosition: FieldPosition.FIRST_BASE,
        preferredPositions: [FieldPosition.FIRST_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 4',
        jerseyNumber: JerseyNumber.fromNumber(4),
        battingOrderPosition: 4,
        fieldPosition: FieldPosition.SECOND_BASE,
        preferredPositions: [FieldPosition.SECOND_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 5',
        jerseyNumber: JerseyNumber.fromNumber(5),
        battingOrderPosition: 5,
        fieldPosition: FieldPosition.THIRD_BASE,
        preferredPositions: [FieldPosition.THIRD_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 6',
        jerseyNumber: JerseyNumber.fromNumber(6),
        battingOrderPosition: 6,
        fieldPosition: FieldPosition.SHORTSTOP,
        preferredPositions: [FieldPosition.SHORTSTOP],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 7',
        jerseyNumber: JerseyNumber.fromNumber(7),
        battingOrderPosition: 7,
        fieldPosition: FieldPosition.LEFT_FIELD,
        preferredPositions: [FieldPosition.LEFT_FIELD],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 8',
        jerseyNumber: JerseyNumber.fromNumber(8),
        battingOrderPosition: 8,
        fieldPosition: FieldPosition.CENTER_FIELD,
        preferredPositions: [FieldPosition.CENTER_FIELD],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 9',
        jerseyNumber: JerseyNumber.fromNumber(9),
        battingOrderPosition: 9,
        fieldPosition: FieldPosition.RIGHT_FIELD,
        preferredPositions: [FieldPosition.RIGHT_FIELD],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Tiger Player 10',
        jerseyNumber: JerseyNumber.fromNumber(10),
        battingOrderPosition: 10,
        fieldPosition: FieldPosition.SHORT_FIELDER, // 10-player standard slow-pitch position
        preferredPositions: [FieldPosition.SHORT_FIELDER],
      },
    ],
    ...overrides,
  }),

  /**
   * Creates a tournament game command with additional metadata.
   */
  tournament: (overrides: Partial<StartNewGameCommand> = {}): StartNewGameCommand => ({
    gameId: GameId.generate(),
    homeTeamName: 'Wildcats',
    awayTeamName: 'Eagles',
    ourTeamSide: 'HOME',
    gameDate: new Date('2024-07-20T18:30:00Z'),
    location: 'Tournament Field #1',
    initialLineup: [
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 1',
        jerseyNumber: JerseyNumber.fromNumber(1),
        battingOrderPosition: 1,
        fieldPosition: FieldPosition.PITCHER,
        preferredPositions: [FieldPosition.PITCHER],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 2',
        jerseyNumber: JerseyNumber.fromNumber(2),
        battingOrderPosition: 2,
        fieldPosition: FieldPosition.CATCHER,
        preferredPositions: [FieldPosition.CATCHER],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 3',
        jerseyNumber: JerseyNumber.fromNumber(3),
        battingOrderPosition: 3,
        fieldPosition: FieldPosition.FIRST_BASE,
        preferredPositions: [FieldPosition.FIRST_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 4',
        jerseyNumber: JerseyNumber.fromNumber(4),
        battingOrderPosition: 4,
        fieldPosition: FieldPosition.SECOND_BASE,
        preferredPositions: [FieldPosition.SECOND_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 5',
        jerseyNumber: JerseyNumber.fromNumber(5),
        battingOrderPosition: 5,
        fieldPosition: FieldPosition.THIRD_BASE,
        preferredPositions: [FieldPosition.THIRD_BASE],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 6',
        jerseyNumber: JerseyNumber.fromNumber(6),
        battingOrderPosition: 6,
        fieldPosition: FieldPosition.SHORTSTOP,
        preferredPositions: [FieldPosition.SHORTSTOP],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 7',
        jerseyNumber: JerseyNumber.fromNumber(7),
        battingOrderPosition: 7,
        fieldPosition: FieldPosition.LEFT_FIELD,
        preferredPositions: [FieldPosition.LEFT_FIELD],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 8',
        jerseyNumber: JerseyNumber.fromNumber(8),
        battingOrderPosition: 8,
        fieldPosition: FieldPosition.CENTER_FIELD,
        preferredPositions: [FieldPosition.CENTER_FIELD],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 9',
        jerseyNumber: JerseyNumber.fromNumber(9),
        battingOrderPosition: 9,
        fieldPosition: FieldPosition.RIGHT_FIELD,
        preferredPositions: [FieldPosition.RIGHT_FIELD],
      },
      {
        playerId: PlayerId.generate(),
        name: 'Wildcat Player 10',
        jerseyNumber: JerseyNumber.fromNumber(10),
        battingOrderPosition: 10,
        fieldPosition: FieldPosition.SHORT_FIELDER, // 10-player standard slow-pitch position
        preferredPositions: [FieldPosition.SHORT_FIELDER],
      },
    ],
    ...overrides,
  }),
};

/**
 * Creates commonly used RecordAtBatCommand variants.
 */
export const createRecordAtBatCommand = {
  /**
   * Creates a simple single with no runners.
   */
  single: (overrides: Partial<RecordAtBatCommand> = {}): RecordAtBatCommand => ({
    gameId: GameId.generate(),
    batterId: PlayerId.generate(),
    result: AtBatResultType.SINGLE,
    runnerAdvances: [],
    ...overrides,
  }),

  /**
   * Creates a home run command.
   */
  homeRun: (overrides: Partial<RecordAtBatCommand> = {}): RecordAtBatCommand => ({
    gameId: GameId.generate(),
    batterId: PlayerId.generate(),
    result: AtBatResultType.HOME_RUN,
    runnerAdvances: [],
    ...overrides,
  }),

  /**
   * Creates a strikeout command.
   */
  strikeout: (overrides: Partial<RecordAtBatCommand> = {}): RecordAtBatCommand => ({
    gameId: GameId.generate(),
    batterId: PlayerId.generate(),
    result: AtBatResultType.STRIKEOUT,
    runnerAdvances: [],
    ...overrides,
  }),
};

/**
 * Creates commonly used SubstitutePlayerCommand variants.
 */
export const createSubstitutePlayerCommand = {
  /**
   * Creates a regular substitution command.
   */
  regular: (overrides: Partial<SubstitutePlayerCommand> = {}): SubstitutePlayerCommand => ({
    gameId: GameId.generate(),
    teamLineupId: TeamLineupId.generate(),
    battingSlot: 1,
    outgoingPlayerId: PlayerId.generate(),
    incomingPlayerId: PlayerId.generate(),
    incomingPlayerName: 'Substitute Player',
    incomingJerseyNumber: JerseyNumber.fromNumber(99),
    newFieldPosition: FieldPosition.PITCHER,
    inning: 5,
    isReentry: false,
    ...overrides,
  }),

  /**
   * Creates a re-entry substitution command.
   */
  reentry: (overrides: Partial<SubstitutePlayerCommand> = {}): SubstitutePlayerCommand => ({
    gameId: GameId.generate(),
    teamLineupId: TeamLineupId.generate(),
    battingSlot: 1,
    outgoingPlayerId: PlayerId.generate(),
    incomingPlayerId: PlayerId.generate(),
    incomingPlayerName: 'Returning Starter',
    incomingJerseyNumber: JerseyNumber.fromNumber(1),
    newFieldPosition: FieldPosition.FIRST_BASE,
    inning: 6,
    isReentry: true,
    ...overrides,
  }),
};

/**
 * Creates commonly used EndInningCommand variants.
 */
export const createEndInningCommand = {
  /**
   * Creates a standard three-outs inning ending.
   */
  threeOuts: (overrides: Partial<EndInningCommand> = {}): EndInningCommand => ({
    gameId: GameId.generate(),
    inning: 1,
    isTopHalf: true,
    endingReason: 'THREE_OUTS',
    finalOuts: 3,
    ...overrides,
  }),

  /**
   * Creates a mercy rule inning ending.
   */
  mercyRule: (overrides: Partial<EndInningCommand> = {}): EndInningCommand => ({
    gameId: GameId.generate(),
    inning: 5,
    isTopHalf: false,
    endingReason: 'MERCY_RULE',
    finalOuts: 1,
    ...overrides,
  }),
};
