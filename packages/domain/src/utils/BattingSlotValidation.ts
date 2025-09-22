import { DomainError } from '../errors/DomainError.js';
import { SoftballRules } from '../rules/SoftballRules.js';

/**
 * Utility class for batting slot validation operations across the domain layer.
 *
 * @remarks
 * Provides centralized validation for batting slot numbers according to configurable
 * softball rules. Batting slots represent positions in the batting order and must
 * conform to league-specific constraints defined in SoftballRules.
 *
 * **Domain Context:** Batting slots determine the order in which players bat.
 * Traditional softball uses positions 1-9 for the standard lineup, with positions
 * 10+ used for Extra Players (EP) depending on rules.
 *
 * **Configurable Validation:** The maximum allowed batting slot is determined by
 * SoftballRules.maxPlayersPerTeam, allowing different leagues to have different
 * lineup size limits while maintaining consistent validation logic.
 *
 * **Error Message Compatibility:** Maintains exact backward compatibility with
 * existing error message formats used throughout the domain layer.
 *
 * @example
 * ```typescript
 * const rules = new SoftballRules({ maxPlayersPerTeam: 15 });
 *
 * // Valid batting slot
 * BattingSlotValidation.validateBattingSlot(5, rules);  //  Valid
 *
 * // Invalid batting slots
 * BattingSlotValidation.validateBattingSlot(0, rules);  //  Below minimum
 * BattingSlotValidation.validateBattingSlot(25, rules); //  Above maximum
 * ```
 */
export class BattingSlotValidation {
  /**
   * Validates that a batting slot number is within the allowed range per softball rules.
   *
   * @param battingSlot - The batting slot number to validate (1-based)
   * @param rules - The softball rules configuration defining the maximum allowed slots
   * @throws {DomainError} When batting slot is outside the valid range (1 to maxPlayersPerTeam)
   *
   * @remarks
   * Batting slots must be positive integers within the configured team size limits.
   * The valid range is always 1 to rules.maxPlayersPerTeam (inclusive), where:
   * - Position 1: Leadoff batter
   * - Positions 2-9: Traditional batting order positions
   * - Positions 10+: Extra Players (EP) if allowed by rules
   *
   * **Business Rules:**
   * - Minimum batting slot is always 1 (no zero-based indexing in softball)
   * - Maximum is configurable via SoftballRules.maxPlayersPerTeam
   * - Common configurations: 9 (boundary case), 10 (standard), 15-25 (with EP), up to 50 (large leagues)
   *
   * **Usage Patterns:**
   * This validation is used across multiple domain contexts:
   * - TeamLineup.addPlayer() - validating batting positions during lineup construction
   * - BattingSlot constructor - validating position ranges
   * - Substitution operations - ensuring substitutes go to valid positions
   * - Strategy pattern implementations - validating lineup modifications
   *
   * **Error Message Compatibility:**
   * Maintains exact format: "Batting slot must be between 1 and {maxPlayersPerTeam}"
   * This ensures backward compatibility with existing domain error handling.
   *
   * @example
   * ```typescript
   * // Standard 9-player rules
   * const standardRules = new SoftballRules({ maxPlayersPerTeam: 9 });
   * BattingSlotValidation.validateBattingSlot(5, standardRules);  //  Valid
   * BattingSlotValidation.validateBattingSlot(10, standardRules); //  Above limit
   *
   * // Extended lineup with Extra Players
   * const extendedRules = new SoftballRules({ maxPlayersPerTeam: 15 });
   * BattingSlotValidation.validateBattingSlot(15, extendedRules); //  Valid EP slot
   * BattingSlotValidation.validateBattingSlot(25, extendedRules); //  Above limit
   *
   * // Edge cases
   * BattingSlotValidation.validateBattingSlot(0, standardRules);  //  Below minimum
   * BattingSlotValidation.validateBattingSlot(-1, standardRules); //  Negative
   * ```
   */
  public static validateBattingSlot(battingSlot: number, rules: SoftballRules): void {
    if (battingSlot < 1 || battingSlot > rules.maxPlayersPerTeam) {
      throw new DomainError(`Batting slot must be between 1 and ${rules.maxPlayersPerTeam}`);
    }
  }
}
