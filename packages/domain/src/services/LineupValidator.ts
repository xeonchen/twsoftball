import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { BattingSlot } from '../value-objects/BattingSlot.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';

/**
 * Represents a complete lineup entry with batting, jersey, and defensive information.
 *
 * @remarks
 * This interface defines the complete set of information needed to validate
 * a player's participation in a softball lineup. It combines:
 * - Batting slot assignment (position in batting order)
 * - Jersey number (unique team identifier)
 * - Field position (defensive role)
 *
 * Used by LineupValidator to perform comprehensive lineup validation
 * according to softball rules and regulations.
 */
export interface LineupEntry {
  /** The batting slot containing player and substitution history */
  battingSlot: BattingSlot;
  /** The player's unique jersey number within the team */
  jerseyNumber: JerseyNumber;
  /** The defensive field position assigned to this player */
  fieldPosition: FieldPosition;
}

/**
 * Domain service responsible for validating softball lineup configurations and batting order rules.
 *
 * @remarks
 * **LineupValidator Purpose**: Ensures that team lineups comply with softball rules and regulations
 * before games begin or when lineup changes are made. Prevents invalid configurations that would
 * result in game delays, forfeits, or rule violations during play.
 *
 * **Core Validation Rules**:
 * 1. **Player Count**: Minimum 9 players (boundary case), 10-player standard, maximum per SoftballRules.maxPlayersPerTeam
 * 2. **Sequential Slots**: Batting slots 1-9 must be filled before using slots 10+ (Extra Players)
 * 3. **Jersey Uniqueness**: Each jersey number must be unique within the team
 * 4. **Player Uniqueness**: Each player can only occupy one batting slot at a time
 * 5. **Position Assignments**: Valid field positions for defensive players
 * 6. **Batting Order**: Slots must be in sequential order for gameplay
 *
 * **Softball-Specific Context**:
 * - **10-player standard**: Most common lineup with all defensive positions including SHORT_FIELDER
 * - **11-12 player common**: Standard defense plus 1-2 EXTRA_PLAYERs (batting-only roles)
 * - **9-player boundary**: Traditional without SHORT_FIELDER (valid but less frequent)
 * - **13+ players**: Multiple EPs allowed but less common in practice
 * - **Re-entry Rules**: Validated in conjunction with substitution patterns
 *
 * **Business Impact**:
 * Proper lineup validation prevents:
 * - Game forfeits due to invalid rosters
 * - Mid-game disputes over player eligibility
 * - Statistics tracking errors
 * - Official scoring complications
 *
 * @example
 * ```typescript
 * // Validate a 9-player traditional lineup
 * const minimalLineup: LineupEntry[] = [
 *   {
 *     battingSlot: BattingSlot.createWithStarter(1, playerId1),
 *     jerseyNumber: new JerseyNumber('12'),
 *     fieldPosition: FieldPosition.PITCHER
 *   },
 *   // ... 8 more entries for complete lineup
 * ];
 *
 * try {
 *   LineupValidator.validateLineupConfiguration(minimalLineup);
 *   console.log('Lineup is valid!');
 * } catch (error) {
 *   console.error('Lineup validation failed:', error.message);
 * }
 *
 * // Validate extended lineup with EP players
 * const extendedLineup = [...minimalLineup, {
 *   battingSlot: BattingSlot.createWithStarter(10, extraPlayerId), // Position 10+ for EP
 *   jerseyNumber: new JerseyNumber('99'),
 *   fieldPosition: FieldPosition.EXTRA_PLAYER
 * }];
 *
 * LineupValidator.validateLineupConfiguration(extendedLineup);
 * ```
 */
export class LineupValidator {
  /**
   * Validates a complete lineup configuration against softball rules and regulations.
   *
   * @remarks
   * This is the primary validation method that performs comprehensive checks on
   * a complete lineup configuration. It validates:
   *
   * **Player Count Requirements**:
   * - Minimum 9 players (boundary case without SHORT_FIELDER)
   * - 10-player standard (most common configuration)
   * - 11-12 player common (standard + 1-2 Extra Players)
   * - Maximum per SoftballRules.maxPlayersPerTeam configuration
   *
   * **Sequential Batting Slot Rules**:
   * - Slots 1-9 must be completely filled before using slots 10+
   * - No gaps allowed in EP slots (must use 10, then 11, then 12, etc.)
   *
   * **Uniqueness Constraints**:
   * - Each jersey number must be unique within the team
   * - Each player can only occupy one batting slot
   * - Each batting slot position must be unique
   *
   * **Field Position Validation**:
   * - All positions must be valid FieldPosition enum values
   * - Appropriate mix of defensive and extra player positions
   *
   * The validation follows "fail-fast" principles - throws immediately upon
   * encountering the first rule violation with a descriptive error message.
   *
   * @param lineup - Array of LineupEntry objects representing the complete team lineup
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   * @throws {DomainError} When any validation rule is violated
   *
   * @example
   * ```typescript
   * // Valid minimal lineup
   * const validLineup: LineupEntry[] = [
   *   // ... 9 properly configured entries
   * ];
   * LineupValidator.validateLineupConfiguration(validLineup); // No exception
   *
   * // Invalid lineup - too few players
   * const tooFewPlayers: LineupEntry[] = [
   *   // ... only 8 entries
   * ];
   * LineupValidator.validateLineupConfiguration(tooFewPlayers); // Throws DomainError
   *
   * // Invalid lineup - duplicate jersey numbers
   * const duplicateJerseys = createLineupWithDuplicateJersey();
   * LineupValidator.validateLineupConfiguration(duplicateJerseys); // Throws DomainError
   * ```
   */
  static validateLineupConfiguration(
    lineup: LineupEntry[],
    rules: SoftballRules = new SoftballRules()
  ): void {
    // 1. Validate player count (9 to maxPlayersPerTeam players)
    if (!this.isValidLineupSize(lineup.length, rules)) {
      throw new DomainError(
        `Lineup must have minimum 9 players (boundary case), 10-player standard preferred, or up to ${rules.maxPlayersPerTeam} maximum, got ${lineup.length}`
      );
    }

    // 2. Extract batting slot positions for sequential validation
    const battingSlotPositions = lineup
      .map(entry => entry.battingSlot.position)
      .sort((a, b) => a - b);

    // 3. Validate that slots 1-9 are filled before using 10+
    this.validateSequentialBattingSlots(battingSlotPositions, rules);

    // 4. Validate jersey number uniqueness
    const jerseyNumbers = lineup.map(entry => entry.jerseyNumber);
    if (!this.areJerseyNumbersUnique(jerseyNumbers)) {
      const duplicates = this.findDuplicateJerseyNumbers(jerseyNumbers);
      if (duplicates.length > 0) {
        throw new DomainError(`Duplicate jersey number: ${duplicates[0]!.toString()}`);
      }
    }

    // 5. Validate player uniqueness (no player in multiple slots)
    this.validatePlayerUniqueness(lineup);

    // 6. Validate batting order is sequential
    this.validateBattingOrder(lineup);
  }

  /**
   * Validates that batting slots are used in the correct sequential order.
   *
   * @remarks
   * **Softball Sequential Slot Rules**:
   * - Positions 1-9: Must be completely filled before using any EP slots
   * - Positions 10+: Must be used sequentially (10, then 11, then 12, etc.) up to maxPlayersPerTeam
   * - No gaps allowed in either range
   *
   * **Business Rationale**: Sequential slot usage ensures:
   * - Proper batting order flow during gameplay
   * - Consistent scorekeeping and statistics tracking
   * - Compliance with league regulations
   * - Clear understanding of batting sequence for all participants
   *
   * @param positions - Array of batting slot positions (should be pre-sorted)
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   * @throws {DomainError} When sequential slot rules are violated
   *
   * @example
   * ```typescript
   * // Valid sequences
   * LineupValidator.validateSequentialBattingSlots([1,2,3,4,5,6,7,8,9], rules); // ✓
   * LineupValidator.validateSequentialBattingSlots([1,2,3,4,5,6,7,8,9,10,11], rules); // ✓
   *
   * // Invalid sequences
   * LineupValidator.validateSequentialBattingSlots([1,2,3,4,5,6,7,8,10], rules); // ✗ Missing 9
   * LineupValidator.validateSequentialBattingSlots([1,2,3,4,5,6,7,8,9,11], rules); // ✗ Missing 10
   * ```
   */
  private static validateSequentialBattingSlots(
    positions: number[],
    rules: SoftballRules = new SoftballRules()
  ): void {
    // Check if positions 1-9 are complete
    const corePositions = positions.filter(pos => pos >= 1 && pos <= 9);
    const epPositions = positions.filter(pos => pos >= 10 && pos <= rules.maxPlayersPerTeam);

    // If using EP positions, core positions 1-9 must be complete
    if (epPositions.length > 0) {
      if (corePositions.length !== 9) {
        throw new DomainError('Batting slots 1-9 must be filled before using slots 10+');
      }

      // Verify core positions are exactly 1-9
      const expectedCore = Array.from({ length: 9 }, (_, i) => i + 1);
      const sortedCore = [...corePositions].sort((a, b) => a - b);
      if (!expectedCore.every((pos, i) => pos === sortedCore[i])) {
        throw new DomainError('Batting slots 1-9 must be completely filled');
      }
    }

    // Check EP positions are sequential starting from 10
    if (epPositions.length > 0) {
      const sortedEP = [...epPositions].sort((a, b) => a - b);
      const expectedEP = Array.from({ length: sortedEP.length }, (_, i) => i + 10);

      if (!expectedEP.every((pos, i) => pos === sortedEP[i])) {
        throw new DomainError('EP slots must be used sequentially starting from position 10');
      }
    }
  }

  /**
   * Validates that each player occupies exactly one batting slot in the lineup.
   *
   * @remarks
   * **Player Uniqueness Rule**: In softball, each player can only bat in one position
   * in the batting order at any given time. This prevents:
   * - Confusion during at-bat sequence
   * - Statistics tracking errors
   * - Rule violations regarding player participation
   * - Unfair advantage through multiple batting positions
   *
   * **Implementation Details**: Extracts the current player from each batting slot
   * and verifies no PlayerId appears multiple times in the active lineup.
   *
   * @param lineup - The complete lineup to validate for player uniqueness
   * @throws {DomainError} When a player is found in multiple batting slots
   *
   * @example
   * ```typescript
   * // Valid - each player in exactly one slot
   * const validLineup = createLineupWithUniquePlayer();
   * LineupValidator.validatePlayerUniqueness(validLineup); // No exception
   *
   * // Invalid - player appears in multiple slots
   * const duplicatePlayerLineup = [
   *   { battingSlot: BattingSlot.createWithStarter(1, playerId), ... },
   *   { battingSlot: BattingSlot.createWithStarter(2, playerId), ... }, // Same player!
   *   // ... rest of lineup
   * ];
   * LineupValidator.validatePlayerUniqueness(duplicatePlayerLineup); // Throws
   * ```
   */
  private static validatePlayerUniqueness(lineup: LineupEntry[]): void {
    const playerIds = lineup.map(entry => entry.battingSlot.getCurrentPlayer());
    const uniquePlayerIds = new Set(playerIds.map(id => id.value));

    if (uniquePlayerIds.size !== playerIds.length) {
      throw new DomainError('Player cannot occupy multiple batting slots');
    }
  }

  /**
   * Validates that batting slots are presented in correct sequential order.
   *
   * @remarks
   * **Batting Order Requirements**: The lineup array must be ordered by batting slot position
   * to ensure proper game flow and avoid confusion during play. This validation checks:
   * - Array is sorted by battingSlot.position in ascending order
   * - No duplicate batting slot positions exist
   * - Positions form a valid sequence for gameplay
   *
   * **Why Order Matters**:
   * - Game management systems expect sequential batting order
   * - Umpires and scorekeepers need predictable player sequence
   * - Statistics tracking relies on consistent batting order presentation
   * - Team strategy depends on known batting sequence
   *
   * @param lineup - The lineup array to validate for proper batting order
   * @throws {DomainError} When batting order is not sequential or contains duplicates
   *
   * @example
   * ```typescript
   * // Valid sequential order
   * const orderedLineup = [
   *   { battingSlot: { position: 1 }, ... },
   *   { battingSlot: { position: 2 }, ... },
   *   { battingSlot: { position: 3 }, ... },
   *   // ... continues in order
   * ];
   * LineupValidator.validateBattingOrder(orderedLineup); // ✓
   *
   * // Invalid - out of order
   * const unorderedLineup = [
   *   { battingSlot: { position: 2 }, ... },  // Should be 1
   *   { battingSlot: { position: 1 }, ... },  // Should be 2
   *   // ...
   * ];
   * LineupValidator.validateBattingOrder(unorderedLineup); // ✗ Throws
   * ```
   */
  static validateBattingOrder(lineup: LineupEntry[]): void {
    const positions = lineup.map(entry => entry.battingSlot.position);

    // Check for duplicates
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      throw new DomainError('Duplicate batting slot position found in lineup');
    }

    // Check if array is sorted in ascending order
    const sortedPositions = [...positions].sort((a, b) => a - b);
    const isOrdered = positions.every((pos, i) => pos === sortedPositions[i]);

    if (!isOrdered) {
      throw new DomainError('Batting order must be sequential starting from position 1');
    }
  }

  /**
   * Determines if the given number of players constitutes a valid lineup size.
   *
   * @remarks
   * **Softball Lineup Size Rules**:
   * - **Minimum 9**: Required to fill all traditional defensive positions
   *   (P, C, 1B, 2B, 3B, SS, LF, CF, RF)
   * - **10-player standard**: Most common configuration adding SHORT_FIELDER
   * - **11-12 player common**: Standard defense plus 1-2 EXTRA_PLAYERs for batting depth
   * - **13+ players**: Valid but less frequent boundary cases
   * - **Maximum per SoftballRules**: Configurable based on league requirements
   * - **Strategic Flexibility**: Larger lineups provide more substitution options
   *   and enable specialized players for different game situations
   *
   * **Regulatory Compliance**: Different leagues have varying limits, configurable
   * through SoftballRules.maxPlayersPerTeam to accommodate different organizational needs.
   *
   * @param size - The number of players in the proposed lineup
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   * @returns True if size is within valid range (9 to maxPlayersPerTeam), false otherwise
   *
   * @example
   * ```typescript
   * const rules = new SoftballRules({ maxPlayersPerTeam: 15 });
   * console.log(LineupValidator.isValidLineupSize(9, rules));  // true - minimum/boundary case
   * console.log(LineupValidator.isValidLineupSize(10, rules)); // true - standard
   * console.log(LineupValidator.isValidLineupSize(12, rules)); // true - common with 2 EPs
   * console.log(LineupValidator.isValidLineupSize(15, rules)); // true - maximum for these rules
   * console.log(LineupValidator.isValidLineupSize(8, rules));  // false - too few
   * console.log(LineupValidator.isValidLineupSize(16, rules)); // false - too many for these rules
   *
   * // Default rules allow up to 25 players
   * console.log(LineupValidator.isValidLineupSize(25)); // true - default maximum
   * console.log(LineupValidator.isValidLineupSize(26)); // false - exceeds default limit
   * ```
   */
  static isValidLineupSize(size: number, rules: SoftballRules = new SoftballRules()): boolean {
    return size >= 9 && size <= rules.maxPlayersPerTeam;
  }

  /**
   * Determines if all jersey numbers in the array are unique.
   *
   * @remarks
   * **Jersey Number Uniqueness Rule**: Each player must have a distinct jersey number
   * to ensure clear identification during gameplay, officiating, and record keeping.
   *
   * **Implementation Strategy**: Converts jersey numbers to their string representation
   * and uses Set data structure to detect duplicates efficiently. This approach handles
   * edge cases where different JerseyNumber objects might have the same underlying value.
   *
   * **Business Context**: Duplicate jersey numbers cause:
   * - Confusion for umpires during player identification
   * - Statistics tracking errors and data corruption
   * - Potential forfeit conditions in official games
   * - Disputes during player substitutions
   *
   * @param jerseyNumbers - Array of JerseyNumber objects to check for uniqueness
   * @returns True if all jersey numbers are unique, false if duplicates exist
   *
   * @example
   * ```typescript
   * const uniqueJerseys = [
   *   new JerseyNumber('12'),
   *   new JerseyNumber('34'),
   *   new JerseyNumber('56')
   * ];
   * console.log(LineupValidator.areJerseyNumbersUnique(uniqueJerseys)); // true
   *
   * const duplicateJerseys = [
   *   new JerseyNumber('12'),
   *   new JerseyNumber('34'),
   *   new JerseyNumber('12') // Duplicate!
   * ];
   * console.log(LineupValidator.areJerseyNumbersUnique(duplicateJerseys)); // false
   * ```
   */
  static areJerseyNumbersUnique(jerseyNumbers: JerseyNumber[]): boolean {
    const jerseyStrings = jerseyNumbers.map(jersey => jersey.toString());
    const uniqueJerseys = new Set(jerseyStrings);
    return uniqueJerseys.size === jerseyNumbers.length;
  }

  /**
   * Finds and returns duplicate jersey numbers in the given array.
   *
   * @remarks
   * **Utility Method**: Used internally to provide specific error messages when
   * duplicate jersey numbers are detected. Returns the first duplicate found
   * to give users actionable information for correcting lineup issues.
   *
   * **Error Reporting Strategy**: Rather than just indicating duplicates exist,
   * this method identifies which specific jersey numbers are duplicated,
   * enabling faster problem resolution.
   *
   * @param jerseyNumbers - Array of JerseyNumber objects to analyze
   * @returns Array containing the first duplicate jersey number found, or empty if none
   *
   * @example
   * ```typescript
   * const jerseys = [
   *   new JerseyNumber('10'),
   *   new JerseyNumber('20'),
   *   new JerseyNumber('10'), // Duplicate
   *   new JerseyNumber('30'),
   *   new JerseyNumber('20')  // Another duplicate
   * ];
   *
   * const duplicates = LineupValidator.findDuplicateJerseyNumbers(jerseys);
   * console.log(duplicates[0].toString()); // '10' (first duplicate found)
   * ```
   */
  private static findDuplicateJerseyNumbers(jerseyNumbers: JerseyNumber[]): JerseyNumber[] {
    const seen = new Set<string>();
    const duplicates: JerseyNumber[] = [];

    jerseyNumbers.forEach(jersey => {
      const jerseyString = jersey.toString();
      if (seen.has(jerseyString)) {
        duplicates.push(jersey);
        return; // Return first duplicate found
      }
      seen.add(jerseyString);
    });

    return duplicates;
  }
}
