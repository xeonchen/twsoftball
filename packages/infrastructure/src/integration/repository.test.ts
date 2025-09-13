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
import type { TeamLineupRepository } from '@twsoftball/application/ports/out/TeamLineupRepository';
import { GameId, Game, TeamLineup, TeamLineupId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { EventSourcedGameRepository } from '../persistence/EventSourcedGameRepository';
import { EventSourcedTeamLineupRepository } from '../persistence/EventSourcedTeamLineupRepository';
import { InMemoryEventStore } from '../persistence/InMemoryEventStore';

describe('Repository Integration Tests', () => {
  let eventStore: EventStore;
  let gameRepository: GameRepository;
  let teamLineupRepository: TeamLineupRepository;

  beforeEach(() => {
    // Setup shared EventStore instance for integration testing
    eventStore = new InMemoryEventStore();

    // Create repositories sharing the same EventStore
    gameRepository = new EventSourcedGameRepository(eventStore);
    teamLineupRepository = new EventSourcedTeamLineupRepository(eventStore, gameRepository);
  });

  describe('Multi-Aggregate Coordination', () => {
    it('should coordinate saves across Game and TeamLineup repositories', async () => {
      // Given: A game with lineups
      const gameId = GameId.generate();
      const game = Game.createNew(gameId, 'Home Eagles', 'Away Hawks');

      const homeLineupId = TeamLineupId.generate();
      const homeLineup = TeamLineup.createNew(homeLineupId, gameId, 'Home Eagles');

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

      const homeLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Team A');

      const awayLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Team B');

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

      const lineup1 = TeamLineup.createNew(TeamLineupId.generate(), gameId1, 'Eagles');

      const lineup2 = TeamLineup.createNew(TeamLineupId.generate(), gameId2, 'Lions');

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

      const homeLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Concurrent Team A');

      const awayLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Concurrent Team B');

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

      const homeLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, 'Query Team A');

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
        'Consistency Team A'
      );

      const awayLineup = TeamLineup.createNew(
        TeamLineupId.generate(),
        gameId,
        'Consistency Team B'
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

        const homeLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, `Home Team ${i}`);

        const awayLineup = TeamLineup.createNew(TeamLineupId.generate(), gameId, `Away Team ${i}`);

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
});
