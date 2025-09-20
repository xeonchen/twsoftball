/**
 * @file DTO Factories
 * Factory functions for creating reusable Data Transfer Objects for testing.
 *
 * @remarks
 * This module provides centralized factory functions for creating DTOs
 * commonly used across test files. These factories reduce code duplication,
 * particularly in interface contract tests and service layer tests.
 *
 * **DTO Categories**:
 * - Team Lineup DTOs: TeamLineupDTO for game state representation
 * - Game State DTOs: Complete game state objects for result testing
 * - Player DTOs: LineupPlayerDTO for team composition
 * - Configuration DTOs: GameRulesDTO for game setup
 *
 * @example
 * ```typescript
 * import { createLineupDTO, createGameStateDTO } from '../test-factories/index.js';
 *
 * describe('Service Tests', () => {
 *   it('should handle lineup operations', () => {
 *     const lineup = createLineupDTO(gameId, 'HOME', 'Eagles');
 *     const gameState = createGameStateDTO(gameId, { homeLineup: lineup });
 *     // ... test implementation
 *   });
 * });
 * ```
 */

import {
  GameId,
  PlayerId,
  TeamLineupId,
  GameStatus,
  FieldPosition,
  JerseyNumber,
} from '@twsoftball/domain';
// Note: Using domain-established standard positions directly

import { GameStateDTO } from '../dtos/GameStateDTO.js';
import { PlayerInGameDTO } from '../dtos/PlayerInGameDTO.js';
import { LineupPlayerDTO } from '../dtos/StartNewGameCommand.js';
import { TeamLineupDTO } from '../dtos/TeamLineupDTO.js';
import { SecureTestUtils } from '../test-utils/secure-test-utils.js';

/**
 * Creates a TeamLineupDTO for testing team lineup scenarios.
 *
 * @remarks
 * This factory was heavily duplicated in GameCommandService.test.ts
 * and other service tests. Provides consistent lineup structure
 * with customizable team details and sensible defaults.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param teamSide - Which team side ('HOME' or 'AWAY')
 * @param teamName - The team name
 * @param options - Optional customization parameters
 * @returns TeamLineupDTO ready for testing
 *
 * @example
 * ```typescript
 * // Basic lineup
 * const homeLineup = createLineupDTO(gameId, 'HOME', 'Eagles');
 *
 * // Lineup with custom players
 * const awayLineup = createLineupDTO(gameId, 'AWAY', 'Hawks', {
 *   battingSlots: [
 *     { playerId: new PlayerId('player-1'), name: 'John Doe', jerseyNumber: JerseyNumber.fromNumber(1) }
 *   ]
 * });
 * ```
 */
export function createLineupDTO(
  gameId: string | GameId,
  teamSide: 'HOME' | 'AWAY',
  teamName: string,
  options?: {
    teamLineupId?: TeamLineupId;
    strategy?: 'DETAILED' | 'SIMPLE';
    battingSlots?: Array<{
      playerId: PlayerId;
      name: string;
      jerseyNumber: JerseyNumber;
      battingOrderPosition?: number;
      fieldPosition?: FieldPosition;
    }>;
    fieldPositions?: Record<FieldPosition, PlayerId | null>;
    benchPlayers?: PlayerId[];
    substitutionHistory?: Array<{
      incomingPlayerId: PlayerId;
      outgoingPlayerId: PlayerId;
      position: FieldPosition;
      timestamp: Date;
    }>;
  }
): TeamLineupDTO {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;

  return {
    teamLineupId: options?.teamLineupId || TeamLineupId.generate(),
    gameId: gameIdInstance,
    teamSide,
    teamName,
    strategy: options?.strategy || 'DETAILED',
    battingSlots: [], // Will be properly populated by actual implementation
    fieldPositions: options?.fieldPositions || ({} as Record<FieldPosition, PlayerId | null>),
    benchPlayers: [], // Will be properly populated by actual implementation
    substitutionHistory: [], // Will be properly populated by actual implementation
  };
}

/**
 * Creates a GameStateDTO for testing game state scenarios.
 *
 * @remarks
 * Used extensively in service tests and result verification.
 * Provides complete game state representation with sensible
 * defaults and easy customization for specific test scenarios.
 *
 * @param gameId - The game ID (can be string or GameId instance)
 * @param options - Optional customization parameters
 * @returns GameStateDTO ready for testing
 *
 * @example
 * ```typescript
 * // Basic game state
 * const gameState = createGameStateDTO(gameId);
 *
 * // Custom game state with specific score
 * const gameState = createGameStateDTO(gameId, {
 *   status: GameStatus.COMPLETED,
 *   score: { home: 7, away: 4, leader: 'HOME', difference: 3 },
 *   currentInning: 9
 * });
 * ```
 */
export function createGameStateDTO(
  gameId: string | GameId,
  options?: {
    status?: GameStatus;
    score?: { home: number; away: number; leader: 'HOME' | 'AWAY' | 'TIE'; difference: number };
    gameStartTime?: Date;
    currentInning?: number;
    isTopHalf?: boolean;
    battingTeam?: 'HOME' | 'AWAY';
    outs?: number;
    bases?: {
      first: PlayerId | null;
      second: PlayerId | null;
      third: PlayerId | null;
      runnersInScoringPosition: PlayerId[];
      basesLoaded: boolean;
    };
    currentBatterSlot?: number;
    homeLineup?: TeamLineupDTO;
    awayLineup?: TeamLineupDTO;
    currentBatter?: PlayerInGameDTO | null;
    lastUpdated?: Date;
  }
): GameStateDTO {
  const gameIdInstance = typeof gameId === 'string' ? new GameId(gameId) : gameId;

  // Create default lineups if not provided
  const defaultHomeLineup =
    options?.homeLineup || createLineupDTO(gameIdInstance, 'HOME', 'Home Team');
  const defaultAwayLineup =
    options?.awayLineup || createLineupDTO(gameIdInstance, 'AWAY', 'Away Team');

  return {
    gameId: gameIdInstance,
    status: options?.status || GameStatus.IN_PROGRESS,
    score: options?.score || { home: 0, away: 0, leader: 'TIE', difference: 0 },
    gameStartTime: options?.gameStartTime || new Date(),
    currentInning: options?.currentInning || 1,
    isTopHalf: options?.isTopHalf ?? true,
    battingTeam: options?.battingTeam || 'AWAY',
    outs: options?.outs || 0,
    bases: options?.bases || {
      first: null,
      second: null,
      third: null,
      runnersInScoringPosition: [],
      basesLoaded: false,
    },
    currentBatterSlot: options?.currentBatterSlot || 1,
    homeLineup: defaultHomeLineup,
    awayLineup: defaultAwayLineup,
    currentBatter: options?.currentBatter || null,
    lastUpdated: options?.lastUpdated || new Date(),
  };
}

/**
 * Creates a LineupPlayerDTO for testing player lineup scenarios.
 *
 * @remarks
 * Used in game setup tests and lineup management scenarios.
 * Provides realistic player data with customizable attributes
 * for various test cases.
 *
 * @param options - Optional customization parameters
 * @returns LineupPlayerDTO ready for testing
 *
 * @example
 * ```typescript
 * // Default player
 * const player = createLineupPlayerDTO();
 *
 * // Custom pitcher
 * const pitcher = createLineupPlayerDTO({
 *   name: 'Ace Johnson',
 *   jerseyNumber: JerseyNumber.fromNumber(21),
 *   fieldPosition: FieldPosition.PITCHER,
 *   preferredPositions: [FieldPosition.PITCHER, FieldPosition.FIRST_BASE]
 * });
 * ```
 */
export function createLineupPlayerDTO(options?: {
  playerId?: PlayerId;
  name?: string;
  jerseyNumber?: JerseyNumber;
  battingOrderPosition?: number;
  fieldPosition?: FieldPosition;
  preferredPositions?: FieldPosition[];
}): LineupPlayerDTO {
  return {
    playerId: options?.playerId || new PlayerId(SecureTestUtils.generatePlayerId()),
    name: options?.name || 'Test Player',
    jerseyNumber: options?.jerseyNumber || JerseyNumber.fromNumber(1),
    battingOrderPosition: options?.battingOrderPosition || 1,
    fieldPosition: options?.fieldPosition || FieldPosition.EXTRA_PLAYER,
    preferredPositions: options?.preferredPositions || [FieldPosition.EXTRA_PLAYER],
  };
}

/**
 * Creates multiple LineupPlayerDTOs for testing full lineup scenarios.
 *
 * @remarks
 * Utility function for creating complete team lineups with
 * realistic batting orders and field positions. Useful for
 * testing game start scenarios and lineup management.
 *
 * @param count - Number of players to create (default: 10 for 10-player standard slow-pitch softball)
 * @param options - Optional customization for all players
 * @returns Array of LineupPlayerDTOs ready for testing
 *
 * @example
 * ```typescript
 * // Create 10-player standard slow-pitch lineup
 * const lineup = createFullLineup();
 *
 * // Create 11-player lineup (common with 1 EP)
 * const elevenPlayerLineup = createFullLineup(11);
 *
 * // Create 12-player lineup (common with 2 EPs)
 * const extendedLineup = createFullLineup(12);
 * ```
 */
export function createFullLineup(
  count: number = 10,
  options?: {
    namePrefix?: string;
    jerseyNumberStart?: number;
  }
): LineupPlayerDTO[] {
  // 10-player standard slow-pitch softball positions
  // Matches domain TestLineupBuilder.STANDARD_POSITIONS pattern
  const slowPitchStandardPositions: FieldPosition[] = [
    FieldPosition.PITCHER, // Slot 1
    FieldPosition.CATCHER, // Slot 2
    FieldPosition.FIRST_BASE, // Slot 3
    FieldPosition.SECOND_BASE, // Slot 4
    FieldPosition.THIRD_BASE, // Slot 5
    FieldPosition.SHORTSTOP, // Slot 6
    FieldPosition.LEFT_FIELD, // Slot 7
    FieldPosition.CENTER_FIELD, // Slot 8
    FieldPosition.RIGHT_FIELD, // Slot 9
    FieldPosition.SHORT_FIELDER, // Slot 10 - Standard 10-player slow-pitch
  ];

  // Extend with additional positions for 11-12 player lineups (common) and larger lineups
  const extendedPositions: FieldPosition[] = [
    ...slowPitchStandardPositions,
    FieldPosition.EXTRA_PLAYER, // 11th player (common)
    FieldPosition.EXTRA_PLAYER, // 12th player (common) - Multiple EPs are valid
  ];

  const defaultPositions = extendedPositions;

  return Array.from({ length: count }, (_, index) => {
    const position = defaultPositions[index] || FieldPosition.EXTRA_PLAYER;
    const jerseyNumber = (options?.jerseyNumberStart || 1) + index;

    return createLineupPlayerDTO({
      name: `${options?.namePrefix || 'Player'} ${index + 1}`,
      jerseyNumber: JerseyNumber.fromNumber(jerseyNumber),
      battingOrderPosition: index + 1,
      fieldPosition: position,
      preferredPositions: [position],
    });
  });
}

/**
 * Creates a complete team lineup with realistic player distribution.
 *
 * @remarks
 * Higher-level factory that creates a full team setup with
 * varied player names, positions, and jersey numbers for
 * realistic testing scenarios.
 *
 * @param teamName - Name of the team for player naming
 * @param options - Optional customization parameters
 * @returns Array of LineupPlayerDTOs with realistic distribution
 *
 * @example
 * ```typescript
 * // Create Eagles lineup
 * const eaglesLineup = createRealisticLineup('Eagles', {
 *   playerCount: 12,
 *   includeSubstitutes: true
 * });
 * ```
 */
export function createRealisticLineup(
  teamName: string,
  options?: {
    playerCount?: number;
    includeSubstitutes?: boolean;
    jerseyNumberStart?: number;
  }
): LineupPlayerDTO[] {
  const playerCount = options?.playerCount || 10;
  const realisticNames = [
    'Mike Johnson',
    'Sarah Davis',
    'Carlos Rodriguez',
    'Jessica Wong',
    'David Thompson',
    'Maria Garcia',
    'John Wilson',
    'Lisa Chen',
    'Robert Martinez',
    'Amanda Taylor',
    'Kevin Brown',
    'Nicole Anderson',
    'Steven Lee',
    'Jennifer White',
    'Mark Garcia',
    'Emily Rodriguez',
  ];

  return createFullLineup(playerCount, {
    jerseyNumberStart: options?.jerseyNumberStart || 1,
  }).map((player, index) => ({
    ...player,
    name: realisticNames[index] || `${teamName} Player ${index + 1}`,
  }));
}
