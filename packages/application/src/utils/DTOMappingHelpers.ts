/**
 * @file DTOMappingHelpers
 * Shared DTO mapping utilities to reduce duplication across use cases.
 *
 * @remarks
 * This module provides common DTO mapping functions that convert domain
 * aggregates (TeamLineup, Player) into presentation-layer DTOs. By centralizing
 * these mapping patterns, we eliminate code duplication while maintaining
 * consistent DTO structure across all use cases.
 *
 * These helpers are extracted from use cases where the same mapping logic
 * was duplicated across RecordAtBat, EndInning, UndoLastAction, RedoLastAction,
 * and StartNewGame use cases.
 *
 * @example
 * ```typescript
 * // In a use case
 * import { DTOMappingHelpers } from '../utils/DTOMappingHelpers.js';
 *
 * const homeLineupDTO = DTOMappingHelpers.mapTeamLineupToDTO(homeLineup, 'HOME');
 * const playerDTO = DTOMappingHelpers.mapPlayerToDTO(teamLineup, playerId, battingSlot);
 * const stats = DTOMappingHelpers.createEmptyStatistics(playerId, name, jerseyNumber);
 * ```
 */

import { TeamLineup, PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';

import { PlayerInGameDTO } from '../dtos/PlayerInGameDTO.js';
import { PlayerStatisticsDTO, FieldingStatisticsDTO } from '../dtos/PlayerStatisticsDTO.js';
import { TeamLineupDTO, BattingSlotDTO } from '../dtos/TeamLineupDTO.js';

/**
 * Shared DTO mapping utilities for converting domain aggregates to DTOs.
 */
export const DTOMappingHelpers = {
  /**
   * Maps TeamLineup aggregate to TeamLineupDTO for presentation layer.
   *
   * @remarks
   * Converts domain TeamLineup aggregate into DTO format suitable for
   * presentation layer consumption. Includes all batting slots, field
   * positions, and player information with statistics.
   *
   * This method performs comprehensive mapping:
   * - Converts batting slots with full player details and substitution history
   * - Maps field position assignments
   * - Includes empty statistics for each player
   * - Handles bench players and substitution tracking
   *
   * @param teamLineup - The TeamLineup aggregate to convert
   * @param teamSide - Whether this is HOME or AWAY team
   * @returns Complete TeamLineupDTO
   *
   * @example
   * ```typescript
   * const homeLineupDTO = DTOMappingHelpers.mapTeamLineupToDTO(homeLineup, 'HOME');
   * console.log(homeLineupDTO.battingSlots[0].currentPlayer?.name);
   * ```
   */
  mapTeamLineupToDTO(teamLineup: TeamLineup, teamSide: 'HOME' | 'AWAY'): TeamLineupDTO {
    // Convert domain batting slots to DTO format
    const activeLineup = teamLineup.getActiveLineup();
    const battingSlots: BattingSlotDTO[] = activeLineup.map(battingSlot => {
      const currentPlayerId = battingSlot.getCurrentPlayer();
      const playerInfo = teamLineup.getPlayerInfo(currentPlayerId);

      return {
        slotNumber: battingSlot.position,
        currentPlayer: playerInfo
          ? {
              playerId: currentPlayerId,
              name: playerInfo.playerName,
              jerseyNumber: playerInfo.jerseyNumber,
              battingOrderPosition: battingSlot.position,
              currentFieldPosition: playerInfo.currentPosition || FieldPosition.EXTRA_PLAYER,
              preferredPositions: playerInfo.currentPosition ? [playerInfo.currentPosition] : [],
              plateAppearances: [], // Would be populated from game history
              statistics: this.createEmptyStatistics(
                currentPlayerId,
                playerInfo.playerName,
                playerInfo.jerseyNumber
              ),
            }
          : null,
        history: battingSlot.history.map(h => {
          const historyPlayerInfo = teamLineup.getPlayerInfo(h.playerId);
          return {
            playerId: h.playerId,
            playerName: historyPlayerInfo?.playerName || 'Unknown',
            enteredInning: h.enteredInning,
            exitedInning: h.exitedInning,
            wasStarter: h.wasStarter,
            isReentry: h.isReentry,
          };
        }),
      };
    });

    // Convert domain field positions to DTO format
    const fieldPositionsMap = teamLineup.getFieldingPositions();
    const fieldPositions: Record<FieldPosition, PlayerId | null> = {} as Record<
      FieldPosition,
      PlayerId | null
    >;
    for (const [position, playerId] of fieldPositionsMap.entries()) {
      fieldPositions[position] = playerId;
    }

    return {
      teamLineupId: teamLineup.id,
      gameId: teamLineup.gameId,
      teamSide,
      teamName: teamLineup.teamName,
      strategy: 'SIMPLE', // Default strategy
      battingSlots,
      fieldPositions,
      benchPlayers: [], // Would be implemented in full version
      substitutionHistory: [], // Would be implemented in full version
    };
  },

  /**
   * Maps player information to PlayerInGameDTO.
   *
   * @remarks
   * Converts domain player information into DTO format for current batter
   * display. Includes complete player details, position, and statistics.
   *
   * This method retrieves player info from the TeamLineup aggregate and
   * constructs a complete PlayerInGameDTO with all required fields:
   * - Player identification (ID, name, jersey number)
   * - Batting order position
   * - Current and preferred field positions
   * - Plate appearance history (empty for now)
   * - Complete statistics (zero-initialized)
   *
   * @param teamLineup - The TeamLineup aggregate containing player info
   * @param playerId - Player identifier
   * @param battingSlot - Current batting slot number
   * @returns Complete PlayerInGameDTO or null if player not found
   *
   * @example
   * ```typescript
   * const currentBatter = DTOMappingHelpers.mapPlayerToDTO(
   *   battingTeamLineup,
   *   currentBatterPlayerId,
   *   battingSlot
   * );
   * if (currentBatter) {
   *   console.log(`${currentBatter.name} is up to bat`);
   * }
   * ```
   */
  mapPlayerToDTO(
    teamLineup: TeamLineup,
    playerId: PlayerId,
    battingSlot: number
  ): PlayerInGameDTO | null {
    const playerInfo = teamLineup.getPlayerInfo(playerId);
    if (!playerInfo) {
      return null;
    }

    return {
      playerId,
      name: playerInfo.playerName,
      jerseyNumber: playerInfo.jerseyNumber,
      battingOrderPosition: battingSlot,
      currentFieldPosition: playerInfo.currentPosition || FieldPosition.EXTRA_PLAYER,
      preferredPositions: playerInfo.currentPosition ? [playerInfo.currentPosition] : [],
      plateAppearances: [], // Would be populated from game history
      statistics: this.createEmptyStatistics(
        playerId,
        playerInfo.playerName,
        playerInfo.jerseyNumber
      ),
    };
  },

  /**
   * Creates empty player statistics for display.
   *
   * @remarks
   * Generates a PlayerStatisticsDTO with all statistical fields initialized
   * to zero. This is used when displaying players who don't yet have any
   * recorded statistics, or when we need placeholder stats for UI consistency.
   *
   * The empty statistics include:
   * - Zero counts for all offensive stats (hits, runs, RBI, etc.)
   * - Zero percentages for batting average, OBP, slugging
   * - Empty fielding statistics with 1.0 fielding percentage (no errors yet)
   *
   * In a future version with statistics tracking, this would be replaced by
   * actual stat calculation from game events.
   *
   * @param playerId - Player identifier
   * @param name - Player display name
   * @param jerseyNumber - Player jersey number
   * @returns Empty PlayerStatisticsDTO with zero values
   *
   * @example
   * ```typescript
   * const stats = DTOMappingHelpers.createEmptyStatistics(
   *   playerId,
   *   'Alice Smith',
   *   new JerseyNumber(10)
   * );
   * console.log(stats.battingAverage); // 0.0
   * console.log(stats.fielding.fieldingPercentage); // 1.0
   * ```
   */
  createEmptyStatistics(
    playerId: PlayerId,
    name: string,
    jerseyNumber: JerseyNumber
  ): PlayerStatisticsDTO {
    const emptyFielding: FieldingStatisticsDTO = {
      positions: [],
      putouts: 0,
      assists: 0,
      errors: 0,
      fieldingPercentage: 1.0,
    };

    return {
      playerId,
      name,
      jerseyNumber,
      plateAppearances: 0,
      atBats: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      strikeouts: 0,
      rbi: 0,
      runs: 0,
      battingAverage: 0.0,
      onBasePercentage: 0.0,
      sluggingPercentage: 0.0,
      fielding: emptyFielding,
    };
  },
} as const;
