import { PlayerId } from '../value-objects/PlayerId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { FieldPosition } from '../constants/FieldPosition';

/**
 * Represents a player in a team lineup with their basic information.
 *
 * @remarks
 * This interface defines the minimal information needed to track a player
 * within a team lineup. Different strategy implementations may extend this
 * with additional details or use it as-is for simplified tracking.
 */
export interface TeamPlayer {
  /** The unique identifier for the player */
  readonly playerId: PlayerId;
  /** The player's jersey number for identification */
  readonly jerseyNumber: JerseyNumber;
  /** The player's name for display and communication */
  readonly name: string;
}

/**
 * Represents the current state of a batting slot in the lineup.
 *
 * @remarks
 * This interface captures who is currently active in each batting slot,
 * including their field position. It provides the foundation for tracking
 * substitutions and position changes throughout the game.
 */
export interface BattingSlotState {
  /** The batting slot number (1-20) */
  readonly slotNumber: number;
  /** The player currently occupying this batting slot */
  readonly currentPlayer: TeamPlayer;
  /** The field position this player is currently playing */
  readonly currentPosition: FieldPosition;
}

/**
 * Strategy interface for managing team lineup and player tracking.
 *
 * @remarks
 * This interface implements the Strategy pattern to allow different approaches
 * to team management based on game complexity and tracking requirements:
 *
 * - **DetailedTeamStrategy**: Full player tracking with names, statistics,
 *   substitution history, and comprehensive game management
 * - **SimpleTeamStrategy**: Minimal tracking focused on current lineup state
 *   without detailed history or complex player management
 *
 * The strategy pattern enables flexibility in how teams are managed while
 * maintaining a consistent interface for the domain layer. Different leagues,
 * game types, or user preferences can choose the appropriate strategy.
 *
 * @example
 * ```typescript
 * // Using detailed strategy for tournament play
 * const detailedStrategy = new DetailedTeamStrategy();
 * await detailedStrategy.addPlayer(player, jerseyNumber, name);
 *
 * // Using simple strategy for casual games
 * const simpleStrategy = new SimpleTeamStrategy();
 * simpleStrategy.setCurrentLineup(slots);
 * ```
 */
export interface TeamStrategy {
  /**
   * Retrieves the current batting order and field positions.
   *
   * @returns Array of batting slots with current player assignments
   *
   * @remarks
   * This method provides the current state of the batting lineup, showing
   * which player is in each slot and their current field position. The
   * returned array should be ordered by slot number (1-20).
   */
  getCurrentLineup(): BattingSlotState[];

  /**
   * Checks if a player is currently in the active lineup.
   *
   * @param playerId - The unique identifier of the player to check
   * @returns True if the player is currently in any batting slot
   *
   * @remarks
   * This method determines if a player is currently participating in the game
   * (i.e., assigned to a batting slot). Players on the bench or substituted
   * out would return false.
   */
  isPlayerInLineup(playerId: PlayerId): boolean;

  /**
   * Gets the current batting slot number for a specific player.
   *
   * @param playerId - The unique identifier of the player
   * @returns The batting slot number (1-20) or undefined if not in lineup
   *
   * @remarks
   * This method provides the batting position of an active player. Returns
   * undefined if the player is not currently in the batting lineup (on bench
   * or substituted out).
   */
  getPlayerBattingSlot(playerId: PlayerId): number | undefined;

  /**
   * Gets the current field position for a specific player.
   *
   * @param playerId - The unique identifier of the player
   * @returns The field position or undefined if not in lineup
   *
   * @remarks
   * This method provides the defensive position of an active player. Returns
   * undefined if the player is not currently in the lineup or is playing
   * as an Extra Player (EP) who doesn't have a defensive position.
   */
  getPlayerFieldPosition(playerId: PlayerId): FieldPosition | undefined;

  /**
   * Processes a player substitution in the lineup.
   *
   * @param battingSlot - The batting slot number (1-20) where substitution occurs
   * @param outgoingPlayerId - The player being substituted out
   * @param incomingPlayer - The new player entering the game
   * @param fieldPosition - The field position for the incoming player
   *
   * @throws {DomainError} When batting slot is invalid or players are not eligible
   *
   * @remarks
   * This method handles the complex logic of player substitutions, including:
   * - Validating the substitution is legal (correct player in slot)
   * - Managing substitution history for re-entry rules
   * - Updating both batting order and field positions
   * - Ensuring defensive position coverage
   */
  substitutePlayer(
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    incomingPlayer: TeamPlayer,
    fieldPosition: FieldPosition
  ): void;

  /**
   * Changes a player's field position without substitution.
   *
   * @param playerId - The player changing positions
   * @param newPosition - The new field position
   *
   * @throws {DomainError} When player is not in lineup or position is invalid
   *
   * @remarks
   * This method handles defensive position changes during the game, such as:
   * - Strategic repositioning based on batter tendencies
   * - Moving players between positions for defensive optimization
   * - Handling pitcher/fielder position swaps
   *
   * Unlike substitution, this keeps the same player in the game but changes
   * their defensive assignment.
   */
  changePlayerPosition(playerId: PlayerId, newPosition: FieldPosition): void;

  /**
   * Validates that the current lineup meets game requirements.
   *
   * @returns True if lineup is valid for game play
   *
   * @remarks
   * This method checks that the current lineup configuration meets the basic
   * requirements for softball gameplay:
   * - Minimum required players (typically 9-10)
   * - No duplicate players in multiple slots
   * - Valid field position assignments
   * - Compliance with league-specific rules
   */
  isLineupValid(): boolean;

  /**
   * Gets the total number of players currently in the batting lineup.
   *
   * @returns The count of active batting slots
   *
   * @remarks
   * This method returns the number of players currently in batting positions.
   * This may be different from the total team roster size, as some players
   * may be on the bench or substituted out.
   */
  getActivePlayerCount(): number;
}
