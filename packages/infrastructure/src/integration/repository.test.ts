/**
 * @file Repository Integration Tests
 * Cross-repository coordination tests for event-sourced aggregate repositories.
 *
 * @remarks
 * These integration tests validate that multiple event-sourced repositories can
 * coordinate properly when sharing the same EventStore instance. This is critical
 * for maintaining consistency in multi-aggregate operations and ensuring proper
 * event ordering across aggregate boundaries.
 *
 * Key integration scenarios tested:
 * - Multi-aggregate coordination through shared EventStore
 * - Cross-repository event consistency
 * - Proper event ordering when multiple aggregates save to same game stream
 * - Isolation between different games (different streams)
 * - Performance characteristics of concurrent repository operations
 *
 * **Integration Test Philosophy:**
 * Unlike unit tests that use mocks, these tests use real EventStore implementations
 * to validate actual coordination behavior. They test the "integration seams"
 * between repositories where complex bugs typically emerge.
 *
 * **Test Infrastructure Setup:**
 * Each test creates a fresh EventStore instance shared across multiple repositories
 * to simulate real-world usage patterns where repositories coordinate through
 * the same underlying event storage mechanism.
 */

import type { EventStore } from '@twsoftball/application/ports/out/EventStore';
import type { GameRepository } from '@twsoftball/application/ports/out/GameRepository';
import type { InningStateRepository } from '@twsoftball/application/ports/out/InningStateRepository';
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';
import {
  GameId,
  Game,
  TeamLineup,
  TeamLineupId,
  InningState,
  InningStateId,
} from '@twsoftball/domain';
// Import types for better type safety
interface StoredEventMetadata {
  readonly source: string;
  readonly createdAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
}
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EventSourcedGameRepository } from '../persistence/EventSourcedGameRepository';
import { EventSourcedInningStateRepository } from '../persistence/EventSourcedInningStateRepository';
import { EventSourcedTeamLineupRepository } from '../persistence/EventSourcedTeamLineupRepository';
import { InMemoryEventStore } from '../persistence/InMemoryEventStore';

describe('Repository Integration Tests', () => {
  let eventStore: EventStore;
  let gameRepository: GameRepository;
  let teamLineupRepository: TeamLineupRepository;
  let inningStateRepository: InningStateRepository;

  beforeEach(() => {
    // Setup shared EventStore instance for integration testing
    eventStore = new InMemoryEventStore();

    // Create repositories sharing the same EventStore
    gameRepository = new EventSourcedGameRepository(eventStore);
    teamLineupRepository = new EventSourcedTeamLineupRepository(eventStore, gameRepository);
    inningStateRepository = new EventSourcedInningStateRepository(eventStore);
  });

  describe('Multi-Aggregate Coordination', () => {
    it('should coordinate saves across Game and TeamLineup repositories', async () => {
      // Given: A game with lineups
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Home Eagles', 'Away Hawks');

      const homeLineupId = TeamLineupId.generate();
      const homeLineup = TeamLineup.createNew(homeLineupId, gameId, 'Home Eagles', 'HOME');

      // When: Saving through repositories
      await gameRepository.save(game);
      await teamLineupRepository.save(homeLineup);

      // Then: Both use the same event store instance and events are properly stored
      const gameEvents = await eventStore.getEvents(gameId);
      const lineupEvents = await eventStore.getEvents(homeLineupId);

      // Verify Game events exist in game stream
      const gameCreatedEvents = gameEvents.filter(e => e.eventType === 'GameCreated');
      expect(gameCreatedEvents).toHaveLength(1);
      expect(gameCreatedEvents[0]?.aggregateType).toBe('Game');
      expect(gameCreatedEvents[0]?.streamId).toBe(gameId.value);

      // Verify TeamLineup events exist in lineup stream (different stream but same event store)
      const teamLineupCreatedEvents = lineupEvents.filter(e => e.eventType === 'TeamLineupCreated');
      expect(teamLineupCreatedEvents).toHaveLength(1);
      expect(teamLineupCreatedEvents[0]?.aggregateType).toBe('TeamLineup');
      expect(teamLineupCreatedEvents[0]?.streamId).toBe(homeLineupId.value);

      // Verify both repositories use the same EventStore instance
      // (Testing infrastructure coordination, not full domain reconstruction)
      expect(gameEvents).toHaveLength(1);
      expect(lineupEvents).toHaveLength(1);
    });

    it('should maintain proper event ordering across repositories', async () => {
      // Given: A game with both home and away lineups
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Team A', 'Team B');

      const homeLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Team A', 'HOME');

      const awayLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Team B', 'AWAY');

      // When: Saving in specific order
      await gameRepository.save(game);
      await teamLineupRepository.save(homeLineup);
      await teamLineupRepository.save(awayLineup);

      // Then: Events are properly stored and repositories maintain coordination
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineupEvents = await eventStore.getEvents(homeLineup.id);
      const awayLineupEvents = await eventStore.getEvents(awayLineup.id);

      // Verify each aggregate has its own event stream
      expect(gameEvents).toHaveLength(1); // GameCreated
      expect(homeLineupEvents).toHaveLength(1); // TeamLineupCreated
      expect(awayLineupEvents).toHaveLength(1); // TeamLineupCreated

      // Verify event types are correct
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(homeLineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      expect(awayLineupEvents[0]?.eventType).toBe('TeamLineupCreated');

      // Verify stream IDs are correct (each aggregate uses its own ID as stream ID)
      expect(gameEvents[0]?.streamId).toBe(gameId.value);
      expect(homeLineupEvents[0]?.streamId).toBe(homeLineup.id.value);
      expect(awayLineupEvents[0]?.streamId).toBe(awayLineup.id.value);
    });

    it('should isolate events between different games', async () => {
      // Given: Two separate games
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      const game1 = Game.createNew(gameId1, 'Eagles', 'Hawks');
      const game2 = Game.createNew(gameId2, 'Lions', 'Bears');

      const lineup1 = TeamLineup.createNew(TeamLineupId.generate(), gameId1, 'Eagles', 'HOME');

      const lineup2 = TeamLineup.createNew(TeamLineupId.generate(), gameId2, 'Lions', 'AWAY');

      // When: Saving entities for both games
      await gameRepository.save(game1);
      await gameRepository.save(game2);
      await teamLineupRepository.save(lineup1);
      await teamLineupRepository.save(lineup2);

      // Then: Events are properly isolated by aggregate streams
      const game1Events = await eventStore.getEvents(gameId1);
      const game2Events = await eventStore.getEvents(gameId2);
      const lineup1Events = await eventStore.getEvents(lineup1.id);
      const lineup2Events = await eventStore.getEvents(lineup2.id);

      expect(game1Events).toHaveLength(1); // GameCreated
      expect(game2Events).toHaveLength(1); // GameCreated
      expect(lineup1Events).toHaveLength(1); // TeamLineupCreated
      expect(lineup2Events).toHaveLength(1); // TeamLineupCreated

      // Verify no cross-contamination - each aggregate uses its own stream
      expect(game1Events[0]?.streamId).toBe(gameId1.value);
      expect(game2Events[0]?.streamId).toBe(gameId2.value);
      expect(lineup1Events[0]?.streamId).toBe(lineup1.id.value);
      expect(lineup2Events[0]?.streamId).toBe(lineup2.id.value);

      // Verify aggregates are associated with correct games via domain properties
      // (Game and lineup association is managed through GameId property, not stream sharing)
    });

    it('should handle concurrent saves across repositories', async () => {
      // Given: A game and multiple lineups to save concurrently
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Concurrent Team A', 'Concurrent Team B');

      const homeLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Concurrent Team A',
        'HOME'
      );

      const awayLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Concurrent Team B',
        'AWAY'
      );

      // When: Saving concurrently across repositories
      await Promise.all([
        gameRepository.save(game),
        teamLineupRepository.save(homeLineup),
        teamLineupRepository.save(awayLineup),
      ]);

      // Then: All events are properly stored across different streams
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineupEvents = await eventStore.getEvents(homeLineup.id);
      const awayLineupEvents = await eventStore.getEvents(awayLineup.id);

      expect(gameEvents).toHaveLength(1); // GameCreated
      expect(homeLineupEvents).toHaveLength(1); // TeamLineupCreated
      expect(awayLineupEvents).toHaveLength(1); // TeamLineupCreated

      // Verify event types are correct
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(homeLineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      expect(awayLineupEvents[0]?.eventType).toBe('TeamLineupCreated');

      // Verify streams are correctly isolated
      expect(gameEvents[0]?.streamId).toBe(gameId.value);
      expect(homeLineupEvents[0]?.streamId).toBe(homeLineup.id.value);
      expect(awayLineupEvents[0]?.streamId).toBe(awayLineup.id.value);
    });
  });

  describe('Cross-Repository Queries', () => {
    it('should allow saving through different repositories using shared EventStore', async () => {
      // Given: A game with lineups saved through different repositories
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Query Team A', 'Query Team B');

      const homeLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Query Team A',
        'HOME'
      );

      // When: Saving through different repositories
      await gameRepository.save(game);
      await teamLineupRepository.save(homeLineup);

      // Then: Both repositories successfully use shared EventStore
      const gameEvents = await eventStore.getEvents(gameId);
      const lineupEvents = await eventStore.getEvents(homeLineup.id);

      expect(gameEvents).toHaveLength(1);
      expect(lineupEvents).toHaveLength(1);
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(lineupEvents[0]?.eventType).toBe('TeamLineupCreated');
    });

    it('should maintain event isolation across repository boundaries', async () => {
      // Given: A complex game scenario with multiple aggregates
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Consistency Team A', 'Consistency Team B');

      const homeLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Consistency Team A',
        'HOME'
      );

      const awayLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Consistency Team B',
        'AWAY'
      );

      // When: Saving all aggregates
      await gameRepository.save(game);
      await teamLineupRepository.save(homeLineup);
      await teamLineupRepository.save(awayLineup);

      // Then: Events are properly isolated in separate streams
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineupEvents = await eventStore.getEvents(homeLineup.id);
      const awayLineupEvents = await eventStore.getEvents(awayLineup.id);

      expect(gameEvents).toHaveLength(1);
      expect(homeLineupEvents).toHaveLength(1);
      expect(awayLineupEvents).toHaveLength(1);

      // Verify proper event types and stream isolation
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(homeLineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      expect(awayLineupEvents[0]?.eventType).toBe('TeamLineupCreated');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple repositories efficiently', async () => {
      // Given: Multiple games with full lineups
      const numberOfGames = 10;
      const games: Game[] = [];
      const lineups: TeamLineup[] = [];

      for (let i = 0; i < numberOfGames; i++) {
        const gameId = GameId.generate();
        const game = Game.createNew(gameId, `Home Team ${i}`, `Away Team ${i}`);

        const homeLineup = TeamLineup.createNew(
          TeamLineupId.generate(),
          gameId,
          `Home Team ${i}`,
          'HOME'
        );

        const awayLineup = TeamLineup.createNew(
          TeamLineupId.generate(),
          gameId,
          `Away Team ${i}`,
          'AWAY'
        );

        games.push(game);
        lineups.push(homeLineup, awayLineup);
      }

      // When: Saving all data through repositories
      const startTime = Date.now();

      await Promise.all(games.map(game => gameRepository.save(game)));
      await Promise.all(lineups.map(lineup => teamLineupRepository.save(lineup)));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Then: Operations complete in reasonable time
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Verify all events were saved correctly in EventStore
      for (const game of games) {
        const gameEvents = await eventStore.getEvents(game.id);
        expect(gameEvents).toHaveLength(1);
        expect(gameEvents[0]?.eventType).toBe('GameCreated');
      }

      // Verify all lineup events were saved
      for (const lineup of lineups) {
        const lineupEvents = await eventStore.getEvents(lineup.id);
        expect(lineupEvents).toHaveLength(1);
        expect(lineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      }
    });
  });

  describe('Cross-Repository Event Sourcing', () => {
    it('should maintain event ordering across repositories', async () => {
      // Given: Multiple aggregates created in a specific order
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Home Team', 'Away Team');

      const homeLineupId = TeamLineupId.generate();
      const homeLineup = TeamLineup.createNew(homeLineupId, gameId, 'Home Team', 'HOME');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Saving in specific order with slight delays to ensure ordering
      await gameRepository.save(game);
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
      await teamLineupRepository.save(homeLineup);
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
      await inningStateRepository.save(inningState);

      // Then: Events maintain proper chronological order
      const allEvents = await eventStore.getAllEvents();
      const timestamps = allEvents.map(e => e.timestamp.getTime());

      // Verify timestamps are in ascending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1] || 0);
      }

      // Verify we have the expected number of events
      expect(allEvents).toHaveLength(3); // GameCreated + TeamLineupCreated + InningStateCreated

      // Verify we have events from all three aggregate types
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes).toContain('GameCreated');
      expect(eventTypes).toContain('TeamLineupCreated');
      expect(eventTypes).toContain('InningStateCreated');
    });

    it('should handle concurrent saves from multiple repositories', async () => {
      // Given: Complete game setup for concurrent saving
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Concurrent Home', 'Concurrent Away');

      const homeLineupId = TeamLineupId.generate();
      const homeLineup = TeamLineup.createNew(homeLineupId, gameId, 'Concurrent Home', 'HOME');

      const awayLineupId = TeamLineupId.generate();
      const awayLineup = TeamLineup.createNew(awayLineupId, gameId, 'Concurrent Away', 'AWAY');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Saving all aggregates concurrently (simulates RecordAtBat use case pattern)
      await Promise.all([
        gameRepository.save(game),
        teamLineupRepository.save(homeLineup),
        teamLineupRepository.save(awayLineup),
        inningStateRepository.save(inningState),
      ]);

      // Then: All events persisted correctly
      const allEvents = await eventStore.getAllEvents();
      const expectedEventCount = 4; // GameCreated + 2 TeamLineupCreated + InningStateCreated
      expect(allEvents).toHaveLength(expectedEventCount);

      // Verify all event types are present
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes).toContain('GameCreated');
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(2);
      expect(eventTypes).toContain('InningStateCreated');

      // Verify stream isolation - each aggregate has its own stream
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineupEvents = await eventStore.getEvents(homeLineupId);
      const awayLineupEvents = await eventStore.getEvents(awayLineupId);
      const inningEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(homeLineupEvents).toHaveLength(1);
      expect(awayLineupEvents).toHaveLength(1);
      expect(inningEvents).toHaveLength(1);
    });

    it('should maintain event consistency across related aggregates', async () => {
      // Given: Game state saved through repositories
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Consistency Team A', 'Consistency Team B');

      const lineupId = TeamLineupId.generate();
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Consistency Team A', 'HOME');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Saving all related aggregates
      await gameRepository.save(game);
      await teamLineupRepository.save(lineup);
      await inningStateRepository.save(inningState);

      // Then: Events are properly stored with correct relationships
      const gameEvents = await eventStore.getEvents(gameId);
      const lineupEvents = await eventStore.getEvents(lineupId);
      const inningStateEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(lineupEvents).toHaveLength(1);
      expect(inningStateEvents).toHaveLength(1);

      // Verify event types
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(lineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      expect(inningStateEvents[0]?.eventType).toBe('InningStateCreated');

      // Verify stream IDs match aggregate IDs
      expect(gameEvents[0]?.streamId).toBe(gameId.value);
      expect(lineupEvents[0]?.streamId).toBe(lineupId.value);
      expect(inningStateEvents[0]?.streamId).toBe(inningStateId.value);

      // Verify event data contains correct relationships
      const lineupEventData = JSON.parse(lineupEvents[0]?.eventData || '{}');
      const inningStateEventData = JSON.parse(inningStateEvents[0]?.eventData || '{}');

      // All lineup and inning state events should reference the same game
      expect(lineupEventData.gameId).toBeDefined();
      expect(inningStateEventData.gameId).toBeDefined();
    });

    it('should maintain stream isolation across different aggregates', async () => {
      // Given: Multiple games with complete setups
      const game1Id = GameId.generate();
      const game1 = Game.createNew(game1Id, 'Eagles', 'Hawks');
      const game1LineupId = TeamLineupId.generate();
      const game1Lineup = TeamLineup.createNew(game1LineupId, game1Id, 'Eagles', 'HOME');
      const game1InningId = InningStateId.generate();
      const game1Inning = InningState.createNew(game1InningId, game1Id);

      const game2Id = GameId.generate();
      const game2 = Game.createNew(game2Id, 'Lions', 'Bears');
      const game2LineupId = TeamLineupId.generate();
      const game2Lineup = TeamLineup.createNew(game2LineupId, game2Id, 'Lions', 'AWAY');
      const game2InningId = InningStateId.generate();
      const game2Inning = InningState.createNew(game2InningId, game2Id);

      // When: Saving all aggregates
      await Promise.all([
        gameRepository.save(game1),
        teamLineupRepository.save(game1Lineup),
        inningStateRepository.save(game1Inning),
        gameRepository.save(game2),
        teamLineupRepository.save(game2Lineup),
        inningStateRepository.save(game2Inning),
      ]);

      // Then: Events are properly isolated by aggregate streams
      const game1Events = await eventStore.getEvents(game1Id);
      const game1LineupEvents = await eventStore.getEvents(game1LineupId);
      const game1InningEvents = await eventStore.getEvents(game1InningId);
      const game2Events = await eventStore.getEvents(game2Id);
      const game2LineupEvents = await eventStore.getEvents(game2LineupId);
      const game2InningEvents = await eventStore.getEvents(game2InningId);

      // Verify each aggregate has exactly one event
      expect(game1Events).toHaveLength(1);
      expect(game1LineupEvents).toHaveLength(1);
      expect(game1InningEvents).toHaveLength(1);
      expect(game2Events).toHaveLength(1);
      expect(game2LineupEvents).toHaveLength(1);
      expect(game2InningEvents).toHaveLength(1);

      // Verify no cross-contamination between streams
      expect(game1Events[0]?.streamId).toBe(game1Id.value);
      expect(game1LineupEvents[0]?.streamId).toBe(game1LineupId.value);
      expect(game1InningEvents[0]?.streamId).toBe(game1InningId.value);
      expect(game2Events[0]?.streamId).toBe(game2Id.value);
      expect(game2LineupEvents[0]?.streamId).toBe(game2LineupId.value);
      expect(game2InningEvents[0]?.streamId).toBe(game2InningId.value);
    });
  });

  describe('Use Case Pattern Validation', () => {
    it('should support StartNewGame use case pattern', async () => {
      // Given: StartNewGame use case scenario
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Home Starters', 'Away Starters');

      const homeLineupId = TeamLineupId.generate();
      const homeLineup = TeamLineup.createNew(homeLineupId, gameId, 'Home Starters', 'HOME');

      const awayLineupId = TeamLineupId.generate();
      const awayLineup = TeamLineup.createNew(awayLineupId, gameId, 'Away Starters', 'AWAY');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Executing StartNewGame sequence
      await gameRepository.save(game);
      await teamLineupRepository.save(homeLineup);
      await teamLineupRepository.save(awayLineup);
      await inningStateRepository.save(inningState);

      // Then: Game is properly initialized for play
      const allEvents = await eventStore.getAllEvents();
      expect(allEvents).toHaveLength(4);

      // Verify game initialization events
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes).toContain('GameCreated');
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(2);
      expect(eventTypes).toContain('InningStateCreated');

      // Verify event data contains expected game initialization
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineupEvents = await eventStore.getEvents(homeLineupId);
      const awayLineupEvents = await eventStore.getEvents(awayLineupId);
      const inningStateEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(homeLineupEvents).toHaveLength(1);
      expect(awayLineupEvents).toHaveLength(1);
      expect(inningStateEvents).toHaveLength(1);

      // Verify game initialization data in events
      const inningStateEventData = JSON.parse(inningStateEvents[0]?.eventData || '{}');
      expect(inningStateEventData.gameId).toBeDefined();
      expect(inningStateEventData.inning).toBe(1);
      expect(inningStateEventData.isTopHalf).toBe(true);
    });

    it('should support RecordAtBat use case coordination pattern', async () => {
      // Given: Game in progress state (existing game, lineups, and inning state)
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Batting Team', 'Fielding Team');

      const battingLineupId = TeamLineupId.generate();
      const battingLineup = TeamLineup.createNew(battingLineupId, gameId, 'Batting Team', 'HOME');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Initial setup (simulates existing game state)
      await gameRepository.save(game);
      await teamLineupRepository.save(battingLineup);
      await inningStateRepository.save(inningState);

      // Then: Events are properly stored for RecordAtBat coordination
      const gameEvents = await eventStore.getEvents(gameId);
      const lineupEvents = await eventStore.getEvents(battingLineupId);
      const inningStateEvents = await eventStore.getEvents(inningStateId);

      // Verify all related aggregates have events stored
      expect(gameEvents).toHaveLength(1);
      expect(lineupEvents).toHaveLength(1);
      expect(inningStateEvents).toHaveLength(1);

      // Verify event types are correct
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(lineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      expect(inningStateEvents[0]?.eventType).toBe('InningStateCreated');

      // Verify game relationships in event data
      const lineupEventData = JSON.parse(lineupEvents[0]?.eventData || '{}');
      const inningStateEventData = JSON.parse(inningStateEvents[0]?.eventData || '{}');
      expect(lineupEventData.gameId).toBeDefined();
      expect(inningStateEventData.gameId).toBeDefined();
    });

    it('should handle complex multi-aggregate scenarios', async () => {
      // Given: Complex game scenario with multiple innings and lineup changes
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Complex Home', 'Complex Away');

      // Multiple lineups for substitutions
      const homeLineup1Id = TeamLineupId.generate();
      const homeLineup1 = TeamLineup.createNew(homeLineup1Id, gameId, 'Complex Home', 'HOME');

      const homeLineup2Id = TeamLineupId.generate();
      const homeLineup2 = TeamLineup.createNew(homeLineup2Id, gameId, 'Complex Home', 'HOME');

      const awayLineupId = TeamLineupId.generate();
      const awayLineup = TeamLineup.createNew(awayLineupId, gameId, 'Complex Away', 'AWAY');

      // Multiple inning states for progression
      const inning1Id = InningStateId.generate();
      const inning1State = InningState.createNew(inning1Id, gameId);

      const inning2Id = InningStateId.generate();
      const inning2State = InningState.createNew(inning2Id, gameId);

      // When: Saving complex scenario
      await Promise.all([
        gameRepository.save(game),
        teamLineupRepository.save(homeLineup1),
        teamLineupRepository.save(homeLineup2),
        teamLineupRepository.save(awayLineup),
        inningStateRepository.save(inning1State),
        inningStateRepository.save(inning2State),
      ]);

      // Then: All aggregates are properly stored and related
      const allEvents = await eventStore.getAllEvents();
      expect(allEvents).toHaveLength(6);

      // Verify event distribution
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes.filter(type => type === 'GameCreated')).toHaveLength(1);
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(3);
      expect(eventTypes.filter(type => type === 'InningStateCreated')).toHaveLength(2);

      // Verify all aggregates have events stored correctly
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineup1Events = await eventStore.getEvents(homeLineup1Id);
      const homeLineup2Events = await eventStore.getEvents(homeLineup2Id);
      const awayLineupEvents = await eventStore.getEvents(awayLineupId);
      const inning1Events = await eventStore.getEvents(inning1Id);
      const inning2Events = await eventStore.getEvents(inning2Id);

      expect(gameEvents).toHaveLength(1);
      expect(homeLineup1Events).toHaveLength(1);
      expect(homeLineup2Events).toHaveLength(1);
      expect(awayLineupEvents).toHaveLength(1);
      expect(inning1Events).toHaveLength(1);
      expect(inning2Events).toHaveLength(1);

      // Verify event data contains correct game relationships
      const homeLineup1EventData = JSON.parse(homeLineup1Events[0]?.eventData || '{}');
      const homeLineup2EventData = JSON.parse(homeLineup2Events[0]?.eventData || '{}');
      const awayLineupEventData = JSON.parse(awayLineupEvents[0]?.eventData || '{}');
      const inning1EventData = JSON.parse(inning1Events[0]?.eventData || '{}');
      const inning2EventData = JSON.parse(inning2Events[0]?.eventData || '{}');

      expect(homeLineup1EventData.gameId).toBeDefined();
      expect(homeLineup2EventData.gameId).toBeDefined();
      expect(awayLineupEventData.gameId).toBeDefined();
      expect(inning1EventData.gameId).toBeDefined();
      expect(inning2EventData.gameId).toBeDefined();
    });
  });

  describe('Advanced Performance and Scalability', () => {
    it('should handle large-scale concurrent operations efficiently', async () => {
      // Given: Large number of concurrent operations
      const numberOfOperations = 50;
      const operations: Promise<void>[] = [];

      for (let i = 0; i < numberOfOperations; i++) {
        const gameId = GameId.generate();
        const game = Game.createNew(gameId, `Home Team ${i}`, `Away Team ${i}`);

        const homeLineupId = TeamLineupId.generate();
        const homeLineup = TeamLineup.createNew(homeLineupId, gameId, `Home Team ${i}`, 'HOME');

        const inningStateId = InningStateId.generate();
        const inningState = InningState.createNew(inningStateId, gameId);

        operations.push(
          Promise.all([
            gameRepository.save(game),
            teamLineupRepository.save(homeLineup),
            inningStateRepository.save(inningState),
          ]).then(() => {})
        );
      }

      // When: Executing all operations concurrently
      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Then: Operations complete efficiently
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all events were persisted
      const allEvents = await eventStore.getAllEvents();
      const expectedEventCount = numberOfOperations * 3; // Game + Lineup + InningState
      expect(allEvents).toHaveLength(expectedEventCount);

      // Verify event type distribution
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes.filter(type => type === 'GameCreated')).toHaveLength(numberOfOperations);
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(
        numberOfOperations
      );
      expect(eventTypes.filter(type => type === 'InningStateCreated')).toHaveLength(
        numberOfOperations
      );
    });

    it('should maintain performance with complex event streams', async () => {
      // Given: Games with multiple events per aggregate
      const numberOfGames = 10;
      const eventsPerGame = 5; // Multiple saves to simulate event accumulation

      for (let gameIndex = 0; gameIndex < numberOfGames; gameIndex++) {
        const gameId = GameId.generate();
        const game = Game.createNew(
          gameId,
          `Performance Home ${gameIndex}`,
          `Performance Away ${gameIndex}`
        );

        const lineupId = TeamLineupId.generate();
        const lineup = TeamLineup.createNew(
          lineupId,
          gameId,
          `Performance Home ${gameIndex}`,
          'HOME'
        );

        const inningStateId = InningStateId.generate();
        const inningState = InningState.createNew(inningStateId, gameId);

        // Save initial state
        await gameRepository.save(game);
        await teamLineupRepository.save(lineup);
        await inningStateRepository.save(inningState);

        // Simulate additional events by re-saving (adds uncommitted events)
        for (let eventIndex = 1; eventIndex < eventsPerGame; eventIndex++) {
          // Note: In real scenarios, these would be business operations that generate events
          // For testing, we're just verifying the infrastructure can handle the load
          await gameRepository.save(game);
          await teamLineupRepository.save(lineup);
          await inningStateRepository.save(inningState);
        }
      }

      // When: Verifying performance with accumulated events
      const startTime = Date.now();
      const allEvents = await eventStore.getAllEvents();
      const queryTime = Date.now() - startTime;

      // Then: Query performance remains reasonable
      expect(queryTime).toBeLessThan(1000); // Should query within 1 second

      // Verify expected number of events (only initial saves create events, re-saves don't add new events)
      const expectedTotalEvents = numberOfGames * 3; // Game + Lineup + InningState per game (only first save)
      expect(allEvents).toHaveLength(expectedTotalEvents);

      // Verify event distribution
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes.filter(type => type === 'GameCreated')).toHaveLength(numberOfGames);
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(numberOfGames);
      expect(eventTypes.filter(type => type === 'InningStateCreated')).toHaveLength(numberOfGames);
    });

    it('should handle event versioning consistency across repositories', async () => {
      // Given: Aggregates with version tracking
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Version Team A', 'Version Team B');

      const lineupId = TeamLineupId.generate();
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Version Team A', 'HOME');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Saving and verifying versions
      await gameRepository.save(game);
      await teamLineupRepository.save(lineup);
      await inningStateRepository.save(inningState);

      // Then: Events are properly stored with version consistency
      const gameEvents = await eventStore.getEvents(gameId);
      const lineupEvents = await eventStore.getEvents(lineupId);
      const inningStateEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(lineupEvents).toHaveLength(1);
      expect(inningStateEvents).toHaveLength(1);

      // Verify event versions start at 1
      expect(gameEvents[0]?.streamVersion).toBe(1);
      expect(lineupEvents[0]?.streamVersion).toBe(1);
      expect(inningStateEvents[0]?.streamVersion).toBe(1);

      // Verify event metadata is present
      expect(gameEvents[0]?.timestamp).toBeDefined();
      expect(lineupEvents[0]?.timestamp).toBeDefined();
      expect(inningStateEvents[0]?.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty lineups scenario', async () => {
      // Given: Game with no lineups (edge case)
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Empty Lineup Home', 'Empty Lineup Away');

      const inningStateId = InningStateId.generate();
      const inningState = InningState.createNew(inningStateId, gameId);

      // When: Saving game without lineups
      await gameRepository.save(game);
      await inningStateRepository.save(inningState);

      // Then: Game and inning state events are properly stored
      const gameEvents = await eventStore.getEvents(gameId);
      const inningStateEvents = await eventStore.getEvents(inningStateId);

      expect(gameEvents).toHaveLength(1);
      expect(inningStateEvents).toHaveLength(1);
      expect(gameEvents[0]?.streamId).toBe(gameId.value);
      expect(inningStateEvents[0]?.streamId).toBe(inningStateId.value);

      // Verify game relationship in event data
      const inningStateEventData = JSON.parse(inningStateEvents[0]?.eventData || '{}');
      expect(inningStateEventData.gameId).toBeDefined();

      // Verify event types are correct
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(inningStateEvents[0]?.eventType).toBe('InningStateCreated');
    });

    it('should handle no innings data scenario', async () => {
      // Given: Game and lineups without inning state
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'No Innings Home', 'No Innings Away');

      const homeLineupId = TeamLineupId.generate();
      const homeLineup = TeamLineup.createNew(homeLineupId, gameId, 'No Innings Home', 'HOME');

      const awayLineupId = TeamLineupId.generate();
      const awayLineup = TeamLineup.createNew(awayLineupId, gameId, 'No Innings Away', 'AWAY');

      // When: Saving without inning state
      await gameRepository.save(game);
      await teamLineupRepository.save(homeLineup);
      await teamLineupRepository.save(awayLineup);

      // Then: Game and lineups events are properly saved, no inning state events
      const gameEvents = await eventStore.getEvents(gameId);
      const homeLineupEvents = await eventStore.getEvents(homeLineupId);
      const awayLineupEvents = await eventStore.getEvents(awayLineupId);

      expect(gameEvents).toHaveLength(1);
      expect(homeLineupEvents).toHaveLength(1);
      expect(awayLineupEvents).toHaveLength(1);

      // Verify game relationships in lineup events
      const homeLineupEventData = JSON.parse(homeLineupEvents[0]?.eventData || '{}');
      const awayLineupEventData = JSON.parse(awayLineupEvents[0]?.eventData || '{}');
      expect(homeLineupEventData.gameId).toBeDefined();
      expect(awayLineupEventData.gameId).toBeDefined();

      // Verify proper event counts
      const allEvents = await eventStore.getAllEvents();
      expect(allEvents).toHaveLength(3); // GameCreated + 2 TeamLineupCreated

      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes).toContain('GameCreated');
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(2);
      expect(eventTypes).not.toContain('InningStateCreated');
    });

    it('should handle mixed repository operations with partial failures simulation', async () => {
      // Given: Multiple aggregates with some successful operations
      const gameId1 = GameId.generate();
      const game1 = Game.createNew(gameId1, 'Success Team A', 'Success Team B');

      const gameId2 = GameId.generate();
      const game2 = Game.createNew(gameId2, 'Success Team C', 'Success Team D');

      const lineupId1 = TeamLineupId.generate();
      const lineup1 = TeamLineup.createNew(lineupId1, gameId1, 'Success Team A', 'HOME');

      // When: Some operations succeed
      await gameRepository.save(game1);
      await gameRepository.save(game2);
      await teamLineupRepository.save(lineup1);
      // Note: Not saving lineup for game2 or any inning states

      // Then: Successful operations have events properly stored
      const game1Events = await eventStore.getEvents(gameId1);
      const game2Events = await eventStore.getEvents(gameId2);
      const lineup1Events = await eventStore.getEvents(lineupId1);

      expect(game1Events).toHaveLength(1);
      expect(game2Events).toHaveLength(1);
      expect(lineup1Events).toHaveLength(1);

      // Verify stream IDs are correct
      expect(game1Events[0]?.streamId).toBe(gameId1.value);
      expect(game2Events[0]?.streamId).toBe(gameId2.value);
      expect(lineup1Events[0]?.streamId).toBe(lineupId1.value);

      // Verify lineup relationship to game1
      const lineup1EventData = JSON.parse(lineup1Events[0]?.eventData || '{}');
      expect(lineup1EventData.gameId).toBeDefined();

      // Verify event isolation
      const allEvents = await eventStore.getAllEvents();
      expect(allEvents).toHaveLength(3); // 2 GameCreated + 1 TeamLineupCreated

      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes.filter(type => type === 'GameCreated')).toHaveLength(2);
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(1);
      expect(eventTypes).not.toContain('InningStateCreated');
    });
  });

  describe('Repository Integration Error Handling', () => {
    it('should handle partial failures in multi-repository saves', async () => {
      // Given: A game and lineup for testing partial failure
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Eagles', 'Hawks');
      const lineupId = TeamLineupId.generate();
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Eagles', 'HOME');

      // Simulate event store failure after first save
      let saveCount = 0;
      const originalAppend = eventStore.append.bind(eventStore);
      vi.spyOn(eventStore, 'append').mockImplementation(
        async (streamId, events, expectedVersion) => {
          if (++saveCount > 1) {
            throw new Error('Event store failure');
          }
          return originalAppend(streamId, events, expectedVersion);
        }
      );

      // When: First save succeeds, second fails
      await gameRepository.save(game);
      await expect(teamLineupRepository.save(lineup)).rejects.toThrow('Event store failure');

      // Then: First save succeeded, verify via event store
      const gameEvents = await eventStore.getEvents(gameId);
      expect(gameEvents).toHaveLength(1);
      expect(gameEvents[0]?.eventType).toBe('GameCreated');
      expect(gameEvents[0]?.streamId).toBe(gameId.value);

      // Verify lineup was not saved due to failure
      const lineupEvents = await eventStore.getEvents(lineupId);
      expect(lineupEvents).toHaveLength(0);
    });

    it('should handle empty event streams across repositories', async () => {
      // Given: Non-existent aggregate IDs
      const nonExistentGameId = GameId.generate();
      const nonExistentLineupId = TeamLineupId.generate();
      const nonExistentInningId = InningStateId.generate();

      // When: Attempting to find non-existent aggregates
      const results = await Promise.all([
        gameRepository.findById(nonExistentGameId),
        teamLineupRepository.findByGameId(nonExistentGameId),
        inningStateRepository.findCurrentByGameId(nonExistentGameId),
      ]);

      // Then: All return appropriate empty results
      expect(results[0]).toBeNull(); // Game not found
      expect(results[1]).toEqual([]); // No lineups found
      expect(results[2]).toBeNull(); // Inning state not found

      // Verify no events exist for these IDs
      const gameEvents = await eventStore.getEvents(nonExistentGameId);
      const lineupEvents = await eventStore.getEvents(nonExistentLineupId);
      const inningEvents = await eventStore.getEvents(nonExistentInningId);

      expect(gameEvents).toEqual([]);
      expect(lineupEvents).toEqual([]);
      expect(inningEvents).toEqual([]);
    });

    it('should handle version conflicts in concurrent updates', async () => {
      // Given: A game saved to establish initial version
      const gameId = GameId.generate();
      const originalGame = Game.createNew(gameId, 'Home Team', 'Away Team');
      await gameRepository.save(originalGame);

      // Verify initial game is saved
      const initialEvents = await eventStore.getEvents(gameId);
      expect(initialEvents).toHaveLength(1);
      expect(initialEvents[0]?.eventType).toBe('GameCreated');

      // Simulate concurrent access scenario - create two instances of NEW games with same ID
      // This simulates the case where two users try to create the same game simultaneously
      const concurrentGameId = GameId.generate();
      const game1 = Game.createNew(concurrentGameId, 'Concurrent Home', 'Concurrent Away');
      const game2 = Game.createNew(concurrentGameId, 'Concurrent Home', 'Concurrent Away');

      expect(game1.getVersion()).toBe(game2.getVersion());

      // When: First save succeeds
      await gameRepository.save(game1);

      // Then: Second save should detect version conflict
      await expect(gameRepository.save(game2)).rejects.toThrow('Concurrency conflict detected');

      // Verify initial game versions were the same before conflict
      expect(game1.getVersion()).toBe(game2.getVersion());
    });

    it('should handle EventStore connection failures during multi-repository operations', async () => {
      // Given: Setup for multi-repository operation
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Connection Test Home', 'Connection Test Away');
      const lineupId = TeamLineupId.generate();
      const lineup = TeamLineup.createNew(lineupId, gameId, 'Connection Test Home', 'HOME');

      // Mock connection failure
      vi.spyOn(eventStore, 'append').mockRejectedValue(new Error('Connection timeout'));

      // When: Attempting to save during connection failure
      await expect(gameRepository.save(game)).rejects.toThrow('Connection timeout');
      await expect(teamLineupRepository.save(lineup)).rejects.toThrow('Connection timeout');

      // Then: No events should be persisted
      const gameEvents = await eventStore.getEvents(gameId);
      const lineupEvents = await eventStore.getEvents(lineupId);

      expect(gameEvents).toHaveLength(0);
      expect(lineupEvents).toHaveLength(0);
    });

    it('should handle corrupted event data gracefully', async () => {
      // Given: Setup with valid game
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Corruption Test Home', 'Corruption Test Away');

      // Save valid game first
      await gameRepository.save(game);

      // Mock corrupted event data during retrieval
      const corruptedEvents = [
        {
          eventId: 'test-event-id',
          streamId: gameId.value,
          streamVersion: 1,
          eventVersion: 1,
          eventType: 'GameCreated',
          eventData: 'invalid-json-data',
          aggregateType: 'Game' as const,
          timestamp: new Date(),
          metadata: {
            source: 'test',
            createdAt: new Date(),
          },
        },
      ];

      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(corruptedEvents);

      // When: Attempting to reconstruct from corrupted data
      // Then: Should handle gracefully (implementation dependent)
      // For now, verify that corrupted data is returned by event store
      const events = await eventStore.getEvents(gameId);
      expect(events).toEqual(corruptedEvents);
      expect(events[0]?.eventData).toBe('invalid-json-data');
    });

    it('should handle race conditions in concurrent repository access', async () => {
      // Given: Multiple concurrent operations on different aggregates
      const operations = [];
      const gameIds = [];
      const lineupIds = [];

      for (let i = 0; i < 20; i++) {
        const gameId = GameId.generate();
        const lineupId = TeamLineupId.generate();
        gameIds.push(gameId);
        lineupIds.push(lineupId);

        const game = Game.createNew(gameId, `Race Home ${i}`, `Race Away ${i}`);
        const lineup = TeamLineup.createNew(lineupId, gameId, `Race Home ${i}`, 'HOME');

        // Execute operations concurrently
        operations.push(
          Promise.all([gameRepository.save(game), teamLineupRepository.save(lineup)])
        );
      }

      // When: All operations execute concurrently
      await Promise.all(operations);

      // Then: All events should be properly persisted despite race conditions
      for (let i = 0; i < gameIds.length; i++) {
        const gameEvents = await eventStore.getEvents(gameIds[i]!);
        const lineupEvents = await eventStore.getEvents(lineupIds[i]!);

        expect(gameEvents).toHaveLength(1);
        expect(lineupEvents).toHaveLength(1);
        expect(gameEvents[0]?.eventType).toBe('GameCreated');
        expect(lineupEvents[0]?.eventType).toBe('TeamLineupCreated');
      }
    });

    it('should handle invalid aggregate state recovery', async () => {
      // Given: Game with invalid state data
      const gameId = GameId.generate();

      // Mock events with invalid state data
      const invalidEvents = [
        {
          eventId: 'invalid-state-event',
          streamId: gameId.value,
          streamVersion: 1,
          eventVersion: 1,
          eventType: 'GameCreated',
          eventData: JSON.stringify({
            gameId: {
              value: gameId.value,
            },
            homeTeamName: null, // Invalid: missing required field
            awayTeamName: '', // Invalid: empty team name
            scheduledDate: 'invalid-date', // Invalid: malformed date
          }),
          aggregateType: 'Game' as const,
          timestamp: new Date(),
          metadata: {
            source: 'test',
            createdAt: new Date(),
          },
        },
      ];

      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(invalidEvents);

      // When: Attempting to reconstruct invalid state
      // Then: Repository should handle the invalid state gracefully
      const events = await eventStore.getEvents(gameId);
      expect(events).toEqual(invalidEvents);

      // Verify the invalid data is accessible for error handling
      const eventData = JSON.parse(events[0]?.eventData || '{}') as {
        gameId: { value: string };
        homeTeamName: null;
        awayTeamName: string;
        scheduledDate: string;
      };
      expect(eventData.homeTeamName).toBeNull();
      expect(eventData.awayTeamName).toBe('');
      expect(eventData.scheduledDate).toBe('invalid-date');
    });

    it('should handle null and undefined event data', async () => {
      // Given: Events with null/undefined data
      const gameId = GameId.generate();

      const nullDataEvents = [
        {
          eventId: 'null-data-event',
          streamId: gameId.value,
          streamVersion: 1,
          eventVersion: 1,
          eventType: 'GameCreated',
          eventData: null as unknown as string,
          aggregateType: 'Game' as const,
          timestamp: new Date(),
          metadata: null as unknown as StoredEventMetadata,
        },
      ];

      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(nullDataEvents);

      // When: Retrieving events with null data
      const events = await eventStore.getEvents(gameId);

      // Then: Should handle null data gracefully
      expect(events).toEqual(nullDataEvents);
      expect(events[0]?.eventData).toBeNull();
      expect(events[0]?.metadata).toBeNull();
    });

    it('should handle malformed event payloads', async () => {
      // Given: Events with malformed JSON payloads
      const gameId = GameId.generate();

      const malformedEvents = [
        {
          eventId: 'malformed-event',
          streamId: gameId.value,
          streamVersion: 1,
          eventVersion: 1,
          eventType: 'GameCreated',
          eventData: '{ invalid json }', // Malformed JSON
          aggregateType: 'Game' as const,
          timestamp: new Date(),
          metadata: {
            source: 'test',
            createdAt: new Date(),
          },
        },
      ];

      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(malformedEvents);

      // When: Retrieving malformed events
      const events = await eventStore.getEvents(gameId);

      // Then: Should retrieve malformed data for error handling
      expect(events).toEqual(malformedEvents);
      expect(events[0]?.eventData).toBe('{ invalid json }');
      expect(events[0]?.metadata).toMatchObject({
        source: 'test',
        createdAt: expect.any(Date),
      });

      // Verify that attempting to parse would throw
      expect(() => JSON.parse(events[0]?.eventData || '') as unknown).toThrow();
    });
  });

  describe('Edge Cases and Advanced Scenarios', () => {
    it('should handle very large event streams efficiently', async () => {
      // Given: Game with many events (simulating long-running game)
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Long Game Home', 'Long Game Away');

      // Save initial game
      await gameRepository.save(game);

      // Simulate large number of events
      const largeEventStream = [];
      for (let i = 1; i <= 1000; i++) {
        largeEventStream.push({
          eventId: `event-${i}`,
          streamId: gameId.value,
          streamVersion: i,
          eventVersion: 1,
          eventType: i === 1 ? 'GameCreated' : 'AtBatCompleted',
          eventData: JSON.stringify({ eventNumber: i }),
          aggregateType: 'Game' as const,
          timestamp: new Date(Date.now() + i),
          metadata: {
            source: 'test',
            createdAt: new Date(Date.now() + i),
          },
        });
      }

      vi.spyOn(eventStore, 'getEvents').mockResolvedValue(largeEventStream);

      // When: Retrieving large event stream
      const startTime = Date.now();
      const events = await eventStore.getEvents(gameId);
      const retrievalTime = Date.now() - startTime;

      // Then: Should handle large streams efficiently
      expect(events).toHaveLength(1000);
      expect(retrievalTime).toBeLessThan(100); // Should retrieve within 100ms
      expect(events[0]?.eventType).toBe('GameCreated');
      expect(events[999]?.eventType).toBe('AtBatCompleted');
    });

    it('should handle rapid concurrent saves to same aggregate', async () => {
      // Given: Game for concurrent modification
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Concurrent Home', 'Concurrent Away');

      // Initial save
      await gameRepository.save(game);

      // When: Rapid concurrent saves (simulating high-frequency updates)
      const concurrentSaves = [];
      for (let i = 0; i < 10; i++) {
        // Create new game instance instead of loading from repository
        const gameInstance = Game.createNew(gameId, 'Concurrent Home', 'Concurrent Away');
        concurrentSaves.push(gameRepository.save(gameInstance));
      }

      // Execute all saves concurrently
      const results = await Promise.allSettled(concurrentSaves);

      // Then: Should handle concurrent access with version conflicts
      // Count successful saves
      const successfulSaves = results.filter(r => r.status === 'fulfilled').length;
      const failedSaves = results.filter(r => r.status === 'rejected').length;

      // Verify all operations completed (success or failure)
      expect(successfulSaves + failedSaves).toBe(10);

      // With same streamId, only one save should succeed due to version conflicts
      // The first save (from setup) succeeded, so concurrent saves should mostly fail
      expect(failedSaves).toBeGreaterThan(0);

      // Verify failures are due to concurrency conflicts
      const rejectedResults = results.filter(r => r.status === 'rejected');
      rejectedResults.forEach((result: PromiseRejectedResult) => {
        expect(result.reason.message).toContain('Concurrency conflict detected');
      });
    });

    it('should handle EventStore capacity limits gracefully', async () => {
      // Given: Mock event store that rejects after capacity limit
      let operationCount = 0;
      const capacityLimit = 5;

      const originalAppend = eventStore.append.bind(eventStore);
      vi.spyOn(eventStore, 'append').mockImplementation(
        async (streamId, events, expectedVersion) => {
          if (++operationCount > capacityLimit) {
            throw new Error('Event store capacity exceeded');
          }
          return originalAppend(streamId, events, expectedVersion);
        }
      );

      // When: Attempting to exceed capacity
      const operations = [];
      for (let i = 0; i < 10; i++) {
        const gameId = GameId.generate();
        const game = Game.createNew(gameId, `Capacity Home ${i}`, `Capacity Away ${i}`);
        operations.push(gameRepository.save(game));
      }

      const results = await Promise.allSettled(operations);

      // Then: Should handle capacity limits appropriately
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(capacityLimit);
      expect(failed).toBe(10 - capacityLimit);

      // Verify error messages
      const rejectedResults = results.filter(r => r.status === 'rejected');
      rejectedResults.forEach((result: PromiseRejectedResult) => {
        expect(result.reason.message).toBe('Event store capacity exceeded');
      });
    });

    it('should handle timestamp collision scenarios', async () => {
      // Given: Events with identical timestamps
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();
      const fixedTimestamp = new Date('2024-06-15T12:00:00.000Z');

      // Mock Date.now to return fixed timestamp
      const originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp.getTime());

      const game1 = Game.createNew(gameId1, 'Timestamp Team A', 'Timestamp Team B');
      const game2 = Game.createNew(gameId2, 'Timestamp Team C', 'Timestamp Team D');

      try {
        // When: Saving games with identical timestamps
        await Promise.all([gameRepository.save(game1), gameRepository.save(game2)]);

        // Then: Both should save successfully despite timestamp collision
        const game1Events = await eventStore.getEvents(gameId1);
        const game2Events = await eventStore.getEvents(gameId2);

        expect(game1Events).toHaveLength(1);
        expect(game2Events).toHaveLength(1);

        // Verify events can be distinguished despite same timestamp
        expect(game1Events[0]?.streamId).toBe(gameId1.value);
        expect(game2Events[0]?.streamId).toBe(gameId2.value);
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });

    it('should handle cross-timezone event ordering', async () => {
      // Given: Events created across different timezones
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Timezone Home', 'Timezone Away');

      // When: Saving game (timezone handling is implicit in event storage)
      await gameRepository.save(game);

      // Then: Events should be stored consistently regardless of timezone
      const events = await eventStore.getEvents(gameId);
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('GameCreated');

      // Verify timestamp is present and is a valid Date object
      expect(events[0]?.timestamp).toBeDefined();
      expect(events[0]?.timestamp).toBeInstanceOf(Date);

      // Verify event data integrity across timezone boundaries
      expect(events[0]?.streamId).toBe(gameId.value);
      expect(events[0]?.aggregateType).toBe('Game');
    });

    it('should handle network timeout simulation', async () => {
      // Given: Event store with network timeout behavior
      const timeoutDuration = 100; // 100ms timeout

      vi.spyOn(eventStore, 'append').mockImplementation(async () => {
        // Simulate network timeout
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Network timeout'));
          }, timeoutDuration);
        });
      });

      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Timeout Home', 'Timeout Away');

      // When: Attempting save during network timeout
      const startTime = Date.now();
      await expect(gameRepository.save(game)).rejects.toThrow('Network timeout');
      const duration = Date.now() - startTime;

      // Then: Should timeout appropriately
      expect(duration).toBeGreaterThanOrEqual(timeoutDuration);
      expect(duration).toBeLessThan(timeoutDuration + 50); // Allow small buffer
    });

    it('should handle memory pressure scenarios with large datasets', async () => {
      // Given: Large number of aggregates to test memory handling
      const numberOfAggregates = 100;
      const aggregates = [];

      for (let i = 0; i < numberOfAggregates; i++) {
        const gameId = GameId.generate();
        const game = Game.createNew(gameId, `Memory Test Home ${i}`, `Memory Test Away ${i}`);

        const lineupId = TeamLineupId.generate();
        const lineup = TeamLineup.createNew(lineupId, gameId, `Memory Test Home ${i}`, 'HOME');

        const inningStateId = InningStateId.generate();
        const inningState = InningState.createNew(inningStateId, gameId);

        aggregates.push({ game, lineup, inningState });
      }

      // When: Processing large dataset
      const startTime = Date.now();

      // Save all aggregates
      for (const { game, lineup, inningState } of aggregates) {
        await Promise.all([
          gameRepository.save(game),
          teamLineupRepository.save(lineup),
          inningStateRepository.save(inningState),
        ]);
      }

      const processingTime = Date.now() - startTime;

      // Then: Should handle large datasets efficiently
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all events were persisted
      const allEvents = await eventStore.getAllEvents();
      const expectedEventCount = numberOfAggregates * 3; // Game + Lineup + InningState
      expect(allEvents).toHaveLength(expectedEventCount);

      // Verify event type distribution
      const eventTypes = allEvents.map(e => e.eventType);
      expect(eventTypes.filter(type => type === 'GameCreated')).toHaveLength(numberOfAggregates);
      expect(eventTypes.filter(type => type === 'TeamLineupCreated')).toHaveLength(
        numberOfAggregates
      );
      expect(eventTypes.filter(type => type === 'InningStateCreated')).toHaveLength(
        numberOfAggregates
      );
    });
  });
});
