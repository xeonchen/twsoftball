import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { DomainEvent } from '../events/DomainEvent';
import { FieldPositionChanged } from '../events/FieldPositionChanged';
import { PlayerAddedToLineup } from '../events/PlayerAddedToLineup';
import { PlayerSubstitutedIntoGame } from '../events/PlayerSubstitutedIntoGame';
import { TeamLineupCreated } from '../events/TeamLineupCreated';
import { SoftballRules } from '../rules/SoftballRules';
import { BattingSlot } from '../value-objects/BattingSlot';
import { GameId } from '../value-objects/GameId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamLineupId } from '../value-objects/TeamLineupId';

/**
 * Information about a player in the team roster.
 *
 * @remarks
 * This interface encapsulates all relevant information about a player's
 * current status within the team lineup, including their identity, position,
 * and eligibility for softball-specific rules like re-entry.
 */
export interface PlayerInfo {
  /** The unique identifier of the player */
  readonly playerId: PlayerId;
  /** The jersey number assigned to the player */
  readonly jerseyNumber: JerseyNumber;
  /** The display name of the player */
  readonly playerName: string;
  /** Current field position (undefined if not currently in defensive lineup) */
  readonly currentPosition: FieldPosition | undefined;
  /** Whether this player was in the starting lineup */
  readonly isStarter: boolean;
  /** Whether this player has already used their re-entry privilege */
  readonly hasUsedReentry: boolean;
}

/**
 * Internal tracking of player participation and substitution history.
 *
 * @remarks
 * This interface maintains the complete history of a player's participation
 * in the game, enabling enforcement of softball's complex substitution rules,
 * particularly the starter re-entry rule.
 */
interface PlayerParticipationHistory {
  /** The unique identifier of the player */
  readonly playerId: PlayerId;
  /** The jersey number assigned to the player */
  readonly jerseyNumber: JerseyNumber;
  /** The display name of the player */
  readonly playerName: string;
  /** Whether this player was in the starting lineup */
  readonly isStarter: boolean;
  /** Current field position (undefined if substituted out or EP) */
  readonly currentPosition: FieldPosition | undefined;
  /** Whether the player has been substituted out at least once */
  readonly hasBeenSubstituted: boolean;
  /** Whether this player has used their re-entry privilege */
  readonly hasUsedReentry: boolean;
  /** Current batting slot position (undefined if not in active lineup) */
  readonly currentBattingSlot: number | undefined;
}

/**
 * Team lineup aggregate root for managing softball team rosters and batting orders.
 *
 * @remarks
 * The TeamLineup aggregate is responsible for comprehensive team management in softball,
 * including player roster management, batting order maintenance, defensive positioning,
 * and enforcement of softball-specific substitution rules.
 *
 * **Core Responsibilities:**
 * - **Player Management**: Add players with unique jersey numbers and positions
 * - **Batting Order**: Maintain batting slot assignments with configurable limits (per SoftballRules)
 * - **Defensive Alignment**: Track field position assignments and changes
 * - **Substitution Rules**: Enforce starter re-entry rules and substitution constraints
 * - **Event Sourcing**: Emit domain events for all state changes
 * - **Rule Validation**: Prevent invalid lineup configurations and rule violations
 *
 * **Softball-Specific Business Rules:**
 * - **Batting Slots**: Support configurable player limits (standard 10 + Extra Players per SoftballRules.maxPlayersPerTeam)
 * - **Jersey Numbers**: Must be unique within team, typically 1-99 range
 * - **Re-entry Rule**: Original starters can re-enter the game once after substitution
 * - **Position Coverage**: Track defensive positions, multiple players can be EXTRA_PLAYER
 * - **Substitution Permanence**: Non-starters cannot re-enter once substituted out
 *
 * **Event Sourcing Architecture:**
 * - All lineup changes generate immutable domain events
 * - Complete audit trail of all roster modifications
 * - Supports undo/redo functionality through event replay
 * - Enables coordination with Game aggregate and external systems
 *
 * **Multi-Aggregate Coordination:**
 * - Coordinates with Game aggregate for game-wide lineup validation
 * - Publishes events that may affect inning progression and scoring
 * - Maintains consistency with softball rule enforcement across aggregates
 *
 * **Data Integrity Guarantees:**
 * - No duplicate players in multiple batting slots simultaneously
 * - Jersey number uniqueness within team roster
 * - Field position coverage constraints (except EXTRA_PLAYER)
 * - Proper batting slot range validation (1-20)
 * - Re-entry rule enforcement for starters vs substitutes
 *
 * @example
 * ```typescript
 * // Create new team lineup
 * const lineup = TeamLineup.createNew(
 *   TeamLineupId.generate(),
 *   GameId.generate(),
 *   'Springfield Tigers'
 * );
 *
 * // Add starting players
 * let updatedLineup = lineup
 *   .addPlayer(pitcher, new JerseyNumber(1), 'John Pitcher', 1, FieldPosition.PITCHER)
 *   .addPlayer(catcher, new JerseyNumber(2), 'Jane Catcher', 2, FieldPosition.CATCHER);
 *
 * // Handle substitution with re-entry tracking
 * updatedLineup = updatedLineup.substitutePlayer(
 *   1, pitcher, reliefPitcher, new JerseyNumber(99), 'Relief Pitcher', FieldPosition.PITCHER, 5
 * );
 *
 * // Check re-entry eligibility
 * if (updatedLineup.isPlayerEligibleForReentry(pitcher)) {
 *   // Original starter can re-enter
 *   updatedLineup = updatedLineup.substitutePlayer(
 *     1, reliefPitcher, pitcher, new JerseyNumber(1), 'John Pitcher', FieldPosition.PITCHER, 8, true
 *   );
 * }
 *
 * // Validate lineup completeness
 * if (updatedLineup.isLineupValid()) {
 *   console.log('Lineup ready for game start');
 * }
 *
 * // Get current batting order and field positions
 * const battingOrder = updatedLineup.getActiveLineup();
 * const fieldPositions = updatedLineup.getFieldingPositions();
 * ```
 */
export class TeamLineup {
  /** Current batting lineup indexed by slot number */
  private readonly battingSlots = new Map<number, BattingSlot>();

  /** Field position assignments for defensive play */
  private readonly fieldPositions = new Map<FieldPosition, PlayerId>();

  /** Complete roster with participation history */
  private readonly playerHistory = new Map<string, PlayerParticipationHistory>();

  /** Jersey number assignments to prevent duplicates */
  private readonly jerseyAssignments = new Map<number, PlayerId>();

  /** Uncommitted domain events */
  private uncommittedEvents: DomainEvent[] = [];

  /** Aggregate version for event sourcing and optimistic concurrency */
  private version: number = 0;

  /** Required defensive positions for a valid lineup */
  private static readonly REQUIRED_POSITIONS = [
    FieldPosition.PITCHER,
    FieldPosition.CATCHER,
    FieldPosition.FIRST_BASE,
    FieldPosition.SECOND_BASE,
    FieldPosition.THIRD_BASE,
    FieldPosition.SHORTSTOP,
    FieldPosition.LEFT_FIELD,
    FieldPosition.CENTER_FIELD,
    FieldPosition.RIGHT_FIELD,
  ];

  /**
   * Creates a TeamLineup instance with the specified state.
   *
   * @remarks
   * This is a private constructor used internally for creating TeamLineup instances
   * from factory methods and ensuring proper initialization of all internal state.
   * Use TeamLineup.createNew() for creating new lineups.
   *
   * @param id - Unique identifier for this team lineup
   * @param gameId - Unique identifier of the game this lineup belongs to
   * @param teamName - Name of the team this lineup represents
   * @param battingSlots - Current batting slot assignments
   * @param fieldPositions - Current field position assignments
   * @param playerHistory - Complete player participation history
   * @param jerseyAssignments - Current jersey number assignments
   */
  private constructor(
    readonly id: TeamLineupId,
    readonly gameId: GameId,
    readonly teamName: string,
    battingSlots: Map<number, BattingSlot> = new Map(),
    fieldPositions: Map<FieldPosition, PlayerId> = new Map(),
    playerHistory: Map<string, PlayerParticipationHistory> = new Map(),
    jerseyAssignments: Map<number, PlayerId> = new Map(),
    existingEvents: DomainEvent[] = []
  ) {
    // Deep copy all maps to ensure immutability
    this.battingSlots = new Map(battingSlots);
    this.fieldPositions = new Map(fieldPositions);
    this.playerHistory = new Map(
      Array.from(playerHistory.entries()).map(([key, history]) => [key, { ...history }])
    );
    this.jerseyAssignments = new Map(jerseyAssignments);
    this.uncommittedEvents = [...existingEvents];
    this.version = 0;
  }

  /**
   * Creates a new team lineup for a softball game.
   *
   * @param id - Unique identifier for the new team lineup
   * @param gameId - Unique identifier of the game this lineup belongs to
   * @param teamName - Name of the team (cannot be empty, max 50 characters)
   * @returns New TeamLineup instance with no players
   * @throws {DomainError} When parameters are invalid
   *
   * @remarks
   * **Business Rules:**
   * - Team name must not be empty or only whitespace
   * - Team name cannot exceed 50 characters for display purposes
   * - Initial lineup has no players and requires setup before game start
   * - Emits TeamLineupCreated event to establish lineup existence
   *
   * **State Initialization:**
   * - Empty batting slots (ready for 1-20 player assignments)
   * - No field position assignments
   * - Empty player roster
   * - No jersey number assignments
   */
  static createNew(id: TeamLineupId, gameId: GameId, teamName: string): TeamLineup {
    if (!id) {
      throw new DomainError('TeamLineupId cannot be null or undefined');
    }
    if (!gameId) {
      throw new DomainError('GameId cannot be null or undefined');
    }
    if (!teamName?.trim()) {
      throw new DomainError('Team name cannot be empty or whitespace');
    }
    if (teamName.length > 50) {
      throw new DomainError('Team name cannot exceed 50 characters');
    }

    const lineup = new TeamLineup(id, gameId, teamName);
    lineup.addEvent(new TeamLineupCreated(id, gameId, teamName));
    return lineup;
  }

  /**
   * Reconstructs a TeamLineup aggregate from a stream of domain events.
   *
   * @param events - Array of domain events to replay in chronological order
   * @returns Fully reconstructed TeamLineup instance with proper state
   * @throws {DomainError} When events are invalid or inconsistent
   *
   * @remarks
   * **Event Sourcing Reconstruction Process:**
   * - Validates events array for completeness and consistency
   * - Ensures first event is TeamLineupCreated to establish identity
   * - Verifies all events belong to the same team lineup and game
   * - Creates base lineup instance from creation event
   * - Applies remaining events sequentially to reconstruct state
   * - Sets correct aggregate version based on event count
   * - Ensures no uncommitted events (all events are considered committed)
   *
   * **Supported Event Types:**
   * - **TeamLineupCreated**: Establishes lineup identity and team name
   * - **PlayerAddedToLineup**: Adds players to batting slots and field positions
   * - **PlayerSubstitutedIntoGame**: Handles player substitutions and re-entry tracking
   * - **FieldPositionChanged**: Updates player defensive positions
   *
   * **Business Rule Enforcement:**
   * - All domain invariants are maintained during reconstruction
   * - Player participation history is accurately tracked
   * - Substitution and re-entry rules are properly applied
   * - Field position assignments remain consistent
   * - Jersey number uniqueness is preserved
   *
   * **State Consistency Guarantees:**
   * - Batting order reflects all substitutions and changes
   * - Field positions match final defensive assignments
   * - Player eligibility for re-entry is correctly calculated
   * - Complete audit trail of all roster modifications
   *
   * @example
   * ```typescript
   * const events = [
   *   new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
   *   new PlayerAddedToLineup(gameId, lineupId, player1, jersey1, 'John Doe', 1, FieldPosition.PITCHER),
   *   new PlayerSubstitutedIntoGame(gameId, lineupId, 1, player1, player2, FieldPosition.CATCHER, 5),
   *   new FieldPositionChanged(gameId, lineupId, player2, FieldPosition.CATCHER, FieldPosition.FIRST_BASE, 7)
   * ];
   *
   * const lineup = TeamLineup.fromEvents(events);
   * console.log(lineup.getActiveLineup().length); // 1
   * console.log(lineup.isPlayerEligibleForReentry(player1)); // true (starter can re-enter)
   * ```
   */
  static fromEvents(events: DomainEvent[]): TeamLineup {
    // Validate events array
    if (!events || events.length === 0) {
      throw new DomainError('Cannot reconstruct team lineup from empty event array');
    }

    // Validate first event is TeamLineupCreated
    const firstEvent = events[0];
    if (firstEvent?.type !== 'TeamLineupCreated') {
      throw new DomainError('First event must be TeamLineupCreated');
    }

    // Validate all events belong to the same team lineup and game
    const teamLineupCreatedEvent = firstEvent as TeamLineupCreated;
    const expectedGameId = teamLineupCreatedEvent.gameId;
    const expectedTeamLineupId = teamLineupCreatedEvent.teamLineupId;

    // Check for duplicate TeamLineupCreated events
    let teamLineupCreatedCount = 0;
    for (const event of events) {
      if (event.type === 'TeamLineupCreated') {
        teamLineupCreatedCount += 1;
        if (teamLineupCreatedCount > 1) {
          throw new DomainError('Cannot have duplicate TeamLineupCreated events');
        }
      }

      if (!event.gameId.equals(expectedGameId)) {
        throw new DomainError('All events must belong to the same game');
      }

      // Check if event has teamLineupId property and validate it
      if ('teamLineupId' in event) {
        const teamLineupEvent = event as { teamLineupId: TeamLineupId };
        if (!teamLineupEvent.teamLineupId.equals(expectedTeamLineupId)) {
          throw new DomainError('All events must belong to the same team lineup');
        }
      }
    }

    // Create initial lineup instance from TeamLineupCreated event
    const lineup = new TeamLineup(
      expectedTeamLineupId,
      expectedGameId,
      teamLineupCreatedEvent.teamName
    );

    // Apply remaining events to reconstruct state
    for (let i = 1; i < events.length; i += 1) {
      const event = events[i];
      if (event) {
        lineup.applyEvent(event);
      }
    }

    // Events are already committed (no uncommitted events for reconstructed lineup)
    lineup.uncommittedEvents = [];

    // Set version to total number of events processed
    lineup.version = events.length;

    return lineup;
  }

  /**
   * Adds a new player to the team lineup at the specified batting slot.
   *
   * @param playerId - Unique identifier of the player to add
   * @param jerseyNumber - Jersey number to assign (must be unique within team)
   * @param playerName - Display name of the player (1-100 characters)
   * @param battingSlot - Batting order position (1 to maxPlayersPerTeam per rules)
   * @param fieldPosition - Initial defensive position
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   * @returns New TeamLineup instance with the player added
   * @throws {DomainError} When constraints are violated
   *
   * @remarks
   * **Business Rules Enforced:**
   * - Batting slot must be between 1 and rules.maxPlayersPerTeam and unoccupied
   * - Jersey numbers must be unique within the team
   * - Player cannot already be in the lineup
   * - Field positions must be unique (except EXTRA_PLAYER)
   * - Player names must be valid (1-100 characters, not empty)
   *
   * **Player Classification:**
   * - Players added via this method are marked as "starters"
   * - Starters are eligible for re-entry after substitution
   * - EXTRA_PLAYER position allows multiple players (batting-only players)
   *
   * **State Changes:**
   * - Creates batting slot with player as initial starter
   * - Assigns field position (unless EXTRA_PLAYER)
   * - Registers jersey number assignment
   * - Records player in participation history
   * - Emits PlayerAddedToLineup event
   */
  addPlayer(
    playerId: PlayerId,
    jerseyNumber: JerseyNumber,
    playerName: string,
    battingSlot: number,
    fieldPosition: FieldPosition,
    rules: SoftballRules
  ): TeamLineup {
    TeamLineup.validateBattingSlot(battingSlot, rules);
    TeamLineup.validatePlayerName(playerName);

    if (this.battingSlots.has(battingSlot)) {
      throw new DomainError(`Batting slot ${battingSlot} is already occupied`);
    }

    if (this.jerseyAssignments.has(jerseyNumber.toNumber())) {
      throw new DomainError(`Jersey number ${jerseyNumber.value} is already assigned`);
    }

    if (this.playerHistory.has(playerId.value)) {
      throw new DomainError('Player is already in the lineup');
    }

    // EXTRA_PLAYER doesn't occupy field positions (they're batting-only players)
    if (fieldPosition !== FieldPosition.EXTRA_PLAYER) {
      if (this.fieldPositions.has(fieldPosition)) {
        throw new DomainError(`Field position ${fieldPosition} is already assigned`);
      }
    }

    // Create new state
    const newBattingSlots = new Map(this.battingSlots);
    const newFieldPositions = new Map(this.fieldPositions);
    const newPlayerHistory = new Map(this.playerHistory);
    const newJerseyAssignments = new Map(this.jerseyAssignments);

    // Add batting slot
    newBattingSlots.set(battingSlot, BattingSlot.createWithStarter(battingSlot, playerId));

    // Add field position (unless EXTRA_PLAYER)
    if (fieldPosition !== FieldPosition.EXTRA_PLAYER) {
      newFieldPositions.set(fieldPosition, playerId);
    }

    // Add to player history
    newPlayerHistory.set(playerId.value, {
      playerId,
      jerseyNumber,
      playerName,
      isStarter: true,
      currentPosition: fieldPosition === FieldPosition.EXTRA_PLAYER ? undefined : fieldPosition,
      hasBeenSubstituted: false,
      hasUsedReentry: false,
      currentBattingSlot: battingSlot,
    });

    // Assign jersey
    newJerseyAssignments.set(jerseyNumber.toNumber(), playerId);

    const newLineup = new TeamLineup(
      this.id,
      this.gameId,
      this.teamName,
      newBattingSlots,
      newFieldPositions,
      newPlayerHistory,
      newJerseyAssignments,
      this.uncommittedEvents
    );

    newLineup.addEvent(
      new PlayerAddedToLineup(
        this.gameId,
        this.id,
        playerId,
        jerseyNumber,
        playerName,
        battingSlot,
        fieldPosition
      )
    );

    return newLineup;
  }

  /**
   * Substitutes one player for another in the specified batting slot.
   *
   * @param battingSlot - The batting slot where substitution occurs (1 to maxPlayersPerTeam per rules)
   * @param outgoingPlayerId - Player being substituted out
   * @param incomingPlayerId - Player being substituted in
   * @param incomingJerseyNumber - Jersey number for incoming player
   * @param incomingPlayerName - Name of incoming player
   * @param fieldPosition - Field position for incoming player
   * @param inning - Inning when substitution occurs (1 or greater)
   * @param isReentry - Whether this is a starter re-entering (default: false)
   * @param rules - Optional softball rules configuration (uses defaults if not provided)
   * @returns New TeamLineup instance with substitution applied
   * @throws {DomainError} When substitution violates rules
   *
   * @remarks
   * **Softball Substitution Rules:**
   * - Outgoing player must currently occupy the specified batting slot
   * - Incoming player cannot already be in the lineup
   * - Jersey numbers must remain unique
   * - Field positions must be unique (except EXTRA_PLAYER)
   * - Re-entry only allowed for original starters who haven't used re-entry
   *
   * **Re-entry Rule Implementation:**
   * - Only original starters can re-enter the game
   * - Each starter can re-enter exactly once
   * - Re-entry must be explicitly flagged with isReentry=true
   * - Non-starters cannot re-enter once substituted out
   *
   * **State Changes:**
   * - Updates batting slot with substitution history
   * - Changes field position assignments
   * - Updates player participation history
   * - Manages jersey number reassignments
   * - Emits PlayerSubstitutedIntoGame event
   *
   * @example
   * ```typescript
   * // Regular substitution
   * lineup = lineup.substitutePlayer(
   *   1, pitcherId, reliefId, new JerseyNumber(99), 'Relief Pitcher', FieldPosition.PITCHER, 5
   * );
   *
   * // Starter re-entry
   * lineup = lineup.substitutePlayer(
   *   1, reliefId, pitcherId, new JerseyNumber(1), 'Original Pitcher', FieldPosition.PITCHER, 8, true
   * );
   * ```
   */
  substitutePlayer(
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    incomingPlayerId: PlayerId,
    incomingJerseyNumber: JerseyNumber,
    incomingPlayerName: string,
    fieldPosition: FieldPosition,
    inning: number,
    rules: SoftballRules,
    isReentry: boolean = false
  ): TeamLineup {
    TeamLineup.validateBattingSlot(battingSlot, rules);
    TeamLineup.validatePlayerName(incomingPlayerName);
    TeamLineup.validateInning(inning);

    const battingSlotObj = this.battingSlots.get(battingSlot);
    if (!battingSlotObj) {
      throw new DomainError(`Batting slot ${battingSlot} is not occupied`);
    }

    if (!battingSlotObj.getCurrentPlayer().equals(outgoingPlayerId)) {
      throw new DomainError(
        `Player ${outgoingPlayerId.value} is not in batting slot ${battingSlot}`
      );
    }

    // Check if incoming player is already in lineup (unless it's a re-entry)
    const incomingPlayerHistory = this.playerHistory.get(incomingPlayerId.value);
    if (incomingPlayerHistory && incomingPlayerHistory.currentBattingSlot !== undefined) {
      throw new DomainError('Incoming player is already in the lineup');
    }

    // Check jersey number availability
    const existingJerseyPlayer = this.jerseyAssignments.get(incomingJerseyNumber.toNumber());
    if (existingJerseyPlayer && !existingJerseyPlayer.equals(incomingPlayerId)) {
      throw new DomainError(`Jersey number ${incomingJerseyNumber.value} is already assigned`);
    }

    // Check field position availability (except EXTRA_PLAYER)
    if (fieldPosition !== FieldPosition.EXTRA_PLAYER) {
      const existingPositionPlayer = this.fieldPositions.get(fieldPosition);
      if (existingPositionPlayer && !existingPositionPlayer.equals(incomingPlayerId)) {
        throw new DomainError(`Field position ${fieldPosition} is already occupied`);
      }
    }

    // Handle re-entry validation
    if (isReentry) {
      if (!incomingPlayerHistory) {
        throw new DomainError(
          'Cannot mark substitution as re-entry for player not in team history'
        );
      }
      if (!incomingPlayerHistory.isStarter) {
        throw new DomainError('Only original starters are eligible for re-entry');
      }
      if (incomingPlayerHistory.hasUsedReentry) {
        throw new DomainError('Player has already used their re-entry privilege');
      }
      if (!incomingPlayerHistory.hasBeenSubstituted) {
        throw new DomainError('Player must have been previously substituted to re-enter');
      }
    } else if (
      incomingPlayerHistory &&
      incomingPlayerHistory.hasBeenSubstituted &&
      !incomingPlayerHistory.isStarter
    ) {
      // For non-re-entry, incoming player should not be in history or should be a new player
      throw new DomainError('Non-starter players cannot re-enter the game');
    }

    // Create new state
    const newBattingSlots = new Map(this.battingSlots);
    const newFieldPositions = new Map(this.fieldPositions);
    const newPlayerHistory = new Map(this.playerHistory);
    const newJerseyAssignments = new Map(this.jerseyAssignments);

    // Update batting slot with substitution
    newBattingSlots.set(
      battingSlot,
      battingSlotObj.substitutePlayer(incomingPlayerId, inning, isReentry)
    );

    // Update field positions
    const outgoingPlayerHistory = this.playerHistory.get(outgoingPlayerId.value)!;
    if (outgoingPlayerHistory.currentPosition) {
      newFieldPositions.delete(outgoingPlayerHistory.currentPosition);
    }
    if (fieldPosition !== FieldPosition.EXTRA_PLAYER) {
      newFieldPositions.set(fieldPosition, incomingPlayerId);
    }

    // Update outgoing player history
    newPlayerHistory.set(outgoingPlayerId.value, {
      ...outgoingPlayerHistory,
      currentPosition: undefined,
      hasBeenSubstituted: true,
      currentBattingSlot: undefined,
    });

    // Update incoming player history
    if (incomingPlayerHistory) {
      // Re-entering player
      newPlayerHistory.set(incomingPlayerId.value, {
        ...incomingPlayerHistory,
        currentPosition: fieldPosition === FieldPosition.EXTRA_PLAYER ? undefined : fieldPosition,
        hasUsedReentry: incomingPlayerHistory.hasUsedReentry || isReentry,
        currentBattingSlot: battingSlot,
      });
    } else {
      // New substitute player
      newPlayerHistory.set(incomingPlayerId.value, {
        playerId: incomingPlayerId,
        jerseyNumber: incomingJerseyNumber,
        playerName: incomingPlayerName,
        isStarter: false,
        currentPosition: fieldPosition === FieldPosition.EXTRA_PLAYER ? undefined : fieldPosition,
        hasBeenSubstituted: false,
        hasUsedReentry: false,
        currentBattingSlot: battingSlot,
      });
    }

    // Update jersey assignments
    newJerseyAssignments.set(incomingJerseyNumber.toNumber(), incomingPlayerId);

    const newLineup = new TeamLineup(
      this.id,
      this.gameId,
      this.teamName,
      newBattingSlots,
      newFieldPositions,
      newPlayerHistory,
      newJerseyAssignments,
      this.uncommittedEvents
    );

    newLineup.addEvent(
      new PlayerSubstitutedIntoGame(
        this.gameId,
        this.id,
        battingSlot,
        outgoingPlayerId,
        incomingPlayerId,
        fieldPosition,
        inning
      )
    );

    return newLineup;
  }

  /**
   * Changes a player's defensive field position.
   *
   * @param playerId - Player whose position is changing
   * @param newPosition - New field position to assign
   * @param inning - Inning when position change occurs (1 or greater)
   * @returns New TeamLineup instance with updated field position
   * @throws {DomainError} When position change is invalid
   *
   * @remarks
   * **Business Rules:**
   * - Player must currently be in the lineup
   * - New position must be different from current position
   * - Target position must be unoccupied (except EXTRA_PLAYER)
   * - Position changes don't affect batting order
   *
   * **Common Scenarios:**
   * - Pitcher moving to first base, first baseman taking mound
   * - Outfield rotations based on batter tendencies
   * - Moving player to/from EXTRA_PLAYER (batting-only player) status
   * - Strategic defensive positioning adjustments
   *
   * **State Changes:**
   * - Updates field position assignments map
   * - Updates player history with new current position
   * - EXTRA_PLAYER positions remove player from defensive coverage
   * - Emits FieldPositionChanged event with position details
   */
  changePosition(playerId: PlayerId, newPosition: FieldPosition, inning: number): TeamLineup {
    TeamLineup.validateInning(inning);

    const playerHistory = this.playerHistory.get(playerId.value);
    if (!playerHistory || playerHistory.currentBattingSlot === undefined) {
      throw new DomainError('Player is not currently in the lineup');
    }

    const { currentPosition } = playerHistory;
    if (currentPosition === newPosition) {
      throw new DomainError('Player is already in the specified position');
    }

    // Check if target position is occupied (except EXTRA_PLAYER)
    if (newPosition !== FieldPosition.EXTRA_PLAYER) {
      const existingPlayer = this.fieldPositions.get(newPosition);
      if (existingPlayer) {
        throw new DomainError(`Field position ${newPosition} is already occupied`);
      }
    }

    // Create new state
    const newFieldPositions = new Map(this.fieldPositions);
    const newPlayerHistory = new Map(this.playerHistory);

    // Remove from current position
    if (currentPosition) {
      newFieldPositions.delete(currentPosition);
    }

    // Add to new position (unless EXTRA_PLAYER)
    if (newPosition !== FieldPosition.EXTRA_PLAYER) {
      newFieldPositions.set(newPosition, playerId);
    }

    // Update player history
    newPlayerHistory.set(playerId.value, {
      ...playerHistory,
      currentPosition: newPosition === FieldPosition.EXTRA_PLAYER ? undefined : newPosition,
    });

    const newLineup = new TeamLineup(
      this.id,
      this.gameId,
      this.teamName,
      this.battingSlots,
      newFieldPositions,
      newPlayerHistory,
      this.jerseyAssignments,
      this.uncommittedEvents
    );

    if (currentPosition) {
      newLineup.addEvent(
        new FieldPositionChanged(
          this.gameId,
          this.id,
          playerId,
          currentPosition,
          newPosition,
          inning
        )
      );
    }

    return newLineup;
  }

  /**
   * Gets the current batting lineup sorted by batting order position.
   *
   * @returns Array of BattingSlot objects ordered by position (1, 2, 3, ...)
   *
   * @remarks
   * Returns a defensive copy of the batting slots sorted by position number.
   * Empty positions are not included in the result. This represents the
   * active batting order that would be used during gameplay.
   */
  getActiveLineup(): BattingSlot[] {
    return Array.from(this.battingSlots.values()).sort((a, b) => a.position - b.position);
  }

  /**
   * Gets the current defensive field position assignments.
   *
   * @returns Map of field positions to player IDs for active defenders
   *
   * @remarks
   * Returns a defensive copy of the field position assignments. EXTRA_PLAYER
   * positions are not included as they don't play defense. This map represents
   * the defensive alignment that would be used during gameplay.
   */
  getFieldingPositions(): Map<FieldPosition, PlayerId> {
    return new Map(this.fieldPositions);
  }

  /**
   * Determines if the specified player is eligible for re-entry into the game.
   *
   * @param playerId - Player to check for re-entry eligibility
   * @returns True if player can re-enter, false otherwise
   *
   * @remarks
   * **Re-entry Eligibility Rules:**
   * - Player must be an original starter (not a substitute)
   * - Player must have been substituted out previously
   * - Player must not have already used their re-entry privilege
   * - Players not in the team roster are not eligible
   *
   * **Use Cases:**
   * - Pre-substitution validation for coaching decisions
   * - UI display of available substitution options
   * - Rule enforcement during game management
   */
  isPlayerEligibleForReentry(playerId: PlayerId): boolean {
    const playerHistory = this.playerHistory.get(playerId.value);
    if (!playerHistory) {
      return false;
    }

    return (
      playerHistory.isStarter &&
      playerHistory.hasBeenSubstituted &&
      !playerHistory.hasUsedReentry &&
      playerHistory.currentBattingSlot === undefined
    );
  }

  /**
   * Validates if the current lineup meets minimum requirements for gameplay.
   *
   * @returns True if lineup is valid for game start, false otherwise
   *
   * @remarks
   * **Validation Criteria:**
   * - All 9 required defensive positions must be filled:
   *   - Pitcher, Catcher, First Base, Second Base, Third Base
   *   - Shortstop, Left Field, Center Field, Right Field
   * - Additional players (Short Fielder, Extra Players) are optional
   * - Batting order can have 1-20 players
   *
   * **Use Cases:**
   * - Pre-game lineup validation
   * - Coaching interface validation
   * - Game start authorization checks
   */
  isLineupValid(): boolean {
    // Check if all required positions are covered
    const allPositionsCovered = TeamLineup.REQUIRED_POSITIONS.every(position =>
      this.fieldPositions.has(position)
    );

    // Must have at least some players in batting order
    return allPositionsCovered && this.battingSlots.size > 0;
  }

  /**
   * Gets comprehensive information about a specific player.
   *
   * @param playerId - Player to get information for
   * @returns PlayerInfo object with current status, or undefined if not found
   *
   * @remarks
   * Returns complete player information including current position, re-entry status,
   * and starter classification. Used for UI display, rule validation, and game
   * management operations.
   */
  getPlayerInfo(playerId: PlayerId): PlayerInfo | undefined {
    const playerHistory = this.playerHistory.get(playerId.value);
    if (!playerHistory) {
      return undefined;
    }

    return {
      playerId: playerHistory.playerId,
      jerseyNumber: playerHistory.jerseyNumber,
      playerName: playerHistory.playerName,
      currentPosition: playerHistory.currentPosition,
      isStarter: playerHistory.isStarter,
      hasUsedReentry: playerHistory.hasUsedReentry,
    };
  }

  /**
   * Gets the current version of this aggregate for optimistic concurrency control.
   *
   * @returns Current version number representing total events processed
   *
   * @remarks
   * The version number represents the total number of events that have been applied
   * to this aggregate throughout its lifetime. This is used for:
   * - Optimistic concurrency control in distributed systems
   * - Ensuring proper event ordering during persistence
   * - Supporting aggregate snapshots and conflict detection
   * - Event sourcing reconstruction validation
   *
   * The version persists after markEventsAsCommitted() and is correctly
   * set during event sourcing reconstruction via fromEvents().
   *
   * @example
   * ```typescript
   * const lineup = TeamLineup.createNew(lineupId, gameId, 'Home Tigers');
   * console.log(lineup.getVersion()); // 1 (TeamLineupCreated event)
   *
   * lineup.addPlayer(playerId, jersey, 'John Doe', 1, FieldPosition.PITCHER, rules);
   * console.log(lineup.getVersion()); // 2 (+ PlayerAddedToLineup event)
   *
   * lineup.markEventsAsCommitted();
   * console.log(lineup.getVersion()); // 2 (version persists)
   * ```
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Gets all uncommitted domain events for this aggregate.
   *
   * @returns Array of domain events that have not been persisted
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
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
   * Applies a single domain event to reconstruct aggregate state during event sourcing.
   *
   * @param event - Domain event to apply
   * @throws {DomainError} When event cannot be applied or contains invalid data
   *
   * @remarks
   * **Event Sourcing Application Process:**
   * - This method is only used during fromEvents() reconstruction
   * - Events are assumed to be valid (no business rule validation)
   * - State changes are applied directly without emitting new events
   * - Does not increment version or add to uncommitted events
   * - Must handle all supported event types for complete reconstruction
   *
   * **Supported Event Types:**
   * - **PlayerAddedToLineup**: Adds player to batting slot and field position
   * - **PlayerSubstitutedIntoGame**: Updates batting slot, field position, and participation history
   * - **FieldPositionChanged**: Updates player's defensive position assignment
   *
   * **State Reconstruction Logic:**
   * - Maintains all internal maps (batting slots, field positions, player history, jerseys)
   * - Preserves domain invariants without validation overhead
   * - Tracks player participation, substitutions, and re-entry eligibility
   * - Handles EXTRA_PLAYER position logic correctly
   *
   * **Error Handling:**
   * - Unknown event types are ignored to support forward compatibility
   * - Invalid event data may cause reconstruction failures
   * - Events must be applied in chronological order for correct state
   */
  private applyEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'TeamLineupCreated': {
        // No-op during replay - lineup already initialized from this event
        break;
      }
      case 'PlayerAddedToLineup': {
        const addedEvent = event as PlayerAddedToLineup;

        // Add batting slot
        this.battingSlots.set(
          addedEvent.battingSlot,
          BattingSlot.createWithStarter(addedEvent.battingSlot, addedEvent.playerId)
        );

        // Add field position (unless EXTRA_PLAYER)
        if (addedEvent.fieldPosition !== FieldPosition.EXTRA_PLAYER) {
          this.fieldPositions.set(addedEvent.fieldPosition, addedEvent.playerId);
        }

        // Add to player history
        this.playerHistory.set(addedEvent.playerId.value, {
          playerId: addedEvent.playerId,
          jerseyNumber: addedEvent.jerseyNumber,
          playerName: addedEvent.playerName,
          isStarter: true,
          currentPosition:
            addedEvent.fieldPosition === FieldPosition.EXTRA_PLAYER
              ? undefined
              : addedEvent.fieldPosition,
          hasBeenSubstituted: false,
          hasUsedReentry: false,
          currentBattingSlot: addedEvent.battingSlot,
        });

        // Assign jersey
        this.jerseyAssignments.set(addedEvent.jerseyNumber.toNumber(), addedEvent.playerId);
        break;
      }
      case 'PlayerSubstitutedIntoGame': {
        const substitutionEvent = event as PlayerSubstitutedIntoGame;

        // Get current batting slot and update with substitution
        const currentBattingSlot = this.battingSlots.get(substitutionEvent.battingSlot);
        if (currentBattingSlot) {
          // Determine if this is a re-entry based on whether incoming player was previously in lineup
          const incomingPlayerHistory = this.playerHistory.get(
            substitutionEvent.incomingPlayerId.value
          );
          const isReentry =
            incomingPlayerHistory?.isStarter && incomingPlayerHistory.hasBeenSubstituted;

          this.battingSlots.set(
            substitutionEvent.battingSlot,
            currentBattingSlot.substitutePlayer(
              substitutionEvent.incomingPlayerId,
              substitutionEvent.inning,
              isReentry || false
            )
          );
        }

        // Update field positions
        const outgoingPlayerHistory = this.playerHistory.get(
          substitutionEvent.outgoingPlayerId.value
        );
        if (outgoingPlayerHistory?.currentPosition) {
          this.fieldPositions.delete(outgoingPlayerHistory.currentPosition);
        }
        if (substitutionEvent.fieldPosition !== FieldPosition.EXTRA_PLAYER) {
          this.fieldPositions.set(
            substitutionEvent.fieldPosition,
            substitutionEvent.incomingPlayerId
          );
        }

        // Update outgoing player history
        if (outgoingPlayerHistory) {
          this.playerHistory.set(substitutionEvent.outgoingPlayerId.value, {
            ...outgoingPlayerHistory,
            currentPosition: undefined,
            hasBeenSubstituted: true,
            currentBattingSlot: undefined,
          });
        }

        // Update incoming player history
        const incomingHistory = this.playerHistory.get(substitutionEvent.incomingPlayerId.value);
        if (incomingHistory) {
          // Re-entering player
          const wasReentry = incomingHistory.isStarter && incomingHistory.hasBeenSubstituted;
          this.playerHistory.set(substitutionEvent.incomingPlayerId.value, {
            ...incomingHistory,
            currentPosition:
              substitutionEvent.fieldPosition === FieldPosition.EXTRA_PLAYER
                ? undefined
                : substitutionEvent.fieldPosition,
            hasUsedReentry: incomingHistory.hasUsedReentry || wasReentry,
            currentBattingSlot: substitutionEvent.battingSlot,
          });
        } else {
          // New substitute player - find a unique jersey number for event sourcing reconstruction
          // Since the PlayerSubstitutedIntoGame event doesn't contain jersey/name info,
          // we generate a unique jersey number to avoid conflicts during reconstruction
          let jerseyNum = 90;
          while (this.jerseyAssignments.has(jerseyNum) && jerseyNum <= 99) {
            jerseyNum += 1;
          }
          if (jerseyNum > 99) {
            // Fallback to higher numbers if 90-99 are taken
            jerseyNum = 50;
            while (this.jerseyAssignments.has(jerseyNum) && jerseyNum <= 89) {
              jerseyNum += 1;
            }
          }
          const placeholderJersey = new JerseyNumber(jerseyNum.toString());

          this.playerHistory.set(substitutionEvent.incomingPlayerId.value, {
            playerId: substitutionEvent.incomingPlayerId,
            jerseyNumber: placeholderJersey,
            playerName: `Substitute ${substitutionEvent.incomingPlayerId.value.slice(-8)}`, // Use part of player ID
            isStarter: false,
            currentPosition:
              substitutionEvent.fieldPosition === FieldPosition.EXTRA_PLAYER
                ? undefined
                : substitutionEvent.fieldPosition,
            hasBeenSubstituted: false,
            hasUsedReentry: false,
            currentBattingSlot: substitutionEvent.battingSlot,
          });
          this.jerseyAssignments.set(
            placeholderJersey.toNumber(),
            substitutionEvent.incomingPlayerId
          );
        }
        break;
      }
      case 'FieldPositionChanged': {
        const positionEvent = event as FieldPositionChanged;

        // Remove from current position
        if (positionEvent.fromPosition) {
          this.fieldPositions.delete(positionEvent.fromPosition);
        }

        // Add to new position (unless EXTRA_PLAYER)
        if (positionEvent.toPosition !== FieldPosition.EXTRA_PLAYER) {
          this.fieldPositions.set(positionEvent.toPosition, positionEvent.playerId);
        }

        // Update player history
        const playerHistory = this.playerHistory.get(positionEvent.playerId.value);
        if (playerHistory) {
          this.playerHistory.set(positionEvent.playerId.value, {
            ...playerHistory,
            currentPosition:
              positionEvent.toPosition === FieldPosition.EXTRA_PLAYER
                ? undefined
                : positionEvent.toPosition,
          });
        }
        break;
      }
      // Ignore unknown event types for forward compatibility
      default:
        break;
    }
  }

  /**
   * Validates that the batting slot is within the allowed range based on softball rules.
   *
   * @param battingSlot - The batting slot to validate
   * @param rules - Softball rules configuration defining maximum players per team
   * @throws {DomainError} When batting slot is invalid
   *
   * @remarks
   * Uses SoftballRules.maxPlayersPerTeam to determine the valid range of batting slots.
   * This allows for configurable roster sizes based on league requirements.
   */
  private static validateBattingSlot(battingSlot: number, rules: SoftballRules): void {
    if (battingSlot < 1 || battingSlot > rules.maxPlayersPerTeam) {
      throw new DomainError(`Batting slot must be between 1 and ${rules.maxPlayersPerTeam}`);
    }
  }

  /**
   * Validates that the player name meets requirements.
   *
   * @param playerName - The player name to validate
   * @throws {DomainError} When player name is invalid
   */
  private static validatePlayerName(playerName: string): void {
    if (!playerName?.trim()) {
      throw new DomainError('Player name cannot be empty or whitespace');
    }
    if (playerName.length > 100) {
      throw new DomainError('Player name cannot exceed 100 characters');
    }
  }

  /**
   * Validates that the inning number is valid.
   *
   * @param inning - The inning to validate (1 or greater)
   * @throws {DomainError} When inning is invalid
   */
  private static validateInning(inning: number): void {
    if (inning < 1) {
      throw new DomainError('Inning must be 1 or greater');
    }
  }
}
