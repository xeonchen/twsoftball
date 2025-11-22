import { GameStatus } from '../constants/GameStatus.js';
import { DomainError } from '../errors/DomainError.js';
import { GameCompleted } from '../events/GameCompleted.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { GameScore } from '../value-objects/GameScore.js';

import { Game } from './Game.js';

describe('Game Aggregate Root - Core Operations', () => {
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
      // Use custom rules matching old hard-coded behavior for these tests
      const customRules = new SoftballRules({
        mercyRuleTiers: [
          { differential: 15, afterInning: 5 }, // Old: 15+ after 5
          { differential: 10, afterInning: 7 }, // Old: 10+ after 7
        ],
      });
      game = Game.createNew(gameId, 'Home Tigers', 'Away Lions', customRules);
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

      // Delegate mercy rule logic to SoftballRules
      expect(
        game.rules.isMercyRule(
          game.score.getHomeRuns(),
          game.score.getAwayRuns(),
          game.currentInning
        )
      ).toBe(true);
    });

    it('should detect mercy rule condition with 10+ run lead after 7 innings', () => {
      // Setup: advance to 7th inning, away team with lead
      for (let i = 1; i < 7; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      game.addAwayRuns(10); // 0-10 lead

      // Delegate mercy rule logic to SoftballRules
      expect(
        game.rules.isMercyRule(
          game.score.getHomeRuns(),
          game.score.getAwayRuns(),
          game.currentInning
        )
      ).toBe(true);
    });

    it('should not trigger mercy rule with insufficient run lead', () => {
      // Setup: 5th inning with 14 run lead (just under 15)
      for (let i = 1; i < 5; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      game.addHomeRuns(14);

      // Delegate mercy rule logic to SoftballRules
      expect(
        game.rules.isMercyRule(
          game.score.getHomeRuns(),
          game.score.getAwayRuns(),
          game.currentInning
        )
      ).toBe(false);
    });

    it('should not trigger mercy rule before required innings', () => {
      // 4th inning with 15+ run lead
      for (let i = 1; i < 4; i += 1) {
        game.advanceInning();
        game.advanceInning();
      }
      game.addHomeRuns(15);

      // Delegate mercy rule logic to SoftballRules
      expect(
        game.rules.isMercyRule(
          game.score.getHomeRuns(),
          game.score.getAwayRuns(),
          game.currentInning
        )
      ).toBe(false);
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

      expect(game.isWalkOffScenario(7, false, 1)).toBe(true);
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
      // Not a walk-off if no runs score (tied game continues)
      expect(game.isWalkOffScenario(8, false, 0)).toBe(false);
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

  describe('Score DTO', () => {
    it('should return score DTO with TIE leader when scores are equal', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();

      const scoreDTO = game.getScoreDTO();

      expect(scoreDTO.home).toBe(0);
      expect(scoreDTO.away).toBe(0);
      expect(scoreDTO.leader).toBe('TIE');
      expect(scoreDTO.difference).toBe(0);
    });

    it('should return score DTO with HOME leader when home team is winning', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.addHomeRuns(3);

      const scoreDTO = game.getScoreDTO();

      expect(scoreDTO.home).toBe(3);
      expect(scoreDTO.away).toBe(0);
      expect(scoreDTO.leader).toBe('HOME');
      expect(scoreDTO.difference).toBe(3);
    });

    it('should return score DTO with AWAY leader when away team is winning', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.addAwayRuns(5);

      const scoreDTO = game.getScoreDTO();

      expect(scoreDTO.home).toBe(0);
      expect(scoreDTO.away).toBe(5);
      expect(scoreDTO.leader).toBe('AWAY');
      expect(scoreDTO.difference).toBe(5);
    });

    it('should return correct difference for close games', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.addHomeRuns(7);
      game.addAwayRuns(6);

      const scoreDTO = game.getScoreDTO();

      expect(scoreDTO.home).toBe(7);
      expect(scoreDTO.away).toBe(6);
      expect(scoreDTO.leader).toBe('HOME');
      expect(scoreDTO.difference).toBe(1);
    });

    it('should return correct difference regardless of which team is ahead', () => {
      const game = Game.createNew(gameId, 'Home Tigers', 'Away Lions');
      game.startGame();
      game.addHomeRuns(2);
      game.addAwayRuns(10);

      const scoreDTO = game.getScoreDTO();

      expect(scoreDTO.home).toBe(2);
      expect(scoreDTO.away).toBe(10);
      expect(scoreDTO.leader).toBe('AWAY');
      expect(scoreDTO.difference).toBe(8);
    });
  });
});
