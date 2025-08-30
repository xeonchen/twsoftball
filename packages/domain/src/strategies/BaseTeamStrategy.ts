import { PlayerId } from '../value-objects/PlayerId';
import { FieldPosition } from '../constants/FieldPosition';
import { SoftballRules } from '../rules/SoftballRules';
import { BattingSlotValidation } from '../utils/BattingSlotValidation';
import type { TeamStrategy, TeamPlayer, BattingSlotState } from './TeamStrategy';

/**
 * Abstract base class providing shared functionality for team strategy implementations.
 *
 * @remarks
 * This base class extracts common logic from both SimpleTeamStrategy and DetailedTeamStrategy
 * to eliminate code duplication while maintaining a clean separation of concerns. It implements
 * the template method pattern, providing concrete implementations of shared behavior while
 * leaving strategy-specific operations abstract.
 *
 * **Shared Functionality Provided**:
 * - Current batting lineup retrieval with consistent sorting
 * - Player lookup operations (in lineup, batting slot, field position)
 * - Active player count tracking
 * - Batting slot validation using centralized utility
 * - Required defensive positions validation
 * - Common lineup validation logic
 *
 * **Template Method Pattern**:
 * Concrete strategy classes must implement strategy-specific operations:
 * - Player substitution logic (with/without history tracking)
 * - Position change handling (with/without history tracking)
 * - Additional methods unique to specific strategies (e.g., addPlayer for DetailedTeamStrategy)
 *
 * **Benefits of This Abstraction**:
 * - Eliminates 100+ lines of duplicated code across strategy implementations
 * - Centralizes common team management logic for easier maintenance
 * - Ensures consistent behavior across all strategy implementations
 * - Reduces maintenance overhead when updating shared functionality
 * - Provides a clear contract for strategy-specific extensions
 *
 * **Design Principles Applied**:
 * - **DRY (Don't Repeat Yourself)**: Shared logic implemented once
 * - **Open/Closed Principle**: Open for extension via abstract methods, closed for modification
 * - **Template Method Pattern**: Defines algorithm structure, delegates specifics to subclasses
 * - **Single Responsibility**: Each method has a clear, focused purpose
 *
 * @example
 * ```typescript
 * // Concrete strategies extend this base class
 * class MyTeamStrategy extends BaseTeamStrategy {
 *   substitutePlayer(battingSlot, outgoingId, incomingPlayer, position, rules) {
 *     // Strategy-specific substitution logic
 *     BaseTeamStrategy.validateBattingSlot(battingSlot, rules);
 *     // ... implementation details
 *   }
 *
 *   changePlayerPosition(playerId, newPosition) {
 *     // Strategy-specific position change logic
 *     // ... implementation details
 *   }
 * }
 * ```
 */
export abstract class BaseTeamStrategy implements TeamStrategy {
  /** Current batting lineup indexed by slot number for O(1) access */
  protected readonly lineupSlots = new Map<number, BattingSlotState>();

  /** Required defensive positions for a valid softball lineup */
  protected static readonly REQUIRED_POSITIONS = [
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
   *
   * **Consistency**: This shared implementation ensures all strategy classes
   * return lineup data in the same format and order, regardless of their
   * internal complexity or tracking mechanisms.
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
   *
   * **Strategy Independence**: This shared implementation works consistently
   * across all strategy types, whether they track detailed history or maintain
   * simple current state.
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
   *
   * **Shared Logic**: All strategy implementations need this functionality,
   * so centralizing it here eliminates duplication and ensures consistency.
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
   * position changes made during the game. Individual strategies may maintain
   * additional history tracking separately.
   *
   * **Universal Need**: Both simple and detailed strategies require this
   * lookup capability, making it ideal for shared implementation.
   */
  getPlayerFieldPosition(playerId: PlayerId): FieldPosition | undefined {
    const slots = Array.from(this.lineupSlots.values());
    const foundSlot = slots.find(slot => slot.currentPlayer.playerId.equals(playerId));
    return foundSlot?.currentPosition;
  }

  /**
   * Gets the total number of players currently in the batting lineup.
   *
   * @returns The count of active batting slots
   *
   * @remarks
   * This method returns the number of players currently in batting positions.
   * This may be different from the total team roster size, as some players
   * may be on the bench or have been substituted out.
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
   * Validates that the current lineup meets basic game requirements.
   *
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   * @returns True if lineup is valid for game play
   *
   * @remarks
   * This method checks that the current lineup configuration meets the basic
   * requirements for softball gameplay:
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
   * **Shared Validation Logic**:
   * Both simple and detailed strategies need the same basic validation,
   * so this shared implementation ensures consistent behavior and reduces
   * code duplication.
   *
   * **Use Cases**:
   * - Pre-game lineup validation
   * - Real-time compliance checking during lineup changes
   * - Quick readiness verification across all strategy types
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
    const hasAllRequiredPositions = BaseTeamStrategy.REQUIRED_POSITIONS.every(requiredPosition =>
      currentPositions.has(requiredPosition)
    );

    if (!hasAllRequiredPositions) {
      return false;
    }

    return true;
  }

  /**
   * Validates that a batting slot number is within the valid range.
   *
   * @param battingSlot - The batting slot number to validate
   * @param rules - Softball rules configuration defining maximum players per team
   *
   * @throws {DomainError} When batting slot is not within valid range
   *
   * @remarks
   * This method delegates to the centralized BattingSlotValidation utility to ensure
   * consistent validation behavior across all team strategy implementations.
   *
   * **Centralized Validation**: Uses the BattingSlotValidation utility which provides:
   * - Consistent error message formats
   * - Configurable validation based on softball rules
   * - Single source of truth for batting slot validation logic
   *
   * **Protected Access**: Available to concrete strategy classes for their
   * validation needs while maintaining encapsulation.
   *
   * **Softball Rules Compliance**:
   * - Minimum batting slot is always 1 (no zero-based indexing in softball)
   * - Maximum per SoftballRules.maxPlayersPerTeam configuration
   * - Supports traditional 9-player lineups through extended EP/DH configurations
   */
  protected static validateBattingSlot(battingSlot: number, rules: SoftballRules): void {
    BattingSlotValidation.validateBattingSlot(battingSlot, rules);
  }

  // Abstract methods that concrete strategies must implement

  /**
   * Processes a player substitution in the lineup.
   *
   * @param battingSlot - The batting slot number where substitution occurs
   * @param outgoingPlayerId - The player being substituted out
   * @param incomingPlayer - The new player entering the game
   * @param fieldPosition - The field position for the incoming player
   * @param rules - Optional softball rules configuration
   *
   * @remarks
   * This abstract method must be implemented by concrete strategy classes to handle
   * their specific substitution logic. Different strategies may:
   * - Track detailed substitution history vs. simple state updates
   * - Enforce re-entry rules vs. allow unlimited substitutions
   * - Maintain starter/substitute distinctions vs. treat all players equally
   * - Validate complex business rules vs. perform basic validation only
   */
  abstract substitutePlayer(
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    incomingPlayer: TeamPlayer,
    fieldPosition: FieldPosition,
    rules?: SoftballRules
  ): void;

  /**
   * Changes a player's field position without substitution.
   *
   * @param playerId - The player changing positions
   * @param newPosition - The new field position
   *
   * @remarks
   * This abstract method must be implemented by concrete strategy classes to handle
   * their specific position change logic. Different strategies may:
   * - Track position change history vs. update current state only
   * - Maintain detailed audit trails vs. focus on current assignments
   * - Apply additional business rule validation vs. basic checks
   * - Integrate with substitution tracking vs. treat as independent operation
   */
  abstract changePlayerPosition(playerId: PlayerId, newPosition: FieldPosition): void;
}
