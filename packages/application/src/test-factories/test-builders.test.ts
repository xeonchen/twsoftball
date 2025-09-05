/**
 * @file Test Builders Tests
 * Comprehensive test coverage for test builder classes and fluent APIs.
 *
 * @remarks
 * These tests validate the behavior of fluent builder APIs used for creating
 * test data objects. They ensure proper method chaining, default values,
 * customization options, and final object construction.
 *
 * **Test Coverage Areas**:
 * - Builder creation and method chaining
 * - Default value assignment and customization
 * - Type safety and parameter validation
 * - Final object construction and property mapping
 * - Edge cases and complex configurations
 */

import {
  GameId,
  PlayerId,
  TeamLineupId,
  GameStatus,
  AtBatResultType,
  JerseyNumber,
  FieldPosition,
} from '@twsoftball/domain';
import { vi, describe, it, expect, afterEach } from 'vitest';

import {
  GameTestBuilder,
  CommandTestBuilder,
  RecordAtBatCommandBuilder,
  StartNewGameCommandBuilder,
  SubstitutePlayerCommandBuilder,
  EndInningCommandBuilder,
  UndoCommandBuilder,
  RedoCommandBuilder,
  EventTestBuilder,
} from './test-builders';

describe('Test Builders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GameTestBuilder', () => {
    describe('creation and defaults', () => {
      it('should create builder with default values', () => {
        const builder = GameTestBuilder.create();
        expect(builder).toBeInstanceOf(GameTestBuilder);
      });

      it('should build game with default values', () => {
        const game = GameTestBuilder.create().build();

        expect(game.id).toBeInstanceOf(GameId);
        expect(game.status).toBe(GameStatus.IN_PROGRESS);
        expect(game.homeTeamName).toBe('Home Team');
        expect(game.awayTeamName).toBe('Away Team');
      });

      it('should generate unique game IDs by default', () => {
        const game1 = GameTestBuilder.create().build();
        const game2 = GameTestBuilder.create().build();

        expect(game1.id.value).not.toBe(game2.id.value);
      });
    });

    describe('fluent API customization', () => {
      it('should set custom game ID from string', () => {
        const customId = 'custom-game-123';
        const game = GameTestBuilder.create().withId(customId).build();

        expect(game.id.value).toBe(customId);
      });

      it('should set custom game ID from GameId object', () => {
        const gameId = new GameId('object-game-456');
        const game = GameTestBuilder.create().withId(gameId).build();

        expect(game.id).toBe(gameId);
      });

      it('should set custom game status', () => {
        const game = GameTestBuilder.create().withStatus(GameStatus.COMPLETED).build();

        expect(game.status).toBe(GameStatus.COMPLETED);
      });

      it('should set custom team names', () => {
        const homeTeam = 'Eagles';
        const awayTeam = 'Hawks';
        const game = GameTestBuilder.create().withTeamNames(homeTeam, awayTeam).build();

        expect(game.homeTeamName).toBe(homeTeam);
        expect(game.awayTeamName).toBe(awayTeam);
      });

      it('should set custom current inning', () => {
        const builder = GameTestBuilder.create().withCurrentInning(5);

        // Note: The current implementation doesn't expose currentInning on the built game
        // This tests the builder method itself
        expect(builder).toBeInstanceOf(GameTestBuilder);
      });

      it('should set custom score', () => {
        const score = { home: 7, away: 3 };
        const builder = GameTestBuilder.create().withScore(score);

        // Note: The current implementation doesn't expose scores on the built game
        // This tests the builder method itself
        expect(builder).toBeInstanceOf(GameTestBuilder);
      });

      it('should set custom game date', () => {
        const gameDate = new Date('2024-03-15');
        const builder = GameTestBuilder.create().withGameDate(gameDate);

        // Note: The current implementation doesn't expose gameDate on the built game
        // This tests the builder method itself
        expect(builder).toBeInstanceOf(GameTestBuilder);
      });
    });

    describe('method chaining', () => {
      it('should support full method chaining', () => {
        const game = GameTestBuilder.create()
          .withId('chained-game')
          .withStatus(GameStatus.IN_PROGRESS)
          .withTeamNames('Chain Eagles', 'Chain Hawks')
          .withCurrentInning(3)
          .withScore({ home: 2, away: 1 })
          .withGameDate(new Date('2024-01-15'))
          .build();

        expect(game.id.value).toBe('chained-game');
        expect(game.homeTeamName).toBe('Chain Eagles');
        expect(game.awayTeamName).toBe('Chain Hawks');
      });

      it('should create new builder instances for each method call', () => {
        const originalBuilder = GameTestBuilder.create();
        const modifiedBuilder = originalBuilder.withId('new-id');

        expect(originalBuilder).not.toBe(modifiedBuilder);
        expect(originalBuilder).toBeInstanceOf(GameTestBuilder);
        expect(modifiedBuilder).toBeInstanceOf(GameTestBuilder);
      });
    });

    describe('game status handling', () => {
      it('should handle NOT_STARTED status', () => {
        const game = GameTestBuilder.create().withStatus(GameStatus.NOT_STARTED).build();

        expect(game.status).toBe(GameStatus.NOT_STARTED);
      });

      it('should handle IN_PROGRESS status', () => {
        const game = GameTestBuilder.create().withStatus(GameStatus.IN_PROGRESS).build();

        expect(game.status).toBe(GameStatus.IN_PROGRESS);
      });

      it('should handle COMPLETED status with fallback', () => {
        // Note: The current implementation has a try-catch for completed games
        // Let's test that it doesn't throw
        expect(() => {
          const game = GameTestBuilder.create().withStatus(GameStatus.COMPLETED).build();

          // Should either be properly completed or fall back to mock structure
          expect(game).toBeDefined();
          expect(game.id).toBeInstanceOf(GameId);
        }).not.toThrow();
      });
    });
  });

  describe('CommandTestBuilder', () => {
    describe('factory methods', () => {
      it('should create RecordAtBatCommandBuilder', () => {
        const builder = CommandTestBuilder.recordAtBat();
        expect(builder).toBeInstanceOf(RecordAtBatCommandBuilder);
      });

      it('should create StartNewGameCommandBuilder', () => {
        const builder = CommandTestBuilder.startNewGame();
        expect(builder).toBeInstanceOf(StartNewGameCommandBuilder);
      });

      it('should create SubstitutePlayerCommandBuilder', () => {
        const builder = CommandTestBuilder.substitutePlayer();
        expect(builder).toBeInstanceOf(SubstitutePlayerCommandBuilder);
      });

      it('should create EndInningCommandBuilder', () => {
        const builder = CommandTestBuilder.endInning();
        expect(builder).toBeInstanceOf(EndInningCommandBuilder);
      });

      it('should create UndoCommandBuilder', () => {
        const builder = CommandTestBuilder.undo();
        expect(builder).toBeInstanceOf(UndoCommandBuilder);
      });

      it('should create RedoCommandBuilder', () => {
        const builder = CommandTestBuilder.redo();
        expect(builder).toBeInstanceOf(RedoCommandBuilder);
      });
    });
  });

  describe('RecordAtBatCommandBuilder', () => {
    describe('defaults and basic building', () => {
      it('should create command with default values', () => {
        const command = CommandTestBuilder.recordAtBat().build();

        expect(command.gameId).toBeInstanceOf(GameId);
        expect(command.batterId).toBeInstanceOf(PlayerId);
        expect(command.result).toBe(AtBatResultType.SINGLE);
        expect(command.runnerAdvances).toEqual([]);
      });

      it('should not include optional fields when not set', () => {
        const command = CommandTestBuilder.recordAtBat().build();

        expect(command).not.toHaveProperty('notes');
        expect(command).not.toHaveProperty('timestamp');
      });
    });

    describe('customization methods', () => {
      it('should set game ID from string', () => {
        const gameId = 'test-game-123';
        const command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();

        expect(command.gameId.value).toBe(gameId);
      });

      it('should set game ID from GameId object', () => {
        const gameId = new GameId('object-game-456');
        const command = CommandTestBuilder.recordAtBat().withGameId(gameId).build();

        expect(command.gameId).toBe(gameId);
      });

      it('should set batter ID from string', () => {
        const batterId = 'batter-789';
        const command = CommandTestBuilder.recordAtBat().withBatter(batterId).build();

        expect(command.batterId.value).toBe(batterId);
      });

      it('should set batter ID from PlayerId object', () => {
        const batterId = new PlayerId('player-object-123');
        const command = CommandTestBuilder.recordAtBat().withBatter(batterId).build();

        expect(command.batterId).toBe(batterId);
      });

      it('should set at-bat result', () => {
        const result = AtBatResultType.HOME_RUN;
        const command = CommandTestBuilder.recordAtBat().withResult(result).build();

        expect(command.result).toBe(result);
      });

      it('should set runner advances', () => {
        const advances = [
          {
            fromBase: 'FIRST' as const,
            toBase: 'SECOND' as const,
            playerId: new PlayerId('runner-1'),
            advanceReason: 'BATTER_ADVANCE' as const,
          },
        ];
        const command = CommandTestBuilder.recordAtBat().withRunnerAdvances(advances).build();

        expect(command.runnerAdvances).toBe(advances);
      });

      it('should set notes', () => {
        const notes = 'Great swing!';
        const command = CommandTestBuilder.recordAtBat().withNotes(notes).build();

        expect(command.notes).toBe(notes);
      });

      it('should set timestamp', () => {
        const timestamp = new Date('2024-03-15T14:30:00Z');
        const command = CommandTestBuilder.recordAtBat().withTimestamp(timestamp).build();

        expect(command.timestamp).toBe(timestamp);
      });
    });

    describe('method chaining', () => {
      it('should support full method chaining', () => {
        const gameId = 'chain-game';
        const batterId = 'chain-batter';
        const notes = 'Chain notes';
        const timestamp = new Date('2024-01-01');

        const command = CommandTestBuilder.recordAtBat()
          .withGameId(gameId)
          .withBatter(batterId)
          .withResult(AtBatResultType.TRIPLE)
          .withRunnerAdvances([])
          .withNotes(notes)
          .withTimestamp(timestamp)
          .build();

        expect(command.gameId.value).toBe(gameId);
        expect(command.batterId.value).toBe(batterId);
        expect(command.result).toBe(AtBatResultType.TRIPLE);
        expect(command.notes).toBe(notes);
        expect(command.timestamp).toBe(timestamp);
      });

      it('should create new builder instances for immutability', () => {
        const original = CommandTestBuilder.recordAtBat();
        const modified = original.withResult(AtBatResultType.DOUBLE);

        expect(original).not.toBe(modified);
        expect(original).toBeInstanceOf(RecordAtBatCommandBuilder);
        expect(modified).toBeInstanceOf(RecordAtBatCommandBuilder);
      });
    });
  });

  describe('StartNewGameCommandBuilder', () => {
    describe('defaults and basic building', () => {
      it('should create command with default values', () => {
        const command = CommandTestBuilder.startNewGame().build();

        expect(command.gameId).toBeInstanceOf(GameId);
        expect(command.homeTeamName).toBe('Home Team');
        expect(command.awayTeamName).toBe('Away Team');
        expect(command.ourTeamSide).toBe('HOME');
        expect(command.gameDate).toBeInstanceOf(Date);
        expect(command.initialLineup).toEqual([]);
      });

      it('should not include optional fields when not set', () => {
        const command = CommandTestBuilder.startNewGame().build();

        expect(command).not.toHaveProperty('location');
        expect(command).not.toHaveProperty('gameRules');
      });
    });

    describe('customization methods', () => {
      it('should set game ID', () => {
        const gameId = 'new-game-123';
        const command = CommandTestBuilder.startNewGame().withGameId(gameId).build();

        expect(command.gameId.value).toBe(gameId);
      });

      it('should set team names', () => {
        const homeTeam = 'Falcons';
        const awayTeam = 'Tigers';
        const command = CommandTestBuilder.startNewGame().withTeamNames(homeTeam, awayTeam).build();

        expect(command.homeTeamName).toBe(homeTeam);
        expect(command.awayTeamName).toBe(awayTeam);
      });

      it('should set our team side', () => {
        const command = CommandTestBuilder.startNewGame().withOurTeamSide('AWAY').build();

        expect(command.ourTeamSide).toBe('AWAY');
      });

      it('should set game date', () => {
        const gameDate = new Date('2024-07-04');
        const command = CommandTestBuilder.startNewGame().withGameDate(gameDate).build();

        expect(command.gameDate).toBe(gameDate);
      });

      it('should set location', () => {
        const location = 'Central Park Field 3';
        const command = CommandTestBuilder.startNewGame().withLocation(location).build();

        expect(command.location).toBe(location);
      });

      it('should set initial lineup', () => {
        const lineup = [
          {
            playerId: new PlayerId('player-1'),
            name: 'John Doe',
            jerseyNumber: JerseyNumber.fromNumber(10),
            fieldPosition: FieldPosition.SHORTSTOP,
            battingOrderPosition: 1,
            preferredPositions: [],
          },
        ];
        const command = CommandTestBuilder.startNewGame().withInitialLineup(lineup).build();

        expect(command.initialLineup).toBe(lineup);
      });

      it('should set game rules', () => {
        const rules = {
          inningsCount: 9,
          mercyRuleEnabled: true,
          mercyRuleInning4: 15,
          mercyRuleInning5: 10,
          extraPlayerAllowed: true,
          maxPlayersInLineup: 12,
        };
        const command = CommandTestBuilder.startNewGame().withGameRules(rules).build();

        expect(command.gameRules).toBe(rules);
      });
    });
  });

  describe('SubstitutePlayerCommandBuilder', () => {
    describe('defaults and basic building', () => {
      it('should create command with default values', () => {
        const command = CommandTestBuilder.substitutePlayer().build();

        expect(command.gameId).toBeInstanceOf(GameId);
        expect(command.teamLineupId).toBeInstanceOf(TeamLineupId);
        expect(command.battingSlot).toBe(1);
        expect(command.outgoingPlayerId).toBeInstanceOf(PlayerId);
        expect(command.incomingPlayerId).toBeInstanceOf(PlayerId);
        expect(command.incomingPlayerName).toBe('Incoming Player');
        expect(command.incomingJerseyNumber).toBeInstanceOf(JerseyNumber);
        expect(command.newFieldPosition).toBe(FieldPosition.PITCHER);
        expect(command.inning).toBe(3);
        expect(command.isReentry).toBe(false);
      });

      it('should not include optional fields when not set', () => {
        const command = CommandTestBuilder.substitutePlayer().build();

        expect(command).not.toHaveProperty('notes');
        expect(command).not.toHaveProperty('timestamp');
      });
    });

    describe('customization methods', () => {
      it('should set game and lineup IDs', () => {
        const gameId = 'sub-game-123';
        const lineupId = 'lineup-456';

        const command = CommandTestBuilder.substitutePlayer()
          .withGameId(gameId)
          .withTeamLineupId(lineupId)
          .build();

        expect(command.gameId.value).toBe(gameId);
        expect(command.teamLineupId.value).toBe(lineupId);
      });

      it('should set batting slot', () => {
        const slot = 7;
        const command = CommandTestBuilder.substitutePlayer().withBattingSlot(slot).build();

        expect(command.battingSlot).toBe(slot);
      });

      it('should set player IDs and name', () => {
        const outgoingId = 'outgoing-123';
        const incomingId = 'incoming-456';
        const incomingName = 'Jane Smith';

        const command = CommandTestBuilder.substitutePlayer()
          .withPlayers(outgoingId, incomingId, incomingName)
          .build();

        expect(command.outgoingPlayerId.value).toBe(outgoingId);
        expect(command.incomingPlayerId.value).toBe(incomingId);
        expect(command.incomingPlayerName).toBe(incomingName);
      });

      it('should set jersey number from number', () => {
        const jerseyNum = 42;
        const command = CommandTestBuilder.substitutePlayer().withJerseyNumber(jerseyNum).build();

        expect(command.incomingJerseyNumber.value).toBe(jerseyNum.toString());
      });

      it('should set jersey number from JerseyNumber object', () => {
        const jerseyNumber = JerseyNumber.fromNumber(99);
        const command = CommandTestBuilder.substitutePlayer()
          .withJerseyNumber(jerseyNumber)
          .build();

        expect(command.incomingJerseyNumber).toBe(jerseyNumber);
      });

      it('should set field position', () => {
        const position = FieldPosition.CATCHER;
        const command = CommandTestBuilder.substitutePlayer().withFieldPosition(position).build();

        expect(command.newFieldPosition).toBe(position);
      });

      it('should set inning', () => {
        const inning = 6;
        const command = CommandTestBuilder.substitutePlayer().withInning(inning).build();

        expect(command.inning).toBe(inning);
      });

      it('should set reentry flag', () => {
        const command = CommandTestBuilder.substitutePlayer().withReentry(true).build();

        expect(command.isReentry).toBe(true);
      });

      it('should set notes and timestamp', () => {
        const notes = 'Injury substitution';
        const timestamp = new Date('2024-05-01');

        const command = CommandTestBuilder.substitutePlayer()
          .withNotes(notes)
          .withTimestamp(timestamp)
          .build();

        expect(command.notes).toBe(notes);
        expect(command.timestamp).toBe(timestamp);
      });
    });
  });

  describe('EndInningCommandBuilder', () => {
    describe('defaults and basic building', () => {
      it('should create command with default values', () => {
        const command = CommandTestBuilder.endInning().build();

        expect(command.gameId).toBeInstanceOf(GameId);
        expect(command.inning).toBe(1);
        expect(command.isTopHalf).toBe(true);
        expect(command.endingReason).toBe('THREE_OUTS');
        expect(command.finalOuts).toBe(3);
      });
    });

    describe('customization methods', () => {
      it('should set game ID', () => {
        const gameId = 'end-inning-game';
        const command = CommandTestBuilder.endInning().withGameId(gameId).build();

        expect(command.gameId.value).toBe(gameId);
      });

      it('should set inning and half', () => {
        const command = CommandTestBuilder.endInning().withInning(7, false).build();

        expect(command.inning).toBe(7);
        expect(command.isTopHalf).toBe(false);
      });

      it('should set ending reason with default outs', () => {
        const command = CommandTestBuilder.endInning().withEndingReason('MERCY_RULE').build();

        expect(command.endingReason).toBe('MERCY_RULE');
        expect(command.finalOuts).toBe(3); // Should maintain previous default
      });

      it('should set ending reason with custom outs', () => {
        const command = CommandTestBuilder.endInning().withEndingReason('FORFEIT', 2).build();

        expect(command.endingReason).toBe('FORFEIT');
        expect(command.finalOuts).toBe(2);
      });

      it('should set notes', () => {
        const notes = 'Mercy rule applied';
        const command = CommandTestBuilder.endInning().withNotes(notes).build();

        expect(command.notes).toBe(notes);
      });
    });
  });

  describe('UndoCommandBuilder', () => {
    describe('defaults and basic building', () => {
      it('should create command with default values', () => {
        const command = CommandTestBuilder.undo().build();

        expect(command.gameId).toBeInstanceOf(GameId);
        expect(command).not.toHaveProperty('actionLimit');
        expect(command).not.toHaveProperty('confirmDangerous');
        expect(command).not.toHaveProperty('notes');
        expect(command).not.toHaveProperty('timestamp');
      });
    });

    describe('customization methods', () => {
      it('should set action limit', () => {
        const limit = 5;
        const command = CommandTestBuilder.undo().withActionLimit(limit).build();

        expect(command.actionLimit).toBe(limit);
      });

      it('should set action limit with confirmation', () => {
        const command = CommandTestBuilder.undo().withActionLimit(10, true).build();

        expect(command.actionLimit).toBe(10);
        expect(command.confirmDangerous).toBe(true);
      });

      it('should set notes and timestamp', () => {
        const notes = 'Undo last at-bat';
        const timestamp = new Date('2024-06-01');

        const command = CommandTestBuilder.undo().withNotes(notes).withTimestamp(timestamp).build();

        expect(command.notes).toBe(notes);
        expect(command.timestamp).toBe(timestamp);
      });
    });
  });

  describe('RedoCommandBuilder', () => {
    describe('defaults and basic building', () => {
      it('should create command with default values', () => {
        const command = CommandTestBuilder.redo().build();

        expect(command.gameId).toBeInstanceOf(GameId);
        expect(command).not.toHaveProperty('actionLimit');
        expect(command).not.toHaveProperty('confirmDangerous');
        expect(command).not.toHaveProperty('notes');
        expect(command).not.toHaveProperty('timestamp');
      });
    });

    describe('customization methods', () => {
      it('should set action limit', () => {
        const limit = 3;
        const command = CommandTestBuilder.redo().withActionLimit(limit).build();

        expect(command.actionLimit).toBe(limit);
      });

      it('should set action limit with confirmation', () => {
        const command = CommandTestBuilder.redo().withActionLimit(7, true).build();

        expect(command.actionLimit).toBe(7);
        expect(command.confirmDangerous).toBe(true);
      });

      it('should set notes and timestamp', () => {
        const notes = 'Redo home run';
        const timestamp = new Date('2024-08-01');

        const command = CommandTestBuilder.redo().withNotes(notes).withTimestamp(timestamp).build();

        expect(command.notes).toBe(notes);
        expect(command.timestamp).toBe(timestamp);
      });
    });
  });

  describe('EventTestBuilder', () => {
    describe('creation and defaults', () => {
      it('should create event with specified type', () => {
        const eventType = 'GameStarted';
        const event = EventTestBuilder.create(eventType).build();

        expect(event.type).toBe(eventType);
        expect(event.gameId).toBeInstanceOf(GameId);
        expect(event.version).toBe(1);
        expect(event.timestamp).toBeInstanceOf(Date);
      });

      it('should generate unique event IDs by default', () => {
        const event1 = EventTestBuilder.create('TestEvent1').build();
        const event2 = EventTestBuilder.create('TestEvent2').build();

        expect(event1.eventId).not.toBe(event2.eventId);
      });
    });

    describe('customization methods', () => {
      it('should set game ID', () => {
        const gameId = 'event-game-123';
        const event = EventTestBuilder.create('TestEvent').withGameId(gameId).build();

        expect(event.gameId.value).toBe(gameId);
      });

      it('should set event ID', () => {
        const eventId = 'custom-event-456';
        const event = EventTestBuilder.create('TestEvent').withEventId(eventId).build();

        expect(event.eventId).toBe(eventId);
      });

      it('should set version', () => {
        const version = 5;
        const event = EventTestBuilder.create('TestEvent').withVersion(version).build();

        expect(event.version).toBe(version);
      });

      it('should set timestamp', () => {
        const timestamp = new Date('2024-09-01T12:00:00Z');
        const event = EventTestBuilder.create('TestEvent').withTimestamp(timestamp).build();

        expect(event.timestamp).toBe(timestamp);
      });

      it('should set event data', () => {
        const data = { playerId: 'player-123', result: 'HOME_RUN' };
        const event = EventTestBuilder.create('AtBatCompleted').withData(data).build();

        expect(event).toMatchObject(data);
      });
    });

    describe('method chaining', () => {
      it('should support full method chaining', () => {
        const gameId = 'chain-game';
        const eventId = 'chain-event';
        const version = 3;
        const timestamp = new Date('2024-10-01');
        const data = { action: 'test' };

        const event = EventTestBuilder.create('ChainedEvent')
          .withGameId(gameId)
          .withEventId(eventId)
          .withVersion(version)
          .withTimestamp(timestamp)
          .withData(data)
          .build();

        expect(event.type).toBe('ChainedEvent');
        expect(event.gameId.value).toBe(gameId);
        expect(event.eventId).toBe(eventId);
        expect(event.version).toBe(version);
        expect(event.timestamp).toBe(timestamp);
        expect(event).toMatchObject(data);
      });
    });
  });

  describe('builder immutability patterns', () => {
    it('should create new instances for each builder method', () => {
      const original = GameTestBuilder.create();
      const modified1 = original.withId('test-1');
      const modified2 = original.withId('test-2');

      expect(original).not.toBe(modified1);
      expect(original).not.toBe(modified2);
      expect(modified1).not.toBe(modified2);
    });

    it('should maintain previous values when chaining', () => {
      const builder = GameTestBuilder.create()
        .withId('persistent-id')
        .withTeamNames('Team A', 'Team B');

      const gameWithStatus = builder.withStatus(GameStatus.IN_PROGRESS).build();
      const gameWithDifferentStatus = builder.withStatus(GameStatus.COMPLETED).build();

      // Both should have the same ID and team names from earlier in the chain
      expect(gameWithStatus.id.value).toBe('persistent-id');
      expect(gameWithStatus.homeTeamName).toBe('Team A');
      expect(gameWithDifferentStatus.id.value).toBe('persistent-id');
      expect(gameWithDifferentStatus.homeTeamName).toBe('Team A');
    });
  });

  describe('builder integration scenarios', () => {
    it('should create consistent objects for use case testing', () => {
      const gameId = 'integration-game';
      const batterId = 'integration-batter';

      // Create consistent game and command
      const game = GameTestBuilder.create()
        .withId(gameId)
        .withStatus(GameStatus.IN_PROGRESS)
        .build();

      const command = CommandTestBuilder.recordAtBat()
        .withGameId(gameId)
        .withBatter(batterId)
        .withResult(AtBatResultType.DOUBLE)
        .build();

      expect(game.id.value).toBe(command.gameId.value);
      expect(command.batterId.value).toBe(batterId);
    });

    it('should support complex substitution scenarios', () => {
      const gameId = 'sub-scenario-game';
      const lineupId = 'sub-scenario-lineup';

      const game = GameTestBuilder.create().withId(gameId).build();

      const substitution = CommandTestBuilder.substitutePlayer()
        .withGameId(gameId)
        .withTeamLineupId(lineupId)
        .withBattingSlot(3)
        .withPlayers('outgoing-player', 'incoming-player', 'New Player')
        .withFieldPosition(FieldPosition.LEFT_FIELD)
        .withReentry(false)
        .build();

      expect(substitution.gameId.value).toBe(game.id.value);
      expect(substitution.battingSlot).toBe(3);
      expect(substitution.incomingPlayerName).toBe('New Player');
      expect(substitution.newFieldPosition).toBe(FieldPosition.LEFT_FIELD);
    });
  });
});
