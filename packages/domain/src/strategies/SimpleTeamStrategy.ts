import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { BaseTeamStrategy } from './BaseTeamStrategy.js';
import type { TeamPlayer, BattingSlotState } from './TeamStrategy.js';

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
export class SimpleTeamStrategy extends BaseTeamStrategy {
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
}
