/**
 * @file GameStateDTO
 * Composite DTO representing complete game state across all aggregates.
 *
 * @remarks
 * This DTO combines data from Game, TeamLineup, and InningState aggregates
 * to provide a complete view of the current game state. This is essential
 * for use cases that need to operate across multiple aggregates or provide
 * comprehensive game information to the presentation layer.
 *
 * The DTO follows the composition pattern where each aggregate contributes
 * specific data:
 * - Game: Overall game metadata, status, and score
 * - InningState: Current play situation (inning, outs, bases, current batter)
 * - TeamLineup: Both home and away team roster and lineup information
 *
 * @example
 * ```typescript
 * // Typical usage in a use case
 * const gameState: GameStateDTO = {
 *   gameId: GameId.create(),
 *   status: GameStatus.IN_PROGRESS,
 *   score: { home: 5, away: 3, leader: 'HOME', difference: 2 },
 *   currentInning: 3,
 *   isTopHalf: false,
 *   battingTeam: 'HOME',
 *   outs: 1,
 *   bases: { first: playerId, second: null, third: null },
 *   currentBatter: { playerId, name: 'John Smith', ... },
 *   homeLineup: teamLineupDTO,
 *   awayLineup: teamLineupDTO,
 *   lastUpdated: new Date()
 * };
 * ```
 */

import { GameId, GameStatus } from '@twsoftball/domain';

import { BasesStateDTO } from './BasesStateDTO.js';
import { GameScoreDTO } from './GameScoreDTO.js';
import { PlayerInGameDTO } from './PlayerInGameDTO.js';
import { TeamLineupDTO } from './TeamLineupDTO.js';

/**
 * Composite DTO representing complete game state across all aggregates.
 *
 * @remarks
 * This DTO serves as the primary data structure for communicating complete
 * game state from the application layer to external layers (web, mobile).
 * It aggregates information from multiple domain aggregates while maintaining
 * clear separation of concerns.
 *
 * The batting team designation ('HOME' | 'AWAY') should always align with
 * the isTopHalf flag:
 * - Top half (isTopHalf: true): Away team bats
 * - Bottom half (isTopHalf: false): Home team bats
 *
 * The outs field represents the current number of outs in the half-inning
 * and must be 0-2. When 3 outs occur, the inning automatically advances.
 */
export interface GameStateDTO {
  // From Game aggregate - overall game coordination
  /** Unique identifier for the game */
  readonly gameId: GameId;

  /** Current status of the game (NOT_STARTED, IN_PROGRESS, COMPLETED) */
  readonly status: GameStatus;

  /** Current score for both teams with leader calculation */
  readonly score: GameScoreDTO;

  /** When the game was started (first pitch time), null if not started yet */
  readonly gameStartTime: Date | null;

  // From InningState aggregate - current play situation
  /** Current inning number (1-based) */
  readonly currentInning: number;

  /**
   * Whether we're in the top half of the inning
   * Top half: away team bats, Bottom half: home team bats
   */
  readonly isTopHalf: boolean;

  /** Which team is currently batting ('HOME' | 'AWAY') */
  readonly battingTeam: 'HOME' | 'AWAY';

  /** Number of outs in current half-inning (0-2) */
  readonly outs: number;

  /** Current state of all bases including runners */
  readonly bases: BasesStateDTO;

  /** Current batter's position in the batting order (1-based) */
  readonly currentBatterSlot: number;

  // From TeamLineup aggregates - both home and away teams
  /** Complete home team lineup and roster information */
  readonly homeLineup: TeamLineupDTO;

  /** Complete away team lineup and roster information */
  readonly awayLineup: TeamLineupDTO;

  // Composite calculated fields - derived from multiple aggregates
  /**
   * Current batter's complete information, null if between batters
   * This is derived by looking up currentBatterSlot in the batting team's lineup
   */
  readonly currentBatter: PlayerInGameDTO | null;

  /** When this game state snapshot was last updated */
  readonly lastUpdated: Date;
}
