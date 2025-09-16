/**
 * @file DTO Mapper
 * Provides type-safe conversion from Application layer DTOs to UI-friendly state.
 *
 * @remarks
 * This mapper handles the transformation of rich Application layer DTOs into
 * simplified, UI-optimized data structures. It acts as an anti-corruption layer
 * that shields the UI from changes in the Application layer and provides data
 * in formats that are optimized for presentation and user interaction.
 *
 * Key Responsibilities:
 * - Convert Application DTOs to UI-friendly formats
 * - Unwrap value objects to primitive types for UI consumption
 * - Add UI-specific computed properties (totals, derived states, etc.)
 * - Handle null/undefined values gracefully with sensible defaults
 * - Provide consistent data shapes regardless of source variations
 *
 * Design Principles:
 * - Defensive programming - handle missing or malformed data
 * - UI-optimized output - add computed properties UI components need
 * - Consistent interfaces - same shape regardless of input variations
 * - No side effects - pure transformation functions
 *
 * @example
 * ```typescript
 * // Convert complex application DTO to simple UI state
 * const gameStateDTO = await gameService.getGameState(gameId);
 * const uiState = toUIGameState(gameStateDTO);
 *
 * // uiState now has UI-friendly properties like:
 * // - score.total (computed from home + away)
 * // - inning.half ('top'/'bottom' instead of boolean)
 * // - timing.created (ISO string instead of Date object)
 * ```
 */

import type {
  GameStateDTO,
  TeamLineupDTO,
  PlayerInGameDTO,
  GameScoreDTO,
  AtBatResultDTO,
  BasesStateDTO,
} from '@twsoftball/application';
import type { BattingSlotDTO } from '@twsoftball/application/dtos/TeamLineupDTO';

/**
 * UI-optimized game state interface.
 */
export interface UIGameState {
  gameId: string;
  status: string;
  inning: {
    number: number;
    half: 'top' | 'bottom';
  };
  score: {
    home: number;
    away: number;
    total: number;
  };
  teams: {
    home: {
      name: string;
      abbreviation: string;
      color: string;
    };
    away: {
      name: string;
      abbreviation: string;
      color: string;
    };
  };
  timing: {
    created: string;
    lastModified: string;
  };
}

/**
 * UI-optimized team lineup interface.
 */
export interface UITeamLineup {
  teamId: string;
  teamName: string;
  players: UIPlayer[];
  substitutionCount: number;
}

/**
 * UI-optimized player interface.
 */
export interface UIPlayer {
  playerId: string;
  name: string;
  position: string;
  jerseyNumber: number;
  battingOrder: number;
  isActive: boolean;
  isStarter: boolean;
}

/**
 * UI-optimized score interface with computed properties.
 */
export interface UIScore {
  home: number;
  away: number;
  total: number;
  byInning: {
    inning: number;
    home: number;
    away: number;
  }[];
  differential: number; // positive = home leading, negative = away leading
}

/**
 * UI-optimized at-bat result interface.
 */
export interface UIAtBatResult {
  batterId: string;
  result: string;
  description: string;
  stats: {
    runsScored: number;
    rbis: number;
    basesAdvanced: number;
    outs: number;
    pitchCount: number;
  };
  impact: 'positive' | 'negative' | 'neutral';
}

/**
 * UI-optimized bases state interface.
 */
export interface UIBasesState {
  first: string | null;
  second: string | null;
  third: string | null;
  runners: {
    playerId: string;
    base: number;
  }[];
  loadedBases: string[]; // ['first', 'second', 'third']
  runnerCount: number;
}

/**
 * Converts GameStateDTO to UI-optimized game state.
 *
 * @remarks
 * Transforms the complex GameStateDTO into a UI-friendly format with:
 * - Unwrapped value objects (GameId -> string)
 * - Computed score totals
 * - Inning half as readable string
 * - Date objects as ISO strings
 * - Defensive handling of missing properties
 *
 * @param dto - Application layer game state DTO
 * @returns UI-optimized game state
 *
 * @example
 * ```typescript
 * const gameStateDTO = {
 *   gameId: { value: 'game-123' },
 *   currentInning: 7,
 *   topOfInning: false,
 *   score: { homeScore: 5, awayScore: 3 }
 * };
 *
 * const uiState = toUIGameState(gameStateDTO);
 * // uiState.inning.half === 'bottom'
 * // uiState.score.total === 8
 * ```
 */
export function toUIGameState(dto: GameStateDTO | null): UIGameState {
  if (!dto) {
    return {
      gameId: '',
      status: '',
      inning: { number: 1, half: 'bottom' },
      score: { home: 0, away: 0, total: 0 },
      teams: {
        home: { name: '', abbreviation: '', color: '' },
        away: { name: '', abbreviation: '', color: '' },
      },
      timing: { created: '', lastModified: '' },
    };
  }

  const homeScore = dto.score?.home || 0;
  const awayScore = dto.score?.away || 0;

  return {
    gameId: dto.gameId?.value || '',
    status: dto.status || '',
    inning: {
      number: dto.currentInning || 1,
      half: dto.isTopHalf !== undefined ? (dto.isTopHalf ? 'top' : 'bottom') : 'bottom',
    },
    score: {
      home: homeScore,
      away: awayScore,
      total: homeScore + awayScore,
    },
    teams: {
      home: {
        name: dto.homeLineup?.teamName || '',
        abbreviation: dto.homeLineup?.teamName || '',
        color: '',
      },
      away: {
        name: dto.awayLineup?.teamName || '',
        abbreviation: dto.awayLineup?.teamName || '',
        color: '',
      },
    },
    timing: {
      created: dto.gameStartTime?.toISOString() || '',
      lastModified: dto.lastUpdated?.toISOString() || '',
    },
  };
}

/**
 * Converts TeamLineupDTO to UI-optimized team lineup.
 *
 * @remarks
 * Transforms team lineup data with:
 * - Unwrapped PlayerId and JerseyNumber value objects
 * - Added isStarter property for UI logic
 * - Substitution count for quick UI display
 * - Safe handling of empty lineups
 *
 * @param dto - Application layer team lineup DTO
 * @returns UI-optimized team lineup
 */
export function toUITeamLineup(dto: TeamLineupDTO | null): UITeamLineup {
  if (!dto) {
    return {
      teamId: '',
      teamName: '',
      players: [],
      substitutionCount: 0,
    };
  }

  return {
    teamId: dto.teamLineupId?.value || dto.teamSide || '',
    teamName: dto.teamName || '',
    players: (dto.battingSlots || ([] as BattingSlotDTO[])).map(slot => ({
      playerId: slot.currentPlayer?.playerId?.value || '',
      name: slot.currentPlayer?.name || '',
      position: slot.currentPlayer?.currentFieldPosition || '',
      jerseyNumber:
        typeof slot.currentPlayer?.jerseyNumber?.toNumber === 'function'
          ? slot.currentPlayer.jerseyNumber.toNumber()
          : Number((slot.currentPlayer?.jerseyNumber as unknown as { value: string })?.value) || 0,
      battingOrder: slot.slotNumber || 0,
      isActive: slot.currentPlayer !== null,
      isStarter: (slot.history?.length || 0) <= 1, // Assume starter if only one history entry
    })),
    substitutionCount: dto.substitutionHistory?.length || 0,
  };
}

/**
 * Converts array of PlayerInGameDTO to UI-optimized player list.
 *
 * @remarks
 * Transforms player data with unwrapped value objects and consistent
 * UI properties. Assumes non-lineup players are substitutes.
 *
 * @param playersDTO - Array of application layer player DTOs
 * @returns Array of UI-optimized players
 */
export function toUIPlayerList(playersDTO: PlayerInGameDTO[]): UIPlayer[] {
  if (!Array.isArray(playersDTO)) {
    return [];
  }

  return playersDTO.map(player => ({
    playerId: player.playerId?.value || '',
    name: player.name || '',
    position: player.currentFieldPosition || '',
    jerseyNumber:
      typeof player.jerseyNumber?.toNumber === 'function'
        ? player.jerseyNumber.toNumber()
        : Number((player.jerseyNumber as unknown as { value: string })?.value) || 0,
    battingOrder: player.battingOrderPosition || 0,
    isActive: true, // Players in list are active by definition
    isStarter: false, // Players from general list assumed to be substitutes
  }));
}

/**
 * Converts GameScoreDTO to UI-optimized score with computed properties.
 *
 * @remarks
 * Enhances score data with:
 * - Total runs computed
 * - Score differential (positive = home leading)
 * - Inning-by-inning breakdown in UI-friendly format
 * - Safe handling of missing inning data
 *
 * @param dto - Application layer game score DTO
 * @returns UI-optimized score with computed properties
 */
export function toUIScore(dto: GameScoreDTO | null): UIScore {
  if (!dto) {
    return {
      home: 0,
      away: 0,
      total: 0,
      byInning: [],
      differential: 0,
    };
  }

  const homeScore = dto.home || 0;
  const awayScore = dto.away || 0;

  return {
    home: homeScore,
    away: awayScore,
    total: homeScore + awayScore,
    byInning: [], // GameScoreDTO doesn't include inning-by-inning breakdown
    differential: homeScore - awayScore,
  };
}

/**
 * Converts AtBatResultDTO to UI-optimized at-bat result.
 *
 * @remarks
 * Enhances at-bat data with:
 * - Unwrapped PlayerId value object
 * - Grouped statistics for easy UI display
 * - Computed impact assessment for UI styling
 * - Safe defaults for missing properties
 *
 * Impact is determined by:
 * - Positive: runs scored > 0 or RBIs > 0
 * - Negative: outs > 0
 * - Neutral: no runs/RBIs and no outs
 *
 * @param dto - Application layer at-bat result DTO
 * @returns UI-optimized at-bat result
 */
export function toUIAtBatResult(dto: AtBatResultDTO | null): UIAtBatResult {
  if (!dto) {
    return {
      batterId: '',
      result: '',
      description: '',
      stats: { runsScored: 0, rbis: 0, basesAdvanced: 0, outs: 0, pitchCount: 0 },
      impact: 'neutral',
    };
  }

  const runsScored =
    dto.runnerAdvances?.filter(
      advance => advance.toBase === 'HOME' || (advance.toBase as unknown) === 4
    ).length || 0;
  const rbis = dto.rbi || 0;
  const outs = 0; // AtBatResultDTO doesn't track outs directly

  // Determine impact for UI styling/logic
  let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (runsScored > 0 || rbis > 0) {
    impact = 'positive';
  } else if (outs > 0) {
    impact = 'negative';
  }

  return {
    batterId: dto.batterId?.value || '',
    result: dto.result?.toString() || '',
    description: dto.result?.toString() || '',
    stats: {
      runsScored,
      rbis,
      basesAdvanced: dto.runnerAdvances?.length || 0,
      outs,
      pitchCount: 0, // AtBatResultDTO doesn't track pitch count
    },
    impact,
  };
}

/**
 * Converts BasesStateDTO to UI-optimized bases state.
 *
 * @remarks
 * Transforms bases data with:
 * - Unwrapped PlayerId value objects
 * - Computed loaded bases array for UI logic
 * - Runner count for quick display
 * - Consistent runner list format
 *
 * @param dto - Application layer bases state DTO
 * @returns UI-optimized bases state
 */
export function toUIBasesState(dto: BasesStateDTO | null): UIBasesState {
  if (!dto) {
    return {
      first: null,
      second: null,
      third: null,
      runners: [],
      loadedBases: [],
      runnerCount: 0,
    };
  }

  const first = dto.first?.value || null;
  const second = dto.second?.value || null;
  const third = dto.third?.value || null;

  // Determine which bases are loaded for UI logic
  const loadedBases: string[] = [];
  if (first) loadedBases.push('first');
  if (second) loadedBases.push('second');
  if (third) loadedBases.push('third');

  return {
    first,
    second,
    third,
    runners: [
      first ? { playerId: first, base: 1 } : null,
      second ? { playerId: second, base: 2 } : null,
      third ? { playerId: third, base: 3 } : null,
    ].filter(Boolean) as { playerId: string; base: number }[],
    loadedBases,
    runnerCount: loadedBases.length,
  };
}
