import { PlayerId } from './PlayerId.js';

/**
 * Represents the three bases in softball/baseball where runners can be positioned.
 *
 * @remarks
 * In softball, bases are numbered from first to third, with HOME plate being
 * where runners score. This type excludes HOME as it's not a base where
 * runners remain - they either advance to score or are out.
 */
export type Base = 'FIRST' | 'SECOND' | 'THIRD';

/**
 * Immutable value object representing the current state of baserunners in a softball game.
 *
 * @remarks
 * BasesState encapsulates all business logic related to baserunners, including:
 * - Runner placement and movement
 * - Force play determination (critical for defensive strategy)
 * - Scoring position identification (runners who can score on most hits)
 * - Base occupancy tracking
 *
 * **Immutability Pattern**: All operations return new BasesState instances rather than
 * modifying the existing state. This ensures thread safety, enables undo/redo functionality,
 * and prevents accidental mutations during game state transitions.
 *
 * **Force Play Rules**: A force play occurs when a runner must advance due to the batter
 * becoming a baserunner. Understanding force plays is crucial for defensive strategy:
 * - FIRST base: Always forced when occupied (batter must reach first)
 * - SECOND base: Forced only when both FIRST and SECOND are occupied
 * - THIRD base: Forced only when bases are loaded (all three bases occupied)
 *
 * @example
 * ```typescript
 * // Create empty bases at start of inning
 * const bases = BasesState.empty();
 *
 * // Place runner on first base after a single
 * const withRunner = bases.withRunnerOn('FIRST', playerId);
 *
 * // Check if runner is in scoring position
 * const scoringRunners = withRunner.getRunnersInScoringPosition(); // []
 *
 * // Advance runner to second on stolen base
 * const advanced = withRunner.withRunnerAdvanced('FIRST', 'SECOND');
 * const scoringNow = advanced.getRunnersInScoringPosition(); // [playerId]
 *
 * // Check force play situation with runner on first
 * console.log(withRunner.isForceAt('FIRST')); // true - batter forces runner
 * console.log(withRunner.isForceAt('SECOND')); // false - no force at second yet
 * ```
 */
export class BasesState {
  private constructor(private readonly runners: ReadonlyMap<Base, PlayerId>) {}

  /**
   * Creates an empty bases state with no runners on any base.
   *
   * @remarks
   * Used at the start of each inning or after clearing the bases due to
   * defensive plays like triple plays or when the third out ends the inning.
   *
   * @returns A new BasesState instance with no runners on base
   *
   * @example
   * ```typescript
   * // Start of new inning
   * const cleanBases = BasesState.empty();
   * console.log(cleanBases.getOccupiedBases()); // []
   * ```
   */
  static empty(): BasesState {
    return new BasesState(new Map());
  }

  /**
   * Returns a new BasesState with the specified runner placed on the given base.
   *
   * @remarks
   * This method places a runner on a base, potentially replacing any existing runner
   * at that position. In real gameplay, this typically happens when:
   * - A batter reaches base safely (placed on FIRST)
   * - A runner advances due to a hit, walk with bases loaded, or error
   * - Manual correction of game state
   *
   * **Note**: This method does not validate baseball rules - it simply places the runner.
   * Game logic should ensure valid transitions (e.g., not placing a runner on SECOND
   * when FIRST is empty without proper advancement).
   *
   * @param base - The base where the runner should be placed
   * @param playerId - The unique identifier of the player to place on base
   * @returns A new BasesState instance with the runner positioned
   *
   * @example
   * ```typescript
   * const bases = BasesState.empty();
   *
   * // Batter reaches first base on a single
   * const runnerOnFirst = bases.withRunnerOn('FIRST', batterId);
   *
   * // Place pinch runner on second base
   * const pinchRunner = runnerOnFirst.withRunnerOn('SECOND', pinchRunnerId);
   * ```
   */
  withRunnerOn(base: Base, playerId: PlayerId): BasesState {
    const newRunners = new Map(this.runners);
    newRunners.set(base, playerId);
    return new BasesState(newRunners);
  }

  /**
   * Returns a new BasesState with a runner advanced from one base to another.
   *
   * @remarks
   * This method handles all types of runner advancement in softball:
   *
   * **Base-to-Base Movement**:
   * - Stolen bases (FIRST → SECOND, SECOND → THIRD, THIRD → HOME)
   * - Advancement on hits (runner on FIRST advances to SECOND or THIRD)
   * - Force advancement due to batter reaching base
   *
   * **Scoring (to HOME)**:
   * - When a runner advances to 'HOME', they score and are removed from the bases
   * - The runner is not placed on any base - they have completed their circuit
   *
   * **Safety Features**:
   * - If no runner exists on the 'from' base, returns the current state unchanged
   * - Prevents errors when attempting invalid movements
   *
   * @param from - The base the runner is currently occupying
   * @param to - The destination base, or 'HOME' if the runner scores
   * @returns A new BasesState with the runner moved, or unchanged if no runner exists
   *
   * @example
   * ```typescript
   * const bases = BasesState.empty().withRunnerOn('FIRST', runnerId);
   *
   * // Runner steals second base
   * const stolenBase = bases.withRunnerAdvanced('FIRST', 'SECOND');
   * console.log(stolenBase.getRunner('FIRST')); // undefined
   * console.log(stolenBase.getRunner('SECOND')); // runnerId
   *
   * // Runner scores from third on a sacrifice fly
   * const withRunnerOnThird = stolenBase.withRunnerAdvanced('SECOND', 'THIRD');
   * const scored = withRunnerOnThird.withRunnerAdvanced('THIRD', 'HOME');
   * console.log(scored.getRunner('THIRD')); // undefined - runner scored
   *
   * // Attempting to advance non-existent runner
   * const unchanged = bases.withRunnerAdvanced('SECOND', 'THIRD');
   * console.log(unchanged.equals(bases)); // true - no change occurred
   * ```
   */
  withRunnerAdvanced(from: Base, to: Base | 'HOME'): BasesState {
    const runner = this.runners.get(from);

    // If no runner on the 'from' base, return unchanged state
    if (!runner) {
      return this;
    }

    const newRunners = new Map(this.runners);

    // Remove runner from the 'from' base
    newRunners.delete(from);

    // If advancing to HOME, don't place on any base
    if (to !== 'HOME') {
      newRunners.set(to, runner);
    }

    return new BasesState(newRunners);
  }

  /**
   * Returns an empty BasesState with all runners cleared from the bases.
   *
   * @remarks
   * Used in scenarios where all runners are cleared simultaneously:
   * - End of inning (third out made)
   * - Triple play or double play that ends the inning
   * - Defensive plays that clear multiple runners
   * - Game reset or correction scenarios
   *
   * This is equivalent to calling `BasesState.empty()` but maintains the
   * fluent interface pattern for chaining operations.
   *
   * @returns A new empty BasesState instance
   *
   * @example
   * ```typescript
   * // Bases loaded scenario
   * let bases = BasesState.empty()
   *   .withRunnerOn('FIRST', player1)
   *   .withRunnerOn('SECOND', player2)
   *   .withRunnerOn('THIRD', player3);
   *
   * console.log(bases.getOccupiedBases().length); // 3
   *
   * // Triple play clears all runners
   * const cleared = bases.withBasesCleared();
   * console.log(cleared.getOccupiedBases().length); // 0
   * ```
   */
  withBasesCleared(): BasesState {
    return BasesState.empty();
  }

  /**
   * Retrieves the runner currently occupying the specified base.
   *
   * @remarks
   * This is a pure query method that doesn't modify state. Returns the PlayerId
   * of the runner on the specified base, or undefined if the base is empty.
   *
   * Used for:
   * - Checking if a base is occupied before making strategic decisions
   * - Identifying which player to advance on a hit
   * - Determining pinch running opportunities
   * - Game state display and validation
   *
   * @param base - The base to check for a runner
   * @returns The PlayerId of the runner on base, or undefined if empty
   *
   * @example
   * ```typescript
   * const bases = BasesState.empty().withRunnerOn('SECOND', runnerId);
   *
   * console.log(bases.getRunner('FIRST'));  // undefined - no runner
   * console.log(bases.getRunner('SECOND')); // runnerId - runner present
   * console.log(bases.getRunner('THIRD'));  // undefined - no runner
   * ```
   */
  getRunner(base: Base): PlayerId | undefined {
    return this.runners.get(base);
  }

  /**
   * Returns an array of all currently occupied bases in baseball order (FIRST, SECOND, THIRD).
   *
   * @remarks
   * This method provides a quick overview of base occupancy for:
   * - Game state display (showing which bases have runners)
   * - Strategic analysis (how many runners are on base)
   * - Force play calculation preparation
   * - Statistical tracking (runners left on base)
   *
   * The bases are returned in conventional baseball order regardless of when
   * runners were placed, making it easy to display or process systematically.
   *
   * @returns Array of occupied bases in order [FIRST, SECOND, THIRD]
   *
   * @example
   * ```typescript
   * const bases = BasesState.empty()
   *   .withRunnerOn('THIRD', player1)
   *   .withRunnerOn('FIRST', player2);
   *
   * console.log(bases.getOccupiedBases()); // ['FIRST', 'THIRD'] - maintains order
   *
   * // Check how many runners are on base
   * const runnerCount = bases.getOccupiedBases().length; // 2
   * ```
   */
  getOccupiedBases(): Base[] {
    const orderedBases: Base[] = ['FIRST', 'SECOND', 'THIRD'];

    return orderedBases.filter(base => this.runners.has(base));
  }

  /**
   * Returns an array of runners currently in "scoring position" (on SECOND or THIRD base).
   *
   * @remarks
   * **Scoring Position Definition**: A runner is in scoring position when they can
   * potentially score on most base hits. This includes:
   * - SECOND base: Can usually score on singles to the outfield
   * - THIRD base: Can score on most hits, wild pitches, passed balls, or sacrifice flies
   *
   * **Strategic Importance**: Runners in scoring position represent immediate
   * scoring threats and influence:
   * - Defensive positioning (infield may play in)
   * - Pitching strategy (may be more careful with walks)
   * - Offensive strategy (situational hitting, sacrifice plays)
   * - Statistical tracking (RBI opportunities, clutch hitting situations)
   *
   * **Note**: FIRST base is not considered scoring position as runners typically
   * cannot score on a single from first base.
   *
   * @returns Array of PlayerIds for runners on SECOND and/or THIRD base
   *
   * @example
   * ```typescript
   * const bases = BasesState.empty()
   *   .withRunnerOn('FIRST', player1)   // Not in scoring position
   *   .withRunnerOn('SECOND', player2)  // In scoring position
   *   .withRunnerOn('THIRD', player3);  // In scoring position
   *
   * const scoringRunners = bases.getRunnersInScoringPosition();
   * console.log(scoringRunners); // [player2, player3]
   *
   * // Check if there are scoring opportunities
   * const hasRBI_Opportunity = scoringRunners.length > 0; // true
   * ```
   */
  getRunnersInScoringPosition(): PlayerId[] {
    const runners: PlayerId[] = [];

    const secondRunner = this.runners.get('SECOND');
    if (secondRunner) {
      runners.push(secondRunner);
    }

    const thirdRunner = this.runners.get('THIRD');
    if (thirdRunner) {
      runners.push(thirdRunner);
    }

    return runners;
  }

  /**
   * Determines if a force play exists at the specified base.
   *
   * @remarks
   * **Force Play Definition**: A force play occurs when a runner must advance to the
   * next base because the batter has become a baserunner. This is one of the most
   * important tactical concepts in softball/baseball defense.
   *
   * **Force Play Rules**:
   * - **FIRST Base**: Always forced when occupied - the batter must reach first base
   * - **SECOND Base**: Forced only when FIRST and SECOND are both occupied
   * - **THIRD Base**: Forced only when all three bases are occupied (bases loaded)
   *
   * **Strategic Implications**:
   * - Force plays are easier defensive opportunities (no tag required)
   * - Defenders can force out the lead runner by fielding to any base ahead of them
   * - Double plays often rely on force play situations
   * - Affects base stealing strategy (harder to steal when forced)
   *
   * **Common Scenarios**:
   * - Runner on FIRST: Batter hits ground ball → force play at SECOND
   * - Runners on FIRST and SECOND: Ground ball → force at THIRD or turn double play
   * - Bases loaded: Ground ball → force at any base, potential triple play
   *
   * @param base - The base to check for a force play situation
   * @returns true if a force play exists at the specified base, false otherwise
   *
   * @example
   * ```typescript
   * // Runner on first only
   * const runnerOnFirst = BasesState.empty().withRunnerOn('FIRST', player1);
   * console.log(runnerOnFirst.isForceAt('FIRST'));  // true - batter forces runner
   * console.log(runnerOnFirst.isForceAt('SECOND')); // false - second not occupied
   * console.log(runnerOnFirst.isForceAt('THIRD'));  // false - bases not loaded
   *
   * // Runners on first and second
   * const firstAndSecond = runnerOnFirst.withRunnerOn('SECOND', player2);
   * console.log(firstAndSecond.isForceAt('FIRST'));  // true - always forced
   * console.log(firstAndSecond.isForceAt('SECOND')); // true - both bases occupied
   * console.log(firstAndSecond.isForceAt('THIRD'));  // false - third not occupied
   *
   * // Bases loaded
   * const basesLoaded = firstAndSecond.withRunnerOn('THIRD', player3);
   * console.log(basesLoaded.isForceAt('FIRST'));  // true - always forced
   * console.log(basesLoaded.isForceAt('SECOND')); // true - first and second occupied
   * console.log(basesLoaded.isForceAt('THIRD'));  // true - all bases occupied
   * ```
   */
  isForceAt(base: Base): boolean {
    switch (base) {
      case 'FIRST':
        // Force at first if there's already a runner on first
        return this.runners.has('FIRST');

      case 'SECOND':
        // Force at second if there are runners on first AND second
        return this.runners.has('FIRST') && this.runners.has('SECOND');

      case 'THIRD':
        // Force at third if bases are loaded (runners on all three bases)
        return this.runners.has('FIRST') && this.runners.has('SECOND') && this.runners.has('THIRD');

      default:
        return false;
    }
  }

  /**
   * Compares this BasesState with another for value equality.
   *
   * @remarks
   * **Value Object Equality**: Since BasesState is a value object, equality is based
   * on the actual data content rather than object identity. Two BasesState instances
   * are equal if they have the same runners on the same bases.
   *
   * **Comparison Logic**:
   * - First checks if both objects are BasesState instances
   * - Compares the number of occupied bases
   * - Verifies each runner's PlayerId matches using PlayerId.equals()
   * - Returns false if any difference is found
   *
   * **Use Cases**:
   * - Game state comparison for undo/redo functionality
   * - Testing and validation
   * - Change detection in game state updates
   * - Event sourcing equality checks
   *
   * @param other - The BasesState instance to compare with
   * @returns true if both BasesState instances have identical runner configurations
   *
   * @example
   * ```typescript
   * const bases1 = BasesState.empty().withRunnerOn('FIRST', player1);
   * const bases2 = BasesState.empty().withRunnerOn('FIRST', player1);
   * const bases3 = BasesState.empty().withRunnerOn('SECOND', player1);
   *
   * console.log(bases1.equals(bases2)); // true - same runner, same base
   * console.log(bases1.equals(bases3)); // false - different base
   * console.log(bases1.equals(bases1)); // true - same instance
   *
   * // Null safety
   * console.log(bases1.equals(null)); // false
   * ```
   */
  equals(other: BasesState): boolean {
    if (!other || !(other instanceof BasesState)) {
      return false;
    }

    // Check if maps have same size
    if (this.runners.size !== other.runners.size) {
      return false;
    }

    // Check if all entries match
    return Array.from(this.runners.entries()).every(([base, playerId]) => {
      const otherPlayerId = other.runners.get(base);
      return otherPlayerId && playerId.equals(otherPlayerId);
    });
  }
}
