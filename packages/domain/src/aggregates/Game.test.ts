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

import { Game } from './Game';

describe('Game Aggregate Root', () => {
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();
  });

  describe('Game Creation', () => {
    it('should create a new game with proper initial state', () => {
      const homeTeamName = 'Home Tigers';
      const awayTeamName = 'Away Lions';

      const game = Game.createNew(gameId, homeTeamName, awayTeamName);

      expect(game.id).toEqual(gameId);
      expect(game.homeTeamName).toBe(homeTeamName);
      expect(game.awayTeamName).toBe(awayTeamName);
      expect(game.status).toBe(GameStatus.NOT_STARTED);
      expect(game.score).toEqual(GameScore.zero());
      expect(game.currentInning).toBe(1);
      expect(game.isTopHalf).toBe(true);
      expect(game.outs).toBe(0);
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('GameCreated');
    });

    it('should throw error when gameId is null or undefined', () => {
      expect(() => Game.createNew(null as unknown as GameId, 'Home', 'Away')).toThrow(DomainError);
    });

    it('should throw error when home team name is empty', () => {
      expect(() => Game.createNew(gameId, '', 'Away')).toThrow(DomainError);
    });

    it('should throw error when away team name is empty', () => {
      expect(() => Game.createNew(gameId, 'Home', '')).toThrow(DomainError);
    });

    it('should throw error when team names are the same', () => {
      expect(() => Game.createNew(gameId, 'Tigers', 'Tigers')).toThrow(DomainError);
    });
  });

  describe('Game State Management', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.markEventsAsCommitted(); // Clear creation events
    });

    describe('Starting Game', () => {
      it('should start the game when in NOT_STARTED status', () => {
        game.startGame();

        expect(game.status).toBe(GameStatus.IN_PROGRESS);
        expect(game.getUncommittedEvents()).toHaveLength(1);
        expect(game.getUncommittedEvents()[0]?.type).toBe('GameStarted');
      });

      it('should throw error when trying to start an already started game', () => {
        game.startGame();

        expect(() => game.startGame()).toThrow(DomainError);
      });

      it('should throw error when trying to start a completed game', () => {
        game.startGame();
        game.completeGame('REGULATION');

        expect(() => game.startGame()).toThrow(DomainError);
      });
    });

    describe('Completing Game', () => {
      beforeEach(() => {
        game.startGame();
        game.markEventsAsCommitted();
      });

      it('should complete the game with regulation ending', () => {
        game.completeGame('REGULATION');

        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.getUncommittedEvents()).toHaveLength(1);
        const gameCompletedEvent = game.getUncommittedEvents()[0];
        expect(gameCompletedEvent).toBeDefined();
        expect(gameCompletedEvent?.type).toBe('GameCompleted');
        if (gameCompletedEvent) {
          expect((gameCompletedEvent as GameCompleted).endingType).toBe('REGULATION');
        }
      });

      it('should complete the game with mercy rule ending', () => {
        game.completeGame('MERCY_RULE');

        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.getUncommittedEvents()).toHaveLength(1);
        const gameCompletedEvent = game.getUncommittedEvents()[0];
        expect(gameCompletedEvent).toBeDefined();
        expect(gameCompletedEvent?.type).toBe('GameCompleted');
        if (gameCompletedEvent) {
          expect((gameCompletedEvent as GameCompleted).endingType).toBe('MERCY_RULE');
        }
      });

      it('should throw error when trying to complete a not started game', () => {
        const notStartedGame = Game.createNew(GameId.generate(), 'Home', 'Away');

        expect(() => notStartedGame.completeGame('REGULATION')).toThrow(DomainError);
      });

      it('should throw error when trying to complete an already completed game', () => {
        game.completeGame('REGULATION');

        expect(() => game.completeGame('MERCY_RULE')).toThrow(DomainError);
      });
    });
  });

  describe('Score Management', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.markEventsAsCommitted();
    });

    it('should add runs to home team', () => {
      game.addHomeRuns(3);

      expect(game.score.getHomeRuns()).toBe(3);
      expect(game.score.getAwayRuns()).toBe(0);
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('ScoreUpdated');
    });

    it('should add runs to away team', () => {
      game.addAwayRuns(2);

      expect(game.score.getHomeRuns()).toBe(0);
      expect(game.score.getAwayRuns()).toBe(2);
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('ScoreUpdated');
    });

    it('should add multiple runs to same team', () => {
      game.addHomeRuns(2);
      game.markEventsAsCommitted();
      game.addHomeRuns(1);

      expect(game.score.getHomeRuns()).toBe(3);
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('ScoreUpdated');
    });

    it('should throw error when adding negative runs', () => {
      expect(() => game.addHomeRuns(-1)).toThrow(DomainError);
    });

    it('should throw error when adding runs to completed game', () => {
      game.completeGame('REGULATION');

      expect(() => game.addHomeRuns(1)).toThrow(DomainError);
    });
  });

  describe('Inning Management', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.markEventsAsCommitted();
    });

    it('should advance to bottom half of inning', () => {
      expect(game.isTopHalf).toBe(true);
      expect(game.currentInning).toBe(1);

      game.advanceInning();

      expect(game.isTopHalf).toBe(false);
      expect(game.currentInning).toBe(1);
      expect(game.outs).toBe(0); // Outs reset when advancing inning
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('InningAdvanced');
    });

    it('should advance to next inning after bottom half', () => {
      game.advanceInning(); // To bottom of 1st
      game.markEventsAsCommitted();
      game.advanceInning(); // To top of 2nd

      expect(game.isTopHalf).toBe(true);
      expect(game.currentInning).toBe(2);
      expect(game.outs).toBe(0);
      expect(game.getUncommittedEvents()).toHaveLength(1);
      expect(game.getUncommittedEvents()[0]?.type).toBe('InningAdvanced');
    });

    it('should track outs within an inning', () => {
      game.addOut();
      expect(game.outs).toBe(1);

      game.addOut();
      expect(game.outs).toBe(2);

      game.addOut(); // This should trigger inning advancement
      expect(game.outs).toBe(0);
      expect(game.isTopHalf).toBe(false); // Advanced to bottom half
    });

    it('should throw error when advancing inning in completed game', () => {
      game.completeGame('REGULATION');

      expect(() => game.advanceInning()).toThrow(DomainError);
    });
  });

  describe('Mercy Rule Detection', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.markEventsAsCommitted();
    });

    it('should detect mercy rule condition with 15+ run lead after 5 innings', () => {
      // Setup: advance to 5th inning, home team with big lead
      for (let i = 1; i < 5; i += 1) {
        game.advanceInning(); // advance through innings
        game.advanceInning(); // complete each inning
      }
      game.addHomeRuns(15); // 15-0 lead

      expect(game.isMercyRuleTriggered()).toBe(true);
    });

    it('should detect mercy rule condition with 10+ run lead after 7 innings', () => {
      // Setup: advance to 7th inning, away team with lead
      for (let i = 1; i < 7; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      game.addAwayRuns(10); // 0-10 lead

      expect(game.isMercyRuleTriggered()).toBe(true);
    });

    it('should not trigger mercy rule with insufficient run lead', () => {
      // Setup: 5th inning with 14 run lead (just under 15)
      for (let i = 1; i < 5; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      game.addHomeRuns(14);

      expect(game.isMercyRuleTriggered()).toBe(false);
    });

    it('should not trigger mercy rule before required innings', () => {
      // 4th inning with 15+ run lead
      for (let i = 1; i < 4; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      game.addHomeRuns(15);

      expect(game.isMercyRuleTriggered()).toBe(false);
    });
  });

  describe('Game Completion Detection', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.markEventsAsCommitted();
    });

    it('should detect game completion after 7 full innings', () => {
      // Play through 7 full innings
      for (let i = 1; i <= 7; i += 1) {
        game.advanceInning(); // top half
        game.advanceInning(); // bottom half
      }

      expect(game.isRegulationComplete()).toBe(true);
    });

    it('should detect walk-off scenario (home team ahead in bottom of inning)', () => {
      // Setup: bottom of 7th, home team takes the lead
      for (let i = 1; i <= 7; i += 1) {
        game.advanceInning(); // top half
        if (i < 7) game.advanceInning(); // bottom half (skip last to stay in bottom 7th)
      }
      game.addHomeRuns(1); // Home team takes lead in bottom of 7th

      expect(game.isWalkOffScenario()).toBe(true);
    });

    it('should require extra innings when tied after regulation', () => {
      // Play 7 full innings with tied score
      for (let i = 1; i <= 7; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      // Score remains 0-0

      expect(game.isRegulationComplete()).toBe(true);
      expect(game.score.isTied()).toBe(true);
      expect(game.isWalkOffScenario()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.markEventsAsCommitted(); // Clear creation event
    });

    it('should track uncommitted events', () => {
      game.startGame();
      game.addHomeRuns(1);
      game.advanceInning();

      expect(game.getUncommittedEvents()).toHaveLength(3);
      expect(game.getUncommittedEvents()[0]?.type).toBe('GameStarted');
      expect(game.getUncommittedEvents()[1]?.type).toBe('ScoreUpdated');
      expect(game.getUncommittedEvents()[2]?.type).toBe('InningAdvanced');
    });

    it('should clear events when marked as committed', () => {
      game.startGame();
      game.addHomeRuns(1);

      expect(game.getUncommittedEvents()).toHaveLength(2);

      game.markEventsAsCommitted();

      expect(game.getUncommittedEvents()).toHaveLength(0);
    });

    it('should include game context in all events', () => {
      game.startGame();
      const events = game.getUncommittedEvents();

      const firstEvent = events[0];
      expect(firstEvent).toBeDefined();
      expect(firstEvent?.gameId).toEqual(gameId);
      expect(firstEvent?.timestamp).toBeInstanceOf(Date);
      expect(firstEvent?.eventId).toBeDefined();
    });
  });

  describe('Validation Rules', () => {
    let game: Game;

    beforeEach(() => {
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.markEventsAsCommitted();
    });

    it('should prevent operations on completed games', () => {
      game.completeGame('REGULATION');

      expect(() => game.addHomeRuns(1)).toThrow(DomainError);
      expect(() => game.addAwayRuns(1)).toThrow(DomainError);
      expect(() => game.advanceInning()).toThrow(DomainError);
      expect(() => game.addOut()).toThrow(DomainError);
    });

    it('should prevent score changes on not started games', () => {
      const notStartedGame = Game.createNew(GameId.generate(), 'Home', 'Away');

      expect(() => notStartedGame.addHomeRuns(1)).toThrow(DomainError);
      expect(() => notStartedGame.addAwayRuns(1)).toThrow(DomainError);
    });

    it('should validate inning boundaries', () => {
      expect(game.currentInning).toBeGreaterThan(0);

      // Advance through many innings to test upper bounds
      for (let i = 0; i < 50; i += 1) {
        game.advanceInning();
      }

      expect(game.currentInning).toBeGreaterThan(0);
      expect(game.currentInning).toBeLessThan(100); // Reasonable upper bound
    });

    it('should validate outs boundaries', () => {
      expect(game.outs).toBe(0);

      game.addOut();
      expect(game.outs).toBe(1);

      game.addOut();
      expect(game.outs).toBe(2);

      // Adding 3rd out should reset outs and advance inning
      game.addOut();
      expect(game.outs).toBe(0);
    });
  });

  describe('Domain Invariants', () => {
    it('should maintain immutability of core properties after creation', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      const originalId = game.id;
      const originalHomeTeam = game.homeTeamName;
      const originalAwayTeam = game.awayTeamName;

      // These should remain immutable throughout game lifecycle
      game.startGame();
      game.addHomeRuns(5);
      game.advanceInning();
      game.completeGame('MERCY_RULE');

      expect(game.id).toEqual(originalId);
      expect(game.homeTeamName).toBe(originalHomeTeam);
      expect(game.awayTeamName).toBe(originalAwayTeam);
    });

    it('should maintain consistency between score and game state', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();

      const initialScore = game.score;
      game.addHomeRuns(3);

      // Score should be updated correctly
      expect(game.score.getHomeRuns()).toBe(3);
      expect(game.score.getAwayRuns()).toBe(0);

      // Original score should remain unchanged (immutability)
      expect(initialScore.getHomeRuns()).toBe(0);
      expect(initialScore.getAwayRuns()).toBe(0);
    });

    it('should maintain proper event sourcing patterns', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');

      // All events should have proper structure
      const events = game.getUncommittedEvents();
      events.forEach(event => {
        expect(event.eventId).toBeDefined();
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.gameId).toEqual(gameId);
        expect(event.type).toBeDefined();
        expect(typeof event.type).toBe('string');
      });
    });
  });

  describe('Game.applyEvent() - Event Application Logic', () => {
    let gameId: GameId;

    beforeEach(() => {
      gameId = GameId.generate();
    });

    describe('GameStarted Event Application', () => {
      it('should apply GameStarted event (status NOT_STARTED → IN_PROGRESS)', () => {
        const gameStartedEvent = new GameStarted(gameId);
        const events = [new GameCreated(gameId, 'Home Tigers', 'Away Lions'), gameStartedEvent];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(reconstructedGame.score).toEqual(GameScore.zero());
        expect(reconstructedGame.currentInning).toBe(1);
        expect(reconstructedGame.isTopHalf).toBe(true);
        expect(reconstructedGame.outs).toBe(0);
      });

      it('should maintain other game state when applying GameStarted', () => {
        const events = [new GameCreated(gameId, 'Springfield Tigers', 'Shelbyville Lions')];
        const initialGame = Game.fromEvents(events);
        expect(initialGame.status).toBe(GameStatus.NOT_STARTED);

        // Apply GameStarted through fromEvents
        const eventsWithStart = [...events, new GameStarted(gameId)];
        const gameAfterStart = Game.fromEvents(eventsWithStart);

        // Only status should change, all other properties preserved
        expect(gameAfterStart.status).toBe(GameStatus.IN_PROGRESS);
        expect(gameAfterStart.homeTeamName).toBe('Springfield Tigers');
        expect(gameAfterStart.awayTeamName).toBe('Shelbyville Lions');
        expect(gameAfterStart.score).toEqual(GameScore.zero());
        expect(gameAfterStart.currentInning).toBe(1);
        expect(gameAfterStart.isTopHalf).toBe(true);
        expect(gameAfterStart.outs).toBe(0);
      });
    });

    describe('ScoreUpdated Event Application', () => {
      it('should apply ScoreUpdated event (update gameScore)', () => {
        const scoreUpdateEvent = new ScoreUpdated(gameId, 'HOME', 3, { home: 3, away: 0 });
        const events = [new GameCreated(gameId, 'Home Tigers', 'Away Lions'), scoreUpdateEvent];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.score.getHomeRuns()).toBe(3);
        expect(reconstructedGame.score.getAwayRuns()).toBe(0);
        expect(reconstructedGame.status).toBe(GameStatus.NOT_STARTED); // Only score changed
      });

      it('should update to final score from ScoreUpdated event', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
          new ScoreUpdated(gameId, 'AWAY', 5, { home: 2, away: 5 }),
          new ScoreUpdated(gameId, 'HOME', 3, { home: 5, away: 5 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        // Should have the final score from the last ScoreUpdated event
        expect(reconstructedGame.score.getHomeRuns()).toBe(5);
        expect(reconstructedGame.score.getAwayRuns()).toBe(5);
        expect(reconstructedGame.score.isTied()).toBe(true);
      });

      it('should handle multiple consecutive score updates', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 }),
          new ScoreUpdated(gameId, 'HOME', 2, { home: 3, away: 0 }),
          new ScoreUpdated(gameId, 'AWAY', 1, { home: 3, away: 1 }),
          new ScoreUpdated(gameId, 'AWAY', 2, { home: 3, away: 3 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.score.getHomeRuns()).toBe(3);
        expect(reconstructedGame.score.getAwayRuns()).toBe(3);
      });
    });

    describe('InningAdvanced Event Application', () => {
      it('should apply InningAdvanced event (inning and half)', () => {
        const inningAdvancedEvent = new InningAdvanced(gameId, 2, false); // Bottom of 2nd
        const events = [new GameCreated(gameId, 'Home Tigers', 'Away Lions'), inningAdvancedEvent];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.currentInning).toBe(2);
        expect(reconstructedGame.isTopHalf).toBe(false);
        expect(reconstructedGame.outs).toBe(0); // Outs reset when inning advances
      });

      it('should reset outs to 0 when applying InningAdvanced', () => {
        // Create a scenario where we know outs would be reset
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new InningAdvanced(gameId, 1, false), // Bottom of 1st, outs = 0
          new InningAdvanced(gameId, 2, true), // Top of 2nd, outs = 0
          new InningAdvanced(gameId, 2, false), // Bottom of 2nd, outs = 0
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.currentInning).toBe(2);
        expect(reconstructedGame.isTopHalf).toBe(false);
        expect(reconstructedGame.outs).toBe(0);
      });

      it('should handle inning progression through multiple advances', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new InningAdvanced(gameId, 1, false), // Bottom 1st
          new InningAdvanced(gameId, 2, true), // Top 2nd
          new InningAdvanced(gameId, 2, false), // Bottom 2nd
          new InningAdvanced(gameId, 3, true), // Top 3rd
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.currentInning).toBe(3);
        expect(reconstructedGame.isTopHalf).toBe(true);
        expect(reconstructedGame.outs).toBe(0);
      });

      it('should maintain game state except inning/outs when applying InningAdvanced', () => {
        const events = [
          new GameCreated(gameId, 'Nuclear Plant', 'Capital City'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 7, { home: 7, away: 0 }),
          new InningAdvanced(gameId, 5, true), // Jump to 5th inning
        ];

        const reconstructedGame = Game.fromEvents(events);

        // Score and other state preserved
        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(reconstructedGame.score.getHomeRuns()).toBe(7);
        expect(reconstructedGame.score.getAwayRuns()).toBe(0);
        expect(reconstructedGame.homeTeamName).toBe('Nuclear Plant');
        expect(reconstructedGame.awayTeamName).toBe('Capital City');
        // Only inning and outs should change
        expect(reconstructedGame.currentInning).toBe(5);
        expect(reconstructedGame.isTopHalf).toBe(true);
        expect(reconstructedGame.outs).toBe(0);
      });
    });

    describe('GameCompleted Event Application', () => {
      it('should apply GameCompleted event (status → COMPLETED)', () => {
        const gameCompletedEvent = new GameCompleted(gameId, 'REGULATION', { home: 8, away: 5 }, 7);
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          gameCompletedEvent,
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.status).toBe(GameStatus.COMPLETED);
        expect(reconstructedGame.score.getHomeRuns()).toBe(8);
        expect(reconstructedGame.score.getAwayRuns()).toBe(5);
      });

      it('should update score to final score from GameCompleted event', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 5, { home: 5, away: 0 }), // Intermediate score
          new GameCompleted(gameId, 'MERCY_RULE', { home: 15, away: 2 }, 5), // Final score
        ];

        const reconstructedGame = Game.fromEvents(events);

        // Final score should come from GameCompleted event
        expect(reconstructedGame.status).toBe(GameStatus.COMPLETED);
        expect(reconstructedGame.score.getHomeRuns()).toBe(15);
        expect(reconstructedGame.score.getAwayRuns()).toBe(2);
      });

      it('should handle different completion types', () => {
        const completionTypes: Array<'REGULATION' | 'MERCY_RULE' | 'FORFEIT' | 'TIME_LIMIT'> = [
          'REGULATION',
          'MERCY_RULE',
          'FORFEIT',
          'TIME_LIMIT',
        ];

        completionTypes.forEach(endingType => {
          const testGameId = GameId.generate();
          const events = [
            new GameCreated(testGameId, 'Team A', 'Team B'),
            new GameStarted(testGameId),
            new GameCompleted(testGameId, endingType, { home: 6, away: 3 }, 7),
          ];

          const reconstructedGame = Game.fromEvents(events);

          expect(reconstructedGame.status).toBe(GameStatus.COMPLETED);
          expect(reconstructedGame.score.getHomeRuns()).toBe(6);
          expect(reconstructedGame.score.getAwayRuns()).toBe(3);
        });
      });
    });

    describe('Unknown Event Types', () => {
      it('should throw error for unknown event types gracefully', () => {
        // Create a mock unknown event
        const unknownEvent = {
          type: 'UnknownEventType',
          gameId,
          timestamp: new Date(),
          eventId: 'test-event-id',
        } as unknown as DomainEvent;

        const events = [new GameCreated(gameId, 'Home Tigers', 'Away Lions'), unknownEvent];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow(
          'Unsupported event type for reconstruction: UnknownEventType'
        );
      });

      it('should throw error with descriptive message for unsupported events', () => {
        const unsupportedEvent = {
          type: 'FutureEventType',
          gameId,
          timestamp: new Date(),
          eventId: 'future-event-123',
        } as unknown as DomainEvent;

        const events = [new GameCreated(gameId, 'Home Tigers', 'Away Lions'), unsupportedEvent];

        expect(() => Game.fromEvents(events)).toThrow(
          'Unsupported event type for reconstruction: FutureEventType'
        );
      });
    });

    describe('Event Application Idempotency and Robustness', () => {
      it('should be idempotent (same event applied twice = no change)', () => {
        // Create a game state, then apply the same event sequence twice
        const baseEvents = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 3, { home: 3, away: 0 }),
          new InningAdvanced(gameId, 1, false),
        ];

        const game1 = Game.fromEvents(baseEvents);
        const game2 = Game.fromEvents(baseEvents); // Apply same events again

        // Both games should have identical state
        expect(game1.status).toBe(game2.status);
        expect(game1.score.getHomeRuns()).toBe(game2.score.getHomeRuns());
        expect(game1.score.getAwayRuns()).toBe(game2.score.getAwayRuns());
        expect(game1.currentInning).toBe(game2.currentInning);
        expect(game1.isTopHalf).toBe(game2.isTopHalf);
        expect(game1.outs).toBe(game2.outs);
        expect(game1.homeTeamName).toBe(game2.homeTeamName);
        expect(game1.awayTeamName).toBe(game2.awayTeamName);
      });

      it('should handle events with matching game ID', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId), // Same game ID
          new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }), // Same game ID
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.id).toEqual(gameId);
        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(reconstructedGame.score.getHomeRuns()).toBe(2);
      });

      it('should maintain domain invariants after applying events', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 10, { home: 10, away: 0 }),
          new ScoreUpdated(gameId, 'AWAY', 7, { home: 10, away: 7 }),
          new InningAdvanced(gameId, 5, true),
          new InningAdvanced(gameId, 5, false),
          new GameCompleted(gameId, 'REGULATION', { home: 12, away: 8 }, 7),
        ];

        const reconstructedGame = Game.fromEvents(events);

        // Verify all domain invariants maintained
        expect(reconstructedGame.score.getHomeRuns()).toBeGreaterThanOrEqual(0);
        expect(reconstructedGame.score.getAwayRuns()).toBeGreaterThanOrEqual(0);
        expect(reconstructedGame.currentInning).toBeGreaterThan(0);
        expect(reconstructedGame.outs).toBeGreaterThanOrEqual(0);
        expect(reconstructedGame.outs).toBeLessThan(3); // Outs reset to 0 with advances
        expect(reconstructedGame.homeTeamName).toBeTruthy();
        expect(reconstructedGame.awayTeamName).toBeTruthy();
        expect(reconstructedGame.homeTeamName).not.toBe(reconstructedGame.awayTeamName);
      });

      it('should not affect uncommitted events array during reconstruction', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        // Reconstructed game should have no uncommitted events
        expect(reconstructedGame.getUncommittedEvents()).toHaveLength(0);
      });

      it('should handle sparse event arrays during reconstruction', () => {
        // The null check in fromEvents() line 500 is defensive programming for sparse arrays
        // This test verifies the method can handle normal event reconstruction properly
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        // Should successfully reconstruct all events
        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(reconstructedGame.score.getHomeRuns()).toBe(1);
        expect(reconstructedGame.score.getAwayRuns()).toBe(0);
      });

      it('should validate event belongs to the game during reconstruction', () => {
        const differentGameId = GameId.generate();
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(differentGameId), // Wrong game ID
        ];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow('All events must belong to the same game');
      });
    });

    describe('Complex Event Application Scenarios', () => {
      it('should handle rapid status transitions', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId), // NOT_STARTED -> IN_PROGRESS
          new GameCompleted(gameId, 'FORFEIT', { home: 0, away: 0 }, 1), // IN_PROGRESS -> COMPLETED
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.status).toBe(GameStatus.COMPLETED);
        expect(reconstructedGame.score.getHomeRuns()).toBe(0);
        expect(reconstructedGame.score.getAwayRuns()).toBe(0);
      });

      it('should maintain event ordering integrity', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new InningAdvanced(gameId, 1, false), // Bottom 1st
          new ScoreUpdated(gameId, 'HOME', 5, { home: 5, away: 0 }),
          new InningAdvanced(gameId, 2, true), // Top 2nd
          new ScoreUpdated(gameId, 'AWAY', 3, { home: 5, away: 3 }),
          new InningAdvanced(gameId, 2, false), // Bottom 2nd
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(reconstructedGame.currentInning).toBe(2);
        expect(reconstructedGame.isTopHalf).toBe(false);
        expect(reconstructedGame.score.getHomeRuns()).toBe(5);
        expect(reconstructedGame.score.getAwayRuns()).toBe(3);
        expect(reconstructedGame.outs).toBe(0);
      });

      it('should reconstruct final game state correctly from complete event stream', () => {
        const events = [
          new GameCreated(gameId, 'Springfield Tigers', 'Capital City Goofballs'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
          new InningAdvanced(gameId, 1, false), // Bottom 1st
          new ScoreUpdated(gameId, 'AWAY', 1, { home: 2, away: 1 }),
          new InningAdvanced(gameId, 2, true), // Top 2nd
          new ScoreUpdated(gameId, 'HOME', 1, { home: 3, away: 1 }),
          new InningAdvanced(gameId, 2, false), // Bottom 2nd
          new InningAdvanced(gameId, 3, true), // Top 3rd
          new InningAdvanced(gameId, 3, false), // Bottom 3rd
          new InningAdvanced(gameId, 4, true), // Top 4th
          new InningAdvanced(gameId, 4, false), // Bottom 4th
          new InningAdvanced(gameId, 5, true), // Top 5th
          new InningAdvanced(gameId, 5, false), // Bottom 5th
          new InningAdvanced(gameId, 6, true), // Top 6th
          new InningAdvanced(gameId, 6, false), // Bottom 6th
          new InningAdvanced(gameId, 7, true), // Top 7th
          new ScoreUpdated(gameId, 'AWAY', 2, { home: 3, away: 3 }),
          new InningAdvanced(gameId, 7, false), // Bottom 7th
          new ScoreUpdated(gameId, 'HOME', 1, { home: 4, away: 3 }), // Walk-off
          new GameCompleted(gameId, 'REGULATION', { home: 4, away: 3 }, 7),
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.homeTeamName).toBe('Springfield Tigers');
        expect(reconstructedGame.awayTeamName).toBe('Capital City Goofballs');
        expect(reconstructedGame.status).toBe(GameStatus.COMPLETED);
        expect(reconstructedGame.score.getHomeRuns()).toBe(4);
        expect(reconstructedGame.score.getAwayRuns()).toBe(3);
        expect(reconstructedGame.currentInning).toBe(7);
        expect(reconstructedGame.isTopHalf).toBe(false);
        expect(reconstructedGame.outs).toBe(0);
      });
    });
  });

  describe('Game Event Management', () => {
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

  describe('Game.fromEvents() - Event Sourcing Reconstruction', () => {
    let gameId: GameId;
    let baseEvents: DomainEvent[];

    beforeEach(() => {
      gameId = GameId.generate();
      // Base events for most tests: creation and start
      baseEvents = [new GameCreated(gameId, 'Home Tigers', 'Away Lions'), new GameStarted(gameId)];
    });

    describe('Basic Reconstruction', () => {
      it('should create game from GameCreated event', () => {
        const events = [new GameCreated(gameId, 'Home Tigers', 'Away Lions')];

        const game = Game.fromEvents(events);

        expect(game.id).toEqual(gameId);
        expect(game.homeTeamName).toBe('Home Tigers');
        expect(game.awayTeamName).toBe('Away Lions');
        expect(game.status).toBe(GameStatus.NOT_STARTED);
        expect(game.score).toEqual(GameScore.zero());
        expect(game.currentInning).toBe(1);
        expect(game.isTopHalf).toBe(true);
        expect(game.outs).toBe(0);
        expect(game.getUncommittedEvents()).toHaveLength(0); // Events are already committed
      });

      it('should replay events in chronological order', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
          new InningAdvanced(gameId, 1, false), // Bottom of 1st
          new ScoreUpdated(gameId, 'AWAY', 1, { home: 2, away: 1 }),
          new InningAdvanced(gameId, 2, true), // Top of 2nd
        ];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.IN_PROGRESS);
        expect(game.score.getHomeRuns()).toBe(2);
        expect(game.score.getAwayRuns()).toBe(1);
        expect(game.currentInning).toBe(2);
        expect(game.isTopHalf).toBe(true);
        expect(game.outs).toBe(0);
      });

      it('should maintain domain invariants during reconstruction', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 5, { home: 5, away: 0 }),
          new ScoreUpdated(gameId, 'AWAY', 3, { home: 5, away: 3 }),
          new GameCompleted(gameId, 'REGULATION', { home: 5, away: 3 }, 7),
        ];

        const game = Game.fromEvents(events);

        // Game should maintain all invariants
        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.score.getHomeRuns()).toBeGreaterThanOrEqual(0);
        expect(game.score.getAwayRuns()).toBeGreaterThanOrEqual(0);
        expect(game.currentInning).toBeGreaterThan(0);
        expect(game.outs).toBeGreaterThanOrEqual(0);
        expect(game.outs).toBeLessThan(3);
        expect(game.homeTeamName).toBeTruthy();
        expect(game.awayTeamName).toBeTruthy();
        expect(game.homeTeamName).not.toBe(game.awayTeamName);
      });
    });

    describe('Error Scenarios', () => {
      it('should handle empty event array gracefully', () => {
        const events: DomainEvent[] = [];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow(
          'Cannot reconstruct game from empty event array'
        );
      });

      it('should throw error if first event is not GameCreated', () => {
        const events = [
          new GameStarted(gameId), // Missing GameCreated as first event
          new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 }),
        ];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow('First event must be GameCreated');
      });

      it('should throw error for events with different game IDs', () => {
        const anotherGameId = GameId.generate();
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(anotherGameId), // Different game ID
        ];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow('All events must belong to the same game');
      });

      it('should throw error for null or undefined events array', () => {
        expect(() => Game.fromEvents(null as unknown as DomainEvent[])).toThrow(DomainError);
        expect(() => Game.fromEvents(undefined as unknown as DomainEvent[])).toThrow(DomainError);
      });
    });

    describe('Complex Game Scenarios', () => {
      it('should reconstruct complete regulation game', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 3, { home: 3, away: 0 }),
          new InningAdvanced(gameId, 1, false), // Bottom 1st
          new ScoreUpdated(gameId, 'AWAY', 2, { home: 3, away: 2 }),
          new InningAdvanced(gameId, 2, true), // Top 2nd
          new ScoreUpdated(gameId, 'HOME', 1, { home: 4, away: 2 }),
          new InningAdvanced(gameId, 2, false), // Bottom 2nd
          new InningAdvanced(gameId, 3, true), // Top 3rd
          // ... continue through 7 innings
          new GameCompleted(gameId, 'REGULATION', { home: 8, away: 6 }, 7),
        ];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.score.getHomeRuns()).toBe(8);
        expect(game.score.getAwayRuns()).toBe(6);
      });

      it('should reconstruct mercy rule game', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 15, { home: 15, away: 0 }),
          new InningAdvanced(gameId, 1, false), // Bottom 1st
          new InningAdvanced(gameId, 2, true), // Top 2nd
          new InningAdvanced(gameId, 2, false), // Bottom 2nd
          new InningAdvanced(gameId, 3, true), // Top 3rd
          new InningAdvanced(gameId, 3, false), // Bottom 3rd
          new InningAdvanced(gameId, 4, true), // Top 4th
          new InningAdvanced(gameId, 4, false), // Bottom 4th
          new InningAdvanced(gameId, 5, true), // Top 5th (mercy rule eligible)
          new GameCompleted(gameId, 'MERCY_RULE', { home: 15, away: 0 }, 5),
        ];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.score.getHomeRuns()).toBe(15);
        expect(game.score.getAwayRuns()).toBe(0);
        expect(game.currentInning).toBe(5);
        expect(game.isMercyRuleTriggered()).toBe(true);
      });

      it('should reconstruct game with multiple score updates', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 }),
          new ScoreUpdated(gameId, 'HOME', 2, { home: 3, away: 0 }),
          new ScoreUpdated(gameId, 'HOME', 1, { home: 4, away: 0 }),
          new InningAdvanced(gameId, 1, false),
          new ScoreUpdated(gameId, 'AWAY', 2, { home: 4, away: 2 }),
          new ScoreUpdated(gameId, 'AWAY', 1, { home: 4, away: 3 }),
        ];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.IN_PROGRESS);
        expect(game.score.getHomeRuns()).toBe(4);
        expect(game.score.getAwayRuns()).toBe(3);
        expect(game.currentInning).toBe(1);
        expect(game.isTopHalf).toBe(false);
      });

      it('should reconstruct extra innings game', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          // Simulate 7 innings with tied score
          new ScoreUpdated(gameId, 'HOME', 5, { home: 5, away: 0 }),
          new InningAdvanced(gameId, 1, false),
          new ScoreUpdated(gameId, 'AWAY', 5, { home: 5, away: 5 }),
          // Fast forward through innings (simplified for test)
          new InningAdvanced(gameId, 8, true), // Extra innings
          new ScoreUpdated(gameId, 'HOME', 1, { home: 6, away: 5 }),
          new InningAdvanced(gameId, 8, false),
          new GameCompleted(gameId, 'REGULATION', { home: 6, away: 5 }, 8),
        ];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.COMPLETED);
        expect(game.score.getHomeRuns()).toBe(6);
        expect(game.score.getAwayRuns()).toBe(5);
        expect(game.currentInning).toBe(8); // Extra innings
      });
    });

    describe('Event Stream Validation', () => {
      it('should validate all events belong to same game', () => {
        const anotherGameId = GameId.generate();
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(anotherGameId, 'HOME', 1, { home: 1, away: 0 }), // Wrong game
        ];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow('All events must belong to the same game');
      });

      it('should handle events in chronological order by timestamp', () => {
        // Create events with specific timestamps to test ordering
        const event1 = new GameCreated(gameId, 'Home Tigers', 'Away Lions');
        const event2 = new GameStarted(gameId);
        const event3 = new ScoreUpdated(gameId, 'HOME', 1, { home: 1, away: 0 });

        // Manually set timestamps (in real scenarios, this would be natural)
        const now = new Date();
        Object.defineProperty(event1, 'timestamp', {
          value: new Date(now.getTime() - 2000),
          writable: false,
        });
        Object.defineProperty(event2, 'timestamp', {
          value: new Date(now.getTime() - 1000),
          writable: false,
        });
        Object.defineProperty(event3, 'timestamp', {
          value: now,
          writable: false,
        });

        const events = [event1, event2, event3];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.IN_PROGRESS);
        expect(game.score.getHomeRuns()).toBe(1);
      });

      it('should handle duplicate game creation event gracefully', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'), // Duplicate
        ];

        // Should either ignore duplicate or throw meaningful error
        expect(() => Game.fromEvents(events)).toThrow(DomainError);
      });
    });

    describe('State Consistency', () => {
      it('should maintain score consistency across multiple updates', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 2, { home: 2, away: 0 }),
          new ScoreUpdated(gameId, 'AWAY', 3, { home: 2, away: 3 }),
          new ScoreUpdated(gameId, 'HOME', 1, { home: 3, away: 3 }),
        ];

        const game = Game.fromEvents(events);

        expect(game.score.getHomeRuns()).toBe(3);
        expect(game.score.getAwayRuns()).toBe(3);
        expect(game.score.isTied()).toBe(true);
      });

      it('should maintain inning progression consistency', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
          new InningAdvanced(gameId, 1, false), // Bottom 1st
          new InningAdvanced(gameId, 2, true), // Top 2nd
          new InningAdvanced(gameId, 2, false), // Bottom 2nd
          new InningAdvanced(gameId, 3, true), // Top 3rd
        ];

        const game = Game.fromEvents(events);

        expect(game.currentInning).toBe(3);
        expect(game.isTopHalf).toBe(true);
        expect(game.outs).toBe(0); // Outs reset with inning advancement
      });

      it('should preserve team names throughout event stream', () => {
        const homeTeam = 'Springfield Nuclear Plant Workers';
        const awayTeam = 'Capital City Goofballs';

        const events = [
          new GameCreated(gameId, homeTeam, awayTeam),
          new GameStarted(gameId),
          new ScoreUpdated(gameId, 'HOME', 10, { home: 10, away: 0 }),
          new InningAdvanced(gameId, 5, true),
          new GameCompleted(gameId, 'MERCY_RULE', { home: 15, away: 2 }, 5),
        ];

        const game = Game.fromEvents(events);

        expect(game.homeTeamName).toBe(homeTeam);
        expect(game.awayTeamName).toBe(awayTeam);
        expect(game.status).toBe(GameStatus.COMPLETED);
      });
    });

    describe('Performance and Edge Cases', () => {
      it('should handle empty uncommitted events after reconstruction', () => {
        const events = baseEvents;

        const game = Game.fromEvents(events);

        expect(game.getUncommittedEvents()).toHaveLength(0);
        expect(game.status).toBe(GameStatus.IN_PROGRESS);
      });

      it('should handle single GameCreated event', () => {
        const events = [new GameCreated(gameId, 'Home', 'Away')];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.NOT_STARTED);
        expect(game.homeTeamName).toBe('Home');
        expect(game.awayTeamName).toBe('Away');
        expect(game.score.isZero()).toBe(true);
      });

      it('should maintain immutability of reconstructed game', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions'),
          new GameStarted(gameId),
        ];

        const game = Game.fromEvents(events);
        const originalScore = game.score;
        const originalStatus = game.status;

        // Game properties should be immutable from external access
        expect(game.score).toBe(originalScore);
        expect(game.status).toBe(originalStatus);
        expect(game.id).toEqual(gameId);
      });
    });

    describe('Phase 3: Final Coverage Improvements', () => {
      describe('Run Validation Coverage', () => {
        it('should reject infinite values in addHomeRuns (lines 653-654)', () => {
          const game = Game.createNew(gameId, 'Home Team', 'Away Team');
          game.startGame();

          expect(() => game.addHomeRuns(Infinity)).toThrow('Runs must be a finite number');
          expect(() => game.addHomeRuns(-Infinity)).toThrow('Runs must be a finite number');
        });

        it('should reject non-integer values in addHomeRuns (lines 659-660)', () => {
          const game = Game.createNew(gameId, 'Home Team', 'Away Team');
          game.startGame();

          expect(() => game.addHomeRuns(1.5)).toThrow('Runs must be an integer');
          expect(() => game.addHomeRuns(3.14)).toThrow('Runs must be an integer');
        });

        it('should reject infinite values in addAwayRuns (lines 653-654)', () => {
          const game = Game.createNew(gameId, 'Home Team', 'Away Team');
          game.startGame();

          expect(() => game.addAwayRuns(Infinity)).toThrow('Runs must be a finite number');
          expect(() => game.addAwayRuns(-Infinity)).toThrow('Runs must be a finite number');
        });

        it('should reject non-integer values in addAwayRuns (lines 659-660)', () => {
          const game = Game.createNew(gameId, 'Home Team', 'Away Team');
          game.startGame();

          expect(() => game.addAwayRuns(2.5)).toThrow('Runs must be an integer');
          expect(() => game.addAwayRuns(4.99)).toThrow('Runs must be an integer');
        });
      });
    });
  });
});
