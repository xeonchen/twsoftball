/**
 * @file CompleteAtBatSequenceCommand Tests
 * Comprehensive tests for command DTO to execute orchestrated at-bat sequence operations.
 */

import {
  GameId,
  PlayerId,
  AtBatResultType,
  FieldPosition,
  TeamLineupId,
  JerseyNumber,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  CompleteAtBatSequenceCommand,
  CompleteAtBatSequenceCommandValidator,
  CompleteAtBatSequenceCommandValidationError,
  CompleteAtBatSequenceCommandFactory,
} from './CompleteAtBatSequenceCommand';
import { RecordAtBatCommand } from './RecordAtBatCommand';
import { SubstitutePlayerCommand } from './SubstitutePlayerCommand';

describe('CompleteAtBatSequenceCommand', () => {
  let validCommand: CompleteAtBatSequenceCommand;
  let gameId: GameId;
  let atBatCommand: RecordAtBatCommand;
  let queuedSubstitutions: SubstitutePlayerCommand[];

  beforeEach(() => {
    gameId = GameId.generate();
    const batterId = PlayerId.generate();

    atBatCommand = {
      gameId,
      batterId,
      result: AtBatResultType.SINGLE,
      runnerAdvances: [],
    };

    queuedSubstitutions = [
      {
        gameId,
        teamLineupId: TeamLineupId.generate(),
        battingSlot: 3,
        outgoingPlayerId: PlayerId.generate(),
        incomingPlayerId: PlayerId.generate(),
        incomingPlayerName: 'Strategic Sub',
        incomingJerseyNumber: JerseyNumber.fromNumber(88),
        newFieldPosition: FieldPosition.LEFT_FIELD,
        inning: 3,
        isReentry: false,
        notes: 'Strategic change',
      },
      {
        gameId,
        teamLineupId: TeamLineupId.generate(),
        battingSlot: 5,
        outgoingPlayerId: PlayerId.generate(),
        incomingPlayerId: PlayerId.generate(),
        incomingPlayerName: 'Injury Sub',
        incomingJerseyNumber: JerseyNumber.fromNumber(89),
        newFieldPosition: FieldPosition.RIGHT_FIELD,
        inning: 3,
        isReentry: false,
        notes: 'Injury replacement',
      },
    ];

    validCommand = {
      gameId,
      atBatCommand,
      checkInningEnd: true,
      handleSubstitutions: true,
      queuedSubstitutions,
      notifyScoreChanges: true,
      maxRetryAttempts: 2,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid CompleteAtBatSequenceCommand with all required fields', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.atBatCommand).toBeDefined();
      expect(typeof command.checkInningEnd).toBe('boolean');
      expect(typeof command.handleSubstitutions).toBe('boolean');
      expect(Array.isArray(command.queuedSubstitutions)).toBe(true);
      expect(typeof command.notifyScoreChanges).toBe('boolean');
      expect(typeof command.maxRetryAttempts).toBe('number');
    });

    it('should handle optional fields with undefined values', () => {
      const minimalCommand: CompleteAtBatSequenceCommand = {
        gameId,
        atBatCommand,
      };

      expect(minimalCommand.checkInningEnd).toBeUndefined();
      expect(minimalCommand.handleSubstitutions).toBeUndefined();
      expect(minimalCommand.queuedSubstitutions).toBeUndefined();
      expect(minimalCommand.notifyScoreChanges).toBeUndefined();
      expect(minimalCommand.maxRetryAttempts).toBeUndefined();
    });

    it('should maintain proper data types for all fields', () => {
      const command = validCommand;

      expect(command.gameId).toEqual(gameId);
      expect(command.atBatCommand).toEqual(atBatCommand);
      expect(command.checkInningEnd).toBe(true);
      expect(command.handleSubstitutions).toBe(true);
      expect(command.queuedSubstitutions).toEqual(queuedSubstitutions);
      expect(command.notifyScoreChanges).toBe(true);
      expect(command.maxRetryAttempts).toBe(2);
    });
  });

  describe('CompleteAtBatSequenceCommandValidator', () => {
    describe('successful validation', () => {
      it('should pass validation for valid command with all fields', () => {
        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(validCommand);
        }).not.toThrow();
      });

      it('should pass validation for minimal command with required fields only', () => {
        const minimalCommand: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(minimalCommand);
        }).not.toThrow();
      });

      it('should pass validation with empty queuedSubstitutions', () => {
        const commandWithEmptySubstitutions: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand,
          queuedSubstitutions: [],
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(commandWithEmptySubstitutions);
        }).not.toThrow();
      });

      it('should pass validation without queuedSubstitutions field', () => {
        const commandWithoutSubstitutions: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand,
          handleSubstitutions: false,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(commandWithoutSubstitutions);
        }).not.toThrow();
      });
    });

    describe('basic field validation', () => {
      it('should reject command without gameId', () => {
        const invalidCommand = {
          ...validCommand,
          gameId: undefined as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Required for testing validation with invalid input types
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        try {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect(error).toBeInstanceOf(CompleteAtBatSequenceCommandValidationError);
          expect((error as Error).message).toBe('gameId is required');
        }
      });

      it('should reject command with null gameId', () => {
        const invalidCommand = {
          ...validCommand,
          gameId: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);
      });

      it('should reject command without atBatCommand', () => {
        const invalidCommand = {
          ...validCommand,
          atBatCommand: undefined as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        try {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect(error).toBeInstanceOf(CompleteAtBatSequenceCommandValidationError);
          expect((error as Error).message).toBe('atBatCommand is required');
        }
      });

      it('should reject command with null atBatCommand', () => {
        const invalidCommand = {
          ...validCommand,
          atBatCommand: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);
      });
    });

    describe('at-bat command validation', () => {
      it('should reject command when atBatCommand.gameId does not match command.gameId', () => {
        const differentGameId = GameId.generate();
        const mismatchedAtBatCommand = {
          ...atBatCommand,
          gameId: differentGameId,
        };

        const invalidCommand = {
          ...validCommand,
          atBatCommand: mismatchedAtBatCommand,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        try {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe(
            'atBatCommand.gameId must match the command gameId'
          );
        }
      });

      it('should pass validation when gameIds match', () => {
        const matchingAtBatCommand = {
          ...atBatCommand,
          gameId: gameId,
        };

        const validCommandWithMatching = {
          ...validCommand,
          atBatCommand: matchingAtBatCommand,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(validCommandWithMatching);
        }).not.toThrow();
      });
    });

    describe('configuration options validation', () => {
      describe('checkInningEnd validation', () => {
        it('should accept valid boolean values', () => {
          const trueCommand = { ...validCommand, checkInningEnd: true };
          const falseCommand = { ...validCommand, checkInningEnd: false };

          expect(() => CompleteAtBatSequenceCommandValidator.validate(trueCommand)).not.toThrow();
          expect(() => CompleteAtBatSequenceCommandValidator.validate(falseCommand)).not.toThrow();
        });

        it('should reject non-boolean values', () => {
          const invalidCommand = {
            ...validCommand,
            checkInningEnd: 'true' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteAtBatSequenceCommandValidationError);

          try {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe('checkInningEnd must be a boolean if provided');
          }
        });

        it('should accept undefined checkInningEnd', () => {
          const commandWithUndefined = { ...validCommand };
          delete (commandWithUndefined as any).checkInningEnd; // eslint-disable-line @typescript-eslint/no-explicit-any

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(commandWithUndefined);
          }).not.toThrow();
        });
      });

      describe('handleSubstitutions validation', () => {
        it('should accept valid boolean values', () => {
          const trueCommand = { ...validCommand, handleSubstitutions: true };
          const falseCommand = { ...validCommand, handleSubstitutions: false };

          expect(() => CompleteAtBatSequenceCommandValidator.validate(trueCommand)).not.toThrow();
          expect(() => CompleteAtBatSequenceCommandValidator.validate(falseCommand)).not.toThrow();
        });

        it('should reject non-boolean values', () => {
          const invalidCommand = {
            ...validCommand,
            handleSubstitutions: 1 as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteAtBatSequenceCommandValidationError);

          try {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe(
              'handleSubstitutions must be a boolean if provided'
            );
          }
        });
      });

      describe('notifyScoreChanges validation', () => {
        it('should accept valid boolean values', () => {
          const trueCommand = { ...validCommand, notifyScoreChanges: true };
          const falseCommand = { ...validCommand, notifyScoreChanges: false };

          expect(() => CompleteAtBatSequenceCommandValidator.validate(trueCommand)).not.toThrow();
          expect(() => CompleteAtBatSequenceCommandValidator.validate(falseCommand)).not.toThrow();
        });

        it('should reject non-boolean values', () => {
          const invalidCommand = {
            ...validCommand,
            notifyScoreChanges: 'yes' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteAtBatSequenceCommandValidationError);

          try {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe(
              'notifyScoreChanges must be a boolean if provided'
            );
          }
        });
      });

      describe('maxRetryAttempts validation', () => {
        it('should accept valid non-negative integers', () => {
          const validRetries = [0, 1, 5, 10];

          validRetries.forEach(attempts => {
            const command = { ...validCommand, maxRetryAttempts: attempts };
            expect(() => CompleteAtBatSequenceCommandValidator.validate(command)).not.toThrow();
          });
        });

        it('should reject negative values', () => {
          const invalidRetries = [-1, -5, -10];

          invalidRetries.forEach(attempts => {
            const invalidCommand = { ...validCommand, maxRetryAttempts: attempts };

            expect(() => {
              CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
            }).toThrow(CompleteAtBatSequenceCommandValidationError);

            try {
              CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
            } catch (error) {
              expect((error as Error).message).toBe(
                'maxRetryAttempts must be a non-negative integer'
              );
            }
          });
        });

        it('should reject values exceeding 10 limit', () => {
          const invalidCommand = { ...validCommand, maxRetryAttempts: 11 };

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteAtBatSequenceCommandValidationError);

          try {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe(
              'maxRetryAttempts cannot exceed 10 for safety limits'
            );
          }
        });

        it('should accept maxRetryAttempts at the 10 limit', () => {
          const commandAtLimit = { ...validCommand, maxRetryAttempts: 10 };

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(commandAtLimit);
          }).not.toThrow();
        });

        it('should reject non-integer values', () => {
          const nonIntegers = [3.5, 2.1, NaN, Infinity];

          nonIntegers.forEach(attempts => {
            const invalidCommand = { ...validCommand, maxRetryAttempts: attempts };

            expect(() => {
              CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
            }).toThrow(CompleteAtBatSequenceCommandValidationError);
          });
        });

        it('should reject string values', () => {
          const invalidCommand = { ...validCommand, maxRetryAttempts: '2' as any }; // eslint-disable-line @typescript-eslint/no-explicit-any

          expect(() => {
            CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteAtBatSequenceCommandValidationError);
        });
      });
    });

    describe('queued substitutions validation', () => {
      it('should pass validation when queuedSubstitutions is not provided', () => {
        const commandWithoutSubs = { ...validCommand };
        delete (commandWithoutSubs as any).queuedSubstitutions; // eslint-disable-line @typescript-eslint/no-explicit-any

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(commandWithoutSubs);
        }).not.toThrow();
      });

      it('should pass validation with valid substitutions array', () => {
        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(validCommand);
        }).not.toThrow();
      });

      it('should pass validation with empty substitutions array', () => {
        const commandWithEmpty = { ...validCommand, queuedSubstitutions: [] };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(commandWithEmpty);
        }).not.toThrow();
      });

      it('should reject non-array queuedSubstitutions', () => {
        const invalidCommand = {
          ...validCommand,
          queuedSubstitutions: 'not an array' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        try {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe('queuedSubstitutions must be an array if provided');
        }
      });

      it('should reject queuedSubstitutions exceeding 5 limit', () => {
        const tooManySubstitutions = Array.from({ length: 6 }, (_, i) => ({
          gameId,
          teamLineupId: TeamLineupId.generate(),
          battingSlot: (i % 9) + 1,
          outgoingPlayerId: PlayerId.generate(),
          incomingPlayerId: PlayerId.generate(),
          incomingPlayerName: `Sub Player ${i}`,
          incomingJerseyNumber: JerseyNumber.fromNumber((i % 99) + 10),
          newFieldPosition: FieldPosition.LEFT_FIELD,
          inning: 3,
          isReentry: false,
          notes: `Sub ${i}`,
        }));

        const invalidCommand = {
          ...validCommand,
          queuedSubstitutions: tooManySubstitutions,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        try {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe(
            'queuedSubstitutions cannot exceed 5 substitutions per at-bat'
          );
        }
      });

      it('should accept queuedSubstitutions at the 5 limit', () => {
        const exactlyLimitSubstitutions = Array.from({ length: 5 }, (_, i) => ({
          gameId,
          teamLineupId: TeamLineupId.generate(),
          battingSlot: i + 1,
          outgoingPlayerId: PlayerId.generate(),
          incomingPlayerId: PlayerId.generate(),
          incomingPlayerName: `Sub Player ${i}`,
          incomingJerseyNumber: JerseyNumber.fromNumber((i % 99) + 20),
          newFieldPosition: FieldPosition.LEFT_FIELD,
          inning: 3,
          isReentry: false,
          notes: `Sub ${i}`,
        }));

        const commandAtLimit = {
          ...validCommand,
          queuedSubstitutions: exactlyLimitSubstitutions,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(commandAtLimit);
        }).not.toThrow();
      });

      it('should reject duplicate battingSlot values in queuedSubstitutions', () => {
        const duplicateSlotSubstitutions = [
          {
            gameId,
            teamLineupId: TeamLineupId.generate(),
            battingSlot: 3,
            outgoingPlayerId: PlayerId.generate(),
            incomingPlayerId: PlayerId.generate(),
            incomingPlayerName: 'First Sub',
            incomingJerseyNumber: JerseyNumber.fromNumber(30),
            newFieldPosition: FieldPosition.LEFT_FIELD,
            inning: 3,
            isReentry: false,
            notes: 'First sub',
          },
          {
            gameId,
            teamLineupId: TeamLineupId.generate(),
            battingSlot: 3, // Duplicate batting slot
            outgoingPlayerId: PlayerId.generate(),
            incomingPlayerId: PlayerId.generate(),
            incomingPlayerName: 'Second Sub',
            incomingJerseyNumber: JerseyNumber.fromNumber(31),
            newFieldPosition: FieldPosition.RIGHT_FIELD,
            inning: 3,
            isReentry: false,
            notes: 'Second sub',
          },
        ];

        const invalidCommand = {
          ...validCommand,
          queuedSubstitutions: duplicateSlotSubstitutions,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        try {
          CompleteAtBatSequenceCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe(
            'queuedSubstitutions cannot have duplicate battingSlot values'
          );
        }
      });

      it('should accept queuedSubstitutions with unique battingSlot values', () => {
        const uniqueSlotSubstitutions = [
          {
            gameId,
            teamLineupId: TeamLineupId.generate(),
            battingSlot: 1,
            outgoingPlayerId: PlayerId.generate(),
            incomingPlayerId: PlayerId.generate(),
            incomingPlayerName: 'First Sub',
            incomingJerseyNumber: JerseyNumber.fromNumber(40),
            newFieldPosition: FieldPosition.LEFT_FIELD,
            inning: 3,
            isReentry: false,
            notes: 'First sub',
          },
          {
            gameId,
            teamLineupId: TeamLineupId.generate(),
            battingSlot: 2,
            outgoingPlayerId: PlayerId.generate(),
            incomingPlayerId: PlayerId.generate(),
            incomingPlayerName: 'Second Sub',
            incomingJerseyNumber: JerseyNumber.fromNumber(41),
            newFieldPosition: FieldPosition.RIGHT_FIELD,
            inning: 3,
            isReentry: false,
            notes: 'Second sub',
          },
          {
            gameId,
            teamLineupId: TeamLineupId.generate(),
            battingSlot: 3,
            outgoingPlayerId: PlayerId.generate(),
            incomingPlayerId: PlayerId.generate(),
            incomingPlayerName: 'Third Sub',
            incomingJerseyNumber: JerseyNumber.fromNumber(42),
            newFieldPosition: FieldPosition.CENTER_FIELD,
            inning: 3,
            isReentry: false,
            notes: 'Third sub',
          },
        ];

        const validCommandWithUnique = {
          ...validCommand,
          queuedSubstitutions: uniqueSlotSubstitutions,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(validCommandWithUnique);
        }).not.toThrow();
      });

      it('should allow null queuedSubstitutions (treated as no substitutions)', () => {
        const commandWithNull = {
          ...validCommand,
          queuedSubstitutions: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        // null queuedSubstitutions should be allowed (treated as undefined)
        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(commandWithNull);
        }).not.toThrow();
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle commands with maximum allowed values', () => {
        const maxSubstitutions = Array.from({ length: 5 }, (_, i) => ({
          gameId,
          teamLineupId: TeamLineupId.generate(),
          battingSlot: i + 1,
          outgoingPlayerId: PlayerId.generate(),
          incomingPlayerId: PlayerId.generate(),
          incomingPlayerName: `Max Sub ${i}`,
          incomingJerseyNumber: JerseyNumber.fromNumber((i % 99) + 60),
          newFieldPosition: FieldPosition.LEFT_FIELD,
          inning: 3,
          isReentry: false,
          notes: `Max sub ${i}`,
        }));

        const maxCommand: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand,
          checkInningEnd: true,
          handleSubstitutions: true,
          queuedSubstitutions: maxSubstitutions,
          notifyScoreChanges: true,
          maxRetryAttempts: 10,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(maxCommand);
        }).not.toThrow();
      });

      it('should handle commands with minimum allowed values', () => {
        const minCommand: CompleteAtBatSequenceCommand = {
          gameId,
          atBatCommand,
          checkInningEnd: false,
          handleSubstitutions: false,
          queuedSubstitutions: [],
          notifyScoreChanges: false,
          maxRetryAttempts: 0,
        };

        expect(() => {
          CompleteAtBatSequenceCommandValidator.validate(minCommand);
        }).not.toThrow();
      });

      it('should validate all combinations of boolean options', () => {
        const booleanCombinations = [
          { checkInningEnd: true, handleSubstitutions: true, notifyScoreChanges: true },
          { checkInningEnd: true, handleSubstitutions: true, notifyScoreChanges: false },
          { checkInningEnd: true, handleSubstitutions: false, notifyScoreChanges: true },
          { checkInningEnd: true, handleSubstitutions: false, notifyScoreChanges: false },
          { checkInningEnd: false, handleSubstitutions: true, notifyScoreChanges: true },
          { checkInningEnd: false, handleSubstitutions: true, notifyScoreChanges: false },
          { checkInningEnd: false, handleSubstitutions: false, notifyScoreChanges: true },
          { checkInningEnd: false, handleSubstitutions: false, notifyScoreChanges: false },
        ];

        booleanCombinations.forEach(options => {
          const command = { ...validCommand, ...options };
          expect(() => CompleteAtBatSequenceCommandValidator.validate(command)).not.toThrow();
        });
      });
    });
  });

  describe('CompleteAtBatSequenceCommandFactory', () => {
    describe('createSimple', () => {
      it('should create simple command with default options', () => {
        const command = CompleteAtBatSequenceCommandFactory.createSimple(gameId, atBatCommand);

        expect(command.gameId).toBe(gameId);
        expect(command.atBatCommand).toBe(atBatCommand);
        expect(command.checkInningEnd).toBe(true);
        expect(command.handleSubstitutions).toBe(false);
        expect(command.notifyScoreChanges).toBe(false);
        expect(command.maxRetryAttempts).toBe(1);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteAtBatSequenceCommandFactory.createSimple(gameId, atBatCommand);
        }).not.toThrow();
      });

      it('should throw validation error for mismatched gameIds', () => {
        const differentGameId = GameId.generate();
        const mismatchedAtBat = { ...atBatCommand, gameId: differentGameId };

        expect(() => {
          CompleteAtBatSequenceCommandFactory.createSimple(gameId, mismatchedAtBat);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);
      });
    });

    describe('createFull', () => {
      it('should create command with all specified options', () => {
        const options = {
          checkInningEnd: false,
          handleSubstitutions: true,
          queuedSubstitutions: queuedSubstitutions,
          notifyScoreChanges: true,
          maxRetryAttempts: 5,
        };

        const command = CompleteAtBatSequenceCommandFactory.createFull(
          gameId,
          atBatCommand,
          options
        );

        expect(command.gameId).toBe(gameId);
        expect(command.atBatCommand).toBe(atBatCommand);
        expect(command.checkInningEnd).toBe(false);
        expect(command.handleSubstitutions).toBe(true);
        expect(command.queuedSubstitutions).toBe(queuedSubstitutions);
        expect(command.notifyScoreChanges).toBe(true);
        expect(command.maxRetryAttempts).toBe(5);
      });

      it('should use default options when not specified', () => {
        const command = CompleteAtBatSequenceCommandFactory.createFull(gameId, atBatCommand);

        expect(command.checkInningEnd).toBe(true);
        expect(command.handleSubstitutions).toBe(false);
        expect(command.notifyScoreChanges).toBe(false);
        expect(command.maxRetryAttempts).toBe(1);
        expect(command.queuedSubstitutions).toBeUndefined();
      });

      it('should handle options with queuedSubstitutions correctly', () => {
        const options = { queuedSubstitutions: queuedSubstitutions };
        const command = CompleteAtBatSequenceCommandFactory.createFull(
          gameId,
          atBatCommand,
          options
        );

        expect(command.queuedSubstitutions).toBe(queuedSubstitutions);
      });

      it('should not add queuedSubstitutions field when not provided', () => {
        const command = CompleteAtBatSequenceCommandFactory.createFull(gameId, atBatCommand, {});

        expect('queuedSubstitutions' in command).toBe(false);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteAtBatSequenceCommandFactory.createFull(gameId, atBatCommand);
        }).not.toThrow();
      });
    });

    describe('createWithSubstitutions', () => {
      it('should create command with substitutions and appropriate settings', () => {
        const command = CompleteAtBatSequenceCommandFactory.createWithSubstitutions(
          gameId,
          atBatCommand,
          queuedSubstitutions,
          true // enableNotifications
        );

        expect(command.gameId).toBe(gameId);
        expect(command.atBatCommand).toBe(atBatCommand);
        expect(command.checkInningEnd).toBe(true);
        expect(command.handleSubstitutions).toBe(true);
        expect(command.queuedSubstitutions).toBe(queuedSubstitutions);
        expect(command.notifyScoreChanges).toBe(true);
        expect(command.maxRetryAttempts).toBe(2); // Higher retry for complex operations
      });

      it('should handle enableNotifications parameter correctly', () => {
        const commandWithNotifications =
          CompleteAtBatSequenceCommandFactory.createWithSubstitutions(
            gameId,
            atBatCommand,
            queuedSubstitutions,
            true
          );

        const commandWithoutNotifications =
          CompleteAtBatSequenceCommandFactory.createWithSubstitutions(
            gameId,
            atBatCommand,
            queuedSubstitutions,
            false
          );

        expect(commandWithNotifications.notifyScoreChanges).toBe(true);
        expect(commandWithoutNotifications.notifyScoreChanges).toBe(false);
      });

      it('should default enableNotifications to false when not provided', () => {
        const command = CompleteAtBatSequenceCommandFactory.createWithSubstitutions(
          gameId,
          atBatCommand,
          queuedSubstitutions
        );

        expect(command.notifyScoreChanges).toBe(false);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteAtBatSequenceCommandFactory.createWithSubstitutions(
            gameId,
            atBatCommand,
            queuedSubstitutions
          );
        }).not.toThrow();
      });
    });

    describe('factory error handling', () => {
      it('should throw validation errors for invalid factory inputs', () => {
        const differentGameId = GameId.generate();
        const mismatchedAtBat = { ...atBatCommand, gameId: differentGameId };

        expect(() => {
          CompleteAtBatSequenceCommandFactory.createSimple(gameId, mismatchedAtBat);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        expect(() => {
          CompleteAtBatSequenceCommandFactory.createFull(gameId, mismatchedAtBat);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);

        expect(() => {
          CompleteAtBatSequenceCommandFactory.createWithSubstitutions(gameId, mismatchedAtBat, []);
        }).toThrow(CompleteAtBatSequenceCommandValidationError);
      });

      it('should throw validation errors for invalid substitutions', () => {
        const invalidSubstitutions = Array.from({ length: 6 }, (_, i) => ({
          gameId,
          teamLineupId: TeamLineupId.generate(),
          battingSlot: (i % 9) + 1,
          outgoingPlayerId: PlayerId.generate(),
          incomingPlayerId: PlayerId.generate(),
          incomingPlayerName: `Invalid Sub ${i}`,
          incomingJerseyNumber: JerseyNumber.fromNumber((i % 99) + 50),
          newFieldPosition: FieldPosition.LEFT_FIELD,
          inning: 3,
          isReentry: false,
          notes: `Invalid sub ${i}`,
        }));

        expect(() => {
          CompleteAtBatSequenceCommandFactory.createWithSubstitutions(
            gameId,
            atBatCommand,
            invalidSubstitutions
          );
        }).toThrow(CompleteAtBatSequenceCommandValidationError);
      });
    });
  });

  describe('CompleteAtBatSequenceCommandValidationError', () => {
    it('should have correct error name and message', () => {
      const error = new CompleteAtBatSequenceCommandValidationError('Test error message');

      expect(error.name).toBe('CompleteAtBatSequenceCommandValidationError');
      expect(error.message).toBe('Test error message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new CompleteAtBatSequenceCommandValidationError('Test error');
      }).toThrow(CompleteAtBatSequenceCommandValidationError);

      try {
        throw new CompleteAtBatSequenceCommandValidationError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(CompleteAtBatSequenceCommandValidationError);
        expect((error as Error).message).toBe('Test error');
      }
    });
  });
});
