/**
 * @file RecordAtBatCommand Tests
 * Tests for command DTO to record an at-bat result during a game.
 */

import { GameId, PlayerId, AtBatResultType } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { RecordAtBatCommand } from './RecordAtBatCommand';
import { RunnerAdvanceDTO } from './RunnerAdvanceDTO';

describe('RecordAtBatCommand', () => {
  let validCommand: RecordAtBatCommand;
  let gameId: GameId;
  let batterId: PlayerId;
  let runner1: PlayerId;
  let runner2: PlayerId;

  beforeEach(() => {
    gameId = GameId.generate();
    batterId = PlayerId.generate();
    runner1 = PlayerId.generate();
    runner2 = PlayerId.generate();

    validCommand = {
      gameId,
      batterId,
      result: AtBatResultType.DOUBLE,
      runnerAdvances: [
        {
          playerId: batterId,
          fromBase: null, // Batter
          toBase: 'SECOND',
          advanceReason: 'HIT',
        },
        {
          playerId: runner1,
          fromBase: 'FIRST',
          toBase: 'HOME',
          advanceReason: 'HIT',
        },
      ],
      notes: 'Line drive to left-center field',
      timestamp: new Date('2024-08-30T15:15:00Z'),
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid RecordAtBatCommand with all required fields', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.batterId).toBeInstanceOf(PlayerId);
      expect(Object.values(AtBatResultType)).toContain(command.result);
      expect(Array.isArray(command.runnerAdvances)).toBe(true);
      expect(typeof command.notes).toBe('string');
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should handle optional fields', () => {
      const minimalCommand: RecordAtBatCommand = {
        gameId,
        batterId,
        result: AtBatResultType.STRIKEOUT,
        runnerAdvances: [],
      };

      expect(minimalCommand.notes).toBeUndefined();
      expect(minimalCommand.timestamp).toBeUndefined();
      expect(minimalCommand.runnerAdvances).toHaveLength(0);
    });

    it('should maintain proper data types', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.batterId).toBeInstanceOf(PlayerId);
      expect(typeof command.notes).toBe('string');
      expect(command.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('At-Bat Result Types', () => {
    const resultTypes = [
      AtBatResultType.SINGLE,
      AtBatResultType.DOUBLE,
      AtBatResultType.TRIPLE,
      AtBatResultType.HOME_RUN,
      AtBatResultType.WALK,
      AtBatResultType.STRIKEOUT,
      AtBatResultType.GROUND_OUT,
      AtBatResultType.FLY_OUT,
      AtBatResultType.ERROR,
      AtBatResultType.FIELDERS_CHOICE,
      AtBatResultType.SACRIFICE_FLY,
      AtBatResultType.DOUBLE_PLAY,
      AtBatResultType.TRIPLE_PLAY,
    ];

    resultTypes.forEach(resultType => {
      it(`should handle ${resultType} result`, () => {
        const command: RecordAtBatCommand = {
          ...validCommand,
          result: resultType,
          runnerAdvances: [],
        };

        expect(command.result).toBe(resultType);
        expect(Object.values(AtBatResultType)).toContain(command.result);
      });
    });
  });

  describe('Runner Advances', () => {
    it('should handle empty runner advances', () => {
      const command: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.STRIKEOUT,
        runnerAdvances: [],
      };

      expect(command.runnerAdvances).toHaveLength(0);
    });

    it('should handle batter advance (fromBase: null)', () => {
      const command: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.SINGLE,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'FIRST',
            advanceReason: 'HIT',
          },
        ],
      };

      expect(command.runnerAdvances).toHaveLength(1);
      expect(command.runnerAdvances?.[0]?.fromBase).toBeNull();
      expect(command.runnerAdvances?.[0]?.toBase).toBe('FIRST');
      expect(command.runnerAdvances?.[0]?.playerId).toEqual(batterId);
    });

    it('should handle multiple runner advances', () => {
      const command: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.TRIPLE,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'THIRD',
            advanceReason: 'HIT',
          },
          {
            playerId: runner1,
            fromBase: 'FIRST',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: runner2,
            fromBase: 'SECOND',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ],
      };

      expect(command.runnerAdvances).toHaveLength(3);
      expect(command.runnerAdvances?.filter(a => a.toBase === 'HOME')).toHaveLength(2);
    });

    it('should handle runner being put out', () => {
      const command: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.FIELDERS_CHOICE,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'FIRST',
            advanceReason: 'FIELDERS_CHOICE',
          },
          {
            playerId: runner1,
            fromBase: 'FIRST',
            toBase: 'OUT',
            advanceReason: 'FORCE_OUT',
          },
        ],
      };

      expect(command.runnerAdvances).toHaveLength(2);
      expect(command.runnerAdvances?.[1]?.toBase).toBe('OUT');
      expect(command.runnerAdvances?.[1]?.advanceReason).toBe('FORCE_OUT');
    });

    it('should handle all valid base combinations', () => {
      const allBaseCombinations = [
        { from: null, to: 'FIRST' as const },
        { from: null, to: 'SECOND' as const },
        { from: null, to: 'THIRD' as const },
        { from: null, to: 'HOME' as const },
        { from: 'FIRST' as const, to: 'SECOND' as const },
        { from: 'FIRST' as const, to: 'THIRD' as const },
        { from: 'FIRST' as const, to: 'HOME' as const },
        { from: 'FIRST' as const, to: 'OUT' as const },
        { from: 'SECOND' as const, to: 'THIRD' as const },
        { from: 'SECOND' as const, to: 'HOME' as const },
        { from: 'SECOND' as const, to: 'OUT' as const },
        { from: 'THIRD' as const, to: 'HOME' as const },
        { from: 'THIRD' as const, to: 'OUT' as const },
      ];

      allBaseCombinations.forEach(({ from, to }) => {
        const advance: RunnerAdvanceDTO = {
          playerId: PlayerId.generate(),
          fromBase: from,
          toBase: to,
          advanceReason: 'TEST',
        };

        const command: RecordAtBatCommand = {
          ...validCommand,
          runnerAdvances: [advance],
        };

        expect(command.runnerAdvances?.[0]?.fromBase).toBe(from);
        expect(command.runnerAdvances?.[0]?.toBase).toBe(to);
      });
    });
  });

  describe('Advance Reasons', () => {
    it('should handle standard advance reasons', () => {
      const standardReasons = [
        'HIT',
        'WALK',
        'ERROR',
        'WILD_PITCH',
        'PASSED_BALL',
        'STEAL',
        'BALK',
        'FORCE',
        'FIELDERS_CHOICE',
        'SACRIFICE',
        'GROUND_OUT',
        'FLY_OUT',
        'FORCE_OUT',
      ];

      standardReasons.forEach(reason => {
        const advance: RunnerAdvanceDTO = {
          playerId: runner1,
          fromBase: 'FIRST',
          toBase: 'SECOND',
          advanceReason: reason,
        };

        const command: RecordAtBatCommand = {
          ...validCommand,
          runnerAdvances: [advance],
        };

        expect(command.runnerAdvances?.[0]?.advanceReason).toBe(reason);
      });
    });

    it('should handle custom advance reasons', () => {
      const customReason = 'DEFENSIVE_INDIFFERENCE';

      const advance: RunnerAdvanceDTO = {
        playerId: runner1,
        fromBase: 'SECOND',
        toBase: 'THIRD',
        advanceReason: customReason,
      };

      const command: RecordAtBatCommand = {
        ...validCommand,
        runnerAdvances: [advance],
      };

      expect(command.runnerAdvances?.[0]?.advanceReason).toBe(customReason);
    });
  });

  describe('Notes and Timestamp', () => {
    it('should handle descriptive notes', () => {
      const command: RecordAtBatCommand = {
        ...validCommand,
        notes: 'Hard line drive caught by diving center fielder',
      };

      expect(command.notes).toBe('Hard line drive caught by diving center fielder');
    });

    it('should handle empty notes', () => {
      const command: RecordAtBatCommand = {
        ...validCommand,
        notes: '',
      };

      expect(command.notes).toBe('');
    });

    it('should handle undefined notes', () => {
      const { notes, ...commandWithoutNotes } = validCommand;
      // notes is extracted but not used - this tests that we can omit it
      expect(notes).toBeDefined(); // notes from validCommand should exist

      const command: RecordAtBatCommand = {
        ...commandWithoutNotes,
        // notes is omitted to represent undefined
      };

      expect(command.notes).toBeUndefined();
    });

    it('should handle precise timestamps', () => {
      const preciseTime = new Date('2024-08-30T15:32:45.123Z');
      const command: RecordAtBatCommand = {
        ...validCommand,
        timestamp: preciseTime,
      };

      expect(command.timestamp).toEqual(preciseTime);
      expect(command.timestamp!.getMilliseconds()).toBe(123);
    });

    it('should handle undefined timestamp', () => {
      const { timestamp: _timestamp, ...commandWithoutTimestamp } = validCommand;
      const command: RecordAtBatCommand = {
        ...commandWithoutTimestamp,
      };

      expect(command.timestamp).toBeUndefined();
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.batterId).toBeInstanceOf(PlayerId);
      expect(Object.values(AtBatResultType)).toContain(command.result);

      command.runnerAdvances!.forEach(advance => {
        expect(advance.playerId).toBeInstanceOf(PlayerId);
      });
    });

    it('should maintain runner advance consistency', () => {
      const command = validCommand;

      command.runnerAdvances!.forEach(advance => {
        if (advance.fromBase === null) {
          // Batter advancing
          expect(advance.playerId).toEqual(batterId);
        } else {
          // Existing runner advancing
          expect(advance.playerId).not.toEqual(batterId);
        }

        expect(typeof advance.advanceReason).toBe('string');
        expect(advance.advanceReason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Specific Game Scenarios', () => {
    it('should handle home run scenario', () => {
      const homeRunCommand: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.HOME_RUN,
        runnerAdvances: [
          {
            playerId: runner1,
            fromBase: 'FIRST',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: runner2,
            fromBase: 'SECOND',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ],
        notes: '3-run home run over left field fence',
      };

      expect(homeRunCommand.result).toBe(AtBatResultType.HOME_RUN);
      expect(homeRunCommand.runnerAdvances!.filter(a => a.toBase === 'HOME')).toHaveLength(3);
      expect(homeRunCommand.notes).toContain('3-run');
    });

    it('should handle double play scenario', () => {
      const doublePlayCommand: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.DOUBLE_PLAY,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'GROUND_OUT',
          },
          {
            playerId: runner1,
            fromBase: 'FIRST',
            toBase: 'OUT',
            advanceReason: 'FORCE_OUT',
          },
        ],
        notes: '6-4-3 double play',
      };

      expect(doublePlayCommand.result).toBe(AtBatResultType.DOUBLE_PLAY);
      expect(doublePlayCommand.runnerAdvances!.filter(a => a.toBase === 'OUT')).toHaveLength(2);
    });

    it('should handle sacrifice fly scenario', () => {
      const sacrificeFlyCommand: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.SACRIFICE_FLY,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'FLY_OUT',
          },
          {
            playerId: runner1,
            fromBase: 'THIRD',
            toBase: 'HOME',
            advanceReason: 'SACRIFICE',
          },
        ],
        notes: 'Deep fly ball to center field, runner tags up and scores',
      };

      expect(sacrificeFlyCommand.result).toBe(AtBatResultType.SACRIFICE_FLY);
      expect(sacrificeFlyCommand.runnerAdvances!.find(a => a.toBase === 'HOME')).toBeDefined();
      expect(sacrificeFlyCommand.runnerAdvances!.find(a => a.toBase === 'OUT')).toBeDefined();
    });

    it('should handle walk scenario', () => {
      const walkCommand: RecordAtBatCommand = {
        ...validCommand,
        result: AtBatResultType.WALK,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'FIRST',
            advanceReason: 'WALK',
          },
        ],
        notes: 'Four straight balls',
      };

      expect(walkCommand.result).toBe(AtBatResultType.WALK);
      expect(walkCommand.runnerAdvances).toHaveLength(1);
      expect(walkCommand.runnerAdvances?.[0]?.toBase).toBe('FIRST');
      expect(walkCommand.runnerAdvances?.[0]?.advanceReason).toBe('WALK');
    });
  });
});
