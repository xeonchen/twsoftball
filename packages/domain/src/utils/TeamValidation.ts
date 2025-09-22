import { DomainError } from '../errors/DomainError.js';

/**
 * Utility class for team designation validation across the domain layer.
 *
 * @remarks
 * Provides centralized validation for team designations used throughout the
 * softball domain. In softball, teams are designated as either 'HOME' or 'AWAY',
 * which determines batting order, field positions, and game flow rules.
 *
 * **Domain Context:** Team designation is fundamental to softball game logic:
 * - AWAY team bats first (top of inning)
 * - HOME team bats second (bottom of inning)
 * - HOME team has "last at-bat" advantage
 * - Field positions and dugout assignments may depend on designation
 * - Statistical records and game reports require accurate team identification
 *
 * **Validation Consistency:** Ensures all team designation validation follows
 * the same pattern across domain entities, value objects, and services,
 * eliminating code duplication and maintaining consistent error messages.
 *
 * @example
 * ```typescript
 * // Valid team designations
 * TeamValidation.validateTeamDesignation('HOME', 'batting team');  //  Valid
 * TeamValidation.validateTeamDesignation('AWAY', 'scoring team');  //  Valid
 *
 * // Invalid designations
 * TeamValidation.validateTeamDesignation('VISITOR', 'team');       //  Invalid
 * TeamValidation.validateTeamDesignation('home', 'team');          //  Case sensitive
 * TeamValidation.validateTeamDesignation('', 'team');              //  Empty string
 * ```
 */
export class TeamValidation {
  /** Valid team designation values in softball */
  private static readonly VALID_TEAMS = ['HOME', 'AWAY'] as const;

  /**
   * Validates that a team designation is either 'HOME' or 'AWAY'.
   *
   * @param team - The team designation string to validate
   * @param fieldName - The field name for error messages (e.g., 'batting team', 'scoring team')
   * @throws {DomainError} When team is not 'HOME' or 'AWAY'
   *
   * @remarks
   * Team designations must be exactly 'HOME' or 'AWAY' (case-sensitive) to maintain
   * consistency with existing domain logic and event sourcing patterns.
   *
   * **Business Rules:**
   * - Only two valid values: 'HOME' and 'AWAY'
   * - Case-sensitive (must be uppercase)
   * - No abbreviations or alternative spellings accepted
   * - Empty strings, null, or undefined values are rejected
   *
   * **Usage Context:** This validation is used throughout the domain layer:
   * - Game scoring events (which team scored)
   * - Inning state management (which team is batting)
   * - Statistical calculations (team-specific metrics)
   * - Game completion logic (final scores by team)
   * - Event sourcing (team context in domain events)
   *
   * **Error Message Compatibility:** Provides consistent error messaging
   * that matches existing domain error patterns for easy debugging and
   * user experience consistency.
   *
   * @example
   * ```typescript
   * // Valid usage in domain events
   * TeamValidation.validateTeamDesignation('HOME', 'scoring team');
   * TeamValidation.validateTeamDesignation('AWAY', 'batting team');
   *
   * // Usage in game state validation
   * const currentBattingTeam = isTopHalf ? 'AWAY' : 'HOME';
   * TeamValidation.validateTeamDesignation(currentBattingTeam, 'current batting team');
   *
   * // Error cases
   * TeamValidation.validateTeamDesignation('VISITOR', 'team');    //  Not valid designation
   * TeamValidation.validateTeamDesignation('home', 'team');       //  Wrong case
   * TeamValidation.validateTeamDesignation('HOME_TEAM', 'team');  //  Modified format
   * TeamValidation.validateTeamDesignation('', 'team');           //  Empty string
   * ```
   */
  public static validateTeamDesignation(team: string, fieldName: string): void {
    if (!this.VALID_TEAMS.includes(team as 'HOME' | 'AWAY')) {
      throw new DomainError(`${fieldName} must be either HOME or AWAY`);
    }
  }
}
