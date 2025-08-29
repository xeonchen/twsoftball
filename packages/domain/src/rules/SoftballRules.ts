import { DomainError } from '../errors/DomainError';

/**
 * Configuration options for softball game rules.
 *
 * @remarks
 * This interface defines all configurable aspects of softball game rules
 * that can vary between different leagues, tournaments, or organizational
 * preferences. Each option has sensible defaults for recreation league play.
 */
export interface SoftballRulesConfig {
  /** Number of regulation innings (1-50) */
  totalInnings?: number;

  /** Maximum players allowed per team roster (9-50) */
  maxPlayersPerTeam?: number;

  /** Time limit in minutes, or null for no time limit (1-720 minutes) */
  timeLimitMinutes?: number | null;

  /** Whether players can re-enter the game after being substituted */
  allowReEntry?: boolean;

  /** Whether mercy rule is enabled to end games early */
  mercyRuleEnabled?: boolean;

  /** Run differential required to trigger mercy rule (1-100) */
  mercyRuleDifferential?: number;

  /** Inning after which mercy rule can be applied (1-50) */
  mercyRuleAfterInning?: number;
}

/**
 * Immutable value object defining configurable softball game rules and regulations.
 *
 * @remarks
 * SoftballRules encapsulates all the configurable game parameters that vary between
 * different leagues, tournaments, and organizational preferences. This includes
 * game length, roster limits, time constraints, mercy rules, and substitution policies.
 *
 * **Domain Context**: Softball rules vary significantly across different contexts:
 * - Recreation leagues typically allow re-entry and have lenient mercy rules
 * - Tournament play often has stricter time limits and roster restrictions
 * - Youth leagues may use shorter games and modified mercy rule thresholds
 * - Corporate leagues might have unique time constraints for scheduling
 *
 * **Business Rules Encapsulated**:
 * - **Mercy Rule**: Automatically ends games when score differential becomes excessive
 *   after a minimum number of innings, preventing unnecessarily lopsided contests
 * - **Time Limits**: Some leagues impose time constraints for scheduling efficiency
 * - **Roster Management**: Different leagues have varying limits on team size
 * - **Re-entry Rules**: Whether substituted players can return to the game
 *
 * **Immutability Pattern**: All rule modifications return new SoftballRules instances
 * rather than modifying existing ones, ensuring thread safety and proper event sourcing.
 *
 * @example
 * ```typescript
 * // Standard recreation league rules
 * const recRules = SoftballRules.recreationLeague();
 * console.log(recRules.totalInnings);        // 7
 * console.log(recRules.allowReEntry);        // true
 *
 * // Tournament rules with time limit
 * const tourneyRules = SoftballRules.tournament();
 * console.log(tourneyRules.timeLimitMinutes);  // 90
 * console.log(tourneyRules.allowReEntry);      // false
 *
 * // Custom rules for specific league
 * const customRules = new SoftballRules({
 *   totalInnings: 9,
 *   timeLimitMinutes: 120,
 *   mercyRuleDifferential: 20
 * });
 *
 * // Evaluate game situations
 * const isComplete = customRules.isGameComplete(12, 8, 7);  // true
 * const isMercy = customRules.isMercyRule(25, 5, 5);        // true
 * ```
 */
export class SoftballRules {
  /**
   * Number of regulation innings required to complete a game.
   *
   * @remarks
   * Most softball leagues play 7 innings, but this can vary:
   * - Youth leagues: often 5-6 innings for shorter attention spans
   * - Tournament play: may use 7 innings with time limits
   * - Exhibition games: can be any agreed-upon length
   *
   * Games can go into extra innings if tied after regulation.
   */
  readonly totalInnings: number;

  /**
   * Maximum number of players allowed on a team roster.
   *
   * @remarks
   * Different leagues have varying roster limits:
   * - Minimum 9 players (starting lineup requirement)
   * - Recreation leagues: often 20-25 to accommodate scheduling flexibility
   * - Tournament play: may limit to 15-20 for competitive balance
   * - Corporate leagues: may allow larger rosters for participation
   */
  readonly maxPlayersPerTeam: number;

  /**
   * Time limit for games in minutes, or null for unlimited time.
   *
   * @remarks
   * Time limits help with scheduling but affect game strategy:
   * - Null: No time limit, play until natural completion
   * - 60-90 minutes: Common for weeknight recreation leagues
   * - 120+ minutes: Tournament play with adequate time for completion
   *
   * When time expires, current inning typically finishes unless mercy rule applies.
   */
  readonly timeLimitMinutes: number | null;

  /**
   * Whether players can re-enter the game after being substituted out.
   *
   * @remarks
   * Re-entry rules vary by league philosophy:
   * - True: Recreation leagues prioritize participation over competition
   * - False: Tournament play maintains competitive integrity
   *
   * **Business Rule**: A player can only re-enter in their original batting position
   * and defensive position if re-entry is allowed.
   */
  readonly allowReEntry: boolean;

  /**
   * Whether the mercy rule is enabled to end games early.
   *
   * @remarks
   * Mercy rules prevent excessively lopsided games that become uncompetitive
   * and potentially demoralizing. When enabled, games end automatically when
   * the score differential reaches the threshold after the minimum inning.
   *
   * Most leagues enable mercy rules for sportsmanship and time management.
   */
  readonly mercyRuleEnabled: boolean;

  /**
   * Run differential required to trigger the mercy rule.
   *
   * @remarks
   * The point spread that triggers automatic game termination:
   * - Lower values (8-12): More likely to end games, faster tournament play
   * - Higher values (15-20): Allow more comeback opportunities
   * - Youth leagues: Often lower to prevent discouragement
   *
   * **Business Logic**: Differential is calculated as (higher score - lower score).
   */
  readonly mercyRuleDifferential: number;

  /**
   * Inning number after which the mercy rule can be applied.
   *
   * @remarks
   * Ensures games have a reasonable chance for competitive play before ending:
   * - Inning 3-4: Common for recreation leagues (allows for early adjustments)
   * - Inning 5+: Tournament play (ensures substantial game development)
   * - Youth leagues: Often inning 2-3 (shorter attention spans)
   *
   * **Business Rule**: Must complete this many innings before mercy rule applies.
   */
  readonly mercyRuleAfterInning: number;

  /**
   * Creates new SoftballRules with specified configuration.
   *
   * @param config - Optional configuration object, uses defaults for any omitted values
   * @throws {DomainError} When any configuration value violates business constraints
   *
   * @remarks
   * **Validation Rules**:
   * - totalInnings: 1-50 (reasonable range for any softball variant)
   * - maxPlayersPerTeam: 9-50 (minimum starting lineup to reasonable maximum)
   * - timeLimitMinutes: 1-720 minutes or null (1 minute to 12 hours max)
   * - mercyRuleDifferential: 1-100 (any reasonable point spread)
   * - mercyRuleAfterInning: 1-50 (must be positive and reasonable)
   *
   * All numeric values must be integers to represent discrete game concepts.
   */
  constructor(config: SoftballRulesConfig = {}) {
    // Set defaults
    this.totalInnings = config.totalInnings ?? 7;
    this.maxPlayersPerTeam = config.maxPlayersPerTeam ?? 25;
    this.timeLimitMinutes = config.timeLimitMinutes ?? null;
    this.allowReEntry = config.allowReEntry ?? true;
    this.mercyRuleEnabled = config.mercyRuleEnabled ?? true;
    this.mercyRuleDifferential = config.mercyRuleDifferential ?? 15;
    this.mercyRuleAfterInning = config.mercyRuleAfterInning ?? 3;

    // Validate all parameters
    SoftballRules.validateTotalInnings(this.totalInnings);
    SoftballRules.validateMaxPlayersPerTeam(this.maxPlayersPerTeam);
    SoftballRules.validateTimeLimitMinutes(this.timeLimitMinutes);
    SoftballRules.validateMercyRuleDifferential(this.mercyRuleDifferential);
    SoftballRules.validateMercyRuleAfterInning(this.mercyRuleAfterInning);
  }

  /**
   * Determines if the mercy rule should be applied given current game state.
   *
   * @param homeScore - Current home team score (non-negative integer)
   * @param awayScore - Current away team score (non-negative integer)
   * @param currentInning - Current inning number (positive integer)
   * @returns True if mercy rule conditions are met and game should end
   * @throws {DomainError} When any parameter is invalid
   *
   * @remarks
   * **Mercy Rule Logic**:
   * 1. Mercy rule must be enabled in configuration
   * 2. Current inning must be greater than mercyRuleAfterInning threshold
   * 3. Score differential must meet or exceed mercyRuleDifferential
   *
   * The mercy rule applies regardless of which team is ahead, preventing
   * both blowout wins and losses from continuing unnecessarily.
   *
   * @example
   * ```typescript
   * const rules = new SoftballRules({
   *   mercyRuleDifferential: 15,
   *   mercyRuleAfterInning: 3
   * });
   *
   * rules.isMercyRule(20, 4, 4);  // true: 16-run differential after inning 3
   * rules.isMercyRule(10, 5, 3);  // false: still in inning 3
   * rules.isMercyRule(12, 8, 4);  // false: only 4-run differential
   * ```
   */
  isMercyRule(homeScore: number, awayScore: number, currentInning: number): boolean {
    SoftballRules.validateScoreParameter('homeScore', homeScore);
    SoftballRules.validateScoreParameter('awayScore', awayScore);
    SoftballRules.validateInningParameter('currentInning', currentInning);

    if (!this.mercyRuleEnabled) {
      return false;
    }

    if (currentInning <= this.mercyRuleAfterInning) {
      return false;
    }

    const differential = Math.abs(homeScore - awayScore);
    return differential >= this.mercyRuleDifferential;
  }

  /**
   * Determines if the game should be considered complete given current state.
   *
   * @param homeScore - Current home team score (non-negative integer)
   * @param awayScore - Current away team score (non-negative integer)
   * @param currentInning - Current inning number (positive integer)
   * @returns True if game completion conditions are met
   * @throws {DomainError} When any parameter is invalid
   *
   * @remarks
   * **Game Completion Logic**:
   * 1. Game ends at regulation innings if not tied
   * 2. Game ends immediately if mercy rule applies
   * 3. Tied games continue into extra innings
   * 4. Extra innings end when one team leads after any complete inning
   *
   * **Business Rules**:
   * - Must complete minimum regulation innings
   * - Mercy rule can end games early regardless of inning
   * - Tie games require extra innings to determine winner
   * - No maximum extra innings (games continue until decided or time limit)
   *
   * @example
   * ```typescript
   * const rules = new SoftballRules({ totalInnings: 7 });
   *
   * rules.isGameComplete(8, 6, 7);   // true: winner after regulation
   * rules.isGameComplete(5, 5, 7);   // false: tied, needs extra innings
   * rules.isGameComplete(6, 7, 8);   // true: winner in extra innings
   * rules.isGameComplete(25, 8, 4);  // true: mercy rule (if enabled)
   * ```
   */
  isGameComplete(homeScore: number, awayScore: number, currentInning: number): boolean {
    SoftballRules.validateScoreParameter('homeScore', homeScore);
    SoftballRules.validateScoreParameter('awayScore', awayScore);
    SoftballRules.validateInningParameter('currentInning', currentInning);

    // Check mercy rule first (can end game at any point)
    if (this.isMercyRule(homeScore, awayScore, currentInning)) {
      return true;
    }

    // Before regulation innings, game cannot be complete
    if (currentInning < this.totalInnings) {
      return false;
    }

    // At regulation innings or beyond, game is complete if not tied
    return homeScore !== awayScore;
  }

  /**
   * Compares this SoftballRules with another for equality.
   *
   * @param other - The SoftballRules to compare against
   * @returns True if all rule parameters are identical, false otherwise
   *
   * @remarks
   * Two SoftballRules instances are considered equal if all their configuration
   * parameters match exactly, including null values for optional parameters.
   * This supports proper value object semantics and event sourcing requirements.
   */
  equals(other: SoftballRules): boolean {
    if (!other || !(other instanceof SoftballRules)) {
      return false;
    }

    return (
      this.totalInnings === other.totalInnings &&
      this.maxPlayersPerTeam === other.maxPlayersPerTeam &&
      this.timeLimitMinutes === other.timeLimitMinutes &&
      this.allowReEntry === other.allowReEntry &&
      this.mercyRuleEnabled === other.mercyRuleEnabled &&
      this.mercyRuleDifferential === other.mercyRuleDifferential &&
      this.mercyRuleAfterInning === other.mercyRuleAfterInning
    );
  }

  /**
   * Returns a string representation of the softball rules configuration.
   *
   * @returns Human-readable summary of all rule parameters
   *
   * @remarks
   * Provides a concise overview of all rule settings for debugging,
   * logging, and user interface display purposes.
   */
  toString(): string {
    const timeLimit = this.timeLimitMinutes ? `${this.timeLimitMinutes}min` : 'unlimited';
    const mercy = this.mercyRuleEnabled
      ? `${this.mercyRuleDifferential} runs after inning ${this.mercyRuleAfterInning}`
      : 'disabled';

    return (
      `SoftballRules(totalInnings=${this.totalInnings}, ` +
      `maxPlayersPerTeam=${this.maxPlayersPerTeam}, ` +
      `timeLimit=${timeLimit}, ` +
      `allowReEntry=${this.allowReEntry}, ` +
      `mercyRule=${mercy})`
    );
  }

  // Static factory methods for common rule configurations

  /**
   * Creates standard recreation league rules optimized for casual play.
   *
   * @returns SoftballRules configured for recreation leagues
   *
   * @remarks
   * Recreation league settings prioritize fun and participation:
   * - 7 innings (standard softball length)
   * - 25 player roster (accommodates varying attendance)
   * - No time limit (games play to completion)
   * - Re-entry allowed (maximizes participation)
   * - Lenient mercy rule (15 runs after inning 3)
   */
  static recreationLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleDifferential: 15,
      mercyRuleAfterInning: 3,
    });
  }

  /**
   * Creates tournament rules optimized for competitive play and scheduling.
   *
   * @returns SoftballRules configured for tournament play
   *
   * @remarks
   * Tournament settings balance competition with time management:
   * - 7 innings (standard competitive length)
   * - 20 player roster (manageable competitive roster)
   * - 90 minute time limit (tournament scheduling)
   * - No re-entry (competitive integrity)
   * - Tighter mercy rule (10 runs after inning 4)
   */
  static tournament(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 90,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleDifferential: 10,
      mercyRuleAfterInning: 4,
    });
  }

  /**
   * Creates youth league rules adapted for younger players.
   *
   * @returns SoftballRules configured for youth leagues
   *
   * @remarks
   * Youth league settings account for shorter attention spans and skill development:
   * - 5 innings (appropriate for younger players)
   * - 15 player roster (smaller team management)
   * - 75 minute time limit (holds attention, allows completion)
   * - Re-entry allowed (development and participation focus)
   * - Early mercy rule (12 runs after inning 2)
   */
  static youthLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 5,
      maxPlayersPerTeam: 15,
      timeLimitMinutes: 75,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleDifferential: 12,
      mercyRuleAfterInning: 2,
    });
  }

  // Private validation methods

  private static validateTotalInnings(innings: number): void {
    if (!Number.isInteger(innings) || innings < 1 || innings > 50) {
      throw new DomainError('Total innings must be an integer between 1 and 50');
    }
  }

  private static validateMaxPlayersPerTeam(players: number): void {
    if (!Number.isInteger(players) || players < 9 || players > 50) {
      throw new DomainError('Max players per team must be an integer between 9 and 50');
    }
  }

  private static validateTimeLimitMinutes(minutes: number | null): void {
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 720)) {
      throw new DomainError('Time limit must be null or an integer between 1 and 720 minutes');
    }
  }

  private static validateMercyRuleDifferential(differential: number): void {
    if (!Number.isInteger(differential) || differential < 1 || differential > 100) {
      throw new DomainError('Mercy rule differential must be an integer between 1 and 100');
    }
  }

  private static validateMercyRuleAfterInning(inning: number): void {
    if (!Number.isInteger(inning) || inning < 1 || inning > 50) {
      throw new DomainError('Mercy rule after inning must be an integer between 1 and 50');
    }
  }

  private static validateScoreParameter(name: string, score: number): void {
    if (!Number.isInteger(score) || score < 0) {
      throw new DomainError(`${name} must be a non-negative integer`);
    }
  }

  private static validateInningParameter(name: string, inning: number): void {
    if (!Number.isInteger(inning) || inning < 1) {
      throw new DomainError(`${name} must be a positive integer`);
    }
  }
}
