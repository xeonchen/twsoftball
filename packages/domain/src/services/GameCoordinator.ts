import { Game } from '../aggregates/Game.js';
import { InningState, RunnerMovement } from '../aggregates/InningState.js';
import { TeamLineup } from '../aggregates/TeamLineup.js';
import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';
import type { SoftballRules } from '../rules/SoftballRules.js';
import { BasesState, Base } from '../value-objects/BasesState.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { RBICalculator } from './RBICalculator.js';

/**
 * Represents the movement of a runner from one position to another.
 *
 * @remarks
 * Simplified interface for specifying runner advancement during at-bat coordination.
 * Used by the GameCoordinator to accept runner movement overrides and calculate
 * automatic advancement patterns.
 *
 * **Movement Types:**
 * - `fromBase: Base` - Runner advancing from an occupied base
 * - `fromBase: null` - Batter advancing from home plate (e.g., batter put out, batter reaching base)
 * - `toBase: Base | 'HOME'` - Successful advancement to a base or scoring
 * - `toBase: 'OUT'` - Runner or batter being put out during the play
 */
export interface RunnerAdvancement {
  /** The player who is advancing */
  runnerId: PlayerId;
  /** The base they are leaving (null for batter starting from home plate) */
  fromBase: Base | null;
  /** The base they are advancing to, 'HOME' if scoring, or 'OUT' if put out */
  toBase: Base | 'HOME' | 'OUT';
}

/**
 * Information about inning transitions when half-innings or full innings end.
 *
 * @remarks
 * Provides details about the new inning state after an inning transition occurs.
 * Used to coordinate between Game and InningState aggregates.
 */
export interface InningTransition {
  /** The new inning number after transition */
  newInningNumber: number;
  /** Whether the new inning half is top (true) or bottom (false) */
  newTopHalf: boolean;
}

/**
 * Comprehensive result of an at-bat recording operation.
 *
 * @remarks
 * Contains all information about the outcome of recording an at-bat,
 * including updated aggregate states, statistical results, and any
 * game state transitions that occurred.
 */
export interface AtBatRecordingResult {
  /** Whether the at-bat was successfully recorded */
  success: boolean;
  /** Updated game aggregate after recording the at-bat */
  updatedGame: Game | null;
  /** Updated inning state aggregate after recording the at-bat */
  updatedInningState: InningState | null;
  /** Number of runs that scored as a result of this at-bat */
  runsScored: number;
  /** Number of RBIs credited to the batter */
  rbis: number;
  /** Whether this at-bat completed the current half-inning (3rd out) */
  inningComplete: boolean;
  /** Information about inning transition if one occurred */
  inningTransition: InningTransition | null;
  /** Whether this at-bat completed the entire game */
  gameComplete: boolean;
  /** The reason for game completion if the game ended */
  completionReason: 'REGULATION' | 'WALKOFF' | 'MERCY_RULE' | null;
  /** Any error message if the operation failed */
  errorMessage?: string;
}

/**
 * Domain service responsible for orchestrating complex game operations across multiple aggregates.
 *
 * @remarks
 * **GameCoordinator Purpose**: Manages sophisticated softball game operations that span multiple
 * domain aggregates, ensuring consistency, business rule enforcement, and proper event sequencing.
 * Acts as the primary orchestration point for complex game state transitions.
 *
 * **Multi-Aggregate Coordination**:
 * - **Game Aggregate**: Overall game state, score tracking, completion conditions
 * - **InningState Aggregate**: Detailed inning progress, outs, baserunners
 * - **TeamLineup Aggregates**: Player participation, batting order, substitutions
 * - **Domain Services**: RBI calculation, statistics, validation rules
 *
 * **Core Responsibilities**:
 * 1. **At-Bat Recording**: Coordinates all effects of an at-bat across aggregates
 * 2. **Runner Advancement**: Calculates and validates baserunner movements
 * 3. **Inning Transitions**: Manages half-inning and full-inning changes
 * 4. **Game Completion**: Detects and handles game-ending conditions
 * 5. **Rule Enforcement**: Ensures all softball rules are consistently applied
 * 6. **Statistical Calculation**: Integrates with statistics services for accuracy
 *
 * **Business Rule Integration**:
 * - Automatic runner advancement based on hit types
 * - Walk-off victory detection for home team wins
 * - Regulation game completion (7+ innings)
 * - Two-tier mercy rule application (10 runs after 4th inning, 7 runs after 5th inning)
 * - Force play and RBI calculation
 * - Inning transition logic
 *
 * **Transactional Consistency**:
 * All operations are atomic - either all aggregates are updated successfully
 * or none are modified, maintaining domain consistency.
 *
 * @example
 * ```typescript
 * // Record a game-winning home run
 * const result = GameCoordinator.recordAtBat(
 *   game,
 *   homeLineup,
 *   awayLineup,
 *   inningState,
 *   batterId,
 *   AtBatResultType.HOME_RUN,
 *   [] // Auto-calculate runner advancement
 * );
 *
 * if (result.success) {
 *   console.log(`${result.runsScored} runs scored!`);
 *   console.log(`${result.rbis} RBIs credited`);
 *
 *   if (result.gameComplete) {
 *     console.log(`Game over: ${result.completionReason}`);
 *   }
 * }
 *
 * // Record at-bat with custom runner advancement
 * const customResult = GameCoordinator.recordAtBat(
 *   game, homeLineup, awayLineup, inningState,
 *   batterId, AtBatResultType.SINGLE,
 *   [
 *     { runnerId: runner1Id, fromBase: 'FIRST', toBase: 'THIRD' }, // Aggressive advancement
 *     { runnerId: runner2Id, fromBase: 'THIRD', toBase: 'HOME' }   // Score from third
 *   ]
 * );
 * ```
 */
export class GameCoordinator {
  /**
   * Records an at-bat and orchestrates all resulting game state changes across multiple aggregates.
   *
   * @remarks
   * This is the primary coordination method that handles the complete lifecycle of an at-bat
   * in a softball game. It manages complex interactions between:
   *
   * **Aggregate Updates**:
   * - Updates InningState with at-bat result and runner advancement
   * - Updates Game with score changes and potential completion
   * - Validates player participation through TeamLineup aggregates
   *
   * **Automatic Calculations**:
   * - Determines standard runner advancement patterns based on hit type
   * - Calculates RBIs using business rules
   * - Counts runs scored from baserunner movements
   * - Detects inning completion (3rd out)
   * - Identifies game completion conditions
   *
   * **Business Rule Enforcement**:
   * - Validates game is in playable state (started, not completed)
   * - Ensures batter is eligible and in correct batting order
   * - Validates runner advancement instructions against current base state
   * - Applies softball-specific rules (walk-offs, mercy rule, etc.)
   * - Rules are now injected via the Game aggregate (uses game.rules)
   *
   * **Error Handling**:
   * Returns success/failure status with detailed error information rather than throwing,
   * enabling calling code to handle edge cases gracefully.
   *
   * @param game - Current game state (contains rules configuration)
   * @param homeLineup - Home team lineup and player information
   * @param awayLineup - Away team lineup and player information
   * @param inningState - Current inning state with bases and outs
   * @param batterId - The player recording the at-bat
   * @param result - The type of at-bat result (hit, walk, out, etc.)
   * @param runnerAdvancementOverrides - Optional custom runner movements (empty for auto-calculation)
   * @param _deprecatedRules - DEPRECATED: Rules are now part of Game aggregate. This parameter is ignored.
   * @returns Complete result including updated aggregates and statistical information
   *
   * @example
   * ```typescript
   * // Automatic runner advancement (game contains rules)
   * const result = GameCoordinator.recordAtBat(
   *   game, homeLineup, awayLineup, inningState,
   *   batterId, AtBatResultType.DOUBLE, []
   * );
   *
   * // Custom runner advancement
   * const customResult = GameCoordinator.recordAtBat(
   *   game, homeLineup, awayLineup, inningState,
   *   batterId, AtBatResultType.SINGLE,
   *   [{ runnerId: runnerId, fromBase: 'SECOND', toBase: 'HOME' }]
   * );
   *
   * // Handle results
   * if (result.success) {
   *   // Update UI, persist changes, etc.
   *   updateGameDisplay(result.updatedGame, result.updatedInningState);
   *
   *   if (result.gameComplete) {
   *     showGameCompletionDialog(result.completionReason);
   *   }
   * } else {
   *   showErrorMessage(result.errorMessage);
   * }
   * ```
   */
  static recordAtBat(
    game: Game,
    homeLineup: TeamLineup,
    awayLineup: TeamLineup,
    inningState: InningState,
    batterId: PlayerId,
    result: AtBatResultType,
    runnerAdvancementOverrides: RunnerAdvancement[],
    /** @deprecated Rules are now part of Game aggregate. This parameter is ignored. */
    _deprecatedRules?: SoftballRules
  ): AtBatRecordingResult {
    // Note: _deprecatedRules parameter is ignored (see @deprecated JSDoc above)
    // TypeScript/IDE will warn developers about usage via JSDoc annotation
    try {
      // 1. Validate preconditions
      this.validateGameState(game);
      this.validateBatterEligibility(homeLineup, awayLineup, inningState, batterId);
      this.validateRunnerAdvancement(inningState, runnerAdvancementOverrides);

      // 2. Determine runner advancement (use overrides or calculate automatically)
      let runnerAdvancement: RunnerAdvancement[];
      let runsScored: number;

      if (runnerAdvancementOverrides.length > 0) {
        runnerAdvancement = runnerAdvancementOverrides;
        runsScored = this.calculateRunsScored(runnerAdvancement);
      } else {
        const advancementResult = this.determineRunnerAdvancement(
          result,
          inningState.basesState,
          batterId
        );
        runnerAdvancement = advancementResult.movements;
        runsScored = advancementResult.runsScored;
      }

      // 3. Calculate statistical outcomes
      const rbis = RBICalculator.calculateRBIs(result, inningState.basesState, inningState.outs);

      // 4. Record at-bat with InningState (determine batting slot from lineup)
      const currentLineup = inningState.isTopHalf ? awayLineup : homeLineup;
      const activeBattingSlots = currentLineup.getActiveLineup();
      const batterSlot = activeBattingSlots.find(slot => slot.getCurrentPlayer()?.equals(batterId));

      if (!batterSlot) {
        throw new DomainError('Batter not found in lineup'); // This should have been caught in validation
      }

      // Build gameContext for walk-off detection
      const gameContext = {
        homeScore: game.score.getHomeRuns(),
        awayScore: game.score.getAwayRuns(),
        totalInnings: game.rules.totalInnings,
        runsAboutToScore: runsScored,
      };

      // 5. Precompute runner movements for hits (SINGLE, DOUBLE, TRIPLE) and pass to InningState
      // This breaks the circular dependency by having GameCoordinator compute movements before calling InningState
      let precomputedMovements: RunnerMovement[] | undefined;
      const isHitType =
        result === AtBatResultType.SINGLE ||
        result === AtBatResultType.DOUBLE ||
        result === AtBatResultType.TRIPLE;

      if (isHitType) {
        // For hits, always precompute movements (whether from overrides or automatic calculation)
        precomputedMovements = this.convertToRunnerMovements(runnerAdvancement);
      }

      let updatedInningState = inningState.recordAtBat(
        batterId,
        batterSlot.position,
        result,
        inningState.inning,
        gameContext,
        precomputedMovements
      );

      // 6. Apply custom runner advancement for non-hit results with overrides
      // For hits, movements are already handled via precomputedMovements parameter
      if (runnerAdvancementOverrides.length > 0 && !isHitType) {
        const runnerMovements = this.convertToRunnerMovements(runnerAdvancement);
        updatedInningState = updatedInningState.advanceRunners(result, runnerMovements);
      }

      // 7. Update game state with score changes
      const currentTeam = inningState.isTopHalf ? 'AWAY' : 'HOME';
      const updatedGame = game;

      if (runsScored > 0) {
        if (currentTeam === 'HOME') {
          updatedGame.addHomeRuns(runsScored);
        } else {
          updatedGame.addAwayRuns(runsScored);
        }
      }

      // 8. Check for inning completion
      const inningComplete = updatedInningState.outs === 0 && inningState.outs === 2; // 3rd out resets outs to 0
      let inningTransition: InningTransition | null = null;

      if (inningComplete) {
        // Determine next inning state
        if (inningState.isTopHalf) {
          // Top half ended, go to bottom half
          inningTransition = {
            newInningNumber: inningState.inning,
            newTopHalf: false,
          };
        } else {
          // Bottom half ended, go to next inning
          inningTransition = {
            newInningNumber: inningState.inning + 1,
            newTopHalf: true,
          };
        }
      }

      // 9. Check for game completion BEFORE advancing Game's inning
      // Pass updatedInningState (after transition) - checkGameCompletion will
      // adjust to evaluate the inning that just completed
      const gameCompletion = this.checkGameCompletion(
        updatedGame,
        updatedInningState,
        runsScored,
        inningComplete
      );

      if (gameCompletion.isComplete) {
        updatedGame.completeGame(gameCompletion.gameEndingType);
        // Game completed - Game's inning state reflects WHERE it ended
        // (current position), not where it would have advanced to
        // Do NOT call advanceInning
      } else if (inningComplete) {
        // Game continues AND inning transitioned
        // Sync Game to match updatedInningState
        updatedGame.advanceInning();
      }

      return {
        success: true,
        updatedGame,
        updatedInningState,
        runsScored,
        rbis,
        inningComplete,
        inningTransition,
        gameComplete: gameCompletion.isComplete,
        completionReason: gameCompletion.reason,
      };
    } catch (error) {
      return {
        success: false,
        updatedGame: null,
        updatedInningState: null,
        runsScored: 0,
        rbis: 0,
        inningComplete: false,
        inningTransition: null,
        gameComplete: false,
        completionReason: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Calculates the number of runs scored from runner advancement movements.
   *
   * @remarks
   * **Run Scoring Logic**: A run is scored when a runner advances to 'HOME'.
   * This method counts all instances where `toBase` equals 'HOME' in the
   * runner advancement array.
   *
   * **Usage Context**: Used internally during at-bat recording to determine
   * how many runs to add to the team's score and for statistical tracking.
   *
   * @param runnerAdvancement - Array of runner movements
   * @returns Number of runs scored (count of movements to 'HOME')
   *
   * @example
   * ```typescript
   * const movements = [
   *   { runnerId: runner1, fromBase: 'THIRD', toBase: 'HOME' },
   *   { runnerId: runner2, fromBase: 'SECOND', toBase: 'THIRD' },
   *   { runnerId: batter, fromBase: null, toBase: 'FIRST' }
   * ];
   *
   * const runs = GameCoordinator.calculateRunsScored(movements); // 1
   * ```
   */
  static calculateRunsScored(runnerAdvancement: RunnerAdvancement[]): number {
    return runnerAdvancement.filter(movement => movement.toBase === 'HOME').length;
  }

  /**
   * Determines automatic runner advancement based on at-bat result type and current base situation.
   *
   * @remarks
   * **Automatic Advancement Rules**: Implements standard softball runner advancement
   * patterns for different types of at-bat results:
   *
   * **Hit Types**:
   * - Single: Runners advance 1 base (2nd/3rd typically score)
   * - Double: All runners score, batter to 2nd
   * - Triple: All runners score, batter to 3rd
   * - Home Run: All runners and batter score
   *
   * **Walk/Force Situations**:
   * - Walk: Only advance forced runners (bases loaded forces all)
   * - Force plays advance minimum required runners
   *
   * **Out Results**:
   * - Most outs: No automatic advancement
   * - Some contact outs may score runner from 3rd
   *
   * **Override Capability**: This method provides defaults that can be overridden
   * by the calling code for unusual situations or strategic decisions.
   *
   * @param resultType - The type of at-bat result
   * @param basesState - Current state of baserunners
   * @param batterId - The batter (becomes a runner on some results)
   * @returns Object containing movements array and runsScored count
   *   - movements: Array of RunnerAdvancement objects describing each runner's movement
   *   - runsScored: Number of runs that scored (count of movements to HOME)
   *
   * @example
   * ```typescript
   * const bases = BasesState.empty()
   *   .withRunnerOn('FIRST', runner1)
   *   .withRunnerOn('THIRD', runner2);
   *
   * const { movements, runsScored } = GameCoordinator.determineRunnerAdvancement(
   *   AtBatResultType.DOUBLE, bases, batterId
   * );
   * // movements: runner1 to HOME, runner2 to HOME, batter to SECOND
   * // runsScored: 2
   * ```
   */
  static determineRunnerAdvancement(
    resultType: AtBatResultType,
    basesState: BasesState,
    batterId: PlayerId
  ): { movements: RunnerAdvancement[]; runsScored: number } {
    const movements: RunnerAdvancement[] = [];
    const occupiedBases = basesState.getOccupiedBases();

    switch (resultType) {
      case AtBatResultType.HOME_RUN:
        // All runners and batter score
        occupiedBases.forEach(base => {
          const runnerId = basesState.getRunner(base);
          if (runnerId) {
            movements.push({ runnerId, fromBase: base, toBase: 'HOME' });
          }
        });
        movements.push({ runnerId: batterId, fromBase: null, toBase: 'HOME' }); // Batter scores
        break;

      case AtBatResultType.TRIPLE:
        // All runners score, batter to third
        occupiedBases.forEach(base => {
          const runnerId = basesState.getRunner(base);
          if (runnerId) {
            movements.push({ runnerId, fromBase: base, toBase: 'HOME' });
          }
        });
        movements.push({ runnerId: batterId, fromBase: null, toBase: 'THIRD' });
        break;

      case AtBatResultType.DOUBLE:
        // All runners score (advance 2+ bases), batter to second
        occupiedBases.forEach(base => {
          const runnerId = basesState.getRunner(base);
          if (runnerId) {
            movements.push({ runnerId, fromBase: base, toBase: 'HOME' });
          }
        });
        movements.push({ runnerId: batterId, fromBase: null, toBase: 'SECOND' });
        break;

      case AtBatResultType.SINGLE: {
        // Runners in scoring position typically score, runner on first advances to second
        const runnerOnFirst = basesState.getRunner('FIRST');
        const runnerOnSecond = basesState.getRunner('SECOND');
        const runnerOnThird = basesState.getRunner('THIRD');

        if (runnerOnFirst) {
          movements.push({ runnerId: runnerOnFirst, fromBase: 'FIRST', toBase: 'SECOND' });
        }
        if (runnerOnSecond) {
          movements.push({ runnerId: runnerOnSecond, fromBase: 'SECOND', toBase: 'HOME' });
        }
        if (runnerOnThird) {
          movements.push({ runnerId: runnerOnThird, fromBase: 'THIRD', toBase: 'HOME' });
        }
        movements.push({ runnerId: batterId, fromBase: null, toBase: 'FIRST' });
        break;
      }

      case AtBatResultType.WALK: {
        // Force advance only when necessary
        const basesArray: Base[] = ['FIRST', 'SECOND', 'THIRD'];
        let forceAdvance = true;

        // Check if bases are loaded or force situation exists
        for (let i = 0; i < basesArray.length; i += 1) {
          const base = basesArray[i]!; // Safe because we're iterating within array bounds
          const runner = basesState.getRunner(base);

          if (runner && forceAdvance) {
            const nextBase = i === 2 ? ('HOME' as const) : basesArray[i + 1]!; // Safe because i < 2 when accessing i+1
            movements.push({ runnerId: runner, fromBase: base, toBase: nextBase });
          } else {
            forceAdvance = false; // No more force advances needed
          }
        }

        // Batter always goes to first on a walk
        movements.push({ runnerId: batterId, fromBase: null, toBase: 'FIRST' });
        break;
      }

      case AtBatResultType.SACRIFICE_FLY: {
        // Runner on third scores if less than 2 outs
        const sacFlyRunner = basesState.getRunner('THIRD');
        if (sacFlyRunner) {
          movements.push({ runnerId: sacFlyRunner, fromBase: 'THIRD', toBase: 'HOME' });
        }
        // Batter is out, no advancement for batter
        break;
      }

      default:
        // Most other results (outs, errors, etc.) have no automatic advancement
        // Could be extended for specific cases like fielder's choice
        break;
    }

    const runsScored = movements.filter(movement => movement.toBase === 'HOME').length;
    return { movements, runsScored };
  }

  /**
   * Validates that the game is in a state where at-bats can be recorded.
   *
   * @param game - The game to validate
   * @throws {DomainError} When game is not in playable state
   */
  private static validateGameState(game: Game): void {
    if (game.status.valueOf() === 'NOT_STARTED') {
      throw new DomainError('Cannot record at-bat: Game has not been started');
    }

    if (game.status.valueOf() === 'COMPLETED') {
      throw new DomainError('Cannot record at-bat: Game has already been completed');
    }
  }

  /**
   * Validates that the batter is eligible to bat in the current game situation.
   *
   * @param homeLineup - Home team lineup
   * @param awayLineup - Away team lineup
   * @param inningState - Current inning state
   * @param batterId - The batter to validate
   * @throws {DomainError} When batter is not eligible
   */
  private static validateBatterEligibility(
    homeLineup: TeamLineup,
    awayLineup: TeamLineup,
    inningState: InningState,
    batterId: PlayerId
  ): void {
    const currentLineup = inningState.isTopHalf ? awayLineup : homeLineup;

    // Check if batter is in the current team's lineup
    const activeBattingSlots = currentLineup.getActiveLineup();
    const isInLineup = activeBattingSlots.some(slot => slot.getCurrentPlayer()?.equals(batterId));

    if (!isInLineup) {
      throw new DomainError("Batter is not in the current batting team's lineup");
    }

    // Additional validation could include checking batting order, substitution eligibility, etc.
  }

  /**
   * Validates that proposed runner advancement is valid given current base state.
   *
   * @param inningState - Current inning state
   * @param runnerAdvancement - Proposed runner movements
   * @throws {DomainError} When advancement is invalid
   */
  private static validateRunnerAdvancement(
    inningState: InningState,
    runnerAdvancement: RunnerAdvancement[]
  ): void {
    const { basesState } = inningState;

    runnerAdvancement.forEach(movement => {
      // Skip validation for batter movements (fromBase: null)
      // Batter is not on a base yet, so base state validation doesn't apply
      if (movement.fromBase === null) {
        return;
      }

      // Validate that runner exists on the specified base
      const runnerOnBase = basesState.getRunner(movement.fromBase);

      if (!runnerOnBase || !runnerOnBase.equals(movement.runnerId)) {
        throw new DomainError(
          `Runner ${movement.runnerId.value} is not on ${movement.fromBase} base`
        );
      }

      // Additional validations could include checking for valid base progression, etc.
    });
  }

  /**
   * Converts RunnerAdvancement objects to RunnerMovement objects for InningState.
   *
   * @param runnerAdvancement - Array of runner advancements
   * @returns Array of runner movements compatible with InningState
   *
   * @remarks
   * This method now supports the full range of runner movements:
   * - `fromBase: Base` - Runner advancing from occupied base
   * - `fromBase: null` - Batter advancing from home plate
   * - `toBase: Base | 'HOME'` - Successful advancement
   * - `toBase: 'OUT'` - Runner or batter being put out
   */
  private static convertToRunnerMovements(
    runnerAdvancement: RunnerAdvancement[]
  ): RunnerMovement[] {
    return runnerAdvancement.map(advancement => ({
      runnerId: advancement.runnerId,
      from: advancement.fromBase, // Can be null for batter
      to: advancement.toBase, // Can be 'OUT' for outs
    }));
  }

  /**
   * Checks if the game should be completed based on current state and recent scoring.
   *
   * @remarks
   * **Game Completion Detection Logic**:
   *
   * **Walk-Off Victory**: Home team scores in bottom half of regulation inning or later to take the lead.
   * Game ends immediately as home team cannot lose after taking lead in final at-bat.
   *
   * **Regulation Completion**: After completing regulation innings, if home team leads
   * after their at-bat opportunity (bottom half), game ends as regulation complete.
   *
   * **Configurable Mercy Rule**: Uses game's SoftballRules configuration for mercy rule logic:
   * - Supports both single-threshold and multi-tier mercy rule systems
   * - Multi-tier example: 10+ runs after 4th inning, 7+ runs after 5th inning
   * - Single-tier example: Traditional mercy rule with one threshold
   * - Completely configurable based on game's SoftballRules instance
   *
   * The mercy rule only applies after BOTH teams have had equal at-bat opportunities.
   * This means it can only trigger after the BOTTOM half of an inning completes.
   *
   * @param game - Current game state with score information and rules configuration
   * @param inningState - Current inning state (inning number, half, outs)
   * @param runsScored - Runs scored in this at-bat (for walk-off detection)
   * @param inningComplete - Whether the current inning half just completed
   * @returns Object indicating if game is complete, completion reason, and ending type
   */
  static checkGameCompletion(
    game: Game,
    inningState: InningState,
    runsScored: number,
    inningComplete: boolean = false
  ): {
    isComplete: boolean;
    reason: 'REGULATION' | 'WALKOFF' | 'MERCY_RULE';
    gameEndingType: 'REGULATION' | 'MERCY_RULE' | 'FORFEIT' | 'TIME_LIMIT';
  } {
    const { inning: currentInning } = inningState;
    const homeScore = game.score.getHomeRuns();
    const awayScore = game.score.getAwayRuns();
    const { totalInnings } = game.rules;

    // CRITICAL: When inningComplete=true, inningState HAS ALREADY transitioned
    // This happens in InningState.recordAtBat() which auto-advances on 3rd out
    // Example: Bottom of inning 7 ends → state advances to Top of inning 8
    // We need to "reverse" the transition to find which inning just completed
    //
    // State after transition:
    // - Top half (isTopHalf=true) + inningComplete → bottom of PREVIOUS inning just ended
    // - Bottom half (isTopHalf=false) + inningComplete → top of CURRENT inning just ended
    //
    const evaluationInning =
      inningComplete && inningState.isTopHalf
        ? currentInning - 1 // Now top of next inning → previous inning bottom just ended
        : currentInning; // Now bottom OR mid-inning → use current inning number

    // Walk-off win - Check FIRST as it takes highest priority
    // Home team takes lead in bottom of final inning or later
    // Ends IMMEDIATELY (not after 3 outs)
    if (
      !inningState.isTopHalf &&
      evaluationInning >= totalInnings &&
      runsScored > 0 &&
      homeScore > awayScore
    ) {
      return { isComplete: true, reason: 'WALKOFF', gameEndingType: 'REGULATION' };
    }

    // Mercy rule logic - Only applies after BOTTOM half completes
    // IMPORTANT: Mercy rule requires both teams to have equal at-bat opportunities
    // This means it can ONLY trigger after the bottom half completes, never after the top half
    // When inningComplete && isTopHalf=true, state transitioned to top = bottom half just ended
    if (
      inningComplete &&
      inningState.isTopHalf &&
      game.rules.isMercyRule(homeScore, awayScore, evaluationInning)
    ) {
      return { isComplete: true, reason: 'MERCY_RULE', gameEndingType: 'MERCY_RULE' };
    }

    // Regulation completion in top of final inning
    // Game ends if HOME team is ALREADY WINNING after top half completes
    // (no need for home team to bat when they're already ahead)
    // If home is losing or tied, they MUST get a chance to bat in the bottom half
    // When inningComplete && !isTopHalf, state transitioned to bottom = top half just ended
    if (evaluationInning >= totalInnings && !inningState.isTopHalf && inningComplete) {
      if (homeScore > awayScore) {
        return { isComplete: true, reason: 'REGULATION', gameEndingType: 'REGULATION' };
      }
    }

    // Regulation completion in bottom of final inning
    // Game ends after bottom half completes if home team is ahead or behind
    // Tied games continue to extra innings (unless max limit reached)
    // When inningComplete && isTopHalf, state transitioned to top of next = bottom half just ended
    if (evaluationInning === totalInnings && inningState.isTopHalf && inningComplete) {
      if (homeScore !== awayScore) {
        // Home team ahead or behind - game over
        return { isComplete: true, reason: 'REGULATION', gameEndingType: 'REGULATION' };
      }
      // Tied after regulation - game continues to extra innings
      // The game should always proceed to at least the first extra inning
      // Extra innings exhaustion is checked separately below
    }

    // Check if we're in extra innings and REACHED OR EXCEEDED the limit
    if (evaluationInning > totalInnings && game.rules.maxExtraInnings !== null) {
      const extraInningsPlayed = evaluationInning - totalInnings;
      // Use >= comparison: game ends when we reach the limit (not after exceeding it)
      if (extraInningsPlayed >= game.rules.maxExtraInnings) {
        // Max extra innings EXCEEDED - game ends after bottom half completes
        // When inningComplete && isTopHalf, state transitioned to top of next = bottom half just ended
        if (inningState.isTopHalf && inningComplete) {
          return { isComplete: true, reason: 'REGULATION', gameEndingType: 'REGULATION' };
        }
      }
    }

    return { isComplete: false, reason: 'REGULATION', gameEndingType: 'REGULATION' };
  }
}
