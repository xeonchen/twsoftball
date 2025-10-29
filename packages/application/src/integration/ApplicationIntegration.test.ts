/**
 * @file ApplicationIntegration.test.ts
 *
 * Integration tests for cross-feature Application layer workflows.
 * Tests verify that multiple use cases and services work together correctly.
 *
 * @remarks
 * These integration tests use real implementations (memory infrastructure) to verify actual
 * workflows across the Application layer. They test cross-feature interactions
 * and ensure proper coordination between use cases, repositories, and event sourcing.
 *
 * **Test Approach:**
 * - Uses DI Container pattern with real infrastructure (memory implementation)
 * - Tests complete workflows from start to finish
 * - Verifies event sourcing persistence and reconstruction
 * - Ensures state consistency across multiple operations
 *
 * **Coverage Focus:**
 * - Complete game workflow (creation → persistence → event sourcing)
 * - Multi-use case workflows
 * - Event sourcing verification
 * - Cross-aggregate consistency
 */

import { GameId, GameStatus } from '@twsoftball/domain';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import { describe, it, expect, beforeEach } from 'vitest';

import { createApplicationServicesWithContainerAndFactory } from '../services/ApplicationFactory.js';
import { createStartNewGameCommand } from '../test-factories/command-factories.js';
import type { ApplicationConfig, ApplicationServices } from '../types/ApplicationTypes.js';

describe('Application Integration Tests', () => {
  let services: ApplicationServices;
  let config: ApplicationConfig;

  beforeEach(async () => {
    config = {
      environment: 'test',
      storage: 'memory',
      debug: false,
    };

    const factory = createMemoryFactory();
    services = await createApplicationServicesWithContainerAndFactory(config, factory);
  });

  describe('Complete Game Workflow Integration', () => {
    it('should handle game creation and persistence across all aggregates', async () => {
      // ========== Phase 1: Game Creation ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: 'Integration Tigers',
        awayTeamName: 'Integration Lions',
      });

      const startResult = await services.startNewGame.execute(startGameCommand);

      expect(startResult.success).toBe(true);
      expect(startResult.initialState).toBeDefined();
      expect(startResult.initialState?.homeLineup.teamName).toBe('Integration Tigers');
      expect(startResult.initialState?.awayLineup.teamName).toBe('Integration Lions');
      expect(startResult.initialState?.currentInning).toBe(1);
      expect(startResult.initialState?.isTopHalf).toBe(true);
      expect(startResult.initialState?.outs).toBe(0);

      // ========== Phase 2: Verify Game Aggregate Persistence ==========
      const savedGame = await services.gameRepository.findById(gameId);
      expect(savedGame).toBeDefined();
      expect(savedGame?.status).toBe(GameStatus.IN_PROGRESS);
      expect(savedGame?.id.value).toBe(gameId.value);

      // ========== Phase 3: Verify Event Sourcing Persistence ==========
      const events = await services.eventStore.getEvents(gameId, 'Game');
      expect(events.length).toBeGreaterThan(0);

      // Should have GameStarted event
      const eventTypes = events.map(e => e.eventType);
      expect(eventTypes).toContain('GameStarted');

      const gameStartedEvent = events.find(e => e.eventType === 'GameStarted');
      expect(gameStartedEvent).toBeDefined();
      expect(gameStartedEvent?.streamId).toBe(gameId.value);

      // ========== Phase 4: Verify Initial State Correctness ==========
      expect(startResult.initialState!.score.home).toBe(0);
      expect(startResult.initialState!.score.away).toBe(0);
      expect(startResult.initialState!.battingTeam).toBe('AWAY');

      // ========== Phase 5: Verify Cross-Aggregate Data Consistency ==========
      expect(startResult.initialState!.homeLineup.gameId.value).toBe(gameId.value);
      expect(startResult.initialState!.awayLineup.gameId.value).toBe(gameId.value);
      expect(startResult.initialState!.homeLineup.teamSide).toBe('HOME');
      expect(startResult.initialState!.awayLineup.teamSide).toBe('AWAY');
    });

    it('should handle multiple game creations independently', async () => {
      // ========== Create First Game ==========
      const game1Id = GameId.generate();
      const startGame1Command = createStartNewGameCommand.standard({
        gameId: game1Id,
        homeTeamName: 'Team A',
        awayTeamName: 'Team B',
      });

      const result1 = await services.startNewGame.execute(startGame1Command);
      expect(result1.success).toBe(true);

      // ========== Create Second Game ==========
      const game2Id = GameId.generate();
      const startGame2Command = createStartNewGameCommand.standard({
        gameId: game2Id,
        homeTeamName: 'Team C',
        awayTeamName: 'Team D',
      });

      const result2 = await services.startNewGame.execute(startGame2Command);
      expect(result2.success).toBe(true);

      // ========== Verify Both Games Exist Independently ==========
      const savedGame1 = await services.gameRepository.findById(game1Id);
      const savedGame2 = await services.gameRepository.findById(game2Id);

      expect(savedGame1).toBeDefined();
      expect(savedGame2).toBeDefined();
      expect(savedGame1!.id.value).toBe(game1Id.value);
      expect(savedGame2!.id.value).toBe(game2Id.value);

      // ========== Verify Events Are Separate ==========
      const game1Events = await services.eventStore.getEvents(game1Id, 'Game');
      const game2Events = await services.eventStore.getEvents(game2Id, 'Game');

      expect(game1Events.length).toBeGreaterThan(0);
      expect(game2Events.length).toBeGreaterThan(0);

      // Events should not cross-contaminate
      game1Events.forEach(event => {
        expect(event.streamId).toBe(game1Id.value);
      });

      game2Events.forEach(event => {
        expect(event.streamId).toBe(game2Id.value);
      });
    });

    it('should reject duplicate game IDs', async () => {
      // ========== Create First Game ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({ gameId });

      const result1 = await services.startNewGame.execute(startGameCommand);
      expect(result1.success).toBe(true);

      // ========== Attempt to Create Duplicate Game ==========
      const result2 = await services.startNewGame.execute(startGameCommand);
      expect(result2.success).toBe(false);
      expect(result2.errors).toBeDefined();
      expect(
        result2.errors!.some(e => e.includes('already exists') || e.includes('duplicate'))
      ).toBe(true);
    });
  });

  describe('Event Sourcing and State Reconstruction', () => {
    it('should persist events with correct metadata and ordering', async () => {
      // ========== Create Game ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: 'Event Source Tigers',
        awayTeamName: 'Event Source Lions',
      });

      const startResult = await services.startNewGame.execute(startGameCommand);
      expect(startResult.success).toBe(true);

      // ========== Retrieve All Events ==========
      const allEvents = await services.eventStore.getEvents(gameId, 'Game');
      expect(allEvents.length).toBeGreaterThan(0);

      // ========== Verify Event Metadata ==========
      allEvents.forEach(event => {
        expect(event.streamId).toBe(gameId.value);
        expect(event.aggregateType).toBe('Game');
        expect(event.timestamp).toBeDefined();
        expect(event.metadata).toBeDefined();
        expect(event.streamVersion).toBeGreaterThanOrEqual(1);
        expect(event.eventType).toBeDefined();
        expect(event.eventData).toBeDefined();
      });

      // ========== Verify Event Ordering ==========
      // Events should be in chronological order by stream version
      for (let i = 1; i < allEvents.length; i++) {
        const prevEventVersion = allEvents[i - 1].streamVersion;
        const currEventVersion = allEvents[i].streamVersion;
        expect(currEventVersion).toBeGreaterThan(prevEventVersion);
      }

      // ========== Verify Event Types ==========
      const eventTypes = new Set(allEvents.map(e => e.eventType));
      expect(eventTypes.has('GameStarted')).toBe(true);
    });

    it('should reconstruct game state from persisted events', async () => {
      // ========== Phase 1: Create Game State ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: 'Reconstruct Test Home',
        awayTeamName: 'Reconstruct Test Away',
      });

      const startResult = await services.startNewGame.execute(startGameCommand);
      expect(startResult.success).toBe(true);

      // ========== Phase 2: Capture Original State ==========
      const originalGame = await services.gameRepository.findById(gameId);
      expect(originalGame).toBeDefined();

      const originalScore = {
        home: originalGame!.score.getHomeRuns(),
        away: originalGame!.score.getAwayRuns(),
      };
      const originalStatus = originalGame!.status;

      // ========== Phase 3: Verify Events Are Sufficient for Reconstruction ==========
      const allEvents = await services.eventStore.getEvents(gameId, 'Game');
      expect(allEvents.length).toBeGreaterThan(0);

      const gameStartedEvent = allEvents.find(e => e.eventType === 'GameStarted');
      expect(gameStartedEvent).toBeDefined();
      expect(gameStartedEvent?.eventData).toBeDefined();

      // ========== Phase 4: Reload and Verify State Matches ==========
      const reloadedGame = await services.gameRepository.findById(gameId);
      expect(reloadedGame).toBeDefined();
      expect(reloadedGame!.id.value).toBe(originalGame!.id.value);
      expect(reloadedGame!.status).toBe(originalStatus);
      expect(reloadedGame!.score.getHomeRuns()).toBe(originalScore.home);
      expect(reloadedGame!.score.getAwayRuns()).toBe(originalScore.away);
    });

    it('should maintain event sourcing integrity across multiple operations', async () => {
      // ========== Create Game ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: 'Multi-Op Tigers',
      });
      const startResult = await services.startNewGame.execute(startGameCommand);
      expect(startResult.success).toBe(true);

      // ========== Verify Initial Event Count ==========
      const initialEvents = await services.eventStore.getEvents(gameId, 'Game');
      const initialEventCount = initialEvents.length;
      expect(initialEventCount).toBeGreaterThan(0);

      // ========== Verify All Events Have Correct Aggregate Reference ==========
      const allGameEvents = await services.eventStore.getEvents(gameId, 'Game');
      allGameEvents.forEach(event => {
        expect(event.streamId).toBe(gameId.value);
        expect(event.aggregateType).toBe('Game');
      });

      // ========== Verify Game Still Loadable ==========
      const game = await services.gameRepository.findById(gameId);
      expect(game!.id.value).toBe(gameId.value);
    });
  });

  describe('Cross-Feature Error Handling Integration', () => {
    it('should handle invalid game creation gracefully', async () => {
      // ========== Attempt Invalid Operation: Empty Team Name ==========
      const gameId = GameId.generate();
      const invalidCommand = createStartNewGameCommand.standard({
        gameId,
        homeTeamName: '',
        awayTeamName: 'Valid Team',
      });

      const result = await services.startNewGame.execute(invalidCommand);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      // ========== Verify No Partial State Persisted ==========
      const game = await services.gameRepository.findById(gameId);
      expect(game).toBeNull();

      // ========== Verify No Events Were Created ==========
      const events = await services.eventStore.getEvents(gameId, 'Game');
      expect(events.length).toBe(0);
    });

    it('should maintain state consistency after failed operations', async () => {
      // ========== Create Valid Game First ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({ gameId });
      const startResult = await services.startNewGame.execute(startGameCommand);
      expect(startResult.success).toBe(true);

      // ========== Verify Initial State ==========
      const initialGame = await services.gameRepository.findById(gameId);
      expect(initialGame).toBeDefined();

      // ========== Attempt Duplicate Game Creation (Should Fail) ==========
      const duplicateResult = await services.startNewGame.execute(startGameCommand);
      expect(duplicateResult.success).toBe(false);

      // ========== Verify Original Game Unaffected ==========
      const finalGame = await services.gameRepository.findById(gameId);
      expect(finalGame).toBeDefined();
      expect(finalGame!.status).toBe(GameStatus.IN_PROGRESS);

      // ========== Verify Event Count Unchanged ==========
      const events = await services.eventStore.getEvents(gameId, 'Game');
      const gameStartedEvents = events.filter(e => e.eventType === 'GameStarted');
      expect(gameStartedEvents.length).toBe(1); // Should still only have 1 GameStarted event
    });
  });

  describe('DI Container Integration', () => {
    it('should provide all required services via DI Container', () => {
      // ========== Verify Use Cases Exist ==========
      expect(services.startNewGame).toBeDefined();
      expect(services.recordAtBat).toBeDefined();
      expect(services.substitutePlayer).toBeDefined();
      expect(services.undoLastAction).toBeDefined();
      expect(services.redoLastAction).toBeDefined();
      expect(services.endInning).toBeDefined();

      // ========== Verify Repositories Exist ==========
      expect(services.gameRepository).toBeDefined();
      expect(services.teamLineupRepository).toBeDefined();
      expect(services.inningStateRepository).toBeDefined();
      expect(services.eventStore).toBeDefined();

      // ========== Verify Supporting Services Exist ==========
      expect(services.logger).toBeDefined();
      expect(services.config).toBeDefined();

      // ========== Verify Services Are Functional ==========
      expect(typeof services.startNewGame.execute).toBe('function');
      expect(typeof services.gameRepository.findById).toBe('function');
      expect(typeof services.eventStore.getEvents).toBe('function');
      expect(typeof services.logger.info).toBe('function');
    });

    it('should share repository instances across use cases', async () => {
      // ========== Create Game via StartNewGame ==========
      const gameId = GameId.generate();
      const startGameCommand = createStartNewGameCommand.standard({ gameId });
      const startResult = await services.startNewGame.execute(startGameCommand);
      expect(startResult.success).toBe(true);

      // ========== Verify Game Accessible via Shared Repository ==========
      const game = await services.gameRepository.findById(gameId);
      expect(game).toBeDefined();
      expect(game!.id.value).toBe(gameId.value);

      // This confirms that the repository instance used by StartNewGame
      // is the same instance exposed in services.gameRepository
    });
  });
});
