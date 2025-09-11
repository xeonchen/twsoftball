import { GameStatus } from '../constants/GameStatus';
import { DomainEvent } from '../events/DomainEvent';
import { GameCreated } from '../events/GameCreated';
import { GameStarted } from '../events/GameStarted';
import { InningAdvanced } from '../events/InningAdvanced';
import { ScoreUpdated } from '../events/ScoreUpdated';
import { GameId } from '../value-objects/GameId';

import { Game } from './Game';

describe('Game Aggregate Root - Event Management and Validation', () => {
  let gameId: GameId;
  let game: Game;

  beforeEach(() => {
    gameId = GameId.generate();
    game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
  });

  describe('getUncommittedEvents()', () => {
    it('should return copy of uncommittedEvents array', () => {
      const uncommittedEvents = game.getUncommittedEvents();

      // Should return array with initial GameCreated event
      expect(uncommittedEvents).toHaveLength(1);
      expect(uncommittedEvents[0]?.type).toBe('GameCreated');

      // Should return a copy, not the original array
      uncommittedEvents.push({} as DomainEvent);
      expect(game.getUncommittedEvents()).toHaveLength(1); // Original should be unchanged
    });

    it('should start with empty uncommitted events after markEventsAsCommitted()', () => {
      game.markEventsAsCommitted();

      expect(game.getUncommittedEvents()).toHaveLength(0);
    });

    it('should add events to uncommitted events when domain operations occur', () => {
      game.markEventsAsCommitted(); // Clear creation event

      game.startGame();
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('GameStarted');

      game.addHomeRuns(2);
      expect(game.getUncommittedEvents()).toHaveLength(2);
      expect(game.getUncommittedEvents()[1]?.type).toBe('ScoreUpdated');

      game.advanceInning();
      expect(game.getUncommittedEvents()).toHaveLength(3);
      expect(game.getUncommittedEvents()[2]?.type).toBe('InningAdvanced');
    });

    it('should maintain uncommitted events immutability (return copy, not reference)', () => {
      const uncommittedEvents1 = game.getUncommittedEvents();
      const uncommittedEvents2 = game.getUncommittedEvents();

      // Should be different array instances
      expect(uncommittedEvents1).not.toBe(uncommittedEvents2);

      // But should have same content
      expect(uncommittedEvents1).toEqual(uncommittedEvents2);

      // Modifying one should not affect the other
      uncommittedEvents1[0] = {} as DomainEvent;
      expect(uncommittedEvents2[0]?.type).toBe('GameCreated');
    });
  });

  describe('markEventsAsCommitted()', () => {
    it('should clear uncommittedEvents array', () => {
      game.startGame();
      game.addHomeRuns(1);
      expect(game.getUncommittedEvents()).toHaveLength(3); // GameCreated + GameStarted + ScoreUpdated

      game.markEventsAsCommitted();

      expect(game.getUncommittedEvents()).toHaveLength(0);
    });

    it('should not affect game state when clearing events', () => {
      game.startGame();
      game.addHomeRuns(3);
      game.advanceInning();

      const originalStatus = game.status;
      const originalScore = game.score;
      const originalInning = game.currentInning;
      const originalIsTopHalf = game.isTopHalf;

      game.markEventsAsCommitted();

      // State should remain unchanged
      expect(game.status).toBe(originalStatus);
      expect(game.score).toEqual(originalScore);
      expect(game.currentInning).toBe(originalInning);
      expect(game.isTopHalf).toBe(originalIsTopHalf);
    });

    it('should allow new events to be added after clearing', () => {
      game.startGame();
      game.markEventsAsCommitted();
      expect(game.getUncommittedEvents()).toHaveLength(0);

      game.addAwayRuns(2);
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('ScoreUpdated');
    });
  });

  describe('getVersion()', () => {
    it('should return current event stream version', () => {
      // Game should have version 1 after creation (GameCreated event)
      expect(game.getVersion()).toBe(1);
    });

    it('should start with version 1 after creation (GameCreated event)', () => {
      // Game starts with version 1 after GameCreated event
      expect(game.getVersion()).toBe(1);
    });

    it('should increment version when events are added', () => {
      expect(game.getVersion()).toBe(1); // Initial: GameCreated

      game.startGame(); // Version should be 2
      expect(game.getVersion()).toBe(2);

      game.addHomeRuns(1); // Version should be 3
      expect(game.getVersion()).toBe(3);

      game.advanceInning(); // Version should be 4
      expect(game.getVersion()).toBe(4);
    });

    it('should maintain version after events are marked as committed', () => {
      game.startGame();
      game.addHomeRuns(2);
      const versionBeforeCommit = game.getVersion(); // Should be 3

      game.markEventsAsCommitted();
      expect(game.getVersion()).toBe(versionBeforeCommit); // Version should persist
    });

    it('should maintain version after reconstruction from events', () => {
      const events = [
        new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
        new GameStarted(gameId),
        new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
        new InningAdvanced(gameId, 1, false),
      ];

      const reconstructedGame = Game.fromEvents(events);

      expect(reconstructedGame.getVersion()).toBe(4); // Should match event count
    });
  });

  describe('Version tracking across operations', () => {
    it('should track version correctly across multiple operations', () => {
      // Test progression through multiple operations
      expect(game.getVersion()).toBe(1); // Initial: GameCreated
      game.startGame();
      expect(game.getVersion()).toBe(2); // + GameStarted
      game.addHomeRuns(3);
      expect(game.getVersion()).toBe(3); // + ScoreUpdated
      game.advanceInning();
      expect(game.getVersion()).toBe(4); // + InningAdvanced
      game.addAwayRuns(1);
      expect(game.getVersion()).toBe(5); // + ScoreUpdated
      game.advanceInning();
      expect(game.getVersion()).toBe(6); // + InningAdvanced
      game.completeGame('REGULATION');
      expect(game.getVersion()).toBe(7); // + GameCompleted
    });

    it('should handle version correctly after events are marked as committed', () => {
      game.startGame();
      game.addHomeRuns(2);
      game.advanceInning();

      const versionBeforeCommit = game.getVersion(); // Should be 4
      game.markEventsAsCommitted();
      expect(game.getVersion()).toBe(versionBeforeCommit); // Version should remain
      expect(game.getUncommittedEvents()).toHaveLength(0); // But events should be cleared

      // Add new events and verify version continues incrementing
      game.addAwayRuns(1);
      expect(game.getVersion()).toBe(versionBeforeCommit + 1); // Should increment from previous version
    });

    it('should start with version 1 for new games after GameCreated event', () => {
      // After Game.createNew(), version should be 1 (GameCreated event)
      expect(game.getVersion()).toBe(1);
    });
  });

  describe('Event management integration with repository operations', () => {
    it('should support typical repository save pattern', () => {
      // Simulate repository save pattern
      game.startGame();
      game.addHomeRuns(3);

      // Repository would get uncommitted events
      const eventsToSave = game.getUncommittedEvents();
      expect(eventsToSave).toHaveLength(3); // GameCreated + GameStarted + ScoreUpdated

      // After successful save, repository would mark as committed
      game.markEventsAsCommitted();
      expect(game.getUncommittedEvents()).toHaveLength(0);
    });

    it('should support event sourcing reconstruction pattern', () => {
      // Simulate what repository would do to reconstruct aggregate
      const events = [
        new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
        new GameStarted(gameId),
        new ScoreUpdated(gameId, 'HOME', 5, { home: 5, away: 0 }),
        new InningAdvanced(gameId, 1, false),
        new ScoreUpdated(gameId, 'AWAY', 2, { home: 5, away: 2 }),
      ];

      const reconstructedGame = Game.fromEvents(events);

      // Reconstructed game should have correct state
      expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
      expect(reconstructedGame.score.getHomeRuns()).toBe(5);
      expect(reconstructedGame.score.getAwayRuns()).toBe(2);
      expect(reconstructedGame.currentInning).toBe(1);
      expect(reconstructedGame.isTopHalf).toBe(false);

      // Should have no uncommitted events (all events are from committed stream)
      expect(reconstructedGame.getUncommittedEvents()).toHaveLength(0);
    });

    it('should handle mixed committed and new events correctly', () => {
      // Start with reconstructed game (all events committed)
      const committedEvents = [
        new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
        new GameStarted(gameId),
        new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
      ];

      const reconstructedGame = Game.fromEvents(committedEvents);
      expect(reconstructedGame.getUncommittedEvents()).toHaveLength(0);

      // Add new operations (should create new uncommitted events)
      reconstructedGame.advanceInning();
      reconstructedGame.addAwayRuns(1);

      const newUncommittedEvents = reconstructedGame.getUncommittedEvents();
      expect(newUncommittedEvents).toHaveLength(2);
      expect(newUncommittedEvents[0]?.type).toBe('InningAdvanced');
      expect(newUncommittedEvents[1]?.type).toBe('ScoreUpdated');
    });

    it('should maintain data integrity between uncommitted events and current state', () => {
      game.startGame();
      game.addHomeRuns(4);
      game.advanceInning();
      game.addAwayRuns(2);

      const uncommittedEvents = game.getUncommittedEvents();

      // Verify events match current state
      const createdEvent = uncommittedEvents.find(e => e.type === 'GameCreated') as GameCreated;
      expect(createdEvent?.homeTeamName).toBe(game.homeTeamName);
      expect(createdEvent?.awayTeamName).toBe(game.awayTeamName);

      const scoreEvents = uncommittedEvents.filter(
        e => e.type === 'ScoreUpdated'
      ) as ScoreUpdated[];
      const latestScoreEvent = scoreEvents[scoreEvents.length - 1];
      if (latestScoreEvent) {
        expect(latestScoreEvent.newScore.home).toBe(game.score.getHomeRuns());
        expect(latestScoreEvent.newScore.away).toBe(game.score.getAwayRuns());
      }

      const inningEvent = uncommittedEvents.find(
        e => e.type === 'InningAdvanced'
      ) as InningAdvanced;
      if (inningEvent) {
        expect(inningEvent.newInning).toBe(game.currentInning);
        expect(inningEvent.isTopHalf).toBe(game.isTopHalf);
      }
    });
  });
});
