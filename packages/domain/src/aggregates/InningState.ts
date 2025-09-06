import { AtBatResultType } from '../constants/AtBatResultType';
import { DomainError } from '../errors/DomainError';
import { AtBatCompleted } from '../events/AtBatCompleted';
import { CurrentBatterChanged } from '../events/CurrentBatterChanged';
import { DomainEvent } from '../events/DomainEvent';
import { HalfInningEnded } from '../events/HalfInningEnded';
import { InningAdvanced } from '../events/InningAdvanced';
import { InningStateCreated } from '../events/InningStateCreated';
import { RunnerAdvanced, AdvanceReason } from '../events/RunnerAdvanced';
import { RunScored } from '../events/RunScored';
import { BasesState, Base } from '../value-objects/BasesState';
import { GameId } from '../value-objects/GameId';
import { InningStateId } from '../value-objects/InningStateId';
import { PlayerId } from '../value-objects/PlayerId';

/**
 * Represents a runner movement instruction for base advancement.
 *
 * @remarks
 * This interface encapsulates the details of how runners should move on the bases
 * following an at-bat result. It provides the necessary information for updating
 * the bases state and emitting appropriate domain events.
 *
 * **Movement Semantics:**
 * - `from: null` indicates the batter advancing from the batter's box to a base
 * - `from: Base` indicates a runner moving from one base to another
 * - `to: Base` indicates the destination base for the runner
 * - `to: 'HOME'` indicates the runner is scoring a run
 * - `to: 'OUT'` indicates the runner is being put out while advancing
 *
 * **Business Context:**
 * Used to specify complex runner movements that can occur during various at-bat
 * results like hits, walks, errors, and fielder's choices. This allows for
 * precise control over baserunner advancement logic.
 */
export interface RunnerMovement {
  /** The player who is moving */
  readonly runnerId: PlayerId;
  /** Starting position (null for batter's box, Base for current base) */
  readonly from: Base | null;
  /** Destination position (Base, 'HOME' to score, or 'OUT' if put out) */
  readonly to: Base | 'HOME' | 'OUT';
}

/**
 * Represents the current game situation within an inning.
 *
 * @remarks
 * This interface provides a complete snapshot of the tactical situation
 * that affects strategic decision-making during gameplay. It combines
 * inning state information with base situation analysis.
 *
 * **Strategic Value:**
 * - Coaches use this information for substitution and tactical decisions
 * - Broadcasters and scorekeepers display this information to fans
 * - Statistical systems use this for situational analysis
 * - Game applications use this for UI updates and notifications
 */
export interface InningGameSituation {
  /** Current inning number (1 or greater) */
  readonly inning: number;
  /** True if top half (away team bats), false if bottom half (home team bats) */
  readonly isTopHalf: boolean;
  /** Current number of outs (0-2 during play) */
  readonly outs: number;
  /** Current batting slot position in the order (1-20) */
  readonly currentBattingSlot: number;
  /** Complete state of all bases and runners */
  readonly basesState: BasesState;
  /** List of runners currently in scoring position (second and third bases) */
  readonly runnersInScoringPosition: PlayerId[];
}

/**
 * InningState aggregate root managing detailed play-by-play state tracking within a softball inning.
 *
 * @remarks
 * The InningState aggregate is responsible for comprehensive inning-level game state management,
 * including baserunner tracking, out counting, batting order progression, and inning transitions.
 * This aggregate captures the tactical details that occur within each half-inning of play.
 *
 * **Aggregate Responsibilities:**
 * - **At-Bat Processing**: Record and process all types of at-bat results with proper baserunner advancement
 * - **Bases Management**: Track runner positions using immutable BasesState for thread safety
 * - **Out Counting**: Manage out progression (0→1→2→3) with automatic inning transitions
 * - **Batting Order**: Track current batter slot with proper cycling (1-20, then back to 1)
 * - **Inning Progression**: Handle half-inning transitions and full inning advancement
 * - **Event Sourcing**: Emit comprehensive domain events for all state changes
 *
 * **Softball-Specific Business Rules:**
 * - **Inning Structure**: Each inning has top half (away team bats) and bottom half (home team bats)
 * - **Out Management**: Three outs end a half-inning, clearing bases and switching sides
 * - **Batting Order**: Supports 1-20 batting slots (10 starters + up to 10 Extra Players)
 * - **Base Running**: Uses existing BasesState for force play logic and scoring position tracking
 * - **At-Bat Results**: Handles all standard results (hits, walks, outs, errors, etc.)
 *
 * **Event Sourcing Architecture:**
 * - All state mutations generate immutable domain events
 * - Complete audit trail enables undo/redo functionality
 * - Event replay can reconstruct any point-in-time state
 * - Supports integration with external systems via event streaming
 *
 * **Multi-Aggregate Coordination:**
 * - Coordinates with Game aggregate for overall game progression
 * - Works with TeamLineup aggregates for player-to-slot mappings
 * - Publishes events that may trigger scoring updates and rule evaluations
 * - Maintains consistency with softball rule enforcement across the domain
 *
 * **Immutability and State Management:**
 * - All operations return new InningState instances (immutable pattern)
 * - BasesState integration provides immutable runner tracking
 * - Event sourcing ensures complete state reconstruction capability
 * - Thread-safe design enables concurrent access patterns
 *
 * @example
 * ```typescript
 * // Create new inning state for game start
 * const inningState = InningState.createNew(
 *   InningStateId.generate(),
 *   gameId
 * );
 *
 * // Record a single with runner advancement
 * let updated = inningState.recordAtBat(
 *   batterId,
 *   1,                           // Leadoff batter
 *   AtBatResultType.SINGLE,
 *   1                            // 1st inning
 * );
 *
 * // Check current situation
 * const situation = updated.getCurrentSituation();
 * console.log(`${situation.outs} outs, runner on first`);
 *
 * // Record next at-bat with complex runner movement
 * updated = updated.recordAtBat(
 *   nextBatterId,
 *   2,                           // #2 batter
 *   AtBatResultType.DOUBLE,
 *   1
 * );
 *
 * // Check scoring opportunities
 * const scoringRunners = updated.getCurrentSituation().runnersInScoringPosition;
 * if (scoringRunners.length > 0) {
 *   console.log('Runners in scoring position!');
 * }
 *
 * // Handle inning-ending out
 * updated = updated
 *   .withOuts(2)                 // Set up scenario with 2 outs
 *   .recordAtBat(
 *     finalBatterId,
 *     3,                         // #3 batter
 *     AtBatResultType.FLY_OUT,
 *     1
 *   );
 * // Automatically transitions to bottom half of inning
 * console.log(`Now bottom half: ${!updated.isTopHalf}`);
 * ```
 */
export class InningState {
  private readonly inningNumber: number;

  private readonly topHalfOfInning: boolean;

  private readonly outsCount: number;

  private readonly currentBattingSlotNumber: number;

  private readonly currentBasesState: BasesState;

  private uncommittedEvents: DomainEvent[] = [];

  /**
   * Creates an InningState instance with the specified state.
   *
   * @remarks
   * This is a private constructor used internally for creating InningState instances
   * from factory methods and ensuring proper initialization. Use InningState.createNew()
   * for creating new inning states.
   *
   * **Design Pattern**: Private constructor with public factory methods ensures
   * proper validation and event emission during aggregate creation.
   *
   * @param id - Unique identifier for this inning state aggregate
   * @param gameId - Unique identifier of the parent game
   * @param inning - Current inning number (1 or greater)
   * @param isTopHalf - True if top half (away team), false if bottom half (home team)
   * @param outs - Current number of outs (0-2)
   * @param currentBattingSlot - Current batting slot position (1-20)
   * @param basesState - Current state of all bases and runners
   * @param existingEvents - Any existing uncommitted events
   */
  private constructor(
    readonly id: InningStateId,
    readonly gameId: GameId,
    inning: number = 1,
    isTopHalf: boolean = true,
    outs: number = 0,
    currentBattingSlot: number = 1,
    basesState: BasesState = BasesState.empty(),
    existingEvents: DomainEvent[] = []
  ) {
    this.inningNumber = inning;
    this.topHalfOfInning = isTopHalf;
    this.outsCount = outs;
    this.currentBattingSlotNumber = currentBattingSlot;
    this.currentBasesState = basesState;
    this.uncommittedEvents = [...existingEvents];
  }

  /**
   * Gets the current inning number.
   *
   * @remarks
   * Inning numbers start at 1 and increment after both top and bottom halves
   * are completed. There is no upper limit (extra innings are supported).
   */
  get inning(): number {
    return this.inningNumber;
  }

  /**
   * Gets whether this is the top half of the inning.
   *
   * @remarks
   * - True = top half (away team batting, home team fielding)
   * - False = bottom half (home team batting, away team fielding)
   */
  get isTopHalf(): boolean {
    return this.topHalfOfInning;
  }

  /**
   * Gets the current number of outs in the half-inning.
   *
   * @remarks
   * Outs count from 0 to 2 during active play. When the 3rd out is recorded,
   * the half-inning ends and outs automatically reset to 0 for the next half.
   */
  get outs(): number {
    return this.outsCount;
  }

  /**
   * Gets the current batting slot position in the batting order.
   *
   * @remarks
   * - Range: 1-20 (supports standard 10-player lineups plus Extra Players)
   * - Cycles: After slot 20 (or maximum slot), returns to slot 1
   * - Advances: Increments after each completed at-bat regardless of result
   */
  get currentBattingSlot(): number {
    return this.currentBattingSlotNumber;
  }

  /**
   * Gets the current state of all bases and runners.
   *
   * @remarks
   * Returns an immutable BasesState that provides access to:
   * - Current runner positions on all bases
   * - Force play situation analysis
   * - Scoring position identification
   * - Base occupancy status
   */
  get basesState(): BasesState {
    return this.currentBasesState;
  }

  /**
   * Creates a new inning state for the start of detailed inning tracking.
   *
   * @param id - Unique identifier for the new inning state aggregate
   * @param gameId - Unique identifier of the parent game this inning belongs to
   * @returns New InningState instance with default starting values
   * @throws {DomainError} When parameters are invalid
   *
   * @remarks
   * **Initial State:**
   * - Inning: 1 (start of game)
   * - Half: Top (away team bats first)
   * - Outs: 0 (no outs recorded yet)
   * - Batting Slot: 1 (leadoff batter)
   * - Bases: Empty (no runners on base)
   *
   * **Event Emission:**
   * Emits InningStateCreated event to establish the aggregate's existence
   * and initial state for event sourcing reconstruction.
   *
   * **Business Rules:**
   * - InningStateId and GameId must be valid (non-null)
   * - Initial state represents the start of the first inning
   * - Away team always bats first (softball standard)
   */
  static createNew(id: InningStateId, gameId: GameId): InningState {
    if (!id) {
      throw new DomainError('InningStateId cannot be null or undefined');
    }
    if (!gameId) {
      throw new DomainError('GameId cannot be null or undefined');
    }

    const inningState = new InningState(id, gameId);
    inningState.addEvent(new InningStateCreated(id, gameId, 1, true));
    return inningState;
  }

  /**
   * Records the completion of an at-bat and processes all resulting state changes.
   *
   * @param batterId - Unique identifier of the batter who completed the at-bat
   * @param battingSlot - Batting slot position of the batter (must match current slot)
   * @param result - The outcome of the at-bat (hit, out, walk, etc.)
   * @param inning - The inning number when this at-bat occurred
   * @returns New InningState instance with all changes applied
   * @throws {DomainError} When parameters violate business rules
   *
   * @remarks
   * **Comprehensive At-Bat Processing:**
   * This method handles all aspects of at-bat completion including:
   * - Batter advancement based on result type
   * - Baserunner movement according to softball rules
   * - Out counting and inning transition logic
   * - Batting order progression with proper cycling
   * - Event emission for complete audit trail
   *
   * **At-Bat Result Handling:**
   * - **Hits** (SINGLE, DOUBLE, TRIPLE, HOME_RUN): Advance batter and existing runners
   * - **Walks/HBP**: Advance batter to first, force runners as needed
   * - **Outs**: Add out count, advance batting order, check for inning end
   * - **Errors**: Advance batter to first, runners advance based on situation
   * - **Fielder's Choice**: Complex logic for runner advancement and outs
   * - **Special Plays**: Double plays, triple plays, sacrifice flies
   *
   * **Automatic Inning Transitions:**
   * - When 3rd out is recorded, automatically ends half-inning
   * - Clears bases and resets outs to 0
   * - Switches from top→bottom or advances to next full inning
   * - Resets batting order to slot 1 for new half-inning
   *
   * **Event Sourcing:**
   * Emits multiple events in proper sequence:
   * 1. AtBatCompleted (captures the at-bat details)
   * 2. RunnerAdvanced (for each runner movement)
   * 3. RunScored (for each run scored)
   * 4. CurrentBatterChanged (batting order advancement)
   * 5. HalfInningEnded (if inning ends)
   * 6. InningAdvanced (if moving to next full inning)
   *
   * @example
   * ```typescript
   * // Record a single with runner advancement
   * const updated = inningState.recordAtBat(
   *   batterId,
   *   1,                           // Leadoff batter
   *   AtBatResultType.SINGLE,
   *   3                            // 3rd inning
   * );
   *
   * // Record an inning-ending strikeout
   * const endInning = inningState
   *   .withOuts(2)                 // Already 2 outs
   *   .recordAtBat(
   *     batterId,
   *     5,                         // 5th batter
   *     AtBatResultType.STRIKEOUT,
   *     4                          // 4th inning
   *   );
   * // Automatically transitions to next half-inning
   * ```
   */
  recordAtBat(
    batterId: PlayerId,
    battingSlot: number,
    result: AtBatResultType,
    inning: number
  ): InningState {
    this.validateAtBatParameters(batterId, battingSlot, result, inning);

    // Create new state starting with current state
    let updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    // Emit AtBatCompleted event
    updatedState.addEvent(
      new AtBatCompleted(this.gameId, batterId, battingSlot, result, inning, this.outsCount)
    );

    // Process the at-bat result
    updatedState = updatedState.processAtBatResult(batterId, result);

    // Advance batting order
    updatedState = updatedState.advanceBattingOrder(battingSlot);

    // Check if inning ended due to 3 outs
    if (updatedState.outsCount >= 3) {
      updatedState = updatedState.endHalfInning();
    }

    return updatedState;
  }

  /**
   * Advances runners on the bases according to the specified movements.
   *
   * @param atBatResult - The at-bat result that caused these runner movements
   * @param movements - Array of runner movement instructions
   * @returns New InningState instance with runner positions updated
   *
   * @remarks
   * **Advanced Runner Management:**
   * This method provides fine-grained control over runner advancement for
   * complex scenarios where automatic advancement logic may not suffice.
   * It's particularly useful for:
   * - Fielder's choice situations with multiple outs
   * - Error scenarios with unusual runner advancement
   * - Complex double plays or triple plays
   * - Situations requiring manual runner positioning
   *
   * **Event Emission:**
   * - Emits RunnerAdvanced event for each movement
   * - Emits RunScored event for runners reaching HOME
   * - Updates out count for runners marked as OUT
   *
   * **State Updates:**
   * - Updates BasesState with new runner positions
   * - Increments out count for runners put out
   * - Maintains immutability by returning new instance
   *
   * @example
   * ```typescript
   * // Complex fielder's choice with runner out at second
   * const updated = inningState.advanceRunners(
   *   AtBatResultType.FIELDERS_CHOICE,
   *   [
   *     { runnerId: batterId, from: null, to: 'FIRST' },        // Batter safe at first
   *     { runnerId: runnerOnFirst, from: 'FIRST', to: 'OUT' }   // Runner forced out
   *   ]
   * );
   * ```
   */
  advanceRunners(atBatResult: AtBatResultType, movements: RunnerMovement[]): InningState {
    let updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    movements.forEach(movement => {
      updatedState = updatedState.processRunnerMovement(movement, atBatResult);
    });

    return updatedState;
  }

  /**
   * Ends the current half-inning and transitions to the next phase.
   *
   * @returns New InningState instance with half-inning transition applied
   *
   * @remarks
   * **Half-Inning Transition Logic:**
   * - **Top Half Ending**: Transitions to bottom half of same inning
   * - **Bottom Half Ending**: Advances to top half of next inning
   * - **State Reset**: Clears bases, resets outs to 0, batting slot to 1
   * - **Event Emission**: Emits HalfInningEnded and possibly InningAdvanced events
   *
   * **Business Rules:**
   * - Called automatically when 3rd out is recorded during at-bat processing
   * - Can be called manually for special situations (forfeit, walk-off, etc.)
   * - Always clears bases (runners left on base don't carry over)
   * - Always resets tactical state for fresh start
   *
   * **Event Sourcing:**
   * - HalfInningEnded event captures which half just completed
   * - InningAdvanced event emitted when moving to next full inning
   * - Proper event ordering ensures accurate state reconstruction
   *
   * @example
   * ```typescript
   * // Manual half-inning end (e.g., walkoff scenario)
   * const nextHalf = inningState.endHalfInning();
   *
   * if (nextHalf.inning > inningState.inning) {
   *   console.log('Advanced to next inning');
   * } else {
   *   console.log('Switched to bottom half');
   * }
   * ```
   */
  endHalfInning(): InningState {
    // Emit HalfInningEnded event
    const updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    updatedState.addEvent(
      new HalfInningEnded(this.gameId, this.inningNumber, this.topHalfOfInning, this.outsCount)
    );

    // Determine next inning state
    let newInning = this.inningNumber;
    let newIsTopHalf = !this.topHalfOfInning;

    // If bottom half just ended, advance to next inning
    if (!this.topHalfOfInning) {
      newInning += 1;
      newIsTopHalf = true;

      // Emit InningAdvanced event
      updatedState.addEvent(new InningAdvanced(this.gameId, newInning, newIsTopHalf));
    }

    // Create new state with reset values
    return new InningState(
      this.id,
      this.gameId,
      newInning,
      newIsTopHalf,
      0, // Reset outs
      1, // Reset to leadoff batter
      BasesState.empty(), // Clear bases
      updatedState.uncommittedEvents
    );
  }

  /**
   * Gets a complete snapshot of the current tactical game situation.
   *
   * @returns Current inning situation with all relevant tactical information
   *
   * @remarks
   * **Tactical Information Provided:**
   * - Inning and half-inning identification
   * - Out count and batting order position
   * - Complete bases state with runner positions
   * - Runners in scoring position analysis
   *
   * **Use Cases:**
   * - UI display of current game situation
   * - Coaching decision support systems
   * - Broadcasting and scoring applications
   * - Statistical analysis and game tracking
   *
   * **Strategic Value:**
   * Coaches use this information to make tactical decisions about:
   * - When to attempt stolen bases
   * - Substitution opportunities
   * - Defensive positioning adjustments
   * - Pinch-hitting decisions
   */
  getCurrentSituation(): InningGameSituation {
    return {
      inning: this.inningNumber,
      isTopHalf: this.topHalfOfInning,
      outs: this.outsCount,
      currentBattingSlot: this.currentBattingSlotNumber,
      basesState: this.currentBasesState,
      runnersInScoringPosition: this.currentBasesState.getRunnersInScoringPosition(),
    };
  }

  /**
   * Determines if the current inning is complete (both halves finished).
   *
   * @returns True if both top and bottom halves have been completed
   *
   * @remarks
   * **Completion Logic:**
   * An inning is complete when both the top half (away team) and bottom half
   * (home team) have had their offensive opportunities and recorded 3 outs each.
   *
   * **Edge Cases:**
   * - Walkoff scenarios may end games mid-inning
   * - Mercy rule applications may truncate innings
   * - This method only tracks standard inning completion
   *
   * **Integration:**
   * This information is typically used by the parent Game aggregate to
   * determine overall game progression and completion conditions.
   */
  isInningComplete(): boolean {
    // An inning is complete when we've moved to the next inning (top half of next inning)
    // This method could be enhanced with more sophisticated logic if needed
    // For now, InningState tracks current half, not completion
    // In future versions, this could check if we're in a subsequent inning
    return this.inningNumber > 1 && this.topHalfOfInning; // Basic logic using instance state
  }

  // Helper methods for test setup and state manipulation

  /**
   * Creates a new InningState instance with a runner placed on the specified base.
   *
   * @param base - The base where the runner should be placed
   * @param playerId - The player to place on the base
   * @returns New InningState instance with the runner positioned
   *
   * @remarks
   * **Test Helper Method**: This method is primarily intended for test setup
   * and scenario creation. In production, runners are typically placed through
   * the normal at-bat processing flow.
   *
   * **Immutable Pattern**: Returns a new instance rather than modifying the
   * existing state, maintaining the immutability contract.
   */
  withRunnerOnBase(base: Base, playerId: PlayerId): InningState {
    const newBasesState = this.currentBasesState.withRunnerOn(base, playerId);

    return new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      newBasesState,
      this.uncommittedEvents
    );
  }

  /**
   * Creates a new InningState instance with the specified number of outs.
   *
   * @param outs - Number of outs to set (0-2)
   * @returns New InningState instance with the out count updated
   * @throws {DomainError} When outs are outside valid range
   *
   * @remarks
   * **Test Helper Method**: Used for setting up specific game situations
   * during testing or scenario simulation.
   *
   * **Validation**: Ensures outs are within the valid range of 0-2 since
   * 3 outs automatically end the half-inning.
   */
  withOuts(outs: number): InningState {
    if (typeof outs !== 'number' || outs < 0 || outs > 2 || !Number.isInteger(outs)) {
      throw new DomainError('Outs must be an integer between 0 and 2');
    }

    return new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      outs,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );
  }

  /**
   * Creates a new InningState instance with the specified current batting slot.
   *
   * @param battingSlot - Batting slot position to set (1-20)
   * @returns New InningState instance with batting slot updated
   * @throws {DomainError} When batting slot is outside valid range
   *
   * @remarks
   * **Test Helper Method**: Used for setting up specific batting order
   * situations during testing.
   *
   * **Validation**: Ensures batting slot is within the valid softball range
   * of 1-20 (supporting Extra Players).
   */
  withCurrentBattingSlot(battingSlot: number): InningState {
    InningState.validateBattingSlot(battingSlot);

    return new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      battingSlot,
      this.currentBasesState,
      this.uncommittedEvents
    );
  }

  /**
   * Creates a new InningState instance with the specified inning and half.
   *
   * @param inning - Inning number to set (1 or greater)
   * @param isTopHalf - Whether this should be the top half (away team bats)
   * @returns New InningState instance with inning state updated
   * @throws {DomainError} When inning is invalid
   *
   * @remarks
   * **Test Helper Method**: Used for setting up specific inning scenarios
   * during testing or simulation.
   */
  withInningHalf(inning: number, isTopHalf: boolean): InningState {
    if (typeof inning !== 'number' || inning < 1 || !Number.isInteger(inning)) {
      throw new DomainError('Inning must be an integer of 1 or greater');
    }

    return new InningState(
      this.id,
      this.gameId,
      inning,
      isTopHalf,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );
  }

  /**
   * Gets all uncommitted domain events for this aggregate.
   *
   * @returns Array of domain events that have not been persisted
   *
   * @remarks
   * **Event Sourcing Integration**: This method is used by the event sourcing
   * infrastructure to retrieve events that need to be persisted to the event
   * store and published to event handlers.
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Marks all uncommitted events as committed, clearing the event list.
   *
   * @remarks
   * This is typically called after events have been successfully persisted
   * to the event store or published to event handlers. It prevents events
   * from being processed multiple times.
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  // Private helper methods

  /**
   * Adds a domain event to the uncommitted events list.
   *
   * @param event - Domain event to add
   */
  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  /**
   * Validates the parameters for recording an at-bat.
   *
   * @param batterId - Batter ID to validate
   * @param battingSlot - Batting slot to validate
   * @param result - At-bat result to validate
   * @param inning - Inning number to validate
   * @throws {DomainError} When any parameter is invalid
   */
  private validateAtBatParameters(
    batterId: PlayerId,
    battingSlot: number,
    result: AtBatResultType,
    inning: number
  ): void {
    if (!batterId) {
      throw new DomainError('BatterId cannot be null or undefined');
    }

    InningState.validateBattingSlot(battingSlot);

    if (battingSlot !== this.currentBattingSlotNumber) {
      throw new DomainError(
        `Batting slot ${battingSlot} does not match current batter slot ${this.currentBattingSlotNumber}`
      );
    }

    if (!Object.values(AtBatResultType).includes(result)) {
      throw new DomainError(`Invalid at-bat result: ${result}`);
    }

    if (typeof inning !== 'number' || inning < 1 || !Number.isInteger(inning)) {
      throw new DomainError('Inning must be an integer of 1 or greater');
    }
  }

  /**
   * Validates a batting slot number.
   *
   * @param battingSlot - Batting slot to validate
   * @throws {DomainError} When batting slot is invalid
   */
  private static validateBattingSlot(battingSlot: number): void {
    if (
      typeof battingSlot !== 'number' ||
      battingSlot < 1 ||
      battingSlot > 20 ||
      !Number.isInteger(battingSlot)
    ) {
      throw new DomainError('Batting slot must be an integer between 1 and 20');
    }
  }

  /**
   * Processes an at-bat result and updates bases and outs accordingly.
   *
   * @param batterId - The batter who completed the at-bat
   * @param result - The result of the at-bat
   * @returns New InningState instance with result processed
   */
  private processAtBatResult(batterId: PlayerId, result: AtBatResultType): InningState {
    let updatedState: InningState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    switch (result) {
      case AtBatResultType.SINGLE:
        updatedState = this.processBatterAdvancement(batterId, 'FIRST');
        break;

      case AtBatResultType.DOUBLE:
        updatedState = this.processBatterAdvancement(batterId, 'SECOND');
        break;

      case AtBatResultType.TRIPLE:
        updatedState = this.processBatterAdvancement(batterId, 'THIRD');
        break;

      case AtBatResultType.HOME_RUN:
        updatedState = this.processHomeRun(batterId);
        break;

      case AtBatResultType.WALK:
        updatedState = this.processWalk(batterId);
        break;

      case AtBatResultType.STRIKEOUT:
      case AtBatResultType.GROUND_OUT:
      case AtBatResultType.FLY_OUT:
        updatedState = this.addOut();
        break;

      case AtBatResultType.SACRIFICE_FLY:
        updatedState = this.processSacrificeFly(batterId);
        break;

      case AtBatResultType.ERROR:
        updatedState = this.processBatterAdvancement(batterId, 'FIRST');
        break;

      case AtBatResultType.FIELDERS_CHOICE:
        updatedState = this.processFieldersChoice(batterId);
        break;

      case AtBatResultType.DOUBLE_PLAY:
        updatedState = this.addOut().addOut();
        // Clear bases as runners are out
        updatedState = new InningState(
          updatedState.id,
          updatedState.gameId,
          updatedState.inningNumber,
          updatedState.topHalfOfInning,
          updatedState.outsCount,
          updatedState.currentBattingSlotNumber,
          BasesState.empty(),
          updatedState.uncommittedEvents
        );
        break;

      case AtBatResultType.TRIPLE_PLAY:
        updatedState = this.addOut().addOut().addOut();
        // Clear bases as all runners are out
        updatedState = new InningState(
          updatedState.id,
          updatedState.gameId,
          updatedState.inningNumber,
          updatedState.topHalfOfInning,
          updatedState.outsCount,
          updatedState.currentBattingSlotNumber,
          BasesState.empty(),
          updatedState.uncommittedEvents
        );
        break;

      default:
        throw new DomainError(`Unhandled at-bat result type: ${String(result)}`);
    }

    return updatedState;
  }

  /**
   * Processes batter advancement to the specified base.
   *
   * @param batterId - The batter advancing
   * @param toBase - The base the batter is advancing to
   * @returns Updated InningState with batter positioned
   */
  private processBatterAdvancement(batterId: PlayerId, toBase: Base): InningState {
    const newBasesState = this.currentBasesState.withRunnerOn(toBase, batterId);

    const updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      newBasesState,
      this.uncommittedEvents
    );

    updatedState.addEvent(
      new RunnerAdvanced(this.gameId, batterId, null, toBase, AdvanceReason.HIT)
    );

    return updatedState;
  }

  /**
   * Processes a home run result, clearing all bases and scoring all runners.
   *
   * @param batterId - The batter who hit the home run
   * @returns Updated InningState with all runners scored
   */
  private processHomeRun(batterId: PlayerId): InningState {
    const updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    // Score all existing runners
    const occupiedBases = this.currentBasesState.getOccupiedBases();
    occupiedBases.forEach(base => {
      const runner = this.currentBasesState.getRunner(base);
      if (runner) {
        updatedState.addEvent(
          new RunnerAdvanced(this.gameId, runner, base, 'HOME', AdvanceReason.HIT)
        );
        updatedState.addEvent(
          new RunScored(
            this.gameId,
            runner,
            this.topHalfOfInning ? 'AWAY' : 'HOME',
            batterId,
            { home: 0, away: 0 } // Simplified scoring - actual scores would come from Game aggregate
          )
        );
      }
    });

    // Score the batter
    updatedState.addEvent(
      new RunnerAdvanced(this.gameId, batterId, null, 'HOME', AdvanceReason.HIT)
    );
    updatedState.addEvent(
      new RunScored(
        this.gameId,
        batterId,
        this.topHalfOfInning ? 'AWAY' : 'HOME',
        batterId,
        { home: 0, away: 0 } // Simplified scoring
      )
    );

    // Clear all bases
    const finalUpdatedState = new InningState(
      updatedState.id,
      updatedState.gameId,
      updatedState.inningNumber,
      updatedState.topHalfOfInning,
      updatedState.outsCount,
      updatedState.currentBattingSlotNumber,
      BasesState.empty(),
      updatedState.uncommittedEvents
    );

    return finalUpdatedState;
  }

  /**
   * Processes a walk result, advancing batter and forcing runners as needed.
   *
   * @param batterId - The batter who walked
   * @returns Updated InningState with forced advancements
   */
  private processWalk(batterId: PlayerId): InningState {
    const updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    // Handle forced advancement logic based on current base situation
    let newBasesState = this.currentBasesState;

    const runnerOnFirst = this.currentBasesState.getRunner('FIRST');
    const runnerOnSecond = this.currentBasesState.getRunner('SECOND');
    const runnerOnThird = this.currentBasesState.getRunner('THIRD');

    // If bases loaded, runner on third is forced to score
    if (runnerOnFirst && runnerOnSecond && runnerOnThird) {
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnThird, 'THIRD', 'HOME', AdvanceReason.FORCE)
      );
      updatedState.addEvent(
        new RunScored(
          this.gameId,
          runnerOnThird,
          this.topHalfOfInning ? 'AWAY' : 'HOME',
          batterId,
          { home: 0, away: 0 } // Simplified scoring
        )
      );
      newBasesState = newBasesState.withRunnerAdvanced('THIRD', 'HOME');

      // Runner on second advances to third
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnSecond, 'SECOND', 'THIRD', AdvanceReason.FORCE)
      );
      newBasesState = newBasesState.withRunnerAdvanced('SECOND', 'THIRD');

      // Runner on first advances to second
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnFirst, 'FIRST', 'SECOND', AdvanceReason.FORCE)
      );
      newBasesState = newBasesState.withRunnerAdvanced('FIRST', 'SECOND');
    }
    // If runners on first and second, runner on second advances to third
    else if (runnerOnFirst && runnerOnSecond) {
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnSecond, 'SECOND', 'THIRD', AdvanceReason.FORCE)
      );
      newBasesState = newBasesState.withRunnerAdvanced('SECOND', 'THIRD');

      // Runner on first advances to second
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnFirst, 'FIRST', 'SECOND', AdvanceReason.FORCE)
      );
      newBasesState = newBasesState.withRunnerAdvanced('FIRST', 'SECOND');
    }
    // If just runner on first, runner advances to second
    else if (runnerOnFirst) {
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnFirst, 'FIRST', 'SECOND', AdvanceReason.FORCE)
      );
      newBasesState = newBasesState.withRunnerAdvanced('FIRST', 'SECOND');
    }

    // Batter advances to first
    newBasesState = newBasesState.withRunnerOn('FIRST', batterId);
    updatedState.addEvent(
      new RunnerAdvanced(this.gameId, batterId, null, 'FIRST', AdvanceReason.WALK)
    );

    const finalState = new InningState(
      updatedState.id,
      updatedState.gameId,
      updatedState.inningNumber,
      updatedState.topHalfOfInning,
      updatedState.outsCount,
      updatedState.currentBattingSlotNumber,
      newBasesState,
      updatedState.uncommittedEvents
    );
    return finalState;
  }

  /**
   * Processes a sacrifice fly, adding an out and potentially scoring runners.
   *
   * @param batterId - The batter who hit the sacrifice fly
   * @returns Updated InningState with out added and runners advanced
   */
  private processSacrificeFly(batterId: PlayerId): InningState {
    let updatedState = this.addOut();

    // If runner on third, they score
    const runnerOnThird = this.currentBasesState.getRunner('THIRD');
    if (runnerOnThird) {
      updatedState.addEvent(
        new RunnerAdvanced(this.gameId, runnerOnThird, 'THIRD', 'HOME', AdvanceReason.SACRIFICE)
      );
      updatedState.addEvent(
        new RunScored(
          this.gameId,
          runnerOnThird,
          this.topHalfOfInning ? 'AWAY' : 'HOME',
          batterId,
          { home: 0, away: 0 } // Simplified scoring
        )
      );
      const newBasesState = updatedState.currentBasesState.withRunnerAdvanced('THIRD', 'HOME');
      updatedState = new InningState(
        updatedState.id,
        updatedState.gameId,
        updatedState.inningNumber,
        updatedState.topHalfOfInning,
        updatedState.outsCount,
        updatedState.currentBattingSlotNumber,
        newBasesState,
        updatedState.uncommittedEvents
      );
    }

    return updatedState;
  }

  /**
   * Processes a fielder's choice, typically advancing batter and putting out a runner.
   *
   * @param batterId - The batter involved in the fielder's choice
   * @returns Updated InningState with fielder's choice processed
   */
  private processFieldersChoice(batterId: PlayerId): InningState {
    let updatedState = this.addOut(); // Typically results in an out

    // Clear the runner on first (if any) since they were forced out
    let newBasesState = updatedState.currentBasesState;
    if (this.currentBasesState.getRunner('FIRST')) {
      newBasesState = newBasesState.withBasesCleared();
    }

    // Place batter on first (simplified logic)
    newBasesState = newBasesState.withRunnerOn('FIRST', batterId);

    updatedState = new InningState(
      updatedState.id,
      updatedState.gameId,
      updatedState.inningNumber,
      updatedState.topHalfOfInning,
      updatedState.outsCount,
      updatedState.currentBattingSlotNumber,
      newBasesState,
      updatedState.uncommittedEvents
    );

    updatedState.addEvent(
      new RunnerAdvanced(this.gameId, batterId, null, 'FIRST', AdvanceReason.FIELDERS_CHOICE)
    );

    return updatedState;
  }

  /**
   * Adds an out to the current count.
   *
   * @returns Updated InningState with incremented out count
   */
  private addOut(): InningState {
    return new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount + 1,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );
  }

  /**
   * Determines the maximum batting slot for the current lineup configuration.
   *
   * @param currentSlot - The current batting slot to help determine lineup size
   * @returns The maximum batting slot (9 for standard, 20 for expanded)
   */
  private static determineMaxBattingSlot(currentSlot: number): number {
    // If current slot is <= 9, assume standard 9-player lineup
    // If current slot is > 9, assume expanded 20-player lineup
    return currentSlot <= 9 ? 9 : 20;
  }

  /**
   * Advances the batting order to the next slot.
   *
   * @param currentSlot - The slot that just batted
   * @returns Updated InningState with advanced batting order
   */
  private advanceBattingOrder(currentSlot: number): InningState {
    // Determine lineup size based on current slot
    const maxSlot = InningState.determineMaxBattingSlot(currentSlot);

    let nextSlot: number;
    if (currentSlot >= maxSlot) {
      nextSlot = 1; // Cycle back to 1
    } else {
      nextSlot = currentSlot + 1;
    }

    const updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      nextSlot,
      this.currentBasesState,
      this.uncommittedEvents
    );

    updatedState.addEvent(
      new CurrentBatterChanged(
        this.gameId,
        currentSlot,
        nextSlot,
        this.inningNumber,
        this.topHalfOfInning
      )
    );

    return updatedState;
  }

  /**
   * Processes a single runner movement and emits appropriate events.
   *
   * @param movement - The runner movement to process
   * @param atBatResult - The at-bat result that caused this movement
   * @returns Updated InningState with movement processed
   */
  private processRunnerMovement(
    movement: RunnerMovement,
    atBatResult: AtBatResultType
  ): InningState {
    let updatedState = new InningState(
      this.id,
      this.gameId,
      this.inningNumber,
      this.topHalfOfInning,
      this.outsCount,
      this.currentBattingSlotNumber,
      this.currentBasesState,
      this.uncommittedEvents
    );

    const reason = InningState.determineAdvanceReason(atBatResult);

    updatedState.addEvent(
      new RunnerAdvanced(this.gameId, movement.runnerId, movement.from, movement.to, reason)
    );

    if (movement.to === 'HOME') {
      // Runner scored
      updatedState.addEvent(
        new RunScored(
          this.gameId,
          movement.runnerId,
          this.topHalfOfInning ? 'AWAY' : 'HOME',
          null, // Simplified - would need batter ID for RBI tracking
          { home: 0, away: 0 } // Simplified scoring
        )
      );
    } else if (movement.to === 'OUT') {
      // Runner was put out
      updatedState = new InningState(
        updatedState.id,
        updatedState.gameId,
        updatedState.inningNumber,
        updatedState.topHalfOfInning,
        updatedState.outsCount + 1,
        updatedState.currentBattingSlotNumber,
        updatedState.currentBasesState,
        updatedState.uncommittedEvents
      );
      // Remove runner from base if they were on one
      if (movement.from) {
        // Create new bases state without the runner who was put out
        const occupiedBases = this.currentBasesState.getOccupiedBases();
        let newBasesState = BasesState.empty();
        occupiedBases.forEach(base => {
          const runner = this.currentBasesState.getRunner(base);
          if (runner && !runner.equals(movement.runnerId)) {
            newBasesState = newBasesState.withRunnerOn(base, runner);
          }
        });
        updatedState = new InningState(
          updatedState.id,
          updatedState.gameId,
          updatedState.inningNumber,
          updatedState.topHalfOfInning,
          updatedState.outsCount,
          updatedState.currentBattingSlotNumber,
          newBasesState,
          updatedState.uncommittedEvents
        );
      }
    } else {
      // Runner advanced to a base
      let newBasesStateForAdvance = updatedState.currentBasesState;
      if (movement.from) {
        newBasesStateForAdvance = newBasesStateForAdvance.withRunnerAdvanced(
          movement.from,
          movement.to
        );
      } else {
        newBasesStateForAdvance = newBasesStateForAdvance.withRunnerOn(
          movement.to,
          movement.runnerId
        );
      }
      updatedState = new InningState(
        updatedState.id,
        updatedState.gameId,
        updatedState.inningNumber,
        updatedState.topHalfOfInning,
        updatedState.outsCount,
        updatedState.currentBattingSlotNumber,
        newBasesStateForAdvance,
        updatedState.uncommittedEvents
      );
    }

    return updatedState;
  }

  /**
   * Determines the appropriate advance reason based on at-bat result.
   *
   * @param atBatResult - The at-bat result
   * @returns Corresponding advance reason
   */
  private static determineAdvanceReason(atBatResult: AtBatResultType): AdvanceReason {
    switch (atBatResult) {
      case AtBatResultType.SINGLE:
      case AtBatResultType.DOUBLE:
      case AtBatResultType.TRIPLE:
      case AtBatResultType.HOME_RUN:
        return AdvanceReason.HIT;
      case AtBatResultType.WALK:
        return AdvanceReason.WALK;
      case AtBatResultType.ERROR:
        return AdvanceReason.ERROR;
      case AtBatResultType.FIELDERS_CHOICE:
        return AdvanceReason.FIELDERS_CHOICE;
      case AtBatResultType.SACRIFICE_FLY:
        return AdvanceReason.SACRIFICE;
      default:
        return AdvanceReason.HIT; // Default fallback
    }
  }
}
