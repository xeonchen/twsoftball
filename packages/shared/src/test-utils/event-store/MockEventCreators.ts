/**
 * @file Mock Event Creators
 * Centralized factory functions for creating mock domain events in tests.
 * Eliminates duplication across test files.
 */

import {
  GameId,
  TeamLineupId,
  InningStateId,
  DomainEvent,
  GameCreated,
  GameStarted,
  AtBatCompleted,
  TeamLineupCreated,
  InningStateCreated,
  PlayerId,
  AtBatResultType,
} from '@twsoftball/domain';

/**
 * Creates a mock GameCreated domain event for EventStore testing scenarios.
 *
 * Generates a realistic GameCreated event with proper domain object structure
 * and valid team names. Essential for testing game aggregate creation and
 * initial event stream establishment in the softball application.
 *
 * @param gameId - The game aggregate identifier for the created event
 * @returns Properly constructed GameCreated domain event
 *
 * @remarks
 * The mock event includes:
 * - Valid game aggregate ID
 * - Realistic team names for test scenarios
 * - Proper domain event structure and type information
 * - Serializable data compatible with EventStore operations
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const gameCreated = createMockGameCreatedEvent(gameId);
 *
 * await eventStore.append(gameId, 'Game', [gameCreated]);
 * const events = await eventStore.getEvents(gameId);
 * expect(events[0].eventType).toBe('GameCreated');
 * ```
 */
export const createMockGameCreatedEvent = (gameId: GameId): GameCreated => {
  return new GameCreated(gameId, 'Mock Home Team', 'Mock Away Team');
};

/**
 * Creates a mock GameStarted domain event for EventStore testing scenarios.
 *
 * Generates a realistic GameStarted event marking the transition from setup to active gameplay.
 * Essential for testing game state transitions and gameplay-phase-dependent operations
 * in the softball application.
 *
 * @param gameId - The game aggregate identifier for the started event
 * @returns Properly constructed GameStarted domain event
 *
 * @remarks
 * The mock event includes:
 * - Valid game aggregate ID
 * - Automatic timestamp marking when game officially began
 * - Proper domain event structure and type information
 * - Event sourcing compliance for state transitions
 *
 * This event represents the critical transition from NOT_STARTED to IN_PROGRESS
 * status, enabling gameplay recording and locking team configurations.
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const gameStarted = createMockGameStartedEvent(gameId);
 *
 * await eventStore.append(gameId, 'Game', [gameStarted]);
 * const events = await eventStore.getEvents(gameId);
 * expect(events[0].eventType).toBe('GameStarted');
 * ```
 */
export const createMockGameStartedEvent = (gameId: GameId): GameStarted => {
  return new GameStarted(gameId);
};

/**
 * Creates a mock AtBatCompleted domain event for EventStore testing scenarios.
 *
 * Generates a realistic at-bat completion event with valid softball game parameters.
 * Critical for testing game progression events and complex event stream scenarios
 * in the TW Softball application.
 *
 * @param gameId - The game aggregate identifier for the at-bat event
 * @returns Properly constructed AtBatCompleted domain event
 *
 * @remarks
 * The mock event includes:
 * - Valid game aggregate ID linking to game context
 * - Generated player ID for batting player
 * - Realistic batting slot number (3rd in lineup)
 * - Single result type (common successful outcome)
 * - Mid-game inning number (3rd inning)
 * - Valid out count (1 out, within 0-2 range)
 *
 * This event represents a typical game progression scenario and validates
 * proper event serialization and storage for complex domain events.
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const atBatEvent = createMockAtBatCompletedEvent(gameId);
 *
 * await eventStore.append(gameId, 'Game', [atBatEvent]);
 * expect(atBatEvent.result).toBe(AtBatResultType.SINGLE);
 * expect(atBatEvent.outs).toBe(1);
 * ```
 */
export const createMockAtBatCompletedEvent = (gameId: GameId): AtBatCompleted => {
  return new AtBatCompleted(
    gameId,
    PlayerId.generate(),
    3, // batting slot
    AtBatResultType.SINGLE,
    3, // inning
    1 // outs (valid range 0-2)
  );
};

/**
 * Creates a mock TeamLineupCreated domain event for EventStore testing scenarios.
 *
 * Generates a realistic team lineup creation event linking team lineup aggregate
 * to its parent game. Essential for testing multi-aggregate event scenarios
 * and cross-aggregate queries in the softball application.
 *
 * @param gameId - The parent game aggregate identifier
 * @param teamLineupId - The team lineup aggregate identifier
 * @returns Properly constructed TeamLineupCreated domain event
 *
 * @remarks
 * The mock event includes:
 * - Team lineup aggregate ID for stream identification
 * - Parent game ID for cross-aggregate relationships
 * - Realistic team name for test scenarios
 * - Proper domain event structure for serialization
 *
 * This event validates multi-aggregate relationships and ensures proper
 * cross-aggregate querying capabilities in EventStore implementations.
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const teamLineupId = TeamLineupId.generate();
 * const lineupEvent = createMockTeamLineupCreatedEvent(gameId, teamLineupId);
 *
 * await eventStore.append(teamLineupId, 'TeamLineup', [lineupEvent]);
 * const gameEvents = await eventStore.getGameEvents(gameId);
 * expect(gameEvents).toContainEqual(expect.objectContaining({
 *   aggregateType: 'TeamLineup'
 * }));
 * ```
 */
export const createMockTeamLineupCreatedEvent = (
  gameId: GameId,
  teamLineupId: TeamLineupId
): TeamLineupCreated => {
  return new TeamLineupCreated(teamLineupId, gameId, 'Mock Team Name');
};

/**
 * Creates a mock InningStateCreated domain event for EventStore testing scenarios.
 *
 * Generates a realistic inning state creation event for testing inning aggregate
 * lifecycle and game state management. Critical for validating complete game
 * state reconstruction across all three aggregate types.
 *
 * @param gameId - The parent game aggregate identifier
 * @param inningStateId - The inning state aggregate identifier
 * @returns Properly constructed InningStateCreated domain event
 *
 * @remarks
 * The mock event includes:
 * - Inning state aggregate ID for stream identification
 * - Parent game ID for cross-aggregate relationships
 * - First inning number (1) for game start scenarios
 * - Top of inning (true) representing away team batting
 * - Proper domain event structure for serialization
 *
 * This event validates the third aggregate type in the softball domain
 * and ensures complete multi-aggregate event sourcing scenarios.
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const inningStateId = InningStateId.generate();
 * const inningEvent = createMockInningStateCreatedEvent(gameId, inningStateId);
 *
 * await eventStore.append(inningStateId, 'InningState', [inningEvent]);
 * const allGameEvents = await eventStore.getEventsByGameId(gameId);
 * expect(allGameEvents).toContainEqual(expect.objectContaining({
 *   aggregateType: 'InningState'
 * }));
 * ```
 */
export const createMockInningStateCreatedEvent = (
  gameId: GameId,
  inningStateId: InningStateId
): InningStateCreated => {
  return new InningStateCreated(inningStateId, gameId, 1, true);
};

/**
 * Creates a large batch of mock domain events for testing scalability and performance.
 *
 * Generates a sequence of realistic domain events for stress testing EventStore
 * implementations with large datasets. Essential for validating performance
 * requirements and batch operation handling in the softball application.
 *
 * @param gameId - The game aggregate identifier for all events in the batch
 * @param count - Number of events to generate in the batch
 * @returns Array of domain events starting with GameCreated followed by AtBatCompleted events
 *
 * @remarks
 * Batch composition:
 * - First event: GameCreated (index 0) for proper game initialization
 * - Remaining events: AtBatCompleted events for game progression
 * - All events share the same gameId for stream consistency
 * - Events represent a realistic game progression sequence
 *
 * This function enables testing of:
 * - Large batch append operations
 * - Event ordering and versioning at scale
 * - Performance characteristics with realistic data volumes
 * - Memory usage patterns with complex domain events
 *
 * @example
 * ```typescript
 * const gameId = GameId.generate();
 * const largeBatch = createMockEventBatch(gameId, 100);
 *
 * // Test batch append performance
 * await eventStore.append(gameId, 'Game', largeBatch);
 *
 * const storedEvents = await eventStore.getEvents(gameId);
 * expect(storedEvents).toHaveLength(100);
 * expect(storedEvents[0].eventType).toBe('GameCreated');
 * expect(storedEvents[99].eventType).toBe('AtBatCompleted');
 * ```
 */
export const createMockEventBatch = (gameId: GameId, count: number): DomainEvent[] => {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return createMockGameCreatedEvent(gameId);
    }
    return createMockAtBatCompletedEvent(gameId);
  });
};

/**
 * Creates a mock GameId using the actual domain value object generator.
 *
 * Maintains consistency with domain layer patterns by using the real
 * GameId.generate() method rather than creating fake IDs. Ensures test
 * scenarios use valid, properly formatted domain identifiers.
 *
 * @returns Properly generated GameId domain value object
 */
export const createMockGameId = (): GameId => GameId.generate();

/**
 * Creates a mock TeamLineupId using the actual domain value object generator.
 *
 * Maintains consistency with domain layer patterns by using the real
 * TeamLineupId.generate() method. Ensures multi-aggregate test scenarios
 * use valid, properly formatted domain identifiers.
 *
 * @returns Properly generated TeamLineupId domain value object
 */
export const createMockTeamLineupId = (): TeamLineupId => TeamLineupId.generate();

/**
 * Creates a mock InningStateId using the actual domain value object generator.
 *
 * Maintains consistency with domain layer patterns by using the real
 * InningStateId.generate() method. Ensures complete aggregate coverage
 * in test scenarios with valid domain identifiers.
 *
 * @returns Properly generated InningStateId domain value object
 */
export const createMockInningStateId = (): InningStateId => InningStateId.generate();
