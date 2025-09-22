import { DomainError } from '../errors/DomainError.js';

/**
 * Immutable value object representing a non-negative run count in softball.
 *
 * @remarks
 * Score encapsulates the fundamental concept of runs in softball with strict
 * business rules ensuring data integrity:
 * - Only non-negative integers allowed (runs cannot be negative)
 * - Immutable operations return new Score instances
 * - Used as building block for team scores and game state
 *
 * **Domain Context**: Runs are the fundamental scoring unit in softball.
 * Each run represents a player successfully advancing around all bases
 * and reaching home plate. Score tracking is critical for:
 * - Game outcome determination
 * - Mercy rule evaluation
 * - Statistical record keeping
 * - Inning progression logic
 *
 * **Immutability Pattern**: All operations return new Score instances rather
 * than modifying existing ones, ensuring thread safety and enabling proper
 * event sourcing with state snapshots.
 *
 * @example
 * ```typescript
 * // Create initial score
 * const score = Score.zero(); // 0 runs
 *
 * // Add runs safely
 * const newScore = score.addRuns(3); // Returns new Score with 3 runs
 * console.log(score.runs);     // Still 0 (immutable)
 * console.log(newScore.runs);  // 3
 *
 * // Invalid operations throw DomainError:
 * // new Score(-1);           // Negative runs not allowed
 * // score.addRuns(-2);       // Cannot subtract runs
 * ```
 */
export class Score {
  /**
   * Creates a new Score with the specified number of runs.
   *
   * @param runs - The number of runs (must be non-negative integer)
   * @throws {DomainError} When runs is not an integer or is negative
   */
  constructor(readonly runs: number) {
    if (!Number.isInteger(runs) || runs < 0) {
      throw new DomainError('Score must be a non-negative integer');
    }
  }

  /**
   * Compares this Score with another for equality.
   *
   * @param other - The Score to compare against
   * @returns True if both scores have the same run count, false otherwise
   */
  equals(other: Score): boolean {
    if (!other || !(other instanceof Score)) {
      return false;
    }
    return this.runs === other.runs;
  }

  /**
   * Creates a new Score with additional runs added to the current total.
   *
   * @param additionalRuns - Number of runs to add (must be non-negative integer)
   * @returns New Score instance with the increased run count
   * @throws {DomainError} When additionalRuns is not an integer or is negative
   */
  addRuns(additionalRuns: number): Score {
    if (!Number.isInteger(additionalRuns) || additionalRuns < 0) {
      throw new DomainError('Additional runs must be a non-negative integer');
    }
    return new Score(this.runs + additionalRuns);
  }

  /**
   * Returns the string representation of this score.
   *
   * @returns The run count as a string
   */
  toString(): string {
    return this.runs.toString();
  }

  /**
   * Creates a new Score with zero runs.
   *
   * @returns Score instance with 0 runs, typically used for game initialization
   */
  static zero(): Score {
    return new Score(0);
  }

  /**
   * Creates a new Score from a run count.
   *
   * @param runs - The number of runs
   * @returns New Score instance with the specified run count
   * @throws {DomainError} When runs parameter is invalid (delegated to constructor)
   */
  static fromRuns(runs: number): Score {
    return new Score(runs);
  }
}
