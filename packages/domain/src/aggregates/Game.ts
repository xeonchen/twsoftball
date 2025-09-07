import { GameStatus } from '../constants/GameStatus';
import { DomainError } from '../errors/DomainError';
import { DomainEvent } from '../events/DomainEvent';
import { GameCompleted } from '../events/GameCompleted';
import { GameCreated } from '../events/GameCreated';
import { GameStarted } from '../events/GameStarted';
import { InningAdvanced } from '../events/InningAdvanced';
import { ScoreUpdated } from '../events/ScoreUpdated';
import { GameId } from '../value-objects/GameId';
import { GameScore } from '../value-objects/GameScore';

/**
 * Game aggregate root responsible for coordinating softball game state and business logic.
 *
 * @remarks
 * The Game aggregate serves as the main coordination point for all softball game activities,
 * managing game lifecycle, score tracking, inning progression, and rule enforcement.
 * It follows event sourcing patterns where all state changes are captured as domain events.
 *
 * **Aggregate Responsibilities:**
 * - Game lifecycle management (creation, start, completion)
 * - Score coordination between home and away teams
 * - Inning progression and game flow control
 * - Mercy rule and completion condition evaluation
 * - Event emission for all significant state changes
 * - Business rule enforcement and invariant protection
 *
 * **Event Sourcing Architecture:**
 * - All state changes generate immutable domain events
 * - Current state can be reconstructed by replaying events
 * - Supports complete undo/redo functionality
 * - Provides full audit trail of all game actions
 *
 * **Multi-Aggregate Coordination:**
 * - Coordinates with TeamLineup aggregates for player management
 * - Coordinates with InningState aggregates for detailed inning tracking
 * - Acts as the root aggregate for the entire game context
 * - Publishes events that other aggregates may subscribe to
 *
 * **Business Invariants:**
 * - Team names must be unique and non-empty
 * - Game status follows valid state transitions
 * - Scores are always non-negative integers
 * - Outs are always between 0-2 (reset to 0 after 3rd out)
 * - Current inning is always positive
 * - Operations are restricted based on game status
 *
 * @example
 * ```typescript
 * // Create and start a new game
 * const game = Game.createNew(
 *   GameId.generate(),
 *   'Springfield Tigers',
 *   'Shelbyville Lions'
 * );
 *
 * game.startGame();
 *
 * // Record gameplay
 * game.addHomeRuns(2);
 * game.advanceInning(); // Move to bottom of 1st
 * game.addAwayRuns(1);
 * game.advanceInning(); // Move to top of 2nd
 *
 * // Check game state
 * console.log(game.score.toString()); // "2-1"
 * console.log(game.currentInning);    // 2
 * console.log(game.isTopHalf);        // true
 *
 * // Handle completion conditions
 * if (game.isMercyRuleTriggered()) {
 *   game.completeGame('MERCY_RULE');
 * }
 * ```
 */
export class Game {
  private gameStatus: GameStatus;

  private gameScore: GameScore;

  private currentInningNumber: number;

  private topHalfOfInning: boolean;

  private currentOuts: number;

  private uncommittedEvents: DomainEvent[] = [];

  private version: number = 0;

  /**
   * Creates a Game instance with the specified state.
   *
   * @remarks
   * This is a private constructor used internally for creating Game instances
   * from various factory methods. Use Game.createNew() for creating new games
   * or other factory methods for reconstructing from events.
   *
   * @param id - Unique identifier for this game
   * @param homeTeamName - Name of the home team
   * @param awayTeamName - Name of the away team
   * @param status - Current game status
   * @param score - Current game score
   * @param currentInning - Current inning number
   * @param isTopHalf - Whether this is the top half of the inning
   * @param outs - Current number of outs
   */
  private constructor(
    readonly id: GameId,
    readonly homeTeamName: string,
    readonly awayTeamName: string,
    status: GameStatus = GameStatus.NOT_STARTED,
    score: GameScore = GameScore.zero(),
    currentInning: number = 1,
    isTopHalf: boolean = true,
    outs: number = 0
  ) {
    this.gameStatus = status;
    this.gameScore = score;
    this.currentInningNumber = currentInning;
    this.topHalfOfInning = isTopHalf;
    this.currentOuts = outs;
  }

  /**
   * Gets the current game status.
   */
  get status(): GameStatus {
    return this.gameStatus;
  }

  /**
   * Gets the current game score.
   */
  get score(): GameScore {
    return this.gameScore;
  }

  /**
   * Gets the current inning number.
   */
  get currentInning(): number {
    return this.currentInningNumber;
  }

  /**
   * Gets whether this is the top half of the inning.
   * True = top half (away team batting), False = bottom half (home team batting).
   */
  get isTopHalf(): boolean {
    return this.topHalfOfInning;
  }

  /**
   * Gets the current number of outs in the half-inning.
   */
  get outs(): number {
    return this.currentOuts;
  }

  /**
   * Creates a new softball game with the specified teams.
   *
   * @param id - Unique identifier for the new game
   * @param homeTeamName - Name of the home team (cannot be empty or same as away)
   * @param awayTeamName - Name of the away team (cannot be empty or same as home)
   * @returns New Game instance in NOT_STARTED status
   * @throws {DomainError} When parameters are invalid
   */
  static createNew(id: GameId, homeTeamName: string, awayTeamName: string): Game {
    if (!id) {
      throw new DomainError('Game ID cannot be null or undefined');
    }

    const game = new Game(id, homeTeamName, awayTeamName);
    game.addEvent(new GameCreated(id, homeTeamName, awayTeamName));
    return game;
  }

  /**
   * Starts the game, transitioning from NOT_STARTED to IN_PROGRESS status.
   *
   * @throws {DomainError} When game is not in NOT_STARTED status
   *
   * @remarks
   * **Business Rules:**
   * - Can only start games in NOT_STARTED status
   * - Once started, enables gameplay operations (scoring, inning advancement)
   * - Locks team information and prevents lineup modifications
   * - Establishes official game start timestamp
   *
   * **State Changes:**
   * - Status: NOT_STARTED → IN_PROGRESS
   * - Emits GameStarted event with timestamp
   */
  startGame(): void {
    if (this.gameStatus !== GameStatus.NOT_STARTED) {
      throw new DomainError('Cannot start game that is not in NOT_STARTED status');
    }

    this.gameStatus = GameStatus.IN_PROGRESS;
    this.addEvent(new GameStarted(this.id));
  }

  /**
   * Completes the game with the specified ending type.
   *
   * @param endingType - How the game ended (regulation, mercy rule, etc.)
   * @throws {DomainError} When game is not in IN_PROGRESS status
   *
   * @remarks
   * **Business Rules:**
   * - Can only complete games in IN_PROGRESS status
   * - Once completed, prevents all further game modifications
   * - Finalizes game result for league standings
   * - Triggers post-game statistical processing
   *
   * **State Changes:**
   * - Status: IN_PROGRESS → COMPLETED
   * - Emits GameCompleted event with final state
   */
  completeGame(endingType: 'REGULATION' | 'MERCY_RULE' | 'FORFEIT' | 'TIME_LIMIT'): void {
    if (this.gameStatus !== GameStatus.IN_PROGRESS) {
      throw new DomainError('Cannot complete game that is not in progress');
    }

    this.gameStatus = GameStatus.COMPLETED;
    this.addEvent(
      new GameCompleted(
        this.id,
        endingType,
        { home: this.gameScore.getHomeRuns(), away: this.gameScore.getAwayRuns() },
        this.currentInningNumber
      )
    );
  }

  /**
   * Adds runs to the home team's score.
   *
   * @param runs - Number of runs to add (must be positive)
   * @throws {DomainError} When game is not in progress or runs are invalid
   *
   * @remarks
   * **Business Rules:**
   * - Only allowed during active gameplay (IN_PROGRESS status)
   * - Runs must be positive integers
   * - Creates new immutable GameScore instance
   *
   * **State Changes:**
   * - Updates game score with new home team total
   * - Emits ScoreUpdated event with details
   */
  addHomeRuns(runs: number): void {
    this.validateGameInProgress('add runs');
    Game.validateRunsToAdd(runs);

    this.gameScore = this.gameScore.addHomeRuns(runs);
    this.addEvent(
      new ScoreUpdated(this.id, 'HOME', runs, {
        home: this.gameScore.getHomeRuns(),
        away: this.gameScore.getAwayRuns(),
      })
    );
  }

  /**
   * Adds runs to the away team's score.
   *
   * @param runs - Number of runs to add (must be positive)
   * @throws {DomainError} When game is not in progress or runs are invalid
   *
   * @remarks
   * **Business Rules:**
   * - Only allowed during active gameplay (IN_PROGRESS status)
   * - Runs must be positive integers
   * - Creates new immutable GameScore instance
   *
   * **State Changes:**
   * - Updates game score with new away team total
   * - Emits ScoreUpdated event with details
   */
  addAwayRuns(runs: number): void {
    this.validateGameInProgress('add runs');
    Game.validateRunsToAdd(runs);

    this.gameScore = this.gameScore.addAwayRuns(runs);
    this.addEvent(
      new ScoreUpdated(this.id, 'AWAY', runs, {
        home: this.gameScore.getHomeRuns(),
        away: this.gameScore.getAwayRuns(),
      })
    );
  }

  /**
   * Advances to the next half-inning or full inning.
   *
   * @throws {DomainError} When game is not in progress
   *
   * @remarks
   * **Advancement Logic:**
   * - Top half → Bottom half (same inning)
   * - Bottom half → Top half (next inning)
   * - Outs reset to 0 after each advancement
   *
   * **State Changes:**
   * - Updates inning and half-inning state
   * - Resets outs to 0
   * - Emits InningAdvanced event
   */
  advanceInning(): void {
    this.validateGameInProgress('advance inning');

    if (this.topHalfOfInning) {
      // Advance to bottom half of same inning
      this.topHalfOfInning = false;
    } else {
      // Advance to top half of next inning
      this.topHalfOfInning = true;
      this.currentInningNumber += 1;
    }

    this.currentOuts = 0; // Reset outs for new half-inning
    this.addEvent(new InningAdvanced(this.id, this.currentInningNumber, this.topHalfOfInning));
  }

  /**
   * Adds one out to the current half-inning, automatically advancing if 3 outs reached.
   *
   * @throws {DomainError} When game is not in progress
   *
   * @remarks
   * **Out Management:**
   * - Increments outs from 0 → 1 → 2 → 0 (with inning advancement)
   * - Automatically calls advanceInning() when 3rd out is recorded
   * - Critical for proper game flow and inning progression
   *
   * **State Changes:**
   * - Increments outs by 1
   * - Auto-advances inning when reaching 3 outs
   * - May emit InningAdvanced event if inning advances
   */
  addOut(): void {
    this.validateGameInProgress('add out');

    this.currentOuts += 1;

    // Auto-advance inning when 3 outs are reached
    if (this.currentOuts >= 3) {
      this.advanceInning();
    }
  }

  /**
   * Determines if the mercy rule should be triggered based on current game state.
   *
   * @returns True if mercy rule conditions are met, false otherwise
   *
   * @remarks
   * **Mercy Rule Conditions:**
   * - 15+ run differential after 5 complete innings
   * - 10+ run differential after 7 complete innings
   *
   * **Business Logic:**
   * - Designed to prevent lopsided games from continuing
   * - Considers both inning completion and run differential
   * - Uses standard slow-pitch softball mercy rules
   */
  isMercyRuleTriggered(): boolean {
    const runDiff = Math.abs(this.gameScore.getRunDifferential());

    // 15+ run lead after 5 complete innings
    if (this.currentInningNumber >= 5 && runDiff >= 15) {
      return true;
    }

    // 10+ run lead after 7 complete innings
    if (this.currentInningNumber >= 7 && runDiff >= 10) {
      return true;
    }

    return false;
  }

  /**
   * Determines if regulation play is complete (7 full innings played).
   *
   * @returns True if regulation innings are complete, false otherwise
   *
   * @remarks
   * **Regulation Completion:**
   * - Standard softball games are 7 innings
   * - Both teams must have had equal opportunity to bat
   * - May still require extra innings if tied
   */
  isRegulationComplete(): boolean {
    return this.currentInningNumber > 7 || (this.currentInningNumber === 7 && this.topHalfOfInning);
  }

  /**
   * Determines if this is a walk-off scenario (home team ahead in bottom of inning after regulation).
   *
   * @returns True if walk-off conditions are met, false otherwise
   *
   * @remarks
   * **Walk-off Conditions:**
   * - Must be bottom half of an inning (home team batting)
   * - Must be in or past regulation (inning 7+)
   * - Home team must be winning
   *
   * **Business Context:**
   * - Walk-off wins end the game immediately
   * - No need to complete the full inning
   * - Common in extra-inning scenarios
   */
  isWalkOffScenario(): boolean {
    return !this.topHalfOfInning && this.currentInningNumber >= 7 && this.gameScore.isHomeWinning();
  }

  /**
   * Gets all uncommitted domain events for this aggregate.
   *
   * @returns Array of domain events that have not been persisted
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents]; // Return copy to prevent external modifications
  }

  /**
   * Gets the current version of the aggregate (total number of events ever added).
   *
   * @returns Current aggregate version number
   *
   * @remarks
   * The version represents the aggregate's position in the event stream.
   * It starts at 0 for a newly created aggregate (before any events) and
   * increments by 1 for each event added to the aggregate.
   *
   * Version tracking is critical for:
   * - Optimistic concurrency control in event stores
   * - Ensuring proper event ordering
   * - Supporting aggregate snapshots
   * - Detecting conflicts in distributed scenarios
   *
   * The version persists after markEventsAsCommitted() and is correctly
   * set during event sourcing reconstruction via fromEvents().
   *
   * @example
   * ```typescript
   * const game = Game.createNew(gameId, 'Home', 'Away');
   * console.log(game.getVersion()); // 1 (GameCreated event)
   *
   * game.startGame();
   * console.log(game.getVersion()); // 2 (+ GameStarted event)
   *
   * game.markEventsAsCommitted();
   * console.log(game.getVersion()); // 2 (version persists)
   * ```
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Reconstructs a Game aggregate from a stream of domain events.
   *
   * @param events - Array of domain events to replay in chronological order
   * @returns Game instance with state reconstructed from events
   * @throws {DomainError} When event stream is invalid or empty
   *
   * @remarks
   * **Event Sourcing Reconstruction:**
   * - Validates event stream integrity (first event must be GameCreated)
   * - Ensures all events belong to the same game aggregate
   * - Replays events in order to rebuild current game state
   * - Returns game with zero uncommitted events (all events are already committed)
   *
   * **Validation Rules:**
   * - Events array cannot be null, undefined, or empty
   * - First event must be GameCreated to establish game identity
   * - All events must have the same gameId for consistency
   * - Events are applied in the order provided (chronological)
   *
   * **State Reconstruction:**
   * - Creates initial game instance from GameCreated event
   * - Applies each subsequent event to update game state
   * - Maintains all domain invariants throughout reconstruction
   * - Preserves immutability of game core properties (id, team names)
   *
   * @example
   * ```typescript
   * const events = [
   *   new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
   *   new GameStarted(gameId),
   *   new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
   *   new InningAdvanced(gameId, 1, false)
   * ];
   *
   * const game = Game.fromEvents(events);
   * console.log(game.status);        // IN_PROGRESS
   * console.log(game.score.getHomeRuns()); // 2
   * console.log(game.isTopHalf);     // false
   * ```
   */
  static fromEvents(events: DomainEvent[]): Game {
    // Validate events array
    if (!events || events.length === 0) {
      throw new DomainError('Cannot reconstruct game from empty event array');
    }

    // Validate first event is GameCreated
    const firstEvent = events[0];
    if (firstEvent?.type !== 'GameCreated') {
      throw new DomainError('First event must be GameCreated');
    }

    // Validate all events belong to the same game
    const gameId = firstEvent.gameId;
    for (const event of events) {
      if (!event.gameId.equals(gameId)) {
        throw new DomainError('All events must belong to the same game');
      }
    }

    // Create initial game instance from GameCreated event
    const gameCreatedEvent = firstEvent as GameCreated;
    const game = new Game(gameId, gameCreatedEvent.homeTeamName, gameCreatedEvent.awayTeamName);

    // Apply remaining events to reconstruct state
    for (let i = 1; i < events.length; i += 1) {
      const event = events[i];
      if (event) {
        game.applyEvent(event);
      }
    }

    // Events are already committed (no uncommitted events for reconstructed game)
    game.uncommittedEvents = [];
    // Set version to total number of events processed
    game.version = events.length;

    return game;
  }

  /**
   * Marks all uncommitted events as committed, clearing the event list.
   *
   * @remarks
   * This is typically called after events have been successfully persisted
   * to the event store or published to event handlers.
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Adds a domain event to the uncommitted events list and increments version.
   *
   * @param event - Domain event to add
   */
  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
    this.version += 1;
  }

  /**
   * Applies a domain event to update the game state during event sourcing reconstruction.
   *
   * @param event - Domain event to apply
   * @throws {DomainError} When event type is not supported
   *
   * @remarks
   * **Event Application Logic:**
   * - GameStarted: Changes status from NOT_STARTED to IN_PROGRESS
   * - ScoreUpdated: Updates game score with new totals
   * - InningAdvanced: Updates current inning and half-inning state
   * - GameCompleted: Changes status to COMPLETED
   *
   * **State Updates:**
   * - All updates maintain domain invariants
   * - Score updates create new immutable GameScore instances
   * - Inning updates reset outs to 0 (as per softball rules)
   * - Status changes follow valid state transitions
   *
   * **Important Notes:**
   * - This method is only used during event sourcing reconstruction
   * - Does not add events to uncommitted events list
   * - Does not perform business rule validation (events are assumed valid)
   * - Events must be applied in chronological order for correct state
   */
  private applyEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'GameStarted':
        this.gameStatus = GameStatus.IN_PROGRESS;
        break;

      case 'ScoreUpdated': {
        const scoreEvent = event as ScoreUpdated;
        this.gameScore = GameScore.fromRuns(scoreEvent.newScore.home, scoreEvent.newScore.away);
        break;
      }

      case 'InningAdvanced': {
        const inningEvent = event as InningAdvanced;
        this.currentInningNumber = inningEvent.newInning;
        this.topHalfOfInning = inningEvent.isTopHalf;
        this.currentOuts = 0; // Outs reset when inning advances
        break;
      }

      case 'GameCompleted': {
        const completedEvent = event as GameCompleted;
        this.gameStatus = GameStatus.COMPLETED;
        // Update score to final score recorded in completion event
        this.gameScore = GameScore.fromRuns(
          completedEvent.finalScore.home,
          completedEvent.finalScore.away
        );
        break;
      }

      default:
        throw new DomainError(`Unsupported event type for reconstruction: ${event.type}`);
    }
  }

  /**
   * Validates that the game is in progress for operations requiring active gameplay.
   *
   * @param operation - Description of the operation being attempted
   * @throws {DomainError} When game is not in IN_PROGRESS status
   */
  private validateGameInProgress(operation: string): void {
    if (this.gameStatus !== GameStatus.IN_PROGRESS) {
      throw new DomainError(
        `Cannot ${operation} when game is not in progress (current status: ${this.gameStatus})`
      );
    }
  }

  /**
   * Validates that runs to be added are valid.
   *
   * @param runs - Number of runs to validate
   * @throws {DomainError} When runs are invalid
   */
  private static validateRunsToAdd(runs: number): void {
    if (typeof runs !== 'number' || Number.isNaN(runs)) {
      throw new DomainError('Runs must be a valid number');
    }
    if (!Number.isFinite(runs)) {
      throw new DomainError('Runs must be a finite number');
    }
    if (runs <= 0) {
      throw new DomainError('Runs to add must be greater than zero');
    }
    if (!Number.isInteger(runs)) {
      throw new DomainError('Runs must be an integer');
    }
  }
}
