import { DomainError } from '../errors/DomainError';
import { PlayerId } from './PlayerId';

/**
 * Represents a single stint of a player in a specific batting slot during a game.
 *
 * @remarks
 * In softball, players can be substituted and starters can re-enter the game.
 * This class tracks each individual period a player occupies a batting slot,
 * including when they entered, when they left (if applicable), and whether
 * this represents their initial starting position or a subsequent entry.
 *
 * The temporal semantics are crucial:
 * - enteredInning: The inning when the player first batted in this slot stint
 * - exitedInning: The inning when they were substituted out (undefined if still active)
 * - wasStarter: True only for the original starter in this slot
 * - isReentry: True when a previously substituted starter returns to the game
 *
 * @example
 * ```typescript
 * // Original starter plays innings 1-5
 * const starterStint = new SlotHistory(starterId, 1, 6, true, false);
 *
 * // Substitute plays innings 6-8
 * const substituteStint = new SlotHistory(subId, 6, 9, false, false);
 *
 * // Starter re-enters for inning 9+
 * const reentryStint = new SlotHistory(starterId, 9, undefined, false, true);
 * ```
 */
export class SlotHistory {
  /**
   * Creates a new SlotHistory representing one stint of a player in a batting slot.
   *
   * @param playerId - The unique identifier of the player in this stint
   * @param enteredInning - The inning when the player began batting in this slot (1-based)
   * @param exitedInning - The inning when substituted out, or undefined if still active
   * @param wasStarter - True if this represents the original starting lineup position
   * @param isReentry - True if this is a starter returning after being substituted
   *
   * @throws {DomainError} When enteredInning is less than 1
   * @throws {DomainError} When exitedInning is not greater than enteredInning
   *
   * @remarks
   * The wasStarter flag should only be true for the very first SlotHistory entry
   * in a slot's timeline. The isReentry flag implements softball re-entry rules:
   * starters can return to the game after being substituted, but non-starters cannot.
   */
  constructor(
    readonly playerId: PlayerId,
    readonly enteredInning: number,
    readonly exitedInning: number | undefined,
    readonly wasStarter: boolean,
    readonly isReentry: boolean
  ) {
    if (enteredInning < 1) {
      throw new DomainError('Entered inning must be at least 1');
    }

    if (exitedInning !== undefined && exitedInning <= enteredInning) {
      throw new DomainError('Exited inning must be greater than entered inning');
    }
  }

  /**
   * Determines if this SlotHistory is equal to another SlotHistory.
   *
   * @param other - The SlotHistory to compare against
   * @returns True if all properties are equal, false otherwise
   *
   * @remarks
   * Value object equality - two SlotHistory instances are equal if all their
   * properties match exactly. This includes player identity, timing, and flags.
   */
  equals(other: SlotHistory): boolean {
    if (!other || !(other instanceof SlotHistory)) {
      return false;
    }

    return (
      this.playerId.equals(other.playerId) &&
      this.enteredInning === other.enteredInning &&
      this.exitedInning === other.exitedInning &&
      this.wasStarter === other.wasStarter &&
      this.isReentry === other.isReentry
    );
  }

  /**
   * Determines if this player stint is currently active in the batting slot.
   *
   * @returns True if the player has not been substituted out (exitedInning is undefined)
   *
   * @remarks
   * An active stint means the player is currently eligible to bat when their
   * slot comes up in the batting order. Only one SlotHistory per batting slot
   * should be active at any given time.
   */
  isCurrentlyActive(): boolean {
    return this.exitedInning === undefined;
  }

  /**
   * Calculates the number of innings this player played during this stint.
   *
   * @param currentInning - Required for active players; the current game inning
   * @returns The number of complete or partial innings played in this stint
   *
   * @throws {DomainError} When currentInning is required but not provided
   *
   * @remarks
   * For completed stints (has exitedInning), counts from enteredInning to exitedInning (exclusive).
   * For active stints (no exitedInning), counts from enteredInning to currentInning (inclusive).
   *
   * Examples:
   * - Played innings 3,4,5,6 then substituted in inning 7: returns 4
   * - Started inning 2, still active in inning 5: returns 4 (innings 2,3,4,5)
   */
  getInningsPlayed(currentInning?: number): number {
    if (this.exitedInning !== undefined) {
      // Player has exited - count from entered to exited (exclusive)
      return this.exitedInning - this.enteredInning;
    }

    // Player is still active - count from entered to current (inclusive)
    if (currentInning === undefined) {
      throw new DomainError('Current inning must be provided for active players');
    }

    return currentInning - this.enteredInning + 1;
  }
}

/**
 * Represents a position in the batting order with complete substitution history.
 *
 * @remarks
 * A batting slot corresponds to a position in the batting order (1-20) and tracks
 * all players who have occupied that position throughout the game. In softball:
 *
 * - Positions 1-9: Traditional batting order
 * - Positions 10-20: Extra Players (EP) and Designated Hitters (DH)
 * - Players can be substituted at any time between innings
 * - Original starters can re-enter the game (re-entry rule)
 * - Non-starters cannot re-enter once substituted out
 *
 * The BattingSlot is an immutable value object that maintains a complete history
 * of all player changes, enabling undo/redo functionality and rule validation.
 *
 * @example
 * ```typescript
 * // Create initial lineup with starter
 * const slot3 = BattingSlot.createWithStarter(3, new PlayerId('starter-123'));
 *
 * // Substitute in a new player in inning 5
 * const withSub = slot3.substitutePlayer(new PlayerId('sub-456'), 5, false);
 *
 * // Original starter re-enters in inning 8
 * const withReentry = withSub.substitutePlayer(new PlayerId('starter-123'), 8, true);
 *
 * console.log(withReentry.getCurrentPlayer()); // starter-123
 * console.log(withReentry.getTotalInningsPlayed(new PlayerId('starter-123'), 9)); // 7 innings
 * ```
 */
export class BattingSlot {
  /**
   * Creates a new BattingSlot with specified position, current player, and history.
   *
   * @param position - The batting order position (1-20)
   * @param currentPlayer - The player currently occupying this slot
   * @param history - Complete chronological history of all players in this slot
   *
   * @throws {DomainError} When position is not between 1 and 20
   * @throws {DomainError} When history is empty
   * @throws {DomainError} When currentPlayer doesn't have an active history entry
   *
   * @remarks
   * Position range 1-20 supports both traditional 9-player lineups and
   * extended lineups with Extra Players (EP) and Designated Hitters (DH).
   * The history must contain at least one entry, and the currentPlayer must
   * have an active (non-exited) entry in that history.
   */
  constructor(
    readonly position: number,
    readonly currentPlayer: PlayerId,
    readonly history: SlotHistory[]
  ) {
    if (position < 1 || position > 20) {
      throw new DomainError('Batting position must be between 1 and 20');
    }

    if (history.length === 0) {
      throw new DomainError('Batting slot must have at least one history entry');
    }

    // Validate that current player has an active history entry
    const hasActiveEntry = history.some(
      h => h.playerId.equals(currentPlayer) && h.isCurrentlyActive()
    );

    if (!hasActiveEntry) {
      throw new DomainError('Current player must have an active history entry (no exit inning)');
    }
  }

  /**
   * Factory method to create a new BattingSlot with an initial starter.
   *
   * @param position - The batting order position (1-20)
   * @param starterId - The player who starts in this batting slot
   * @returns A new BattingSlot with the starter as the only history entry
   *
   * @throws {DomainError} When position is not between 1 and 20
   *
   * @remarks
   * This is the preferred way to create batting slots for initial lineup setup.
   * The starter is marked as entering in inning 1 with wasStarter=true and
   * isReentry=false. They begin as the active player with no exit inning.
   *
   * @example
   * ```typescript
   * // Create batting slot 4 with initial starter
   * const slot4 = BattingSlot.createWithStarter(4, new PlayerId('player-789'));
   * ```
   */
  static createWithStarter(position: number, starterId: PlayerId): BattingSlot {
    const starterHistory = new SlotHistory(starterId, 1, undefined, true, false);
    return new BattingSlot(position, starterId, [starterHistory]);
  }

  /**
   * Creates a new BattingSlot with a player substituted into this position.
   *
   * @param newPlayerId - The player being substituted into this slot
   * @param inInning - The inning when the substitution occurs (must be > current player's entry inning)
   * @param isReentry - True if this substitution represents a starter re-entering
   * @returns A new BattingSlot with updated current player and history
   *
   * @throws {DomainError} When no active player found in history
   * @throws {DomainError} When attempting to substitute in the same inning the current player entered
   *
   * @remarks
   * This method implements softball substitution rules:
   * - Substitutions can only occur between innings or during an inning before the player bats
   * - Current player is marked as exited in the specified inning
   * - New player becomes active with no exit inning
   * - isReentry flag should be true only when a starter returns to the game
   *
   * The method returns a new immutable BattingSlot instance, preserving the
   * complete history for undo/redo functionality.
   *
   * @example
   * ```typescript
   * // Substitute a new player in inning 6
   * const withSub = originalSlot.substitutePlayer(
   *   new PlayerId('substitute-123'),
   *   6,
   *   false
   * );
   *
   * // Starter re-enters in inning 8
   * const withReentry = withSub.substitutePlayer(
   *   new PlayerId('original-starter'),
   *   8,
   *   true
   * );
   * ```
   */
  substitutePlayer(newPlayerId: PlayerId, inInning: number, isReentry: boolean): BattingSlot {
    // Find the current active player's history entry
    const currentPlayerHistory = this.history.find(
      h => h.playerId.equals(this.currentPlayer) && h.isCurrentlyActive()
    );

    if (!currentPlayerHistory) {
      throw new DomainError('No active player found in history');
    }

    if (inInning <= currentPlayerHistory.enteredInning) {
      throw new DomainError('Cannot substitute in the same inning the current player entered');
    }

    // Create new history with current player marked as exited
    const updatedHistory = this.history.map(h =>
      h === currentPlayerHistory
        ? new SlotHistory(
            h.playerId,
            h.enteredInning,
            inInning, // Mark as exited in this inning
            h.wasStarter,
            h.isReentry
          )
        : h
    );

    // Add new player's history entry
    const newPlayerHistory = new SlotHistory(
      newPlayerId,
      inInning,
      undefined, // Active player
      false, // This entry is not a starter
      isReentry
    );

    return new BattingSlot(this.position, newPlayerId, [...updatedHistory, newPlayerHistory]);
  }

  /**
   * Determines if this BattingSlot is equal to another BattingSlot.
   *
   * @param other - The BattingSlot to compare against
   * @returns True if position, current player, and all history match exactly
   *
   * @remarks
   * Value object equality - two BattingSlot instances are equal if their
   * position, current player, and complete history are identical. This includes
   * the order of history entries, as the substitution sequence matters for
   * game rules and replay functionality.
   */
  equals(other: BattingSlot): boolean {
    if (!other || !(other instanceof BattingSlot)) {
      return false;
    }

    if (this.position !== other.position) {
      return false;
    }

    if (!this.currentPlayer.equals(other.currentPlayer)) {
      return false;
    }

    if (this.history.length !== other.history.length) {
      return false;
    }

    return this.history.every((h, index) => {
      const otherHistory = other.history[index];
      return otherHistory ? h.equals(otherHistory) : false;
    });
  }

  /**
   * Gets the player currently occupying this batting slot.
   *
   * @returns The PlayerId of the current active player
   *
   * @remarks
   * This is the player who will bat when this slot's turn comes up in the
   * batting order. There should always be exactly one active player per slot.
   */
  getCurrentPlayer(): PlayerId {
    return this.currentPlayer;
  }

  /**
   * Gets the complete substitution history for this batting slot.
   *
   * @returns A copy of the chronological history of all player stints
   *
   * @remarks
   * Returns a defensive copy to preserve immutability. The history is ordered
   * chronologically by when each player entered the slot. This complete record
   * enables undo/redo functionality and validates re-entry rules.
   */
  getHistory(): SlotHistory[] {
    return [...this.history]; // Return a copy to preserve immutability
  }

  /**
   * Determines if the specified player was the original starter in this slot.
   *
   * @param playerId - The player to check
   * @returns True if the player has a history entry with wasStarter=true
   *
   * @remarks
   * Only the original lineup player should have wasStarter=true. This is used
   * to implement re-entry rules: starters can return to the game after being
   * substituted, but non-starters cannot re-enter once they leave.
   */
  wasPlayerStarter(playerId: PlayerId): boolean {
    return this.history.some(h => h.playerId.equals(playerId) && h.wasStarter);
  }

  /**
   * Determines if the specified player has ever occupied this batting slot.
   *
   * @param playerId - The player to check
   * @returns True if the player appears in any history entry for this slot
   *
   * @remarks
   * This checks the complete history, including players who may have been
   * substituted out. Used for validation (e.g., ensuring a player doesn't
   * occupy multiple batting slots simultaneously) and statistics tracking.
   */
  hasPlayerPlayed(playerId: PlayerId): boolean {
    return this.history.some(h => h.playerId.equals(playerId));
  }

  /**
   * Gets all history entries for a specific player in this batting slot.
   *
   * @param playerId - The player whose history to retrieve
   * @returns Array of SlotHistory entries for the specified player
   *
   * @remarks
   * A player may have multiple history entries if they were substituted out
   * and later re-entered the game. This is particularly relevant for starters
   * who can re-enter under softball rules. Returns empty array if player
   * never played in this slot.
   */
  getPlayerHistory(playerId: PlayerId): SlotHistory[] {
    return this.history.filter(h => h.playerId.equals(playerId));
  }

  /**
   * Calculates the total innings a player has been active in this batting slot.
   *
   * @param playerId - The player whose innings to calculate
   * @param currentInning - The current game inning (required for active players)
   * @returns Total number of innings the player has been in this slot
   *
   * @remarks
   * Sums innings across all of the player's stints in this slot. This handles
   * complex scenarios like starter re-entry where a player may have multiple
   * separate periods of activity. Used for statistics and playing time analysis.
   *
   * @example
   * ```typescript
   * // Starter played innings 1-4, then re-entered for innings 8-9
   * const totalInnings = slot.getTotalInningsPlayed(starterId, 9);
   * // Returns 6 (innings 1,2,3,4,8,9)
   * ```
   */
  getTotalInningsPlayed(playerId: PlayerId, currentInning: number): number {
    const playerHistories = this.getPlayerHistory(playerId);

    if (playerHistories.length === 0) {
      return 0;
    }

    return playerHistories.reduce(
      (total, history) => total + history.getInningsPlayed(currentInning),
      0
    );
  }
}
