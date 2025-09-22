import { DomainError } from '../errors/DomainError.js';

import { SoftballRules, SoftballRulesConfig } from './SoftballRules.js';

/**
 * Factory for creating predefined softball rule configurations for different leagues and contexts.
 *
 * @remarks
 * RuleVariants provides a simplified set of factory methods for creating
 * SoftballRules instances configured for the most common scenarios:
 * standard recreational play, tournament competition, and recreational leagues.
 *
 * **Domain Context**: Different softball contexts require different rule configurations:
 * - **Standard Rules**: Balanced rules suitable for most recreational play
 * - **Tournament Rules**: Competitive rules with time management for organized tournaments
 * - **Recreation League Rules**: Casual rules emphasizing participation and fun
 *
 * **Design Pattern**: This implements the Factory Method pattern, providing
 * semantic creation methods that encapsulate domain knowledge about different
 * softball contexts while keeping the API simple and focused.
 *
 * @example
 * ```typescript
 * // Core rule variants
 * const standardRules = RuleVariants.standard();
 * const tournamentRules = RuleVariants.tournament();
 * const recreationRules = RuleVariants.recreationLeague();
 *
 * // Custom modifications
 * const customRules = RuleVariants.withCustomizations(standardRules, {
 *   timeLimitMinutes: 120,
 *   maxPlayersPerTeam: 20,
 *   maxExtraInnings: 5,
 *   allowTieGames: false
 * });
 *
 * // Custom mercy rule tiers
 * const customMercy = RuleVariants.withCustomizations(recreationRules, {
 *   mercyRuleTiers: [
 *     { differential: 15, afterInning: 3 },
 *     { differential: 10, afterInning: 5 }
 *   ]
 * });
 * ```
 */
export class RuleVariants {
  /**
   * Creates standard softball rules with balanced settings for general recreational play.
   *
   * @returns SoftballRules configured with standard balanced settings
   *
   * @remarks
   * Standard rules provide a balanced configuration suitable for most recreational
   * softball contexts. These rules balance competitive play with practical considerations:
   * - Two-tier mercy rule system that tightens as the game progresses
   * - Moderate time limits for scheduling efficiency
   * - Standard roster sizes accommodating most team situations
   * - Reasonable extra innings policy with tie games allowed
   *
   * **Configuration Details**:
   * - 7 innings (standard softball length)
   * - 25 player maximum roster (accommodates varying attendance)
   * - 60 minute time limit (practical scheduling)
   * - Re-entry allowed (maximizes participation)
   * - Two-tier mercy rule: 10 runs after 4th inning, 7 runs after 5th inning
   * - No extra innings (0 maximum), tie games allowed
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
   * - Single mercy rule (10 runs after inning 4)
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

  /**
   * Creates recreation league rules optimized for casual play and maximum participation.
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
      mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
    });
  }

  // Custom Rule Creation Methods

  /**
   * Creates custom rules by modifying an existing rule set.
   *
   * @param baseRules - The base SoftballRules to customize
   * @param customizations - Configuration changes to apply
   * @returns New SoftballRules with customizations applied
   * @throws {DomainError} When baseRules is null/undefined or customizations are invalid
   *
   * @remarks
   * This method enables rule customization by overlaying changes onto existing
   * rule sets, preserving domain knowledge while allowing specific modifications.
   *
   * **Use Cases**:
   * - League-specific modifications of standard rules
   * - Tournament variations of standard configurations
   * - Regional adaptations of core rules
   * - Seasonal adjustments (winter indoor leagues)
   *
   * @example
   * ```typescript
   * // Customize standard rules for a time-limited league
   * const customStandard = RuleVariants.withCustomizations(
   *   RuleVariants.standard(),
   *   {
   *     timeLimitMinutes: 120,
   *     maxPlayersPerTeam: 30
   *   }
   * );
   *
   * // Modify tournament rules for youth adaptation
   * const youthTourney = RuleVariants.withCustomizations(
   *   RuleVariants.tournament(),
   *   {
   *     totalInnings: 5,
   *     allowReEntry: true,
   *     mercyRuleTiers: [{ differential: 12, afterInning: 4 }]
   *   }
   * );
   * ```
   */
  static withCustomizations(
    baseRules: SoftballRules,
    customizations: SoftballRulesConfig
  ): SoftballRules {
    if (!baseRules || !(baseRules instanceof SoftballRules)) {
      throw new DomainError('Base rules must be a valid SoftballRules instance');
    }

    // Extract current configuration from base rules
    const currentConfig: SoftballRulesConfig = {
      totalInnings: baseRules.totalInnings,
      maxPlayersPerTeam: baseRules.maxPlayersPerTeam,
      timeLimitMinutes: baseRules.timeLimitMinutes,
      allowReEntry: baseRules.allowReEntry,
      mercyRuleEnabled: baseRules.mercyRuleEnabled,
      mercyRuleTiers: [...baseRules.mercyRuleTiers],
      maxExtraInnings: baseRules.maxExtraInnings,
      allowTieGames: baseRules.allowTieGames,
    };

    // Merge customizations with current configuration
    const mergedConfig: SoftballRulesConfig = {
      ...currentConfig,
      ...customizations,
    };

    return new SoftballRules(mergedConfig);
  }

  /**
   * Creates completely custom rules from scratch.
   *
   * @param config - Complete configuration for custom rules
   * @returns New SoftballRules with specified configuration
   * @throws {DomainError} When configuration violates business constraints
   *
   * @remarks
   * This method creates rules without any base configuration, suitable for
   * unique situations that don't align with standard rule sets.
   *
   * **Use Cases**:
   * - Experimental league formats
   * - Special event tournaments
   * - Training or instructional games
   * - Unique organizational requirements
   *
   * @example
   * ```typescript
   * // Create rules for a quick-play format
   * const quickPlay = RuleVariants.custom({
   *   totalInnings: 3,
   *   maxPlayersPerTeam: 12,
   *   timeLimitMinutes: 30,
   *   allowReEntry: true,
   *   mercyRuleEnabled: false
   * });
   *
   * // Create rules for instructional games
   * const instructional = RuleVariants.custom({
   *   totalInnings: 5,
   *   maxPlayersPerTeam: 15,
   *   timeLimitMinutes: 60,
   *   allowReEntry: true,
   *   mercyRuleEnabled: true,
   *   mercyRuleTiers: [{ differential: 8, afterInning: 2 }]
   * });
   * ```
   */
  static custom(config: SoftballRulesConfig): SoftballRules {
    return new SoftballRules(config);
  }
}
