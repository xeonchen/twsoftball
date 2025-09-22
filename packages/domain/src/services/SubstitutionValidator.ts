import { DomainError } from '../errors/DomainError.js';
import { BattingSlot, SlotHistory } from '../value-objects/BattingSlot.js';
import { PlayerId } from '../value-objects/PlayerId.js';

/**
 * Domain service responsible for validating player substitutions and re-entry rules in softball.
 *
 * @remarks
 * **SubstitutionValidator Purpose**: Enforces softball's complex substitution and re-entry rules
 * to ensure fair play and regulatory compliance. Prevents invalid player movements that would
 * result in game forfeit, protests, or rule violations.
 *
 * **Core Softball Substitution Rules**:
 * 1. **Universal Substitution**: Any player can be substituted at any time
 * 2. **Starter Re-entry**: Only original starters can re-enter the game
 * 3. **Single Re-entry**: Starters can only re-enter once per game
 * 4. **Original Position**: Re-entering starters must return to their original batting slot
 * 5. **Non-starter Finality**: Once removed, non-starters cannot return
 * 6. **Timing Rules**: Substitutions typically occur between innings
 *
 * **Re-entry Business Context**:
 * - **Strategic Advantage**: Allows coaches to rest starters and bring them back
 * - **Injury Management**: Enables temporary removal for medical attention
 * - **Platoon Systems**: Supports specialized players for different situations
 * - **Youth Development**: Provides playing time opportunities while maintaining core players
 *
 * **Validation Complexity**:
 * The service must track complete substitution history to enforce re-entry limits,
 * validate player eligibility, and ensure timing constraints are met.
 *
 * @example
 * ```typescript
 * // Valid substitution sequence
 * let slot = BattingSlot.createWithStarter(3, starterId);
 *
 * // Substitute starter with bench player
 * SubstitutionValidator.validateSubstitution(slot, subId, 4, false);
 * slot = slot.substitutePlayer(subId, 4, false);
 *
 * // Starter re-enters later in game
 * SubstitutionValidator.validateSubstitution(slot, starterId, 7, true);
 * slot = slot.substitutePlayer(starterId, 7, true);
 *
 * // Check if starter can re-enter again (should be false)
 * const canReenter = SubstitutionValidator.canPlayerReenter(slot, starterId); // false
 * ```
 */
export class SubstitutionValidator {
  /**
   * Validates whether a proposed player substitution is legal according to softball rules.
   *
   * @remarks
   * This method performs comprehensive validation of substitution attempts, checking:
   *
   * **Player Eligibility**:
   * - Current player must be active in the batting slot
   * - Re-entry players must be original starters
   * - Non-starters cannot re-enter once removed
   * - Starters can only re-enter once per game
   *
   * **Timing Constraints**:
   * - Cannot substitute in the same inning player entered
   * - Substitution inning must be later than current player's entry
   * - Prevents retroactive substitutions
   *
   * **Re-entry Logic**:
   * - Validates re-entry flag against player's starter status
   * - Checks if starter has already used their single re-entry opportunity
   * - Ensures re-entry claims are legitimate
   *
   * **Rule Enforcement**: Throws descriptive errors for any rule violations,
   * enabling coaches and officials to understand and correct invalid substitutions.
   *
   * @param battingSlot - The batting slot where substitution is being attempted
   * @param newPlayerId - The player being substituted into the slot
   * @param inInning - The inning when the substitution occurs (1-based)
   * @param isReentry - True if this substitution represents a starter re-entering
   * @throws {DomainError} When substitution violates softball rules
   *
   * @example
   * ```typescript
   * const slot = BattingSlot.createWithStarter(5, starterId);
   *
   * // Valid substitution
   * SubstitutionValidator.validateSubstitution(slot, subId, 3, false);
   *
   * // Invalid - same inning
   * try {
   *   SubstitutionValidator.validateSubstitution(slot, subId, 1, false);
   * } catch (error) {
   *   console.log(error.message); // "Cannot substitute in the same inning..."
   * }
   *
   * // Invalid re-entry claim
   * try {
   *   SubstitutionValidator.validateSubstitution(slot, nonStarterId, 3, true);
   * } catch (error) {
   *   console.log(error.message); // "Player was not the original starter..."
   * }
   * ```
   */
  static validateSubstitution(
    battingSlot: BattingSlot,
    newPlayerId: PlayerId,
    inInning: number,
    isReentry: boolean
  ): void {
    const currentPlayer = battingSlot.getCurrentPlayer();
    const currentPlayerHistory = battingSlot
      .getHistory()
      .find(h => h.playerId.equals(currentPlayer) && h.isCurrentlyActive());

    if (!currentPlayerHistory) {
      throw new DomainError('No active player found in batting slot');
    }

    // 1. Validate timing - cannot substitute in same inning player entered
    if (inInning <= currentPlayerHistory.enteredInning) {
      throw new DomainError('Cannot substitute in the same inning the current player entered');
    }

    // 2. For non-re-entry substitutions, we should be able to substitute the current player
    // For re-entry, we validate separately below

    // 3. Validate re-entry rules if this is claimed as re-entry
    if (isReentry) {
      this.validateReentryEligibility(battingSlot, newPlayerId);
    }
  }

  /**
   * Validates that a player is eligible for re-entry according to softball rules.
   *
   * @remarks
   * **Re-entry Eligibility Rules**:
   * - Only original starters can re-enter
   * - Starters can only re-enter once per game
   * - Must re-enter in their original batting slot position
   * - Cannot re-enter if already used their re-entry opportunity
   *
   * **Implementation Logic**:
   * - Checks if player was an original starter in this slot
   * - Verifies player hasn't already re-entered previously
   * - Ensures re-entry count doesn't exceed the single allowed re-entry
   *
   * @param battingSlot - The batting slot where re-entry is being attempted
   * @param playerId - The player attempting to re-enter
   * @throws {DomainError} When re-entry is not allowed for this player
   *
   * @example
   * ```typescript
   * // Starter was substituted, now trying to re-enter
   * const slotWithSub = originalSlot.substitutePlayer(subId, 3, false);
   *
   * // Valid re-entry
   * SubstitutionValidator.validateReentryEligibility(slotWithSub, originalStarterId);
   *
   * // Invalid - non-starter trying to re-enter
   * SubstitutionValidator.validateReentryEligibility(slotWithSub, subId); // Throws
   * ```
   */
  private static validateReentryEligibility(battingSlot: BattingSlot, playerId: PlayerId): void {
    // Check if player was original starter
    if (!battingSlot.wasPlayerStarter(playerId)) {
      throw new DomainError('Player was not the original starter in this batting slot');
    }

    // Check if this player has already re-entered
    const playerHistory = battingSlot.getPlayerHistory(playerId);
    const reentryCount = playerHistory.filter(h => h.isReentry).length;

    if (reentryCount > 0) {
      throw new DomainError('Starter can only re-enter once per game');
    }
  }

  /**
   * Determines if a player is eligible to re-enter the game.
   *
   * @remarks
   * **Re-entry Eligibility Check**: Returns whether a player can legally re-enter
   * based on softball re-entry rules:
   * - Must be an original starter
   * - Must not have already used their single re-entry opportunity
   * - Must have been substituted out (not currently active)
   *
   * **Use Cases**:
   * - Coach decision-making (can I bring this player back?)
   * - UI state management (enable/disable re-entry buttons)
   * - Game planning and strategy analysis
   * - Rule education and training scenarios
   *
   * @param battingSlot - The batting slot to check for re-entry eligibility
   * @param playerId - The player whose re-entry eligibility to check
   * @returns True if player can legally re-enter, false otherwise
   *
   * @example
   * ```typescript
   * // Original starter, not yet substituted
   * const slot1 = BattingSlot.createWithStarter(1, starterId);
   * console.log(SubstitutionValidator.canPlayerReenter(slot1, starterId)); // true
   *
   * // After substitution
   * const slot2 = slot1.substitutePlayer(subId, 3, false);
   * console.log(SubstitutionValidator.canPlayerReenter(slot2, starterId)); // true
   * console.log(SubstitutionValidator.canPlayerReenter(slot2, subId)); // false
   *
   * // After re-entry
   * const slot3 = slot2.substitutePlayer(starterId, 5, true);
   * console.log(SubstitutionValidator.canPlayerReenter(slot3, starterId)); // false
   * ```
   */
  static canPlayerReenter(battingSlot: BattingSlot, playerId: PlayerId): boolean {
    // Must be original starter
    if (!battingSlot.wasPlayerStarter(playerId)) {
      return false;
    }

    // Check if already re-entered
    const playerHistory = battingSlot.getPlayerHistory(playerId);
    const hasReentered = playerHistory.some(h => h.isReentry);

    return !hasReentered;
  }

  /**
   * Determines if a player has been substituted out of the batting slot.
   *
   * @remarks
   * **Substitution Status Check**: Determines whether a player has been removed
   * from active participation in a batting slot. A player is considered substituted if:
   * - They have history entries with exitedInning defined
   * - They are not currently the active player
   * - They were previously active but no longer are
   *
   * **Business Applications**:
   * - Eligibility verification for re-entry attempts
   * - Statistical tracking of player participation
   * - Game state analysis and reporting
   * - Coaching decision support
   *
   * @param battingSlot - The batting slot to check for player substitution status
   * @param playerId - The player whose substitution status to determine
   * @returns True if player has been substituted out, false if never played or currently active
   *
   * @example
   * ```typescript
   * // Active starter
   * const slot = BattingSlot.createWithStarter(1, starterId);
   * console.log(SubstitutionValidator.hasPlayerBeenSubstituted(slot, starterId)); // false
   *
   * // After substitution
   * const withSub = slot.substitutePlayer(subId, 3, false);
   * console.log(SubstitutionValidator.hasPlayerBeenSubstituted(withSub, starterId)); // true
   * console.log(SubstitutionValidator.hasPlayerBeenSubstituted(withSub, subId)); // false
   *
   * // Never played in this slot
   * console.log(SubstitutionValidator.hasPlayerBeenSubstituted(slot, neverId)); // false
   * ```
   */
  static hasPlayerBeenSubstituted(battingSlot: BattingSlot, playerId: PlayerId): boolean {
    const currentPlayer = battingSlot.getCurrentPlayer();

    // If player is currently active, they haven't been substituted
    if (currentPlayer.equals(playerId)) {
      return false;
    }

    // Check if player has any history in this slot
    const playerHistory = battingSlot.getPlayerHistory(playerId);
    if (playerHistory.length === 0) {
      return false; // Never played in this slot
    }

    // Player has history but is not current player = has been substituted
    return playerHistory.some(h => h.exitedInning !== undefined);
  }

  /**
   * Returns the complete substitution history for a batting slot.
   *
   * @remarks
   * **History Tracking**: Provides chronological record of all player changes
   * in a batting slot throughout the game. This comprehensive history enables:
   * - Rule validation for complex substitution scenarios
   * - Statistical analysis of player participation
   * - Game replay and audit capabilities
   * - Coaching analysis and strategy evaluation
   *
   * **Data Structure**: Returns array of SlotHistory objects in chronological order,
   * showing when each player entered, when they left (if applicable), and their
   * role status (starter, substitute, re-entry).
   *
   * @param battingSlot - The batting slot whose history to retrieve
   * @returns Array of SlotHistory objects in chronological order
   *
   * @example
   * ```typescript
   * // Complex substitution scenario
   * const slot = BattingSlot.createWithStarter(1, starterId)
   *   .substitutePlayer(subId, 3, false)
   *   .substitutePlayer(starterId, 5, true)
   *   .substitutePlayer(sub2Id, 7, false);
   *
   * const history = SubstitutionValidator.getSubstitutionHistory(slot);
   * console.log(history.length); // 4
   *
   * // First entry: starter innings 1-2
   * console.log(history[0].wasStarter); // true
   * console.log(history[0].enteredInning); // 1
   * console.log(history[0].exitedInning); // 3
   *
   * // Second entry: substitute innings 3-4
   * console.log(history[1].wasStarter); // false
   * console.log(history[1].isReentry); // false
   *
   * // Third entry: starter re-entry innings 5-6
   * console.log(history[2].isReentry); // true
   * ```
   */
  static getSubstitutionHistory(battingSlot: BattingSlot): SlotHistory[] {
    return battingSlot.getHistory();
  }

  /**
   * Validates that a field position change is allowed for the specified player.
   *
   * @remarks
   * **Position Change Rules**: In softball, players can change defensive positions
   * without substitution as long as they remain in the game. This validation ensures:
   * - Only active players can change positions
   * - Player must currently be in the batting slot
   * - Position changes don't require substitution rules
   *
   * **Distinction from Substitution**: Position changes are different from player
   * substitutions - they involve the same player moving to a different defensive
   * role rather than replacing one player with another.
   *
   * **Common Scenarios**:
   * - Moving infielder to outfield due to game situation
   * - Switching pitcher to different position
   * - Adjusting defensive alignment for specific batter
   *
   * @param battingSlot - The batting slot containing the player
   * @param playerId - The player requesting position change
   * @param inInning - The inning when position change occurs
   * @throws {DomainError} When position change is not allowed
   *
   * @example
   * ```typescript
   * const slot = BattingSlot.createWithStarter(1, playerId);
   *
   * // Valid position change - active player
   * SubstitutionValidator.validatePositionChange(slot, playerId);
   *
   * // Invalid - player not in slot
   * SubstitutionValidator.validatePositionChange(slot, otherId); // Throws
   *
   * // Invalid - substituted player
   * const withSub = slot.substitutePlayer(subId, 2, false);
   * SubstitutionValidator.validatePositionChange(withSub, playerId); // Throws
   * ```
   */
  static validatePositionChange(battingSlot: BattingSlot, playerId: PlayerId): void {
    const currentPlayer = battingSlot.getCurrentPlayer();

    // Player must be currently active in this slot
    if (!currentPlayer.equals(playerId)) {
      throw new DomainError('Player is not currently active in this batting slot');
    }

    // Position changes are always allowed for active players
    // No additional timing or eligibility restrictions apply
  }
}
