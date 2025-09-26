/**
 * @file Command Mapper Tests
 * Tests for Command mapper that converts UI data to Application commands following TDD approach.
 */

import { AtBatResultType } from '@twsoftball/application';
import { describe, it, expect } from 'vitest';

import {
  toStartNewGameCommand,
  toRecordAtBatCommand,
  toSubstitutePlayerCommand,
  toUndoCommand,
  toRedoCommand,
  toEndInningCommand,
  type UIStartGameData,
  type UIRecordAtBatData,
  type UISubstitutePlayerData,
  type UIUndoRedoData,
  type UIEndInningData,
} from './commandMapper';

describe('Command Mapper', () => {
  describe('toStartNewGameCommand', () => {
    it('should convert UI data to StartNewGameCommand with proper domain types', () => {
      const uiData: UIStartGameData = {
        gameId: 'game-123',
        homeTeamName: 'Eagles',
        awayTeamName: 'Hawks',
        ourTeamSide: 'HOME' as const,
        gameDate: new Date('2023-01-01'),
        initialLineup: [
          {
            playerId: 'player-1',
            name: 'John Smith',
            jerseyNumber: 15,
            battingOrderPosition: 1,
            fieldPosition: 'P',
            preferredPositions: ['P'],
          },
          {
            playerId: 'player-2',
            name: 'Jane Doe',
            jerseyNumber: 8,
            battingOrderPosition: 2,
            fieldPosition: 'C',
            preferredPositions: ['C'],
          },
        ],
      };

      const command = toStartNewGameCommand(uiData);

      expect(command.gameId.value).toBe('game-123');
      expect(command.homeTeamName).toBe('Eagles');
      expect(command.awayTeamName).toBe('Hawks');
      expect(command.ourTeamSide).toBe('HOME');
      expect(command.gameDate).toEqual(new Date('2023-01-01'));
      expect(command.initialLineup).toHaveLength(2);
      expect(command.initialLineup[0].playerId.value).toBe('player-1');
      expect(command.initialLineup[0].name).toBe('John Smith');
      expect(command.initialLineup[0].jerseyNumber.value).toBe('15');
      expect(command.initialLineup[0].battingOrderPosition).toBe(1);
      expect(command.initialLineup[0].fieldPosition).toBe('P');
      expect(command.initialLineup[1].playerId.value).toBe('player-2');
      expect(command.initialLineup[1].name).toBe('Jane Doe');
      expect(command.initialLineup[1].jerseyNumber.value).toBe('8');
      expect(command.initialLineup[1].battingOrderPosition).toBe(2);
      expect(command.initialLineup[1].fieldPosition).toBe('C');
    });

    it('should handle empty lineups', () => {
      const uiData: UIStartGameData = {
        gameId: 'empty-game',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        ourTeamSide: 'HOME' as const,
        gameDate: new Date('2023-01-01'),
        initialLineup: [],
      };

      const command = toStartNewGameCommand(uiData);

      expect(command.initialLineup).toEqual([]);
      expect(command.gameId).toEqual({ value: 'empty-game' });
    });

    it('should preserve all lineup data accurately', () => {
      const uiData: UIStartGameData = {
        gameId: 'test-game',
        homeTeamName: 'Test Home',
        awayTeamName: 'Test Away',
        ourTeamSide: 'HOME' as const,
        gameDate: new Date('2023-01-01'),
        initialLineup: [
          {
            playerId: 'p1',
            name: 'Player One',
            jerseyNumber: 1,
            battingOrderPosition: 1,
            fieldPosition: '1B',
            preferredPositions: ['1B'],
          },
          {
            playerId: 'p2',
            name: 'Player Two',
            jerseyNumber: 2,
            battingOrderPosition: 2,
            fieldPosition: '2B',
            preferredPositions: ['2B'],
          },
          {
            playerId: 'p3',
            name: 'Player Three',
            jerseyNumber: 3,
            battingOrderPosition: 3,
            fieldPosition: '3B',
            preferredPositions: ['3B'],
          },
        ],
      };

      const command = toStartNewGameCommand(uiData);

      expect(command.initialLineup).toHaveLength(3);
      expect(command.initialLineup[1].playerId.value).toBe('p2');
      expect(command.initialLineup[1].name).toBe('Player Two');
      expect(command.initialLineup[1].jerseyNumber.value).toBe('2');
      expect(command.initialLineup[1].battingOrderPosition).toBe(2);
      expect(command.initialLineup[1].fieldPosition).toBe('2B');
    });
  });

  describe('toRecordAtBatCommand', () => {
    it('should convert UI data to RecordAtBatCommand with proper domain types', () => {
      const uiData: UIRecordAtBatData = {
        gameId: 'game-456',
        batterId: 'batter-1',
        result: 'SINGLE',
        runnerAdvances: [
          {
            playerId: 'runner-1',
            fromBase: 'FIRST',
            toBase: 'SECOND',
            advanceReason: 'BATTED_BALL',
          },
          {
            playerId: 'runner-2',
            fromBase: 'SECOND',
            toBase: 'THIRD',
            advanceReason: 'BATTED_BALL',
          },
        ],
      };

      const command = toRecordAtBatCommand(uiData);

      expect(command).toEqual({
        gameId: { value: 'game-456' },
        batterId: { value: 'batter-1' },
        result: 'SINGLE',
        runnerAdvances: [
          {
            playerId: { value: 'runner-1' },
            fromBase: 'FIRST',
            toBase: 'SECOND',
            advanceReason: 'BATTED_BALL',
          },
          {
            playerId: { value: 'runner-2' },
            fromBase: 'SECOND',
            toBase: 'THIRD',
            advanceReason: 'BATTED_BALL',
          },
        ],
      });
    });

    it('should handle empty runner advances', () => {
      const uiData: UIRecordAtBatData = {
        gameId: 'simple-game',
        batterId: 'simple-batter',
        result: 'STRIKEOUT',
        runnerAdvances: [],
      };

      const command = toRecordAtBatCommand(uiData);

      expect(command.runnerAdvances).toEqual([]);
      expect(command.gameId).toEqual({ value: 'simple-game' });
      expect(command.batterId).toEqual({ value: 'simple-batter' });
      expect(command.result).toBe('STRIKEOUT');
    });

    it('should handle complex runner scenarios', () => {
      const uiData: UIRecordAtBatData = {
        gameId: 'complex-game',
        batterId: 'power-hitter',
        result: 'TRIPLE',
        runnerAdvances: [
          { playerId: 'r1', fromBase: 'FIRST', toBase: 'HOME', advanceReason: 'BATTED_BALL' }, // Runner scores
          { playerId: 'r2', fromBase: 'SECOND', toBase: 'HOME', advanceReason: 'BATTED_BALL' }, // Runner scores
          {
            playerId: 'power-hitter',
            fromBase: null,
            toBase: 'THIRD',
            advanceReason: 'BATTED_BALL',
          }, // Batter to third
        ],
      };

      const command = toRecordAtBatCommand(uiData);

      expect(command.runnerAdvances).toHaveLength(3);
      expect(command.runnerAdvances[0]).toEqual({
        playerId: { value: 'r1' },
        fromBase: 'FIRST',
        toBase: 'HOME',
        advanceReason: 'BATTED_BALL',
      });
    });
  });

  describe('toSubstitutePlayerCommand', () => {
    it('should convert UI data to SubstitutePlayerCommand with proper domain types', () => {
      const uiData: UISubstitutePlayerData = {
        gameId: 'game-789',
        teamLineupId: 'team-lineup-1',
        battingSlot: 1,
        outgoingPlayerId: 'starter-1',
        incomingPlayerId: 'substitute-1',
        incomingPlayerName: 'Substitute Player',
        incomingJerseyNumber: 99,
        newFieldPosition: 'RF',
        inning: 1,
        isReentry: false,
      };

      const command = toSubstitutePlayerCommand(uiData);

      expect(command.gameId.value).toBe('game-789');
      expect(command.teamLineupId.value).toBe('team-lineup-1');
      expect(command.battingSlot).toBe(1);
      expect(command.outgoingPlayerId.value).toBe('starter-1');
      expect(command.incomingPlayerId.value).toBe('substitute-1');
      expect(command.incomingPlayerName).toBe('Substitute Player');
      expect(command.incomingJerseyNumber.value).toBe('99');
      expect(command.newFieldPosition).toBe('RF');
      expect(command.inning).toBe(1);
      expect(command.isReentry).toBe(false);
    });

    it('should handle all field positions correctly', () => {
      const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF'];

      positions.forEach(position => {
        const uiData: UISubstitutePlayerData = {
          gameId: 'position-test',
          teamLineupId: 'team-lineup-test',
          battingSlot: 1,
          outgoingPlayerId: 'out-player',
          incomingPlayerId: 'in-player',
          incomingPlayerName: 'Test Player',
          incomingJerseyNumber: 1,
          newFieldPosition: position,
          inning: 1,
          isReentry: false,
        };

        const command = toSubstitutePlayerCommand(uiData);
        expect(command.newFieldPosition).toBe(position);
      });
    });
  });

  describe('toUndoCommand', () => {
    it('should convert UI data to UndoCommand with proper domain types', () => {
      const uiData: UIUndoRedoData = {
        gameId: 'undo-game',
      };

      const command = toUndoCommand(uiData);

      expect(command).toEqual({
        gameId: { value: 'undo-game' },
      });
    });

    it('should handle various game ID formats', () => {
      const gameIds = ['simple-id', 'game_with_underscores', 'UPPERCASE-ID', '123-numeric'];

      gameIds.forEach(gameId => {
        const uiData: UIUndoRedoData = { gameId };
        const command = toUndoCommand(uiData);
        expect(command.gameId).toEqual({ value: gameId });
      });
    });
  });

  describe('toRedoCommand', () => {
    it('should convert UI data to RedoCommand with proper domain types', () => {
      const uiData: UIUndoRedoData = {
        gameId: 'redo-game',
      };

      const command = toRedoCommand(uiData);

      expect(command).toEqual({
        gameId: { value: 'redo-game' },
      });
    });

    it('should create identical structure to undo command', () => {
      const uiData: UIUndoRedoData = { gameId: 'same-game' };

      const undoCommand = toUndoCommand(uiData);
      const redoCommand = toRedoCommand(uiData);

      expect(undoCommand).toEqual(redoCommand);
    });
  });

  describe('toEndInningCommand', () => {
    it('should convert UI data to EndInningCommand with proper domain types', () => {
      const uiData: UIEndInningData = {
        gameId: 'inning-end-game',
      };

      const command = toEndInningCommand(uiData);

      expect(command).toEqual({
        gameId: { value: 'inning-end-game' },
      });
    });

    it('should work with any game ID', () => {
      const testCases = [
        'regular-game-id',
        'GAME_123',
        'special-chars-!@#',
        'very-long-game-id-with-many-segments-and-hyphens',
      ];

      testCases.forEach(gameId => {
        const uiData: UIEndInningData = { gameId };
        const command = toEndInningCommand(uiData);
        expect(command.gameId).toEqual({ value: gameId });
      });
    });
  });

  describe('type safety', () => {
    it('should maintain type safety across all mappings', () => {
      // This test ensures TypeScript compilation validates proper types
      const startGameData: UIStartGameData = {
        gameId: 'type-safe-game',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        ourTeamSide: 'HOME',
        gameDate: new Date(),
        initialLineup: [],
      };

      const atBatData: UIRecordAtBatData = {
        gameId: 'type-safe-game',
        batterId: 'batter',
        result: 'SINGLE' as AtBatResultType,
        runnerAdvances: [],
      };

      const subData: UISubstitutePlayerData = {
        gameId: 'type-safe-game',
        teamLineupId: 'team-1',
        battingSlot: 1,
        outgoingPlayerId: 'out',
        incomingPlayerId: 'in',
        incomingPlayerName: 'Player',
        incomingJerseyNumber: 10,
        newFieldPosition: 'LF',
        inning: 1,
        isReentry: false,
      };

      const undoRedoData: UIUndoRedoData = {
        gameId: 'type-safe-game',
      };

      const endInningData: UIEndInningData = {
        gameId: 'type-safe-game',
        inning: 1,
        isTopHalf: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
      };

      // All these should compile and execute without type errors
      const startCmd = toStartNewGameCommand(startGameData);
      const atBatCmd = toRecordAtBatCommand(atBatData);
      const subCmd = toSubstitutePlayerCommand(subData);
      const undoCmd = toUndoCommand(undoRedoData);
      const redoCmd = toRedoCommand(undoRedoData);
      const endCmd = toEndInningCommand(endInningData);

      // Verify all commands have required structure
      expect(startCmd.gameId).toBeDefined();
      expect(atBatCmd.gameId).toBeDefined();
      expect(subCmd.gameId).toBeDefined();
      expect(undoCmd.gameId).toBeDefined();
      expect(redoCmd.gameId).toBeDefined();
      expect(endCmd.gameId).toBeDefined();
    });
  });
});
