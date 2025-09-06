import { DomainError } from '../errors/DomainError';

/**
 * Represents a single mercy rule tier with differential and inning threshold.
 *
 * @remarks
 * Mercy rule tiers allow for different run differential thresholds at different
 * inning milestones. This supports common softball mercy rule patterns like:
 * - 10 runs after 4th inning (more lenient early game)
 * - 7 runs after 5th inning (tighter late game)
 * - Single threshold rules (traditional mercy rule)
 *
 * **Business Logic**: Each tier represents a "if the game reaches inning X
 * and the score differential is Y or greater, end the game" rule.
 */
export interface MercyRuleTier {
  /** Run differential required to trigger this mercy rule tier (1-100) */
  differential: number;
  /** Inning after which this mercy rule tier can be applied (1-50) */
  afterInning: number;
}

/**
 * Configuration options for softball game rules.
 *
 * @remarks
 * This interface defines all configurable aspects of softball game rules
 * that can vary between different leagues, tournaments, or organizational
 * preferences. Each option has sensible defaults for recreation league play.
 *
 * **Mercy Rule Configuration**: Supports both traditional single-threshold mercy rules
 * and modern multi-tier systems. When both are provided, mercyRuleTiers takes precedence.
 */
export interface SoftballRulesConfig {
  /** Number of regulation innings (1-50) */
  totalInnings?: number;

  /** Maximum players allowed per team roster (9-50) */
  maxPlayersPerTeam?: number;

  /** Time limit in minutes, or null for unlimited time (1-720 minutes, defaults to 60) */
  timeLimitMinutes?: number | null;

  /** Whether players can re-enter the game after being substituted */
  allowReEntry?: boolean;

  /** Whether mercy rule is enabled to end games early */
  mercyRuleEnabled?: boolean;

  /**
   * Multi-tier mercy rule configuration
   *
   * @remarks
   * When provided, this array defines multiple mercy rule thresholds that apply at different
   * innings. Common patterns:
   * - Two-tier: [{ differential: 10, afterInning: 4 }, { differential: 7, afterInning: 5 }]
   * - Single-tier: [{ differential: 15, afterInning: 3 }]
   * - Three-tier: Early/mid/late game thresholds
   */
  mercyRuleTiers?: MercyRuleTier[];

  /** Maximum extra innings allowed, or null for unlimited (0-20, defaults to 0) */
  maxExtraInnings?: number | null;

  /** Whether tie games are allowed after regulation and max extra innings */
  allowTieGames?: boolean;
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
 *   mercyRuleTiers: [{ differential: 20, afterInning: 4 }]
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
   * - Minimum 9 players (boundary case without SHORT_FIELDER)
   * - 10-player standard: Most common configuration with SHORT_FIELDER
   * - 11-12 player common: Standard defense plus 1-2 EXTRA_PLAYERs
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
   * Multi-tier mercy rule configuration.
   *
   * @remarks
   * Defines multiple mercy rule thresholds that apply at different innings.
   * When empty, falls back to single-threshold properties for backward compatibility.
   *
   * **Common Patterns**:
   * - Two-tier system: 10 runs after 4th, 7 runs after 5th inning
   * - Single-tier system: Traditional mercy rule with one threshold
   * - Multi-tier system: Progressive tightening as game progresses
   *
   * **Business Logic**: Each tier represents "at inning X, if differential >= Y, end game".
   * Rules are evaluated in order, so structure with increasing inning thresholds.
   */
  readonly mercyRuleTiers: ReadonlyArray<MercyRuleTier>;

  /**
   * Maximum extra innings allowed after regulation, or null for unlimited.
   *
   * @remarks
   * Controls how long games can continue beyond regulation innings:
   * - Null: Unlimited extra innings (games continue until decided)
   * - Number: Games end in ties after this many extra innings
   *
   * **Common Settings**:
   * - Tournament play: 3-5 extra innings (schedule management)
   * - Recreation leagues: null or 10+ (let games finish naturally)
   * - Time-constrained leagues: 2-3 extra innings
   *
   * Works in conjunction with allowTieGames to determine final outcomes.
   */
  readonly maxExtraInnings: number | null;

  /**
   * Whether games can end in ties after regulation and max extra innings.
   *
   * @remarks
   * Determines final game outcomes when extra innings are exhausted:
   * - True: Games can end in ties (common in recreation leagues)
   * - False: Games continue until decided (tournament play)
   *
   * **Business Logic**: Only relevant when maxExtraInnings is set.
   * If maxExtraInnings is null, this setting is ignored as games
   * continue indefinitely until decided.
   */
  readonly allowTieGames: boolean;

  /**
   * Creates new SoftballRules with specified configuration.
   *
   * @param config - Optional configuration object, uses defaults for any omitted values
   * @throws {DomainError} When any configuration value violates business constraints
   *
   * @remarks
   * **Validation Rules**:
   * - totalInnings: 1-50 (reasonable range for any softball variant)
   * - maxPlayersPerTeam: 9-50 (minimum 9-player to maximum, 10-player standard, 11-12 common)
   * - timeLimitMinutes: 1-720 minutes or null (1 minute to 12 hours max, defaults to 60)
   * - mercyRuleTiers: Valid tiers with increasing inning thresholds
   * - maxExtraInnings: 0-20 innings or null (0 = no extra innings, defaults to 0)
   * - allowTieGames: Controls whether games can end in ties
   *
   * All numeric values must be integers to represent discrete game concepts.
   */
  constructor(config: SoftballRulesConfig = {}) {
    // Set defaults
    this.totalInnings = config.totalInnings ?? 7;
    this.maxPlayersPerTeam = config.maxPlayersPerTeam ?? 25;
    this.timeLimitMinutes = 'timeLimitMinutes' in config ? config.timeLimitMinutes : 60;
    this.allowReEntry = config.allowReEntry ?? true;
    this.mercyRuleEnabled = config.mercyRuleEnabled ?? true;
    this.maxExtraInnings = 'maxExtraInnings' in config ? config.maxExtraInnings : 0;
    this.allowTieGames = config.allowTieGames ?? true;

    // Set mercy rule tiers or use default two-tier system
    if (config.mercyRuleTiers !== undefined) {
      this.mercyRuleTiers = [...config.mercyRuleTiers]; // Use provided tiers (could be empty)
    } else {
      this.mercyRuleTiers = [
        { differential: 10, afterInning: 4 }, // 10 runs after 4th inning
        { differential: 7, afterInning: 5 }, // 7 runs after 5th inning
      ];
    }

    // Validate all parameters
    SoftballRules.validateTotalInnings(this.totalInnings);
    SoftballRules.validateMaxPlayersPerTeam(this.maxPlayersPerTeam);
    SoftballRules.validateTimeLimitMinutes(this.timeLimitMinutes);
    SoftballRules.validateMercyRuleTiers(this.mercyRuleTiers);
    SoftballRules.validateMaxExtraInnings(this.maxExtraInnings);
    SoftballRules.validateTieGameRules(this.maxExtraInnings, this.allowTieGames);
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
   * **Multi-Tier Mercy Rule Logic**:
   * 1. Mercy rule must be enabled in configuration
   * 2. Evaluates all mercy rule tiers in order (if configured)
   * 3. Falls back to single-threshold logic for backward compatibility
   * 4. Returns true if any tier's conditions are met
   *
   * **Tier Evaluation**: For each tier, checks if:
   * - Current inning >= tier.afterInning (inclusive - rule applies AT the specified inning)
   * - Score differential >= tier.differential
   *
   * The mercy rule applies regardless of which team is ahead, preventing
   * both blowout wins and losses from continuing unnecessarily.
   *
   * @example
   * ```typescript
   * // Two-tier mercy rule system
   * const rules = new SoftballRules({
   *   mercyRuleTiers: [
   *     { differential: 10, afterInning: 4 },  // 10 runs after 4th inning
   *     { differential: 7, afterInning: 5 }    // 7 runs after 5th inning
   *   ]
   * });
   *
   * rules.isMercyRule(15, 4, 5);  // true: 11-run differential, triggers first tier
   * rules.isMercyRule(12, 5, 6);  // true: 7-run differential, triggers second tier
   * rules.isMercyRule(10, 5, 4);  // false: 5-run differential doesn't meet either tier
   * rules.isMercyRule(11, 5, 5);  // false: 6-run differential, neither tier met
   *
   * // Single-tier system with custom tiers
   * const singleTierRules = new SoftballRules({
   *   mercyRuleTiers: [{ differential: 15, afterInning: 3 }]
   * });
   * singleTierRules.isMercyRule(20, 4, 4);  // true: 16-run differential at 4th inning
   * ```
   */
  isMercyRule(homeScore: number, awayScore: number, currentInning: number): boolean {
    SoftballRules.validateScoreParameter('homeScore', homeScore);
    SoftballRules.validateScoreParameter('awayScore', awayScore);
    SoftballRules.validateInningParameter('currentInning', currentInning);

    if (!this.mercyRuleEnabled) {
      return false;
    }

    const differential = Math.abs(homeScore - awayScore);

    // Evaluate all mercy rule tiers (empty tiers means no mercy rule applies)
    if (this.mercyRuleTiers.length === 0) {
      return false;
    }

    return this.mercyRuleTiers.some(
      tier => currentInning >= tier.afterInning && differential >= tier.differential
    );
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
   * 3. Tied games continue into extra innings (if allowed)
   * 4. Extra innings end when one team leads after any complete inning
   * 5. Games can end in ties if maxExtraInnings reached and allowTieGames enabled
   *
   * **Business Rules**:
   * - Must complete minimum regulation innings
   * - Mercy rule can end games early regardless of inning
   * - Tie games require extra innings to determine winner (unless ties allowed)
   * - Extra innings limited by maxExtraInnings configuration
   * - Final tie determination controlled by allowTieGames setting
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
    if (homeScore !== awayScore) {
      return true;
    }

    // Handle tied games based on extra innings configuration
    if (this.maxExtraInnings === null) {
      // No limit on extra innings, game continues until decided
      return false;
    }

    // Check if we've exceeded maximum extra innings
    const extraInningsPlayed = currentInning - this.totalInnings;
    if (extraInningsPlayed >= this.maxExtraInnings) {
      // Maximum extra innings reached, game ends in tie if allowed
      return this.allowTieGames;
    }

    // Still within extra innings limit, game continues
    return false;
  }

  /**
   * Compares this SoftballRules with another for equality.
   *
   * @param other - The SoftballRules to compare against
   * @returns True if all rule parameters are identical, false otherwise
   *
   * @remarks
   * Two SoftballRules instances are considered equal if all their configuration
   * parameters match exactly, including null values for optional parameters and
   * mercy rule tiers arrays. This supports proper value object semantics and
   * event sourcing requirements.
   */
  equals(other: SoftballRules): boolean {
    if (!other || !(other instanceof SoftballRules)) {
      return false;
    }

    // Compare basic properties
    if (
      this.totalInnings !== other.totalInnings ||
      this.maxPlayersPerTeam !== other.maxPlayersPerTeam ||
      this.timeLimitMinutes !== other.timeLimitMinutes ||
      this.allowReEntry !== other.allowReEntry ||
      this.mercyRuleEnabled !== other.mercyRuleEnabled ||
      this.maxExtraInnings !== other.maxExtraInnings ||
      this.allowTieGames !== other.allowTieGames
    ) {
      return false;
    }

    // Compare mercy rule tiers arrays
    if (this.mercyRuleTiers.length !== other.mercyRuleTiers.length) {
      return false;
    }

    return this.mercyRuleTiers.every((thisTier, index) => {
      const otherTier = other.mercyRuleTiers[index]!; // Safe because we're within bounds
      return (
        thisTier.differential === otherTier.differential &&
        thisTier.afterInning === otherTier.afterInning
      );
    });
  }

  /**
   * Returns a string representation of the softball rules configuration.
   *
   * @returns Human-readable summary of all rule parameters
   *
   * @remarks
   * Provides a concise overview of all rule settings for debugging,
   * logging, and user interface display purposes. Shows both mercy rule
   * tiers (if configured) and legacy single-threshold values.
   */
  toString(): string {
    const timeLimit = this.timeLimitMinutes ? `${this.timeLimitMinutes}min` : 'unlimited';
    const extraInnings = this.maxExtraInnings ? `${this.maxExtraInnings}` : 'unlimited';
    const tieGames = this.allowTieGames ? 'allowed' : 'not allowed';

    let mercy: string;
    if (!this.mercyRuleEnabled) {
      mercy = 'disabled';
    } else {
      const tierDescriptions = this.mercyRuleTiers.map(
        tier => `${tier.differential} runs at inning ${tier.afterInning}`
      );
      mercy = `tiers: [${tierDescriptions.join(', ')}]`;
    }

    return (
      `SoftballRules(totalInnings=${this.totalInnings}, ` +
      `maxPlayersPerTeam=${this.maxPlayersPerTeam}, ` +
      `timeLimit=${timeLimit}, ` +
      `allowReEntry=${this.allowReEntry}, ` +
      `mercyRule=${mercy}, ` +
      `maxExtraInnings=${extraInnings}, ` +
      `allowTieGames=${tieGames})`
    );
  }

  // Private validation methods

  private static validateTotalInnings(innings: number): void {
    if (!Number.isInteger(innings) || innings < 1 || innings > 50) {
      throw new DomainError('Total innings must be an integer between 1 and 50');
    }
  }

  private static validateMaxPlayersPerTeam(players: number): void {
    if (!Number.isInteger(players) || players < 9 || players > 50) {
      throw new DomainError(
        'Max players per team must be an integer between 9 and 50 (9=minimum, 10=standard, 11-12=common)'
      );
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

  private static validateMaxExtraInnings(maxExtraInnings: number | null): void {
    if (
      maxExtraInnings !== null &&
      (!Number.isInteger(maxExtraInnings) || maxExtraInnings < 0 || maxExtraInnings > 20)
    ) {
      throw new DomainError('Max extra innings must be null or an integer between 0 and 20');
    }
  }

  private static validateTieGameRules(
    maxExtraInnings: number | null,
    allowTieGames: boolean
  ): void {
    if (maxExtraInnings === null && allowTieGames) {
      throw new DomainError('Cannot allow tie games when maxExtraInnings is unlimited (null)');
    }
  }

  /**
   * Validates mercy rule tiers array for business rule compliance.
   *
   * @param tiers - Array of mercy rule tiers to validate
   * @throws {DomainError} When any tier violates business constraints
   *
   * @remarks
   * **Validation Rules**:
   * - Each tier must have valid differential (1-100) and afterInning (1-50)
   * - Tiers should be ordered by increasing afterInning for logical consistency
   * - No duplicate afterInning values (ambiguous rule application)
   * - Differential values should generally decrease as innings increase (tightening)
   */
  private static validateMercyRuleTiers(tiers: ReadonlyArray<MercyRuleTier>): void {
    if (tiers.length === 0) {
      return; // Empty array is valid, falls back to legacy properties
    }

    // Validate individual tier properties
    tiers.forEach(tier => {
      SoftballRules.validateMercyRuleDifferential(tier.differential);
      SoftballRules.validateMercyRuleAfterInning(tier.afterInning);
    });

    // Check for duplicate inning values
    const inningValues = tiers.map(tier => tier.afterInning);
    const uniqueInnings = new Set(inningValues);
    if (uniqueInnings.size !== inningValues.length) {
      const duplicateInning = inningValues.find(
        (inning, index) => inningValues.indexOf(inning) !== index
      );
      throw new DomainError(
        `Duplicate mercy rule tier for inning ${duplicateInning}. Each inning can only have one mercy rule threshold.`
      );
    }

    // Validate logical ordering (innings should increase)
    tiers.reduce((previousInning, tier) => {
      if (tier.afterInning <= previousInning) {
        throw new DomainError(
          `Mercy rule tiers must be ordered by increasing inning values. Found inning ${tier.afterInning} after inning ${previousInning}.`
        );
      }
      return tier.afterInning;
    }, 0);
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

  // Convenience aliases to RuleVariants static methods
  // These provide backward compatibility and simpler API access

  /**
   * Creates standard softball rules with balanced settings.
   *
   * @returns SoftballRules configured with standard balanced settings
   * @remarks Convenience alias for RuleVariants.standard()
   */
  static standard(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 60,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [
        { differential: 10, afterInning: 4 },
        { differential: 7, afterInning: 5 },
      ],
      maxExtraInnings: 0,
      allowTieGames: true,
    });
  }

  /**
   * Creates standard recreation league rules.
   *
   * @returns SoftballRules configured for recreation leagues
   * @remarks Convenience alias for RuleVariants.recreationLeague()
   */
  static recreationLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
    });
  }

  /**
   * Creates standard tournament rules.
   *
   * @returns SoftballRules configured for tournament play
   * @remarks Convenience alias for RuleVariants.tournament()
   */
  static tournament(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 90,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
    });
  }
}
