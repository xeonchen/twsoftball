import { AtBatResultType } from '../constants/AtBatResultType';
import { DomainError } from '../errors/DomainError';

/**
 * Represents an at-bat result with its count for statistical aggregation.
 *
 * @remarks
 * Used to aggregate multiple occurrences of the same at-bat result type
 * for efficient statistical calculation. For example, a player might have
 * 3 singles, 2 doubles, etc.
 */
export interface AtBatResult {
  /** The type of at-bat result */
  type: AtBatResultType;
  /** The number of times this result occurred */
  count: number;
}

/**
 * Comprehensive player statistics for softball performance analysis.
 *
 * @remarks
 * Contains all major offensive statistics used in softball:
 * - Basic counts (hits, at-bats, etc.)
 * - Calculated percentages (batting average, OBP, etc.)
 * - Advanced metrics (OPS)
 */
export interface PlayerStats {
  /** Total number of hits (1B, 2B, 3B, HR) */
  hits: number;
  /** Total number of official at-bats (excludes BB, HBP, SF) */
  atBats: number;
  /** Total number of plate appearances (includes everything) */
  plateAppearances: number;
  /** Total bases accumulated (1B=1, 2B=2, 3B=3, HR=4) */
  totalBases: number;
  /** Total number of walks (base on balls) */
  walks: number;
  /** Batting average (hits / at-bats) */
  battingAverage: number;
  /** On-base percentage ((H+BB+HBP)/(AB+BB+HBP+SF)) */
  onBasePercentage: number;
  /** Slugging percentage (total bases / at-bats) */
  sluggingPercentage: number;
  /** On-base plus slugging (OBP + SLG) */
  ops: number;
}

/**
 * Domain service responsible for calculating softball batting statistics and performance metrics.
 *
 * @remarks
 * **StatisticsCalculator Purpose**: Provides accurate, consistent calculation of all major
 * softball offensive statistics according to official rules and conventions. Ensures
 * mathematical precision and handles edge cases appropriately.
 *
 * **Core Statistical Calculations**:
 * - **Batting Average**: Hits divided by at-bats (measures contact success)
 * - **On-Base Percentage**: Rate of reaching base safely (includes walks, HBP)
 * - **Slugging Percentage**: Total bases per at-bat (measures power)
 * - **OPS**: Combined metric (OBP + SLG) for overall offensive value
 * - **Total Bases**: Weighted value of all hits (1B=1, 2B=2, 3B=3, HR=4)
 *
 * **Statistical Rules Implementation**:
 * - **At-Bats**: Include all plate appearances except walks, HBP, and sacrifice flies
 * - **Hits**: Only count singles, doubles, triples, and home runs
 * - **Plate Appearances**: Count every time batter comes to the plate
 * - **Division by Zero**: Return 0.000 when denominator is zero
 * - **Precision**: Round all percentages to 3 decimal places
 *
 * **Business Context**:
 * Statistics are used for:
 * - Player evaluation and comparison
 * - League standings and awards
 * - Historical record keeping
 * - Strategic decision making
 * - Fan engagement and analysis
 *
 * @example
 * ```typescript
 * // Calculate batting average
 * const avg = StatisticsCalculator.calculateBattingAverage(25, 100); // 0.250
 *
 * // Calculate comprehensive player stats
 * const atBatResults: AtBatResult[] = [
 *   { type: AtBatResultType.SINGLE, count: 15 },
 *   { type: AtBatResultType.DOUBLE, count: 5 },
 *   { type: AtBatResultType.HOME_RUN, count: 3 },
 *   { type: AtBatResultType.WALK, count: 8 },
 *   { type: AtBatResultType.STRIKEOUT, count: 12 }
 * ];
 *
 * const stats = StatisticsCalculator.calculatePlayerStats(atBatResults);
 * console.log(`BA: ${stats.battingAverage}, OBP: ${stats.onBasePercentage}`);
 * ```
 */
export class StatisticsCalculator {
  /**
   * Calculates batting average (hits divided by at-bats).
   *
   * @remarks
   * **Batting Average Formula**: BA = H / AB
   *
   * Batting average is the most traditional baseball/softball statistic, measuring
   * how often a batter gets a hit when they put the ball in play. It excludes
   * walks and sacrifice flies from the denominator.
   *
   * **Interpretation**:
   * - .300+ is considered excellent
   * - .250-.299 is above average
   * - .200-.249 is below average
   * - Below .200 is poor
   *
   * **Edge Cases**:
   * - Returns 0.000 when at-bats is 0 (no division by zero)
   * - Rounds to 3 decimal places for standard statistical presentation
   *
   * @param hits - Number of hits (singles, doubles, triples, home runs)
   * @param atBats - Number of official at-bats (excludes walks, HBP, SF)
   * @returns Batting average rounded to 3 decimal places
   * @throws {DomainError} When hits or atBats is negative, or hits > atBats
   *
   * @example
   * ```typescript
   * const ba1 = StatisticsCalculator.calculateBattingAverage(30, 100); // 0.300
   * const ba2 = StatisticsCalculator.calculateBattingAverage(0, 20);   // 0.000
   * const ba3 = StatisticsCalculator.calculateBattingAverage(1, 3);    // 0.333
   * ```
   */
  static calculateBattingAverage(hits: number, atBats: number): number {
    this.validateNonNegative(hits, 'hits');
    this.validateNonNegative(atBats, 'atBats');

    if (atBats === 0) {
      return 0.0;
    }

    if (hits > atBats) {
      throw new DomainError('Hits cannot exceed at-bats');
    }

    return this.roundToThreeDecimals(hits / atBats);
  }

  /**
   * Calculates on-base percentage (rate of reaching base safely).
   *
   * @remarks
   * **On-Base Percentage Formula**: OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
   *
   * OBP measures how often a batter reaches base through any means - hits, walks,
   * or hit by pitch. It's considered more valuable than batting average because
   * it includes walks and better represents offensive contribution.
   *
   * **Components**:
   * - Numerator: All ways to reach base (hits, walks, hit by pitch)
   * - Denominator: All plate appearances except sacrifices (but includes SF)
   * - Sacrifice flies are included in denominator but not numerator
   *
   * **Interpretation**:
   * - .400+ is excellent
   * - .350-.399 is very good
   * - .300-.349 is average
   * - Below .300 is below average
   *
   * @param hits - Number of hits
   * @param walks - Number of base on balls (walks)
   * @param hitByPitch - Number of times hit by pitch
   * @param atBats - Number of official at-bats
   * @param sacrificeFlies - Number of sacrifice flies
   * @returns On-base percentage rounded to 3 decimal places
   * @throws {DomainError} When any parameter is negative or totals are inconsistent
   *
   * @example
   * ```typescript
   * // Player with 25 hits, 10 walks, 1 HBP, 80 at-bats, 2 sacrifice flies
   * const obp = StatisticsCalculator.calculateOnBasePercentage(25, 10, 1, 80, 2);
   * // (25 + 10 + 1) / (80 + 10 + 1 + 2) = 36/93 = 0.387
   * ```
   */
  static calculateOnBasePercentage(
    hits: number,
    walks: number,
    hitByPitch: number,
    atBats: number,
    sacrificeFlies: number
  ): number {
    this.validateNonNegative(hits, 'hits');
    this.validateNonNegative(walks, 'walks');
    this.validateNonNegative(hitByPitch, 'hitByPitch');
    this.validateNonNegative(atBats, 'atBats');
    this.validateNonNegative(sacrificeFlies, 'sacrificeFlies');

    if (hits > atBats) {
      throw new DomainError('Hits cannot exceed at-bats');
    }

    const onBaseEvents = hits + walks + hitByPitch;
    const plateAppearances = atBats + walks + hitByPitch + sacrificeFlies;

    if (onBaseEvents > plateAppearances) {
      throw new DomainError('On-base events cannot exceed plate appearances');
    }

    if (plateAppearances === 0) {
      return 0.0;
    }

    return this.roundToThreeDecimals(onBaseEvents / plateAppearances);
  }

  /**
   * Calculates slugging percentage (total bases per at-bat).
   *
   * @remarks
   * **Slugging Percentage Formula**: SLG = TB / AB
   *
   * Slugging percentage measures the power of a hitter by calculating total bases
   * per at-bat. It weights hits by their base value: singles (1), doubles (2),
   * triples (3), and home runs (4).
   *
   * **Base Values**:
   * - Single = 1 base
   * - Double = 2 bases
   * - Triple = 3 bases
   * - Home Run = 4 bases
   *
   * **Interpretation**:
   * - .500+ is excellent power
   * - .400-.499 is good power
   * - .300-.399 is average
   * - Below .300 is below average
   *
   * **Theoretical Maximum**: 4.000 (if every at-bat is a home run)
   *
   * @param totalBases - Total bases accumulated from all hits
   * @param atBats - Number of official at-bats
   * @returns Slugging percentage rounded to 3 decimal places
   * @throws {DomainError} When parameters are negative or totalBases exceeds 4*atBats
   *
   * @example
   * ```typescript
   * // Player with 40 total bases in 100 at-bats
   * const slg = StatisticsCalculator.calculateSluggingPercentage(40, 100); // 0.400
   * ```
   */
  static calculateSluggingPercentage(totalBases: number, atBats: number): number {
    this.validateNonNegative(totalBases, 'totalBases');
    this.validateNonNegative(atBats, 'atBats');

    // Maximum possible total bases is 4 times at-bats (all home runs)
    if (totalBases > atBats * 4) {
      throw new DomainError('Total bases cannot exceed 4 times at-bats');
    }

    if (atBats === 0) {
      return 0.0;
    }

    return this.roundToThreeDecimals(totalBases / atBats);
  }

  /**
   * Calculates OPS (On-base Plus Slugging).
   *
   * @remarks
   * **OPS Formula**: OPS = OBP + SLG
   *
   * OPS combines on-base percentage and slugging percentage into a single metric
   * that measures overall offensive contribution. It's widely used because it
   * captures both the ability to get on base and the ability to hit for power.
   *
   * **Interpretation**:
   * - .900+ is excellent
   * - .800-.899 is very good
   * - .700-.799 is above average
   * - .600-.699 is average
   * - Below .600 is below average
   *
   * **Advantages**: Simple to calculate and understand, correlates well with run production
   * **Limitations**: Treats OBP and SLG equally, though OBP is typically more valuable
   *
   * @param onBasePercentage - On-base percentage (0.000-1.000)
   * @param sluggingPercentage - Slugging percentage (0.000-4.000)
   * @returns OPS value rounded to 3 decimal places
   * @throws {DomainError} When percentages are negative or OBP > 1.000
   *
   * @example
   * ```typescript
   * const ops = StatisticsCalculator.calculateOPS(0.350, 0.450); // 0.800
   * ```
   */
  static calculateOPS(onBasePercentage: number, sluggingPercentage: number): number {
    this.validateNonNegative(onBasePercentage, 'onBasePercentage');
    this.validateNonNegative(sluggingPercentage, 'sluggingPercentage');

    if (onBasePercentage > 1.0) {
      throw new DomainError('On-base percentage cannot exceed 1.000');
    }

    // Note: Slugging percentage can theoretically exceed 4.0 in edge cases,
    // so we don't validate an upper bound here

    return this.roundToThreeDecimals(onBasePercentage + sluggingPercentage);
  }

  /**
   * Calculates total bases from an array of at-bat results.
   *
   * @remarks
   * **Total Bases Calculation**: Sum of (count × base_value) for all hit results
   *
   * Total bases represents the sum of bases achieved through hits, weighted by
   * the type of hit. Used as input for slugging percentage calculation.
   *
   * **Base Values by Hit Type**:
   * - Single: 1 base
   * - Double: 2 bases
   * - Triple: 3 bases
   * - Home Run: 4 bases
   * - All non-hits: 0 bases
   *
   * @param results - Array of at-bat results with counts
   * @returns Total number of bases accumulated
   * @throws {DomainError} When any count is negative
   *
   * @example
   * ```typescript
   * const results: AtBatResult[] = [
   *   { type: AtBatResultType.SINGLE, count: 10 },  // 10 bases
   *   { type: AtBatResultType.DOUBLE, count: 3 },   // 6 bases
   *   { type: AtBatResultType.HOME_RUN, count: 2 }  // 8 bases
   * ];
   * const totalBases = StatisticsCalculator.calculateTotalBases(results); // 24
   * ```
   */
  static calculateTotalBases(results: AtBatResult[]): number {
    return results.reduce((total, result) => {
      this.validateNonNegative(result.count, `count for ${result.type}`);
      return total + result.count * this.getBaseValue(result.type);
    }, 0);
  }

  /**
   * Calculates total hits from an array of at-bat results.
   *
   * @remarks
   * **Hits Calculation**: Sum of counts for all hit result types
   *
   * Counts only official hits: singles, doubles, triples, and home runs.
   * Excludes walks, errors, fielder's choices, and other non-hit outcomes.
   *
   * @param results - Array of at-bat results with counts
   * @returns Total number of hits
   * @throws {DomainError} When any count is negative
   *
   * @example
   * ```typescript
   * const results: AtBatResult[] = [
   *   { type: AtBatResultType.SINGLE, count: 5 },
   *   { type: AtBatResultType.DOUBLE, count: 2 },
   *   { type: AtBatResultType.WALK, count: 3 }      // Not counted as hit
   * ];
   * const hits = StatisticsCalculator.calculateHits(results); // 7
   * ```
   */
  static calculateHits(results: AtBatResult[]): number {
    return results.reduce((total, result) => {
      this.validateNonNegative(result.count, `count for ${result.type}`);
      return total + (this.isHit(result.type) ? result.count : 0);
    }, 0);
  }

  /**
   * Calculates total at-bats from an array of at-bat results.
   *
   * @remarks
   * **At-Bats Calculation**: Sum of counts for results that count as official at-bats
   *
   * Includes all plate appearances except:
   * - Walks (base on balls)
   * - Hit by pitch
   * - Sacrifice flies
   * - Sacrifice hits/bunts
   *
   * This follows official scoring rules where certain plate appearances don't
   * "count against" the batter statistically.
   *
   * @param results - Array of at-bat results with counts
   * @returns Total number of official at-bats
   * @throws {DomainError} When any count is negative
   *
   * @example
   * ```typescript
   * const results: AtBatResult[] = [
   *   { type: AtBatResultType.SINGLE, count: 3 },      // Counts as AB
   *   { type: AtBatResultType.WALK, count: 2 },        // Doesn't count as AB
   *   { type: AtBatResultType.STRIKEOUT, count: 4 }    // Counts as AB
   * ];
   * const atBats = StatisticsCalculator.calculateAtBats(results); // 7
   * ```
   */
  static calculateAtBats(results: AtBatResult[]): number {
    return results.reduce((total, result) => {
      this.validateNonNegative(result.count, `count for ${result.type}`);
      return total + (this.countsAsAtBat(result.type) ? result.count : 0);
    }, 0);
  }

  /**
   * Calculates total plate appearances from an array of at-bat results.
   *
   * @remarks
   * **Plate Appearances Calculation**: Sum of all at-bat result counts
   *
   * Plate appearances include every time a batter comes to the plate,
   * regardless of the outcome. This is the most comprehensive counting
   * statistic and is used in various percentage calculations.
   *
   * @param results - Array of at-bat results with counts
   * @returns Total number of plate appearances
   * @throws {DomainError} When any count is negative
   *
   * @example
   * ```typescript
   * const results: AtBatResult[] = [
   *   { type: AtBatResultType.SINGLE, count: 3 },
   *   { type: AtBatResultType.WALK, count: 2 },
   *   { type: AtBatResultType.SACRIFICE_FLY, count: 1 }
   * ];
   * const pa = StatisticsCalculator.calculatePlateAppearances(results); // 6
   * ```
   */
  static calculatePlateAppearances(results: AtBatResult[]): number {
    return results.reduce((total, result) => {
      this.validateNonNegative(result.count, `count for ${result.type}`);
      return total + result.count;
    }, 0);
  }

  /**
   * Calculates comprehensive player statistics from at-bat results.
   *
   * @remarks
   * **Comprehensive Statistics**: Calculates all major offensive statistics
   * from a complete set of at-bat results for a player.
   *
   * **Calculated Statistics**:
   * - Basic counts: hits, at-bats, plate appearances, total bases, walks
   * - Percentages: batting average, on-base percentage, slugging percentage
   * - Advanced metrics: OPS
   *
   * **Usage**: Primary method for converting raw game data into meaningful
   * statistical analysis. Handles all edge cases and provides complete
   * statistical profile.
   *
   * @param results - Array of all at-bat results for the player
   * @returns Complete PlayerStats object with all calculated statistics
   *
   * @example
   * ```typescript
   * const seasonResults: AtBatResult[] = [
   *   { type: AtBatResultType.SINGLE, count: 25 },
   *   { type: AtBatResultType.DOUBLE, count: 8 },
   *   { type: AtBatResultType.HOME_RUN, count: 5 },
   *   { type: AtBatResultType.WALK, count: 12 },
   *   { type: AtBatResultType.STRIKEOUT, count: 18 }
   * ];
   *
   * const stats = StatisticsCalculator.calculatePlayerStats(seasonResults);
   * console.log(`${stats.hits}/${stats.atBats} = ${stats.battingAverage} BA`);
   * ```
   */
  static calculatePlayerStats(results: AtBatResult[]): PlayerStats {
    // Calculate basic counts
    const hits = this.calculateHits(results);
    const atBats = this.calculateAtBats(results);
    const plateAppearances = this.calculatePlateAppearances(results);
    const totalBases = this.calculateTotalBases(results);

    // Count walks specifically
    const walks = results
      .filter(r => r.type === AtBatResultType.WALK)
      .reduce((sum, r) => sum + r.count, 0);

    // For OBP calculation, we need HBP and SF counts (assuming 0 for now as they're not in AtBatResultType)
    const hitByPitch = 0; // Not tracked in current AtBatResultType enum
    const sacrificeFlies = results
      .filter(r => r.type === AtBatResultType.SACRIFICE_FLY)
      .reduce((sum, r) => sum + r.count, 0);

    // Calculate derived statistics
    const battingAverage = this.calculateBattingAverage(hits, atBats);
    const onBasePercentage = this.calculateOnBasePercentage(
      hits,
      walks,
      hitByPitch,
      atBats,
      sacrificeFlies
    );
    const sluggingPercentage = this.calculateSluggingPercentage(totalBases, atBats);
    const ops = this.calculateOPS(onBasePercentage, sluggingPercentage);

    return {
      hits,
      atBats,
      plateAppearances,
      totalBases,
      walks,
      battingAverage,
      onBasePercentage,
      sluggingPercentage,
      ops,
    };
  }

  /**
   * Determines if an at-bat result type counts as a hit.
   *
   * @remarks
   * **Hit Classification**: Only singles, doubles, triples, and home runs count as hits.
   * All other outcomes (walks, errors, outs, etc.) do not count as hits.
   *
   * @param resultType - The at-bat result type to check
   * @returns True if the result type is a hit, false otherwise
   *
   * @example
   * ```typescript
   * console.log(StatisticsCalculator.isHit(AtBatResultType.SINGLE)); // true
   * console.log(StatisticsCalculator.isHit(AtBatResultType.WALK));   // false
   * ```
   */
  static isHit(resultType: AtBatResultType): boolean {
    return [
      AtBatResultType.SINGLE,
      AtBatResultType.DOUBLE,
      AtBatResultType.TRIPLE,
      AtBatResultType.HOME_RUN,
    ].includes(resultType);
  }

  /**
   * Determines if an at-bat result type counts as an official at-bat.
   *
   * @remarks
   * **At-Bat Classification**: Most plate appearances count as at-bats except:
   * - Walks (base on balls)
   * - Sacrifice flies
   * - Hit by pitch (not in current enum)
   * - Sacrifice hits/bunts (not in current enum)
   *
   * @param resultType - The at-bat result type to check
   * @returns True if the result type counts as an at-bat, false otherwise
   *
   * @example
   * ```typescript
   * console.log(StatisticsCalculator.countsAsAtBat(AtBatResultType.SINGLE));  // true
   * console.log(StatisticsCalculator.countsAsAtBat(AtBatResultType.WALK));    // false
   * console.log(StatisticsCalculator.countsAsAtBat(AtBatResultType.ERROR));   // true
   * ```
   */
  static countsAsAtBat(resultType: AtBatResultType): boolean {
    // Walks and sacrifice flies don't count as at-bats
    return ![AtBatResultType.WALK, AtBatResultType.SACRIFICE_FLY].includes(resultType);
  }

  /**
   * Gets the base value for a specific at-bat result type.
   *
   * @remarks
   * **Base Value Mapping**: Returns the number of bases achieved for hit types:
   * - Single: 1 base
   * - Double: 2 bases
   * - Triple: 3 bases
   * - Home Run: 4 bases
   * - All other results: 0 bases
   *
   * Used in calculating total bases for slugging percentage.
   *
   * @param resultType - The at-bat result type
   * @returns The number of bases for this result type
   *
   * @example
   * ```typescript
   * console.log(StatisticsCalculator.getBaseValue(AtBatResultType.DOUBLE));  // 2
   * console.log(StatisticsCalculator.getBaseValue(AtBatResultType.WALK));    // 0
   * ```
   */
  static getBaseValue(resultType: AtBatResultType): number {
    switch (resultType) {
      case AtBatResultType.SINGLE:
        return 1;
      case AtBatResultType.DOUBLE:
        return 2;
      case AtBatResultType.TRIPLE:
        return 3;
      case AtBatResultType.HOME_RUN:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Validates that a number is non-negative.
   *
   * @param value - The value to validate
   * @param name - The name of the parameter for error messages
   * @throws {DomainError} When the value is negative
   */
  private static validateNonNegative(value: number, name: string): void {
    if (value < 0) {
      throw new DomainError(`${name} cannot be negative`);
    }
  }

  /**
   * Rounds a number to three decimal places.
   *
   * @param value - The value to round
   * @returns The value rounded to 3 decimal places
   */
  private static roundToThreeDecimals(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
