/**
 * @file PlayerInGameDTO
 * DTO representing a player's complete in-game information and statistics.
 *
 * @remarks
 * This DTO represents a player's complete state during a game, combining
 * their basic information, current position assignments, performance history,
 * and calculated statistics. It serves as the comprehensive player view
 * for use cases that need complete player context.
 *
 * The DTO includes both current game information (batting order position,
 * field position) and historical performance data (plate appearances,
 * cumulative statistics). This enables use cases to make informed decisions
 * about lineup changes, strategic substitutions, and performance analysis.
 *
 * Position assignments can change during the game through substitutions,
 * but the batting order position typically remains constant (players
 * substitute into existing slots rather than creating new ones).
 *
 * @example
 * ```typescript
 * const player: PlayerInGameDTO = {
 *   playerId: PlayerId.create(),
 *   name: 'John Smith',
 *   jerseyNumber: JerseyNumber.create(15),
 *   battingOrderPosition: 4, // Cleanup hitter
 *   currentFieldPosition: FieldPosition.FIRST_BASE,
 *   preferredPositions: [FieldPosition.FIRST_BASE, FieldPosition.LEFT_FIELD],
 *   plateAppearances: [single, double, walk],
 *   statistics: playerStats // Calculated batting and fielding stats
 * };
 * ```
 */

import { PlayerId, JerseyNumber, FieldPosition } from '@twsoftball/domain';

import { AtBatResultDTO } from './AtBatResultDTO';
import { PlayerStatisticsDTO } from './PlayerStatisticsDTO';

/**
 * DTO representing a player's complete in-game information and statistics.
 *
 * @remarks
 * This interface combines a player's identity, current game assignments,
 * performance history, and calculated statistics into a single comprehensive
 * view. It's used throughout the application layer when complete player
 * context is needed.
 *
 * Batting order position rules:
 * - Positions 1-9: Required starting lineup positions
 * - Positions 10-30: Extra player positions (optional)
 * - Position 0: Bench player (not in batting order)
 *
 * Field position assignments:
 * - currentFieldPosition: Where the player is positioned right now
 * - preferredPositions: Where the player is most effective (for strategic decisions)
 *
 * Performance tracking:
 * - plateAppearances: Individual at-bat results from this game
 * - statistics: Calculated batting and fielding statistics
 */
export interface PlayerInGameDTO {
  /** Unique identifier for this player */
  readonly playerId: PlayerId;

  /** Player's display name for roster and statistics */
  readonly name: string;

  /** Player's uniform number (1-99) */
  readonly jerseyNumber: JerseyNumber;

  /**
   * Current position in batting order
   * 1-9: Starting lineup positions
   * 10-30: Extra player positions
   * 0: Bench player (not in batting order)
   */
  readonly battingOrderPosition: number;

  /** Current defensive field position assignment */
  readonly currentFieldPosition: FieldPosition;

  /**
   * Field positions where this player is most effective
   * Used for strategic decision-making and substitution planning
   */
  readonly preferredPositions: FieldPosition[];

  /**
   * All plate appearances by this player in current game
   * Includes at-bat results, RBI, and timing information
   * Ordered chronologically (earliest first)
   */
  readonly plateAppearances: AtBatResultDTO[];

  /**
   * Calculated batting and fielding statistics for this player
   * Updated in real-time as game progresses
   * Includes current game and potentially season totals
   */
  readonly statistics: PlayerStatisticsDTO;
}
