/**
 * @file TeamLineupDTO
 * DTO representing a team's lineup state including batting order and field positions.
 *
 * @remarks
 * This DTO represents the complete state of a team's lineup from the TeamLineup
 * aggregate. It includes both the batting order configuration and current field
 * position assignments, along with historical information about substitutions.
 *
 * The batting slots represent the permanent batting order positions (1-30),
 * while field positions show current defensive assignments. Players can be
 * substituted in and out of the game, but their batting slot number remains
 * constant throughout the game.
 *
 * Strategy types determine how the lineup is managed:
 * - DETAILED: Full roster management with individual player tracking
 * - SIMPLE: Basic lineup with minimal substitution tracking
 *
 * @example
 * ```typescript
 * const homeLineup: TeamLineupDTO = {
 *   teamLineupId: TeamLineupId.create(),
 *   gameId: GameId.create(),
 *   teamSide: 'HOME',
 *   teamName: 'Eagles',
 *   strategy: 'DETAILED',
 *   battingSlots: [
 *     { slotNumber: 1, currentPlayer: leadoffHitter, history: [...] },
 *     { slotNumber: 2, currentPlayer: secondBatter, history: [...] }
 *   ],
 *   fieldPositions: { PITCHER: playerId, CATCHER: playerId2, ... },
 *   benchPlayers: [reservePlayer1, reservePlayer2],
 *   substitutionHistory: [substitution1, substitution2]
 * };
 * ```
 */

import { GameId, PlayerId, TeamLineupId, FieldPosition } from '@twsoftball/domain';

import { PlayerInGameDTO } from './PlayerInGameDTO';

/**
 * DTO representing a team's complete lineup state.
 *
 * @remarks
 * This interface represents the lineup state from the TeamLineup aggregate,
 * including both active players and historical information. The batting slots
 * maintain the batting order structure, while field positions track current
 * defensive assignments.
 *
 * Substitution rules in softball:
 * - Players can be substituted once and may re-enter once in their original slot
 * - Batting order must be maintained (slot numbers never change)
 * - All field positions must be filled during defensive play
 *
 * The history tracking enables proper enforcement of re-entry rules and
 * provides complete audit trails for official scorekeeping.
 */
export interface TeamLineupDTO {
  /** Unique identifier for this team's lineup */
  readonly teamLineupId: TeamLineupId;

  /** Reference to the game this lineup belongs to */
  readonly gameId: GameId;

  /** Which side of the field this team occupies */
  readonly teamSide: 'HOME' | 'AWAY';

  /** Display name for this team */
  readonly teamName: string;

  /**
   * Strategy type for lineup management
   * DETAILED: Full player tracking with statistics
   * SIMPLE: Basic lineup with minimal data
   */
  readonly strategy: 'DETAILED' | 'SIMPLE';

  /**
   * Batting order slots with current assignments and history
   * Slots 1-9 are required starters, 10-30 are for extra players
   */
  readonly battingSlots: BattingSlotDTO[];

  /**
   * Current field position assignments
   * Maps each defensive position to the player currently playing it
   */
  readonly fieldPositions: Record<FieldPosition, PlayerId | null>;

  /**
   * Players not currently in the lineup but available for substitution
   * These players are part of the roster but not in batting order
   */
  readonly benchPlayers: PlayerInGameDTO[];

  /**
   * Complete history of all substitutions made during the game
   * Used for enforcing re-entry rules and official scorekeeping
   */
  readonly substitutionHistory: SubstitutionRecordDTO[];
}

/**
 * DTO representing a batting slot with its current assignment and history.
 *
 * @remarks
 * Each batting slot represents a permanent position in the batting order.
 * The slot number (1-30) never changes, but the player assigned to that
 * slot can change through substitution. The history tracks all players
 * who have occupied this slot during the game.
 *
 * Batting slot rules:
 * - Slot numbers 1-9: Required starting positions
 * - Slot numbers 10-30: Extra players (optional)
 * - Players must bat in numerical slot order
 * - Substitutions maintain slot assignments
 */
export interface BattingSlotDTO {
  /** Permanent batting order position (1-30) */
  readonly slotNumber: number;

  /**
   * Player currently assigned to this slot
   * Null if slot is temporarily empty (rare, typically only during substitutions)
   */
  readonly currentPlayer: PlayerInGameDTO | null;

  /**
   * Complete history of all players who have occupied this slot
   * Includes entry/exit innings and substitution context
   */
  readonly history: SlotHistoryDTO[];
}

/**
 * DTO representing the history of a specific batting slot.
 *
 * @remarks
 * This tracks when players entered and exited each batting slot,
 * which is essential for enforcing softball's re-entry rules.
 * Each player can re-enter the game once in their original slot
 * after being substituted out.
 */
export interface SlotHistoryDTO {
  /** Player who occupied this slot during this period */
  readonly playerId: PlayerId;

  /** Display name of the player for reporting purposes */
  readonly playerName: string;

  /** Inning when this player first entered this slot */
  readonly enteredInning: number;

  /**
   * Inning when this player exited this slot
   * Undefined if player is still in the slot
   */
  readonly exitedInning: number | undefined;

  /**
   * Whether this player was in the starting lineup for this slot
   * Used to determine re-entry eligibility
   */
  readonly wasStarter: boolean;

  /**
   * Whether this represents a re-entry of a previously substituted player
   * Players can only re-enter once in their original slot
   */
  readonly isReentry: boolean;
}

/**
 * DTO representing a substitution that occurred during the game.
 *
 * @remarks
 * This records the complete context of each substitution for official
 * scorekeeping and rule enforcement. Softball has specific rules about
 * when substitutions can occur and how they affect player eligibility.
 *
 * Substitution timing rules:
 * - Can occur between innings or during timeouts
 * - Must be reported to umpire before player enters game
 * - Once substituted, original player can only re-enter in same slot
 */
export interface SubstitutionRecordDTO {
  /** Player entering the game */
  readonly incomingPlayerId: PlayerId;

  /** Player leaving the game */
  readonly outgoingPlayerId: PlayerId;

  /** Display name of incoming player */
  readonly incomingPlayerName: string;

  /** Display name of outgoing player */
  readonly outgoingPlayerName: string;

  /** Batting order slot affected by this substitution */
  readonly battingSlot: number;

  /** Inning when substitution took effect */
  readonly inning: number;

  /**
   * Whether the incoming player is re-entering after previous substitution
   * Re-entry is only allowed once per player in their original slot
   */
  readonly isReentry: boolean;

  /** Exact time when substitution was recorded */
  readonly timestamp: Date;
}
