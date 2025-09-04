/**
 * @file RecordAtBatCommand Tests
 * Tests for command DTO to record an at-bat result during a game.
 */

import { GameId, PlayerId, AtBatResultType } from '@twsoftball/domain';
import type { Base, AdvanceReason } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  RecordAtBatCommand,
  RecordAtBatCommandValidator,
  RecordAtBatCommandValidationError,
  RecordAtBatCommandFactory,
} from './RecordAtBatCommand';
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
      timestamp: new Date(), // Use current time to avoid timestamp validation issues
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

  describe('RecordAtBatCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should validate a complete valid command', () => {
        expect(() => RecordAtBatCommandValidator.validate(validCommand)).not.toThrow();
      });

      it('should throw error for missing gameId', () => {
        const invalidCommand = { ...validCommand, gameId: null } as unknown as RecordAtBatCommand;
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('gameId is required')
        );
      });

      it('should throw error for missing batterId', () => {
        const invalidCommand = { ...validCommand, batterId: null } as unknown as RecordAtBatCommand;
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('batterId is required')
        );
      });

      it('should throw error for missing result', () => {
        const invalidCommand = { ...validCommand, result: null } as unknown as RecordAtBatCommand;
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('result is required')
        );
      });

      it('should throw error for invalid AtBatResultType', () => {
        const invalidCommand = {
          ...validCommand,
          result: 'INVALID_RESULT',
        } as unknown as RecordAtBatCommand;
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('Invalid at-bat result: INVALID_RESULT')
        );
      });
    });

    describe('Runner Advances Validation', () => {
      it('should validate empty runner advances', () => {
        const command = { ...validCommand, runnerAdvances: [] };
        expect(() => RecordAtBatCommandValidator.validate(command)).not.toThrow();
      });

      it('should throw error for non-array runner advances', () => {
        const invalidCommand = {
          ...validCommand,
          runnerAdvances: 'not-array',
        } as unknown as RecordAtBatCommand;
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('runnerAdvances must be an array if provided')
        );
      });

      it('should throw error for too many runner advances', () => {
        const tooManyAdvances = Array.from({ length: 5 }, () => ({
          playerId: PlayerId.generate(),
          fromBase: 'FIRST' as const,
          toBase: 'SECOND' as const,
          advanceReason: 'HIT',
        }));
        const invalidCommand = { ...validCommand, runnerAdvances: tooManyAdvances };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError(
            'runnerAdvances cannot exceed 4 advances (max bases + batter)'
          )
        );
      });

      it('should throw error for duplicate player advances', () => {
        const duplicatePlayerId = PlayerId.generate();
        const duplicateAdvances: RunnerAdvanceDTO[] = [
          {
            playerId: duplicatePlayerId,
            fromBase: 'FIRST',
            toBase: 'SECOND',
            advanceReason: 'HIT',
          },
          {
            playerId: duplicatePlayerId,
            fromBase: 'SECOND',
            toBase: 'THIRD',
            advanceReason: 'HIT',
          },
        ];
        const invalidCommand = { ...validCommand, runnerAdvances: duplicateAdvances };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('Each player can only have one advance per at-bat')
        );
      });

      it('should throw error for missing playerId in advance', () => {
        const invalidAdvance = [
          {
            playerId: null as unknown as PlayerId,
            fromBase: 'FIRST' as const,
            toBase: 'SECOND' as const,
            advanceReason: 'HIT',
          },
        ];
        const invalidCommand = { ...validCommand, runnerAdvances: invalidAdvance };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('Runner advance at index 0: playerId is required')
        );
      });

      it('should throw error for invalid advance reason', () => {
        const invalidAdvance = [
          {
            playerId: PlayerId.generate(),
            fromBase: 'FIRST' as const,
            toBase: 'SECOND' as const,
            advanceReason: 'INVALID_REASON' as unknown as AdvanceReason,
          },
        ];
        const invalidCommand = { ...validCommand, runnerAdvances: invalidAdvance };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError(
            "Runner advance at index 0: invalid advanceReason 'INVALID_REASON'. Valid reasons: HIT, WALK, ERROR, WILD_PITCH, PASSED_BALL, STEAL, BALK, SACRIFICE, FIELDERS_CHOICE, OUT, GROUND_OUT, FLY_OUT, FORCE_OUT"
          )
        );
      });

      it('should throw error for both bases null', () => {
        const invalidAdvance = [
          {
            playerId: PlayerId.generate(),
            fromBase: null,
            toBase: null as unknown as Base,
            advanceReason: 'HIT',
          },
        ];
        const invalidCommand = { ...validCommand, runnerAdvances: invalidAdvance };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError(
            'Runner advance at index 0: both fromBase and toBase cannot be null'
          )
        );
      });

      it('should allow batter put out (fromBase null, toBase OUT)', () => {
        const validAdvance = [
          {
            playerId: PlayerId.generate(),
            fromBase: null,
            toBase: 'OUT' as const,
            advanceReason: 'GROUND_OUT',
          },
        ];
        const validCmd = { ...validCommand, runnerAdvances: validAdvance };
        expect(() => RecordAtBatCommandValidator.validate(validCmd)).not.toThrow(); // This should be valid - batter put out
      });

      it('should throw error for invalid fromBase', () => {
        const invalidAdvance = [
          {
            playerId: PlayerId.generate(),
            fromBase: 'INVALID_BASE' as unknown as Base,
            toBase: 'SECOND' as const,
            advanceReason: 'HIT',
          },
        ];
        const invalidCommand = { ...validCommand, runnerAdvances: invalidAdvance };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError(
            "Runner advance at index 0: invalid fromBase 'INVALID_BASE'"
          )
        );
      });

      it('should throw error for same fromBase and toBase', () => {
        const invalidAdvance = [
          {
            playerId: PlayerId.generate(),
            fromBase: 'SECOND' as const,
            toBase: 'SECOND' as const,
            advanceReason: 'HIT',
          },
        ];
        const invalidCommand = { ...validCommand, runnerAdvances: invalidAdvance };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError(
            'Runner advance at index 0: cannot advance from SECOND to the same base'
          )
        );
      });
    });

    describe('Notes Validation', () => {
      it('should allow empty string notes', () => {
        const command = { ...validCommand, notes: '' };
        expect(() => RecordAtBatCommandValidator.validate(command)).not.toThrow();
      });

      it('should throw error for notes exceeding length limit', () => {
        const longNotes = 'a'.repeat(501);
        const invalidCommand = { ...validCommand, notes: longNotes };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('notes cannot exceed 500 characters')
        );
      });

      it('should throw error for whitespace-only notes', () => {
        const invalidCommand = { ...validCommand, notes: '   ' };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('notes cannot be only whitespace')
        );
      });
    });

    describe('Timestamp Validation', () => {
      it('should validate valid timestamp', () => {
        const command = { ...validCommand, timestamp: new Date() };
        expect(() => RecordAtBatCommandValidator.validate(command)).not.toThrow();
      });

      it('should throw error for non-Date timestamp', () => {
        const invalidCommand = {
          ...validCommand,
          timestamp: 'not-a-date',
        } as unknown as RecordAtBatCommand;
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('timestamp must be a valid Date object')
        );
      });

      it('should throw error for invalid Date', () => {
        const invalidCommand = { ...validCommand, timestamp: new Date('invalid') };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('timestamp must be a valid Date')
        );
      });

      it('should throw error for timestamp too far in future', () => {
        const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
        const invalidCommand = { ...validCommand, timestamp: futureDate };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError(
            'timestamp cannot be more than 1 hour in the future'
          )
        );
      });

      it('should throw error for timestamp too far in past', () => {
        const pastDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400 days ago
        const invalidCommand = { ...validCommand, timestamp: pastDate };
        expect(() => RecordAtBatCommandValidator.validate(invalidCommand)).toThrow(
          new RecordAtBatCommandValidationError('timestamp cannot be more than 1 year in the past')
        );
      });
    });
  });

  describe('RecordAtBatCommandFactory', () => {
    describe('createSimple', () => {
      it('should create simple command with valid data', () => {
        const command = RecordAtBatCommandFactory.createSimple(
          gameId,
          batterId,
          AtBatResultType.SINGLE,
          'Clean hit to left field'
        );

        expect(command.gameId).toBe(gameId);
        expect(command.batterId).toBe(batterId);
        expect(command.result).toBe(AtBatResultType.SINGLE);
        expect(command.notes).toBe('Clean hit to left field');
        expect(command.runnerAdvances).toEqual([]);
        expect(command.timestamp).toBeInstanceOf(Date);
      });

      it('should create simple command without notes', () => {
        const command = RecordAtBatCommandFactory.createSimple(
          gameId,
          batterId,
          AtBatResultType.STRIKEOUT
        );

        expect(command.notes).toBeUndefined();
      });

      it('should throw validation error for invalid data', () => {
        expect(() =>
          RecordAtBatCommandFactory.createSimple(
            null as unknown as GameId,
            batterId,
            AtBatResultType.SINGLE
          )
        ).toThrow(RecordAtBatCommandValidationError);
      });
    });

    describe('createStrikeout', () => {
      it('should create strikeout command', () => {
        const command = RecordAtBatCommandFactory.createStrikeout(
          gameId,
          batterId,
          'Swinging strikeout'
        );

        expect(command.result).toBe(AtBatResultType.STRIKEOUT);
        expect(command.runnerAdvances).toEqual([]);
        expect(command.notes).toBe('Swinging strikeout');
      });
    });

    describe('createHomeRun', () => {
      it('should create home run command with no runners', () => {
        const command = RecordAtBatCommandFactory.createHomeRun(
          gameId,
          batterId,
          [],
          'Solo home run'
        );

        expect(command.result).toBe(AtBatResultType.HOME_RUN);
        expect(command.runnerAdvances).toHaveLength(1); // Just the batter
        expect(command.runnerAdvances?.[0]?.playerId).toBe(batterId);
        expect(command.runnerAdvances?.[0]?.fromBase).toBeNull();
        expect(command.runnerAdvances?.[0]?.toBase).toBe('HOME');
      });

      it('should create home run command with runners on base', () => {
        const runner1Id = PlayerId.generate();
        const command = RecordAtBatCommandFactory.createHomeRun(
          gameId,
          batterId,
          [runner1Id],
          'Two-run home run'
        );

        expect(command.runnerAdvances).toHaveLength(2); // Runner + batter
        expect(command.notes).toBe('Two-run home run');
      });
    });

    describe('createWalk', () => {
      it('should create walk command with no forced runners', () => {
        const command = RecordAtBatCommandFactory.createWalk(
          gameId,
          batterId,
          [],
          'Four pitch walk'
        );

        expect(command.result).toBe(AtBatResultType.WALK);
        expect(command.runnerAdvances).toHaveLength(1); // Just the batter
        expect(command.runnerAdvances?.[0]?.toBase).toBe('FIRST');
        expect(command.runnerAdvances?.[0]?.advanceReason).toBe('WALK');
      });

      it('should create walk command with forced runners', () => {
        const forcedRunner: RunnerAdvanceDTO = {
          playerId: PlayerId.generate(),
          fromBase: 'FIRST',
          toBase: 'SECOND',
          advanceReason: 'WALK',
        };

        const command = RecordAtBatCommandFactory.createWalk(
          gameId,
          batterId,
          [forcedRunner],
          'Bases loaded walk'
        );

        expect(command.runnerAdvances).toHaveLength(2); // Forced runner + batter
      });
    });
  });

  describe('RecordAtBatCommandValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new RecordAtBatCommandValidationError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('RecordAtBatCommandValidationError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RecordAtBatCommandValidationError);
    });
  });
});
