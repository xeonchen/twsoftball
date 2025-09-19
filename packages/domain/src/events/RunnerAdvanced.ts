import { DomainError } from '../errors/DomainError.js';
import { Base } from '../value-objects/BasesState.js';
import { GameId } from '../value-objects/GameId.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { DomainEvent } from './DomainEvent.js';

/**
 * Represents the reason why a runner advanced on the bases.
 *
 * This enum provides fine-grained tracking of runner advancement reasons,
 * which is essential for accurate softball statistics, game replay, and
 * undo/redo functionality in the event sourcing system.
 *
 * @remarks
 * Each advance reason captures different softball situations that cause
 * runners to move between bases. This granular tracking enables:
 * - Detailed statistical analysis (RBI calculations, stolen bases, errors)
 * - Accurate game replay and audit trails
 * - Proper undo/redo operations that understand game context
 * - Compliance with official softball scoring rules
 *
 * @example
 * ```typescript
 * // Runner advances from FIRST to SECOND on a hit
 * const hitAdvance = new RunnerAdvanced(
 *   gameId, runnerId, Base.FIRST, Base.SECOND, AdvanceReason.HIT
 * );
 *
 * // Batter advances to first on a walk
 * const walkAdvance = new RunnerAdvanced(
 *   gameId, batterId, null, Base.FIRST, AdvanceReason.WALK
 * );
 *
 * // Runner scores from third on a sacrifice fly
 * const sacrificeScore = new RunnerAdvanced(
 *   gameId, runnerId, Base.THIRD, 'HOME', AdvanceReason.SACRIFICE
 * );
 * ```
 */
export enum AdvanceReason {
  /**
   * Runner advances due to the batter hitting the ball.
   *
   * @remarks
   * This is the most common advancement reason. Occurs when:
   * - Batter gets a hit (single, double, triple, home run)
   * - Runners advance based on the quality and placement of the hit
   * - Used for calculating RBIs when runners score
   *
   * @example
   * Batter hits a double, runner on first advances to third
   */
  HIT = 'HIT',

  /**
   * Runner advances due to the batter receiving a walk (base on balls).
   *
   * @remarks
   * Occurs when:
   * - Batter walks and forces runners to advance (force situation)
   * - Runner steals during a walk count
   * - Bases loaded walk forces all runners to advance one base
   *
   * @example
   * Bases loaded, batter walks, all runners forced to advance one base
   */
  WALK = 'WALK',

  /**
   * Runner advances due to a sacrifice play by the batter.
   *
   * @remarks
   * Includes both sacrifice flies and sacrifice bunts:
   * - Sacrifice fly: Batter hits a fly ball that allows a runner to tag up and score
   * - Sacrifice bunt: Batter bunts to advance a runner, usually getting out in the process
   * - Batter typically gets out but the advancement is intentional
   *
   * @example
   * Runner on third, batter hits sacrifice fly to right field, runner tags up and scores
   */
  SACRIFICE = 'SACRIFICE',

  /**
   * Runner advances due to a defensive error.
   *
   * @remarks
   * Occurs when:
   * - Fielder commits an error (dropped ball, throwing error, etc.)
   * - Runner takes advantage of the mistake to advance
   * - Does not count as an earned run if the runner eventually scores
   * - Important for distinguishing earned vs. unearned runs
   *
   * @example
   * Ground ball to shortstop, throwing error allows runner on first to advance to second
   */
  ERROR = 'ERROR',

  /**
   * Runner advances on a fielder's choice play.
   *
   * @remarks
   * Occurs when:
   * - Fielder chooses to get out a different runner instead of the batter
   * - Usually happens when fielder attempts to get the lead runner
   * - Batter reaches base but another runner may be forced out
   * - No hit is credited, but runners may still advance
   *
   * @example
   * Runner on first, ground ball to second base, fielder throws to second for the force out
   * but runner advances to second on the same play
   */
  FIELDERS_CHOICE = 'FIELDERS_CHOICE',

  /**
   * Runner advances by stealing a base.
   *
   * @remarks
   * Occurs when:
   * - Runner advances to the next base without the ball being hit
   * - Usually happens during a pitch or pick-off attempt
   * - Requires speed and timing from the runner
   * - Credited as a stolen base in statistics
   *
   * @example
   * Runner on first steals second base during a 2-1 count to the batter
   */
  STOLEN_BASE = 'STOLEN_BASE',

  /**
   * Runner advances due to a wild pitch by the pitcher.
   *
   * @remarks
   * Occurs when:
   * - Pitcher throws a pitch that the catcher cannot cleanly handle
   * - Ball gets away from catcher, allowing runners to advance
   * - Charged as an error to the pitcher, not the catcher
   * - Often happens on breaking balls in the dirt
   *
   * @example
   * Curveball bounces in front of home plate, catcher can't block it, runner advances from second to third
   */
  WILD_PITCH = 'WILD_PITCH',

  /**
   * Runner advances due to a balk by the pitcher.
   *
   * @remarks
   * Occurs when:
   * - Pitcher commits an illegal motion or deception
   * - All runners advance one base automatically
   * - Called by the umpire when pitcher violates pitching rules
   * - Relatively rare but important to track for rule compliance
   *
   * @example
   * Pitcher starts delivery but stops without completing the pitch, all runners advance one base
   */
  BALK = 'BALK',

  /**
   * Runner is forced to advance due to the batter reaching base.
   *
   * @remarks
   * Occurs when:
   * - Batter reaches first base and forces runners to advance
   * - Usually happens with bases loaded or when a runner must vacate their base
   * - Runner has no choice but to advance to avoid a force out
   * - Different from other reasons as it's mandatory, not opportunistic
   *
   * @example
   * Bases loaded, batter reaches first on error, all runners forced to advance one base
   */
  FORCE = 'FORCE',
}

/**
 * Domain event representing a single runner's advancement between bases.
 *
 * This event is part of the fine-grained event sourcing design that captures
 * individual runner movements rather than aggregating multiple movements into
 * a single event. This granular approach provides better audit trails,
 * more precise undo/redo operations, and detailed analytics.
 *
 * @remarks
 * **Event Sourcing Context:**
 * - Each runner movement is tracked as a separate event for maximum granularity
 * - Events can be replayed to reconstruct any game state at any point in time
 * - Enables precise undo/redo operations that understand individual runner movements
 * - Supports complex statistical calculations and game analysis
 *
 * **Position Semantics:**
 * - `from: null` represents the batter's box (new batter advancing to first)
 * - `from: Base` represents starting base position (FIRST, SECOND, THIRD)
 * - `to: Base` represents ending base position
 * - `to: 'HOME'` represents scoring a run
 * - `to: 'OUT'` represents being put out while running
 *
 * **Temporal Ordering:**
 * Multiple RunnerAdvanced events may occur from a single at-bat, and their
 * order matters for proper game state reconstruction. Events are processed
 * in chronological order during replay.
 *
 * @example
 * ```typescript
 * // Batter hits a double, advancing from batter's box to second base
 * const batterAdvance = new RunnerAdvanced(
 *   gameId,
 *   batterId,
 *   null,              // from batter's box
 *   Base.SECOND,       // to second base
 *   AdvanceReason.HIT
 * );
 *
 * // Existing runner advances from first to third on the same double
 * const runnerAdvance = new RunnerAdvanced(
 *   gameId,
 *   runnerId,
 *   Base.FIRST,        // from first base
 *   Base.THIRD,        // to third base
 *   AdvanceReason.HIT
 * );
 *
 * // Runner scores from third base
 * const runnerScores = new RunnerAdvanced(
 *   gameId,
 *   runnerId,
 *   Base.THIRD,        // from third base
 *   'HOME',            // scores a run
 *   AdvanceReason.HIT
 * );
 *
 * // Runner caught stealing
 * const caughtStealing = new RunnerAdvanced(
 *   gameId,
 *   runnerId,
 *   Base.FIRST,        // from first base
 *   'OUT',             // put out
 *   AdvanceReason.STOLEN_BASE
 * );
 * ```
 */
export class RunnerAdvanced extends DomainEvent {
  readonly type = 'RunnerAdvanced';

  /**
   * Creates a new RunnerAdvanced domain event.
   *
   * @param gameId - The unique identifier of the game where this advancement occurred.
   *                 Used for event sourcing aggregate identification.
   * @param runnerId - The unique identifier of the player who advanced.
   *                   Links this movement to a specific player for statistics and tracking.
   * @param from - The starting position of the runner.
   *               - `null`: Batter advancing from batter's box to first base
   *               - `Base.FIRST | SECOND | THIRD`: Starting base position
   * @param to - The ending position of the runner.
   *             - `Base.FIRST | SECOND | THIRD`: Ending base position
   *             - `'HOME'`: Runner scored a run
   *             - `'OUT'`: Runner was put out while advancing
   * @param reason - The softball situation that caused this advancement.
   *                 Used for statistical tracking and business rule application.
   *
   * @throws {DomainError} When the advancement violates softball rules:
   *                       - Cannot advance from HOME or OUT positions
   *                       - Cannot advance to the same position
   *                       - Cannot move backward between bases
   *
   * @example
   * ```typescript
   * // Valid advancements
   * const newBatter = new RunnerAdvanced(gameId, playerId, null, Base.FIRST, AdvanceReason.HIT);
   * const stealing = new RunnerAdvanced(gameId, playerId, Base.FIRST, Base.SECOND, AdvanceReason.STOLEN_BASE);
   * const scoring = new RunnerAdvanced(gameId, playerId, Base.THIRD, 'HOME', AdvanceReason.SACRIFICE);
   *
   * // Invalid advancements (will throw DomainError)
   * // new RunnerAdvanced(gameId, playerId, Base.SECOND, Base.FIRST, AdvanceReason.HIT); // backward
   * // new RunnerAdvanced(gameId, playerId, Base.FIRST, Base.FIRST, AdvanceReason.HIT); // same base
   * ```
   */
  constructor(
    readonly gameId: GameId,
    readonly runnerId: PlayerId,
    readonly from: Base | null,
    readonly to: Base | 'HOME' | 'OUT',
    readonly reason: AdvanceReason
  ) {
    super();
    this.validateAdvancement(from, to);
  }

  /**
   * Validates that the proposed runner advancement follows softball rules.
   *
   * This validation ensures that only legal baseball/softball movements are
   * recorded in the event sourcing system, maintaining data integrity and
   * preventing invalid game states.
   *
   * @param from - Starting position to validate
   * @param to - Ending position to validate
   *
   * @throws {DomainError} When advancement violates softball rules:
   *                       1. Cannot advance from terminal positions (HOME/OUT)
   *                       2. Cannot advance to same position (no movement)
   *                       3. Cannot move backward between bases
   *
   * @remarks
   * **Validation Rules:**
   *
   * 1. **Terminal Position Rule**: Runners cannot advance from HOME or OUT because:
   *    - HOME represents a completed run (terminal state)
   *    - OUT represents elimination from the play (terminal state)
   *    - These are final positions in the base running sequence
   *
   * 2. **Same Position Rule**: Runners cannot advance from and to the same position because:
   *    - It represents no actual movement
   *    - Could indicate a logic error in the calling code
   *    - Event sourcing should only record actual state changes
   *
   * 3. **Backward Movement Rule**: Runners cannot move backward between bases because:
   *    - Violates fundamental baseball/softball rules
   *    - Runners must advance in order: FIRST → SECOND → THIRD → HOME
   *    - Prevents data corruption from invalid game logic
   *
   * **Valid Movement Patterns:**
   * - `null → FIRST`: Batter reaches first base
   * - `FIRST → SECOND → THIRD → HOME`: Normal base advancement
   * - `Any Base → OUT`: Runner eliminated while advancing
   *
   * @example
   * ```typescript
   * // Valid movements
   * validateAdvancement(null, Base.FIRST);        // ✓ Batter to first
   * validateAdvancement(Base.FIRST, Base.SECOND); // ✓ Advance to next base
   * validateAdvancement(Base.THIRD, 'HOME');      // ✓ Score a run
   * validateAdvancement(Base.SECOND, 'OUT');      // ✓ Put out while running
   *
   * // Invalid movements (throws DomainError)
   * // validateAdvancement(Base.SECOND, Base.FIRST);  // ✗ Backward movement
   * // validateAdvancement(Base.FIRST, Base.FIRST);   // ✗ No movement
   * // validateAdvancement(Base.THIRD, Base.SECOND); // ✗ Backward movement
   * ```
   */
  private validateAdvancement(from: Base | null, to: Base | 'HOME' | 'OUT'): void {
    // Note: 'from' parameter is typed as Base | null, so it cannot be 'HOME' or 'OUT'
    // These values are only valid for the 'to' parameter

    // Cannot advance to same base - no actual movement occurred
    if (from === to) {
      throw new DomainError('Runner cannot advance from and to the same base');
    }

    // Check for backward movement (only applies to valid bases)
    // Runners must advance forward: FIRST → SECOND → THIRD → HOME
    if (from !== null && to !== 'HOME' && to !== 'OUT') {
      const baseOrder: Record<Base, number> = {
        FIRST: 1,
        SECOND: 2,
        THIRD: 3,
      };

      if (baseOrder[from] > baseOrder[to]) {
        throw new DomainError(`Runner cannot advance backward from ${from} to ${to}`);
      }
    }
  }
}
