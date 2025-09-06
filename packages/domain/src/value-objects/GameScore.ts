import { DomainError } from '../errors/DomainError';

import { Score } from './Score';

/**
 * Immutable value object representing the current score state for both teams in a softball game.
 *
 * @remarks
 * GameScore encapsulates the home and away team scores, providing business logic for:
 * - Score comparison and game state determination
 * - Run differential calculations (important for standings and mercy rule evaluation)
 * - Safe score mutations that return new instances
 * - Score display and formatting
 *
 * **Mercy Rule Context**: The run differential is crucial for determining when mercy
 * rules should be applied (e.g., 15+ run lead after 5 innings, 10+ run lead after 7 innings).
 *
 * **Immutability Pattern**: All score modifications return new GameScore instances,
 * ensuring thread safety and enabling proper event sourcing with state snapshots.
 *
 * @example
 * ```typescript
 * // Start new game with 0-0 score
 * const score = GameScore.zero();
 *
 * // Add runs and get new score state
 * const updatedScore = score.addHomeRuns(3).addAwayRuns(1);
 * console.log(updatedScore.toString()); // "3-1"
 * console.log(updatedScore.getRunDifferential()); // 2
 * ```
 */
export class GameScore {
  /**
   * Creates a new GameScore with the specified home and away scores.
   *
   * @param homeScore - The Score value object for the home team
   * @param awayScore - The Score value object for the away team
   * @throws {DomainError} When either score parameter is null or undefined
   */
  constructor(
    readonly homeScore: Score,
    readonly awayScore: Score
  ) {
    if (!homeScore) {
      throw new DomainError('Home score cannot be null or undefined');
    }
    if (!awayScore) {
      throw new DomainError('Away score cannot be null or undefined');
    }
  }

  /**
   * Gets the number of runs scored by the home team.
   *
   * @returns The home team's run total as a number
   */
  getHomeRuns(): number {
    return this.homeScore.runs;
  }

  /**
   * Gets the number of runs scored by the away team.
   *
   * @returns The away team's run total as a number
   */
  getAwayRuns(): number {
    return this.awayScore.runs;
  }

  /**
   * Calculates the total runs scored by both teams.
   *
   * @returns The combined run total for both teams
   */
  getTotalRuns(): number {
    return this.homeScore.runs + this.awayScore.runs;
  }

  /**
   * Determines if the home team is currently winning.
   *
   * @returns True if home team has more runs than away team, false otherwise
   */
  isHomeWinning(): boolean {
    return this.homeScore.runs > this.awayScore.runs;
  }

  /**
   * Determines if the away team is currently winning.
   *
   * @returns True if away team has more runs than home team, false otherwise
   */
  isAwayWinning(): boolean {
    return this.awayScore.runs > this.homeScore.runs;
  }

  /**
   * Determines if both teams have the same score.
   *
   * @returns True if both teams have scored the same number of runs, false otherwise
   */
  isTied(): boolean {
    return this.homeScore.runs === this.awayScore.runs;
  }

  /**
   * Determines if both teams have zero runs (0-0 score).
   *
   * @returns True if both teams have zero runs, false otherwise
   */
  isZero(): boolean {
    return this.homeScore.runs === 0 && this.awayScore.runs === 0;
  }

  /**
   * Calculates the run differential from the home team's perspective.
   *
   * @returns Positive number if home team is winning, negative if away team is winning, zero if tied
   * @remarks Critical for mercy rule evaluation and game completion logic
   */
  getRunDifferential(): number {
    return this.homeScore.runs - this.awayScore.runs;
  }

  /**
   * Creates a new GameScore with additional runs added to the home team.
   *
   * @param runs - Number of runs to add to the home team's score
   * @returns New GameScore instance with updated home team score
   * @throws {DomainError} When runs parameter is invalid (delegated to Score.addRuns)
   */
  addHomeRuns(runs: number): GameScore {
    const newHomeScore = this.homeScore.addRuns(runs);
    return new GameScore(newHomeScore, this.awayScore);
  }

  /**
   * Creates a new GameScore with additional runs added to the away team.
   *
   * @param runs - Number of runs to add to the away team's score
   * @returns New GameScore instance with updated away team score
   * @throws {DomainError} When runs parameter is invalid (delegated to Score.addRuns)
   */
  addAwayRuns(runs: number): GameScore {
    const newAwayScore = this.awayScore.addRuns(runs);
    return new GameScore(this.homeScore, newAwayScore);
  }

  /**
   * Compares this GameScore with another for equality.
   *
   * @param other - The GameScore to compare against
   * @returns True if both GameScores have identical home and away scores, false otherwise
   */
  equals(other: GameScore): boolean {
    if (!other || !(other instanceof GameScore)) {
      return false;
    }
    return this.homeScore.equals(other.homeScore) && this.awayScore.equals(other.awayScore);
  }

  /**
   * Returns the score in standard "home-away" format.
   *
   * @returns String representation like "7-3" (home score first, away score second)
   */
  toString(): string {
    return `${this.homeScore.runs}-${this.awayScore.runs}`;
  }

  /**
   * Creates a new GameScore with both teams at zero runs.
   *
   * @returns GameScore instance with 0-0 score, typically used for new games
   */
  static zero(): GameScore {
    return new GameScore(Score.zero(), Score.zero());
  }

  /**
   * Creates a new GameScore from run totals for both teams.
   *
   * @param homeRuns - Number of runs for the home team
   * @param awayRuns - Number of runs for the away team
   * @returns New GameScore instance with the specified run totals
   * @throws {DomainError} When either run total is invalid (delegated to Score constructor)
   */
  static fromRuns(homeRuns: number, awayRuns: number): GameScore {
    return new GameScore(new Score(homeRuns), new Score(awayRuns));
  }
}
