import { PlayerId } from '../value-objects/PlayerId';
import { FieldPosition } from '../constants/FieldPosition';
import { SoftballRules } from '../rules/SoftballRules';
import { DomainError } from '../errors/DomainError';
import type { TeamStrategy, TeamPlayer, BattingSlotState } from './TeamStrategy';

/**
 * Simplified team strategy implementation focused on current lineup state only.
 *
 * @remarks
 * SimpleTeamStrategy provides basic team management capabilities with minimal
 * complexity and no historical tracking. This implementation is ideal for:
 *
 * **Core Features**:
 * - Current batting lineup management (configurable slot limit per SoftballRules)
 * - Basic player substitution without re-entry restrictions
 * - Simple position changes without history tracking
 * - Essential lineup validation for game readiness
 * - Minimal data overhead and maximum performance
 *
 * **Simplified Business Logic**:
 * - **No Re-entry Rules**: Any player can substitute for any other player at any time
 * - **No History Tracking**: Focus only on current state, no substitution history
 * - **Flexible Substitutions**: All substitutions are treated as permanent by default
 * - **Basic Validation**: Essential checks only (valid slots, duplicate players, required positions)
 * - **Performance Optimized**: Minimal memory footprint and processing overhead
 *
 * **Key Differences from DetailedTeamStrategy**:
 * - No substitution history or re-entry rule enforcement
 * - No starter vs. substitute distinction
 * - No position change tracking
 * - Simplified validation focused on current state only
 * - Direct lineup setting capability for easy initialization
 *
 * **Business Context**:
 * This strategy is perfect for casual games, recreational leagues, or scenarios
 * where detailed tracking is unnecessary. It maintains game integrity while
 * reducing complexity and administrative overhead.
 *
 * **Use Cases**:
 * - Casual recreational softball games
 * - Youth leagues with simplified rules
 * - Pick-up games with flexible substitution policies
 * - Scenarios requiring quick lineup changes without bureaucracy
 * - Applications needing minimal memory usage
 *
 * @example
 * ```typescript
 * const strategy = new SimpleTeamStrategy();
 *
 * // Set entire lineup at once (common for casual games)
 * const lineup: BattingSlotState[] = [
 *   { slotNumber: 1, currentPlayer: pitcher, currentPosition: FieldPosition.PITCHER },
 *   { slotNumber: 2, currentPlayer: catcher, currentPosition: FieldPosition.CATCHER },
 *   // ... more players
 * ];
 * strategy.setCurrentLineup(lineup);
 *
 * // Simple substitution - no re-entry restrictions
 * strategy.substitutePlayer(1, pitcher.playerId, reliefPitcher, FieldPosition.PITCHER);
 *
 * // Player can return later if needed (casual rules)
 * strategy.substitutePlayer(1, reliefPitcher.playerId, pitcher, FieldPosition.PITCHER);
 *
 * // Validate lineup for game start
 * if (strategy.isLineupValid()) {
 *   // Ready for play
 * }
 * ```
 */
export class SimpleTeamStrategy implements TeamStrategy {
  /** Current batting lineup indexed by slot number for O(1) access */
  private readonly lineupSlots = new Map<number, BattingSlotState>();

  /** Required defensive positions for a valid softball lineup */
  private static readonly REQUIRED_POSITIONS = [
    FieldPosition.PITCHER,
    FieldPosition.CATCHER,
    FieldPosition.FIRST_BASE,
    FieldPosition.SECOND_BASE,
    FieldPosition.THIRD_BASE,
    FieldPosition.SHORTSTOP,
    FieldPosition.LEFT_FIELD,
    FieldPosition.CENTER_FIELD,
    FieldPosition.RIGHT_FIELD,
  ];

  /**
   * Sets the complete batting lineup, replacing any existing lineup.
   *
   * @param lineupData - Array of batting slot states representing the full lineup
   *
   * @throws {DomainError} When lineup data contains invalid slots, duplicates, or malformed data
   *
   * @remarks
   * This method provides a convenient way to set the entire lineup at once,
   * which is common in casual games or when initializing from saved game state.
   *
   * **Validation Rules Applied**:
   * - All batting slot numbers must be between 1 and maxPlayersPerTeam (inclusive)
   * - No duplicate batting slot numbers allowed
   * - No duplicate players across different slots
   * - All required data fields must be present and valid
   *
   * **Flexibility Features**:
   * - Non-sequential slot assignments are allowed (e.g., 1, 5, 9, 12)
   * - Empty lineup can be set by passing an empty array
   * - Complete lineup replacement on each call (no merging with existing)
   * - Automatic sorting by slot number for consistent ordering
   *
   * **Performance**: Efficient bulk update operation that validates once
   * rather than incrementally, making it ideal for initialization scenarios.
   *
   * @example
   * ```typescript
   * const lineup: BattingSlotState[] = [
   *   { slotNumber: 1, currentPlayer: pitcher, currentPosition: FieldPosition.PITCHER },
   *   { slotNumber: 3, currentPlayer: catcher, currentPosition: FieldPosition.CATCHER },
   *   // Non-sequential slots are fine
   * ];
   * strategy.setCurrentLineup(lineup);
   * ```
   */
  setCurrentLineup(
    lineupData: BattingSlotState[],
    rules: SoftballRules = new SoftballRules()
  ): void {
    // Clear existing lineup
    this.lineupSlots.clear();

    // Validate and set new lineup
    const usedSlots = new Set<number>();
    const usedPlayers = new Set<string>();

    lineupData.forEach(slot => {
      // Validate batting slot number
      SimpleTeamStrategy.validateBattingSlot(slot.slotNumber, rules);

      // Check for duplicate slots
      if (usedSlots.has(slot.slotNumber)) {
        throw new DomainError(`Duplicate batting slot ${slot.slotNumber} found in lineup`);
      }
      usedSlots.add(slot.slotNumber);

      // Check for duplicate players
      const playerKey = slot.currentPlayer.playerId.value;
      if (usedPlayers.has(playerKey)) {
        throw new DomainError(`Player ${playerKey} appears in multiple batting slots`);
      }
      usedPlayers.add(playerKey);

      // Add to lineup
      this.lineupSlots.set(slot.slotNumber, {
        slotNumber: slot.slotNumber,
        currentPlayer: slot.currentPlayer,
        currentPosition: slot.currentPosition,
      });
    });
  }

  /**
   * Retrieves the current batting order and field positions.
   *
   * @returns Array of batting slots with current player assignments, sorted by slot number
   *
   * @remarks
   * Returns the current state of the batting lineup, showing which player
   * is in each slot and their current field position. The returned array
   * is always sorted by slot number for consistent ordering.
   *
   * **Immutability**: Returns a new array on each call to prevent external
   * mutation of internal lineup state. This follows domain modeling best
   * practices for maintaining data integrity.
   *
   * **Performance**: Uses Map.values() for O(n) iteration and Array.sort()
   * for consistent ordering, optimized for typical lineup sizes (9-20 players).
   */
  getCurrentLineup(): BattingSlotState[] {
    return Array.from(this.lineupSlots.values()).sort((a, b) => a.slotNumber - b.slotNumber);
  }

  /**
   * Checks if a player is currently in the active lineup.
   *
   * @param playerId - The unique identifier of the player to check
   * @returns True if the player is currently in any batting slot
   *
   * @remarks
   * This method determines if a player is currently participating in the game
   * (i.e., assigned to a batting slot). Players not in the lineup or who have
   * been substituted out return false.
   *
   * **Performance**: Uses Map iteration with early termination for O(n)
   * performance in worst case, O(1) in best case. Suitable for typical
   * lineup sizes without optimization overhead.
   */
  isPlayerInLineup(playerId: PlayerId): boolean {
    return Array.from(this.lineupSlots.values()).some(slot =>
      slot.currentPlayer.playerId.equals(playerId)
    );
  }

  /**
   * Gets the current batting slot number for a specific player.
   *
   * @param playerId - The unique identifier of the player
   * @returns The batting slot number (1 to maxPlayersPerTeam) or undefined if not in lineup
   *
   * @remarks
   * This method provides the batting position of an active player. Returns
   * undefined if the player is not currently in the batting lineup.
   *
   * **Batting Order Integrity**: The batting slot number represents the
   * player's position in the batting order, which remains constant even
   * through substitutions (the new player takes the same slot).
   */
  getPlayerBattingSlot(playerId: PlayerId): number | undefined {
    const slots = Array.from(this.lineupSlots.values());
    const foundSlot = slots.find(slot => slot.currentPlayer.playerId.equals(playerId));
    return foundSlot?.slotNumber;
  }

  /**
   * Gets the current field position for a specific player.
   *
   * @param playerId - The unique identifier of the player
   * @returns The field position or undefined if not in lineup
   *
   * @remarks
   * This method provides the defensive position of an active player. Returns
   * undefined if the player is not currently in the lineup.
   *
   * **Position Tracking**: Reflects the most current position, including any
   * position changes made during the game. No historical tracking is maintained
   * in the simple strategy for performance and simplicity.
   */
  getPlayerFieldPosition(playerId: PlayerId): FieldPosition | undefined {
    const slots = Array.from(this.lineupSlots.values());
    const foundSlot = slots.find(slot => slot.currentPlayer.playerId.equals(playerId));
    return foundSlot?.currentPosition;
  }

  /**
   * Processes a player substitution in the lineup with simplified rules.
   *
   * @param battingSlot - The batting slot number (1 to maxPlayersPerTeam per rules) where substitution occurs
   * @param outgoingPlayerId - The player being substituted out
   * @param incomingPlayer - The new player entering the game
   * @param fieldPosition - The field position for the incoming player
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   *
   * @throws {DomainError} When batting slot is invalid, players are not eligible, or basic validation fails
   *
   * @remarks
   * This method handles player substitutions with simplified logic compared to
   * DetailedTeamStrategy. Key differences include:
   *
   * **Simplified Validation**:
   * - Batting slot must be valid and occupied
   * - Outgoing player must be the current occupant of the slot
   * - Incoming player must not already be in the lineup
   * - **No re-entry rule enforcement** - any player can substitute any time
   *
   * **No History Tracking**:
   * - No substitution history maintained
   * - No starter vs. substitute distinction
   * - No re-entry limitations or complex rule enforcement
   * - Focus on current state only for maximum simplicity
   *
   * **Flexible Substitution Policy**:
   * This approach is perfect for casual games where the focus is on
   * enjoyment rather than strict rule enforcement. Players can freely
   * enter and leave the game as needed.
   *
   * **Performance**: Minimal overhead with no historical data structures
   * to maintain, making substitutions very fast and memory-efficient.
   */
  substitutePlayer(
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    incomingPlayer: TeamPlayer,
    fieldPosition: FieldPosition,
    rules: SoftballRules = new SoftballRules()
  ): void {
    SimpleTeamStrategy.validateBattingSlot(battingSlot, rules);

    const currentSlot = this.lineupSlots.get(battingSlot);
    if (!currentSlot) {
      throw new DomainError(`No player found in batting slot ${battingSlot}`);
    }

    if (!currentSlot.currentPlayer.playerId.equals(outgoingPlayerId)) {
      throw new DomainError(
        `Player ${outgoingPlayerId.value} is not in batting slot ${battingSlot}`
      );
    }

    // Check if incoming player is already in lineup
    if (this.isPlayerInLineup(incomingPlayer.playerId)) {
      throw new DomainError('Player is already in the lineup');
    }

    // Simple substitution - update lineup directly without history tracking
    this.lineupSlots.set(battingSlot, {
      slotNumber: battingSlot,
      currentPlayer: incomingPlayer,
      currentPosition: fieldPosition,
    });
  }

  /**
   * Changes a player's field position without substitution.
   *
   * @param playerId - The player changing positions
   * @param newPosition - The new field position
   *
   * @throws {DomainError} When player is not in lineup
   *
   * @remarks
   * This method handles defensive position changes during the game, such as:
   * - Strategic repositioning based on batter tendencies
   * - Moving players between positions for defensive optimization
   * - Handling pitcher/fielder position swaps
   *
   * **Simplified Tracking**: Unlike DetailedTeamStrategy, no position change
   * history is maintained. Only the current position is tracked for maximum
   * simplicity and performance.
   *
   * **Batting Order**: Position changes do not affect the batting order.
   * The player maintains their batting slot while changing their defensive
   * assignment.
   */
  changePlayerPosition(playerId: PlayerId, newPosition: FieldPosition): void {
    let targetSlot: BattingSlotState | undefined;
    let slotNumber: number | undefined;

    // Find the player's current slot
    const entries = Array.from(this.lineupSlots.entries());
    const foundEntry = entries.find(([, state]) => state.currentPlayer.playerId.equals(playerId));
    if (foundEntry) {
      [slotNumber, targetSlot] = foundEntry;
    }

    if (!targetSlot || slotNumber === undefined) {
      throw new DomainError('Player is not currently in the lineup');
    }

    // Update position in lineup - no history tracking
    this.lineupSlots.set(slotNumber, {
      ...targetSlot,
      currentPosition: newPosition,
    });
  }

  /**
   * Validates that the current lineup meets basic game requirements.
   *
   * @returns True if lineup is valid for game play
   *
   * @remarks
   * This method checks that the current lineup configuration meets the basic
   * requirements for softball gameplay with simplified validation:
   *
   * **Minimum Player Requirements**:
   * - At least 9 players in the lineup (standard softball minimum)
   * - Maximum per SoftballRules.maxPlayersPerTeam configuration
   *
   * **Essential Position Coverage**:
   * - All required defensive positions must be filled
   * - Required positions: P, C, 1B, 2B, 3B, SS, LF, CF, RF
   * - Optional positions: SF, EP automatically considered valid
   *
   * **Simplified Validation**:
   * - No complex rule checking beyond basic requirements
   * - Focus on essential game readiness only
   * - Performance optimized for frequent validation calls
   *
   * **Use Cases**:
   * - Pre-game lineup validation
   * - Real-time compliance checking during lineup changes
   * - Quick readiness verification for casual games
   */
  isLineupValid(rules: SoftballRules = new SoftballRules()): boolean {
    const lineup = this.getCurrentLineup();

    // Must have at least 9 players but not exceed maximum
    if (lineup.length < 9 || lineup.length > rules.maxPlayersPerTeam) {
      return false;
    }

    // Check for required positions
    const currentPositions = new Set(lineup.map(slot => slot.currentPosition));

    // All required defensive positions must be covered
    const hasAllRequiredPositions = SimpleTeamStrategy.REQUIRED_POSITIONS.every(requiredPosition =>
      currentPositions.has(requiredPosition)
    );

    if (!hasAllRequiredPositions) {
      return false;
    }

    return true;
  }

  /**
   * Gets the total number of players currently in the batting lineup.
   *
   * @returns The count of active batting slots
   *
   * @remarks
   * This method returns the number of players currently in batting positions.
   *
   * **Performance**: Uses Map.size for O(1) performance regardless of
   * lineup size or complexity.
   *
   * **Consistency**: Count reflects actual batting slots occupied, which may
   * be non-sequential (e.g., slots 1, 3, 7, 12 would return count of 4).
   */
  getActivePlayerCount(): number {
    return this.lineupSlots.size;
  }

  /**
   * Validates that a batting slot number is within the valid range.
   *
   * @param battingSlot - The batting slot number to validate
   * @param rules - Softball rules configuration defining maximum players per team
   * @throws {DomainError} When batting slot is not within valid range
   *
   * @remarks
   * **Softball Batting Order Rules**:
   * - Minimum 1 player (though 9+ required for valid game)
   * - Maximum per SoftballRules.maxPlayersPerTeam configuration
   * - Slots can be filled non-sequentially for flexibility
   * - Extra Player (EP) rules support larger lineups based on league configuration
   *
   * **Validation Scope**: This is the only complex validation maintained
   * in SimpleTeamStrategy to ensure basic game rule compliance while
   * keeping complexity minimal.
   */
  private static validateBattingSlot(battingSlot: number, rules: SoftballRules): void {
    if (battingSlot < 1 || battingSlot > rules.maxPlayersPerTeam) {
      throw new DomainError(`Batting slot must be between 1 and ${rules.maxPlayersPerTeam}`);
    }
  }
}
