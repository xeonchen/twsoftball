import { SoftballRules, SoftballRulesConfig } from './SoftballRules';
import { DomainError } from '../errors/DomainError';

/**
 * Factory for creating predefined softball rule configurations for different leagues and contexts.
 *
 * @remarks
 * RuleVariants provides a comprehensive set of factory methods for creating
 * SoftballRules instances configured for specific league types, organizations,
 * age groups, and tournament formats. This eliminates the need to manually
 * configure rules for common scenarios while maintaining flexibility for
 * custom variations.
 *
 * **Domain Context**: Different softball contexts require vastly different
 * rule configurations:
 * - **Organizational Rules**: ASA/USA, USSSA, NSA each have distinct standards
 * - **League Types**: Church, corporate, and competitive leagues have different priorities
 * - **Age Groups**: Youth, adult, and senior leagues require age-appropriate modifications
 * - **Tournament Formats**: Single/double elimination and round robin need time management
 * - **Playing Styles**: Slow pitch, fast pitch, and co-ed have unique requirements
 *
 * **Design Pattern**: This implements the Factory Method pattern, providing
 * semantic creation methods that encapsulate complex configuration logic and
 * domain knowledge about different softball contexts.
 *
 * @example
 * ```typescript
 * // Official organization rules
 * const asaRules = RuleVariants.asaUsaSoftball();
 * const usssaRules = RuleVariants.usssa();
 *
 * // League-specific rules
 * const churchRules = RuleVariants.churchLeague();
 * const corpRules = RuleVariants.corporateLeague();
 *
 * // Age-specific rules
 * const youthRules = RuleVariants.youth12U();
 * const seniorRules = RuleVariants.senior50Plus();
 *
 * // Tournament formats
 * const singleElim = RuleVariants.singleEliminationTournament();
 * const doubleElim = RuleVariants.doubleEliminationTournament();
 *
 * // Advanced mercy rule systems
 * const twoTier = RuleVariants.twoTierMercyRule();
 * const threeTier = RuleVariants.threeTierMercyRule();
 * const lenient = RuleVariants.lenientMercyRule();
 * const tight = RuleVariants.tightMercyRule();
 *
 * // Custom modifications
 * const customRules = RuleVariants.withCustomizations(asaRules, {
 *   timeLimitMinutes: 120,
 *   maxPlayersPerTeam: 25,
 *   maxExtraInnings: 5,
 *   allowTieGames: true
 * });
 *
 * // Custom mercy rule tiers
 * const customMercy = RuleVariants.withCustomizations(churchRules, {
 *   mercyRuleTiers: [
 *     { differential: 15, afterInning: 3 },
 *     { differential: 10, afterInning: 5 }
 *   ]
 * });
 * ```
 */
export class RuleVariants {
  // Official Organization Standards

  /**
   * Creates ASA/USA Softball official rules configuration.
   *
   * @returns SoftballRules configured for ASA/USA Softball sanctioned play
   *
   * @remarks
   * Amateur Softball Association (now USA Softball) is the national governing
   * body for softball in the United States. Their rules emphasize competitive
   * integrity and standardization:
   * - Strict re-entry limitations (no re-entry)
   * - Conservative mercy rule (10 runs after 5 innings)
   * - Moderate roster sizes for competitive balance
   * - No time limits (games play to natural conclusion)
   */
  static asaUsaSoftball(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: null,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 10, afterInning: 5 }],
    });
  }

  /**
   * Creates USSSA (United States Specialty Sports Association) rules.
   *
   * @returns SoftballRules configured for USSSA sanctioned play
   *
   * @remarks
   * USSSA focuses on participation and player development while maintaining
   * competitive standards. Their rules are more flexible than ASA/USA:
   * - Allows re-entry for increased participation
   * - Lenient mercy rule (15 runs after 3 innings)
   * - Larger roster sizes to accommodate more players
   * - Emphasis on fun and skill development
   */
  static usssa(): SoftballRules {
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
   * Creates NSA (National Softball Association) rules.
   *
   * @returns SoftballRules configured for NSA sanctioned play
   *
   * @remarks
   * NSA balances competitive play with practical tournament management.
   * Their rules are designed for organized competitive leagues:
   * - No re-entry to maintain competitive integrity
   * - Moderate mercy rule (12 runs after 4 innings)
   * - Controlled roster sizes for fair competition
   * - Focus on organized tournament play
   */
  static nsa(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: null,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 4 }],
    });
  }

  /**
   * Creates ISA (Independent Softball Association) rules.
   *
   * @returns SoftballRules configured for ISA sanctioned play
   *
   * @remarks
   * ISA emphasizes recreational play with competitive elements.
   * Rules are designed for community and regional tournaments:
   * - Re-entry allowed for participation
   * - Generous mercy rule (20 runs after 4 innings)
   * - Smaller roster sizes for intimate team dynamics
   * - Balance of competition and enjoyment
   */
  static isa(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 15,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 20, afterInning: 4 }],
    });
  }

  // League Type Variants

  /**
   * Creates church league rules optimized for fellowship and participation.
   *
   * @returns SoftballRules configured for church league play
   *
   * @remarks
   * Church leagues prioritize Christian fellowship, family participation,
   * and community building over pure competition:
   * - Re-entry allowed to maximize participation
   * - Time limits for family scheduling considerations
   * - Generous mercy rule to maintain sportsmanship
   * - Large rosters to include whole church families
   * - Emphasis on fun and community over winning
   */
  static churchLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 75,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
    });
  }

  /**
   * Creates corporate league rules for workplace recreational sports.
   *
   * @returns SoftballRules configured for corporate league play
   *
   * @remarks
   * Corporate leagues balance employee morale building with practical
   * scheduling constraints for working professionals:
   * - Re-entry allowed for team building and inclusion
   * - Time limits to fit after-work schedules
   * - Large rosters to accommodate varying availability
   * - Moderate mercy rule for competitive balance
   * - Focus on networking and stress relief
   */
  static corporateLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 30,
      timeLimitMinutes: 90,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 4 }],
    });
  }

  /**
   * Creates beer league rules for casual recreational play.
   *
   * @returns SoftballRules configured for beer league play
   *
   * @remarks
   * Beer leagues epitomize recreational softball - fun, social, and relaxed.
   * Rules maximize enjoyment and minimize conflict:
   * - Re-entry encouraged for social participation
   * - No time limits (let the good times roll)
   * - Very lenient mercy rule (20 runs) to allow comebacks
   * - Large rosters for social inclusion
   * - Emphasis on fun over competition
   */
  static beerLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 20, afterInning: 4 }],
    });
  }

  /**
   * Creates competitive league rules for serious recreational play.
   *
   * @returns SoftballRules configured for competitive league play
   *
   * @remarks
   * Competitive leagues attract skilled players seeking challenging games
   * while maintaining recreational spirit:
   * - No re-entry to maintain competitive integrity
   * - Longer time limits for complete strategic play
   * - Smaller rosters for focused team chemistry
   * - Tight mercy rule (8 runs) for competitive balance
   * - Serious play with recreational accessibility
   */
  static competitiveLeague(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 18,
      timeLimitMinutes: 120,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 8, afterInning: 5 }],
    });
  }

  // Tournament Format Variants

  /**
   * Creates single elimination tournament rules for bracket-style competition.
   *
   * @returns SoftballRules configured for single elimination tournaments
   *
   * @remarks
   * Single elimination tournaments require efficient game management
   * since every game is potentially a team's last:
   * - No re-entry maintains competitive intensity
   * - Time limits essential for tournament scheduling
   * - Moderate mercy rule balances competition and schedule
   * - Controlled roster sizes for fair matchups
   * - Win-or-go-home pressure requires fair, decisive games
   */
  static singleEliminationTournament(): SoftballRules {
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
   * Creates double elimination tournament rules for extended bracket play.
   *
   * @returns SoftballRules configured for double elimination tournaments
   *
   * @remarks
   * Double elimination allows teams a second chance, requiring slightly
   * different time management than single elimination:
   * - No re-entry preserves competitive balance
   * - Longer time limits accommodate the second-chance format
   * - Moderate mercy rule balances thorough competition with schedule
   * - Teams get two losses before elimination, so games can be more decisive
   */
  static doubleEliminationTournament(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 105,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 4 }],
    });
  }

  /**
   * Creates round robin tournament rules for pool play format.
   *
   * @returns SoftballRules configured for round robin tournaments
   *
   * @remarks
   * Round robin tournaments require many games in short timeframes,
   * with every team playing every other team:
   * - No re-entry maintains competitive consistency
   * - Shorter games (6 innings) and tight time limits for scheduling
   * - Aggressive mercy rule (8 runs after 3 innings) to move schedule
   * - Multiple games per team means efficiency is crucial
   * - Seeding and advancement based on overall record
   */
  static roundRobinTournament(): SoftballRules {
    return new SoftballRules({
      totalInnings: 6,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 75,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 8, afterInning: 3 }],
    });
  }

  /**
   * Creates weekend tournament rules for recreational tournament play.
   *
   * @returns SoftballRules configured for weekend tournaments
   *
   * @remarks
   * Weekend tournaments blend competitive play with recreational enjoyment
   * over a 2-3 day period:
   * - Re-entry allowed for participation and enjoyment
   * - Time limits help manage weekend schedule
   * - Generous mercy rule maintains fun atmosphere
   * - Larger rosters accommodate weekend availability
   * - Balance of competition and recreation for weekend warriors
   */
  static weekendTournament(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 90,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
    });
  }

  // Age-Based Variants

  /**
   * Creates 12U (12 years and under) youth rules.
   *
   * @returns SoftballRules configured for 12U youth play
   *
   * @remarks
   * 12U softball focuses on fundamental skill development and maintaining
   * engagement for young players with shorter attention spans:
   * - Shorter games (6 innings) for appropriate duration
   * - Re-entry encourages participation and learning
   * - Early mercy rule (10 runs after 2 innings) prevents discouragement
   * - Smaller rosters for better individual attention
   * - Time limits prevent excessively long games
   */
  static youth12U(): SoftballRules {
    return new SoftballRules({
      totalInnings: 6,
      maxPlayersPerTeam: 15,
      timeLimitMinutes: 75,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 10, afterInning: 2 }],
    });
  }

  /**
   * Creates 14U (14 years and under) youth rules.
   *
   * @returns SoftballRules configured for 14U youth play
   *
   * @remarks
   * 14U players have developed more skills and attention span than 12U,
   * allowing for slightly more advanced competition:
   * - Still shorter games (6 innings) but longer time limits
   * - Re-entry supports continued development
   * - Moderate mercy rule (12 runs after 3 innings)
   * - Developing competitive awareness while maintaining fun
   */
  static youth14U(): SoftballRules {
    return new SoftballRules({
      totalInnings: 6,
      maxPlayersPerTeam: 15,
      timeLimitMinutes: 90,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 3 }],
    });
  }

  /**
   * Creates 16U (16 years and under) youth rules.
   *
   * @returns SoftballRules configured for 16U youth play
   *
   * @remarks
   * 16U approaches adult-level play while maintaining youth development focus:
   * - Full 7-inning games with extended time limits
   * - Re-entry still allowed for development
   * - Moderate mercy rule balances competition and development
   * - Larger rosters as players specialize in positions
   * - Transitional rules preparing for adult competition
   */
  static youth16U(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 18,
      timeLimitMinutes: 105,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 3 }],
    });
  }

  /**
   * Creates 18U (18 years and under) youth rules.
   *
   * @returns SoftballRules configured for 18U youth play
   *
   * @remarks
   * 18U represents the highest level of youth competition, closely
   * resembling adult rules while maintaining developmental aspects:
   * - Full adult-length games and time limits
   * - Re-entry still allowed for late bloomers
   * - Competitive mercy rule (10 runs after 4 innings)
   * - Adult-sized rosters for full team development
   * - Preparation for college and adult competitive play
   */
  static youth18U(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 120,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
    });
  }

  /**
   * Creates senior (50 years and older) rules.
   *
   * @returns SoftballRules configured for senior (50+) play
   *
   * @remarks
   * Senior leagues accommodate the physical realities of older players
   * while maintaining competitive enjoyment:
   * - Re-entry allowed for social participation and injury management
   * - No time limits (seniors often prefer complete games)
   * - Generous mercy rule respects varying skill levels
   * - Large rosters accommodate health and availability issues
   * - Focus on exercise, competition, and camaraderie
   */
  static senior50Plus(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 15, afterInning: 4 }],
    });
  }

  /**
   * Creates masters (60 years and older) rules.
   *
   * @returns SoftballRules configured for masters (60+) play
   *
   * @remarks
   * Masters leagues emphasize enjoyment and social interaction over
   * intense competition, with rules reflecting this philosophy:
   * - Very lenient mercy rule (20 runs after 3 innings)
   * - Re-entry encouraged for maximum participation
   * - No time pressure for leisurely games
   * - Large rosters for social inclusion
   * - Celebration of lifelong love of the game
   */
  static masters60Plus(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 20, afterInning: 3 }],
    });
  }

  // Special Format Variants

  /**
   * Creates co-ed rules for mixed-gender teams.
   *
   * @returns SoftballRules configured for co-ed play
   *
   * @remarks
   * Co-ed softball requires special considerations to balance gender
   * participation and maintain competitive fairness:
   * - Re-entry helps balance gender requirements
   * - Time limits accommodate mixed skill levels
   * - Moderate mercy rule maintains competitive balance
   * - Roster sizes accommodate gender ratio requirements
   * - Focus on inclusive, social competitive environment
   */
  static coEd(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 90,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 4 }],
    });
  }

  /**
   * Creates slow pitch softball rules.
   *
   * @returns SoftballRules configured for slow pitch play
   *
   * @remarks
   * Slow pitch is the most common recreational softball format,
   * emphasizing hitting and offensive play:
   * - Re-entry common in recreational slow pitch
   * - No time limits for traditional game completion
   * - Generous mercy rule allows for offensive displays
   * - Large rosters common in recreational play
   * - Focus on hitting, fielding, and recreational competition
   */
  static slowPitch(): SoftballRules {
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
   * Creates fast pitch softball rules.
   *
   * @returns SoftballRules configured for fast pitch play
   *
   * @remarks
   * Fast pitch represents the most competitive form of softball,
   * with rules emphasizing athletic competition and strategy:
   * - No re-entry maintains competitive integrity
   * - No time limits allow for complete strategic games
   * - Tight mercy rule (8 runs) reflects higher competition level
   * - Smaller rosters for focused team composition
   * - Emphasis on pitching, defense, and competitive strategy
   */
  static fastPitch(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 18,
      timeLimitMinutes: null,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 8, afterInning: 5 }],
    });
  }

  /**
   * Creates modified pitch softball rules.
   *
   * @returns SoftballRules configured for modified pitch play
   *
   * @remarks
   * Modified pitch bridges slow pitch and fast pitch, offering
   * a balanced competitive format:
   * - Re-entry allowed for participation balance
   * - Time limits provide game management
   * - Moderate mercy rule balances competition
   * - Medium roster sizes for flexibility
   * - Blend of recreational accessibility and competitive elements
   */
  static modifiedPitch(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 105,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 12, afterInning: 4 }],
    });
  }

  // Advanced Mercy Rule Variants

  /**
   * Creates rules with progressive two-tier mercy rule system.
   *
   * @returns SoftballRules configured with two-tier mercy rule system
   *
   * @remarks
   * Implements a modern two-tier mercy rule system that tightens as the game progresses:
   * - Early game (after 4th inning): 10-run differential (more lenient)
   * - Late game (after 5th inning): 7-run differential (tighter control)
   *
   * This system prevents early blowouts while still allowing competitive games
   * to develop. Popular in competitive recreation leagues and tournaments
   * where game flow management is important.
   */
  static twoTierMercyRule(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 25,
      timeLimitMinutes: 90,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [
        { differential: 10, afterInning: 4 }, // 10 runs after 4th inning
        { differential: 7, afterInning: 5 }, // 7 runs after 5th inning
      ],
    });
  }

  /**
   * Creates rules with aggressive three-tier mercy rule system.
   *
   * @returns SoftballRules configured with three-tier mercy rule system
   *
   * @remarks
   * Implements an aggressive three-tier mercy rule system for rapid game resolution:
   * - Very early (after 2nd inning): 20-run differential (prevents complete blowouts)
   * - Mid-game (after 4th inning): 12-run differential (moderate control)
   * - Late game (after 6th inning): 8-run differential (tight endgame)
   *
   * Designed for tournament formats where schedule management is critical
   * and games need to move quickly while maintaining competitive balance.
   */
  static threeTierMercyRule(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 20,
      timeLimitMinutes: 75,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [
        { differential: 20, afterInning: 2 }, // Very lenient early
        { differential: 12, afterInning: 4 }, // Moderate mid-game
        { differential: 8, afterInning: 6 }, // Tight late game
      ],
    });
  }

  /**
   * Creates rules with lenient single-tier mercy rule system.
   *
   * @returns SoftballRules configured with lenient mercy rule
   *
   * @remarks
   * Uses a very lenient single mercy rule threshold designed for social leagues
   * where the emphasis is on fun rather than competitive balance:
   * - 25 runs after 3rd inning (allows for big offensive displays)
   * - Only prevents completely lopsided games
   * - Maximizes playing time and participation
   */
  static lenientMercyRule(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 30,
      timeLimitMinutes: null,
      allowReEntry: true,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 25, afterInning: 3 }],
    });
  }

  /**
   * Creates rules with tight single-tier mercy rule system.
   *
   * @returns SoftballRules configured with tight mercy rule
   *
   * @remarks
   * Uses a tight single mercy rule threshold for highly competitive leagues:
   * - 6 runs after 5th inning (prevents moderate blowouts)
   * - Ensures games remain competitive throughout
   * - Suitable for skilled player leagues where games are typically close
   */
  static tightMercyRule(): SoftballRules {
    return new SoftballRules({
      totalInnings: 7,
      maxPlayersPerTeam: 18,
      timeLimitMinutes: 120,
      allowReEntry: false,
      mercyRuleEnabled: true,
      mercyRuleTiers: [{ differential: 6, afterInning: 5 }],
    });
  }

  // Convenience Aliases for Standard Rules

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
      mercyRuleTiers: [{ differential: 15, afterInning: 3 }],
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
      mercyRuleTiers: [{ differential: 10, afterInning: 4 }],
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
      mercyRuleTiers: [{ differential: 12, afterInning: 2 }],
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
   * - Tournament variations of organizational standards
   * - Regional adaptations of national rules
   * - Seasonal adjustments (winter indoor leagues)
   *
   * @example
   * ```typescript
   * // Customize ASA rules for a time-limited league
   * const customASA = RuleVariants.withCustomizations(
   *   RuleVariants.asaUsaSoftball(),
   *   {
   *     timeLimitMinutes: 120,
   *     maxPlayersPerTeam: 25
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
