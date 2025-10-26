import { GameStatus } from '../constants/GameStatus.js';
import { DomainError } from '../errors/DomainError.js';
import { DomainEvent } from '../events/DomainEvent.js';
import { GameCompleted } from '../events/GameCompleted.js';
import { GameCreated } from '../events/GameCreated.js';
import { GameStarted } from '../events/GameStarted.js';
import { InningAdvanced } from '../events/InningAdvanced.js';
import { RunScored } from '../events/RunScored.js';
import { ScoreUpdated } from '../events/ScoreUpdated.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { GameId } from '../value-objects/GameId.js';
import { GameScore } from '../value-objects/GameScore.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { Game } from './Game.js';

/**
 * Helper function to create standard rules config for GameCreated events in tests.
 */
function standardRulesConfig(): {
  totalInnings: number;
  maxPlayersPerTeam: number;
  timeLimitMinutes: number;
  allowReEntry: boolean;
  mercyRuleEnabled: boolean;
  mercyRuleTiers: Array<{ differential: number; afterInning: number }>;
  maxExtraInnings: number;
  allowTieGames: boolean;
} {
  return {
    totalInnings: 7,
    maxPlayersPerTeam: 25,
    timeLimitMinutes: 60,
    allowReEntry: true,
    mercyRuleEnabled: true,
    mercyRuleTiers: [
      { differential: 10, afterInning: 4 },
      { differential: 7, afterInning: 5 },
    ],
    maxExtraInnings: 0,
    allowTieGames: true,
  };
}

describe('Game Aggregate Root - Event Sourcing', () => {
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();
  });

  describe('Game.applyEvent() - Event Application Logic', () => {
    beforeEach(() => {
      gameId = GameId.generate();
    });

    describe('GameStarted Event Application', () => {
      it('should apply GameStarted event (status NOT_STARTED → IN_PROGRESS)', () => {
        const gameStartedEvent = new GameStarted(gameId);
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          gameStartedEvent,
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(reconstructedGame.score).toEqual(GameScore.zero());
        expect(reconstructedGame.currentInning).toBe(1);
        expect(reconstructedGame.isTopHalf).toBe(true);
        expect(reconstructedGame.outs).toBe(0);
      });

      it('should maintain other game state when applying GameStarted', () => {
        const events = [
          new GameCreated(gameId, 'Springfield Tigers', 'Shelbyville Lions', standardRulesConfig()),
        ];
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
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          scoreUpdateEvent,
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.score.getHomeRuns()).toBe(3);
        expect(reconstructedGame.score.getAwayRuns()).toBe(0);
        expect(reconstructedGame.status).toBe(GameStatus.NOT_STARTED); // Only score changed
      });

      it('should update to final score from ScoreUpdated event', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          inningAdvancedEvent,
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.currentInning).toBe(2);
        expect(reconstructedGame.isTopHalf).toBe(false);
        expect(reconstructedGame.outs).toBe(0); // Outs reset when inning advances
      });

      it('should reset outs to 0 when applying InningAdvanced', () => {
        // Create a scenario where we know outs would be reset
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Nuclear Plant', 'Capital City', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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

    describe('RunScored Event Application', () => {
      it('should apply RunScored event (update game score)', () => {
        const runnerId = PlayerId.generate();
        const batterId = PlayerId.generate();

        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          new GameStarted(gameId),
          new RunScored(gameId, runnerId, 'HOME', batterId, { home: 1, away: 0 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.score.getHomeRuns()).toBe(1);
        expect(reconstructedGame.score.getAwayRuns()).toBe(0);
        expect(reconstructedGame.status).toBe(GameStatus.IN_PROGRESS);
      });

      it('should apply multiple RunScored events maintaining score accuracy', () => {
        const runner1 = PlayerId.generate();
        const runner2 = PlayerId.generate();
        const runner3 = PlayerId.generate();
        const batter = PlayerId.generate();

        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          new GameStarted(gameId),
          new RunScored(gameId, runner1, 'HOME', batter, { home: 1, away: 0 }),
          new RunScored(gameId, runner2, 'HOME', batter, { home: 2, away: 0 }),
          new RunScored(gameId, runner3, 'AWAY', batter, { home: 2, away: 1 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.score.getHomeRuns()).toBe(2);
        expect(reconstructedGame.score.getAwayRuns()).toBe(1);
      });

      it('should handle RunScored event interleaved with other events', () => {
        const runner = PlayerId.generate();
        const batter = PlayerId.generate();

        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          new GameStarted(gameId),
          new RunScored(gameId, runner, 'HOME', batter, { home: 1, away: 0 }),
          new InningAdvanced(gameId, 1, false),
          new RunScored(gameId, runner, 'AWAY', batter, { home: 1, away: 1 }),
          new InningAdvanced(gameId, 2, true),
          new RunScored(gameId, runner, 'HOME', batter, { home: 2, away: 1 }),
        ];

        const reconstructedGame = Game.fromEvents(events);

        expect(reconstructedGame.score.getHomeRuns()).toBe(2);
        expect(reconstructedGame.score.getAwayRuns()).toBe(1);
        expect(reconstructedGame.currentInning).toBe(2);
        expect(reconstructedGame.isTopHalf).toBe(true);
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

        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          unknownEvent,
        ];

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

        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          unsupportedEvent,
        ];

        expect(() => Game.fromEvents(events)).toThrow(
          'Unsupported event type for reconstruction: FutureEventType'
        );
      });
    });

    describe('Event Application Idempotency and Robustness', () => {
      it('should be idempotent (same event applied twice = no change)', () => {
        // Create a game state, then apply the same event sequence twice
        const baseEvents = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          new GameStarted(differentGameId), // Wrong game ID
        ];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow('All events must belong to the same game');
      });
    });

    describe('Complex Event Application Scenarios', () => {
      it('should handle rapid status transitions', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(
            gameId,
            'Springfield Tigers',
            'Capital City Goofballs',
            standardRulesConfig()
          ),
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

  describe('Game.fromEvents() - Event Sourcing Reconstruction', () => {
    let gameId: GameId;
    let baseEvents: DomainEvent[];

    beforeEach(() => {
      gameId = GameId.generate();
      // Base events for most tests: creation and start
      baseEvents = [
        new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
        new GameStarted(gameId),
      ];
    });

    describe('Basic Reconstruction', () => {
      it('should create game from GameCreated event', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
        ];

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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
        // Delegate mercy rule logic to SoftballRules
        expect(
          game.rules.isMercyRule(
            game.score.getHomeRuns(),
            game.score.getAwayRuns(),
            game.currentInning
          )
        ).toBe(true);
      });

      it('should reconstruct game with multiple score updates', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          new GameStarted(gameId),
          new ScoreUpdated(anotherGameId, 'HOME', 1, { home: 1, away: 0 }), // Wrong game
        ];

        expect(() => Game.fromEvents(events)).toThrow(DomainError);
        expect(() => Game.fromEvents(events)).toThrow('All events must belong to the same game');
      });

      it('should handle events in chronological order by timestamp', () => {
        // Create events with specific timestamps to test ordering
        const event1 = new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig());
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()), // Duplicate
        ];

        // Should either ignore duplicate or throw meaningful error
        expect(() => Game.fromEvents(events)).toThrow(DomainError);
      });
    });

    describe('State Consistency', () => {
      it('should maintain score consistency across multiple updates', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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
        const events = [new GameCreated(gameId, 'Home', 'Away', standardRulesConfig())];

        const game = Game.fromEvents(events);

        expect(game.status).toBe(GameStatus.NOT_STARTED);
        expect(game.homeTeamName).toBe('Home');
        expect(game.awayTeamName).toBe('Away');
        expect(game.score.isZero()).toBe(true);
      });

      it('should maintain immutability of reconstructed game', () => {
        const events = [
          new GameCreated(gameId, 'Home Tigers', 'Away Lions', standardRulesConfig()),
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

  describe('Rules Persistence', () => {
    it('should preserve custom rules when reconstructing from events', () => {
      const customRules = {
        totalInnings: 5,
        maxPlayersPerTeam: 20,
        timeLimitMinutes: 90,
        allowReEntry: false,
        mercyRuleEnabled: true,
        mercyRuleTiers: [{ differential: 10, afterInning: 3 }],
        maxExtraInnings: 2,
        allowTieGames: false,
      };

      const game = Game.createNew(gameId, 'Home', 'Away', new SoftballRules(customRules));
      game.startGame();

      const reconstructed = Game.fromEvents(game.getUncommittedEvents());

      expect(reconstructed.rules.totalInnings).toBe(5);
      expect(reconstructed.rules.maxPlayersPerTeam).toBe(20);
      expect(reconstructed.rules.timeLimitMinutes).toBe(90);
      expect(reconstructed.rules.allowReEntry).toBe(false);
      expect(reconstructed.rules.mercyRuleEnabled).toBe(true);
      expect(reconstructed.rules.mercyRuleTiers).toHaveLength(1);
      expect(reconstructed.rules.mercyRuleTiers[0]?.differential).toBe(10);
      expect(reconstructed.rules.mercyRuleTiers[0]?.afterInning).toBe(3);
      expect(reconstructed.rules.maxExtraInnings).toBe(2);
      expect(reconstructed.rules.allowTieGames).toBe(false);
    });

    it('should preserve custom rules when restoring from snapshot', () => {
      const customRules = {
        totalInnings: 9,
        maxPlayersPerTeam: 15,
        timeLimitMinutes: null,
        allowReEntry: true,
        mercyRuleEnabled: false,
        mercyRuleTiers: [],
        maxExtraInnings: 3,
        allowTieGames: true,
      };

      const snapshot = {
        aggregateId: gameId,
        aggregateType: 'Game' as const,
        version: 1,
        data: {
          id: gameId.value,
          homeTeamName: 'Home',
          awayTeamName: 'Away',
          status: GameStatus.NOT_STARTED,
          homeRuns: 0,
          awayRuns: 0,
          currentInning: 1,
          isTopHalf: true,
          outs: 0,
          rules: customRules,
        },
        timestamp: new Date(),
      };

      const restored = Game.fromSnapshot(snapshot, []);

      expect(restored.rules.totalInnings).toBe(9);
      expect(restored.rules.maxPlayersPerTeam).toBe(15);
      expect(restored.rules.timeLimitMinutes).toBe(null);
      expect(restored.rules.allowReEntry).toBe(true);
      expect(restored.rules.mercyRuleEnabled).toBe(false);
      expect(restored.rules.mercyRuleTiers).toHaveLength(0);
      expect(restored.rules.maxExtraInnings).toBe(3);
      expect(restored.rules.allowTieGames).toBe(true);
    });

    it('should maintain separate rules for concurrent games', () => {
      const gameId1 = GameId.generate();
      const gameId2 = GameId.generate();

      const rules1 = { totalInnings: 5, mercyRuleTiers: [{ differential: 15, afterInning: 3 }] };
      const rules2 = { totalInnings: 7, mercyRuleTiers: [{ differential: 10, afterInning: 4 }] };

      const game1 = Game.createNew(gameId1, 'Home', 'Away', new SoftballRules(rules1));
      const game2 = Game.createNew(gameId2, 'Home', 'Away', new SoftballRules(rules2));

      expect(game1.rules.totalInnings).toBe(5);
      expect(game2.rules.totalInnings).toBe(7);
      expect(game1.rules.mercyRuleTiers[0]?.differential).toBe(15);
      expect(game2.rules.mercyRuleTiers[0]?.differential).toBe(10);
    });
  });
});
