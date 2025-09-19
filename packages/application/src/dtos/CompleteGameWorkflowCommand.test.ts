/**
 * @file CompleteGameWorkflowCommand Tests
 * Comprehensive tests for command DTO to execute complete game workflows.
 */

import {
  GameId,
  PlayerId,
  JerseyNumber,
  FieldPosition,
  AtBatResultType,
  TeamLineupId,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  CompleteGameWorkflowCommand,
  CompleteGameWorkflowCommandValidator,
  CompleteGameWorkflowCommandValidationError,
  CompleteGameWorkflowCommandFactory,
} from './CompleteGameWorkflowCommand.js';
import { RecordAtBatCommand } from './RecordAtBatCommand.js';
import { StartNewGameCommand, LineupPlayerDTO, GameRulesDTO } from './StartNewGameCommand.js';
import { SubstitutePlayerCommand } from './SubstitutePlayerCommand.js';

describe('CompleteGameWorkflowCommand', () => {
  let validCommand: CompleteGameWorkflowCommand;
  let startGameCommand: StartNewGameCommand;
  let atBatSequences: RecordAtBatCommand[];
  let substitutions: SubstitutePlayerCommand[];
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();

    // Create a valid lineup for the start game command
    const lineupPlayers: LineupPlayerDTO[] = Array.from({ length: 9 }, (_, i) => ({
      playerId: PlayerId.generate(),
      name: `Player ${i + 1}`,
      jerseyNumber: JerseyNumber.fromNumber(i + 1),
      battingOrderPosition: i + 1,
      fieldPosition: [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
      ][i]!,
      preferredPositions: [],
    }));

    const gameRules: GameRulesDTO = {
      mercyRuleEnabled: true,
      mercyRuleInning4: 15,
      mercyRuleInning5: 10,
      timeLimitMinutes: 60,
      extraPlayerAllowed: true,
      maxPlayersInLineup: 12,
    };

    startGameCommand = {
      gameId,
      homeTeamName: 'Eagles',
      awayTeamName: 'Hawks',
      ourTeamSide: 'HOME',
      gameDate: new Date('2024-08-30T14:00:00Z'),
      location: 'City Park Field 1',
      initialLineup: lineupPlayers,
      gameRules,
    };

    // Create sample at-bat sequences
    atBatSequences = [
      {
        gameId,
        batterId: lineupPlayers[0]!.playerId,
        result: AtBatResultType.SINGLE,
        runnerAdvances: [],
      },
      {
        gameId,
        batterId: lineupPlayers[1]!.playerId,
        result: AtBatResultType.DOUBLE,
        runnerAdvances: [],
      },
    ];

    // Create sample substitutions
    substitutions = [
      {
        gameId,
        teamLineupId: TeamLineupId.generate(),
        battingSlot: 5,
        outgoingPlayerId: PlayerId.generate(),
        incomingPlayerId: PlayerId.generate(),
        incomingPlayerName: 'Substitute Player',
        incomingJerseyNumber: JerseyNumber.fromNumber(99),
        newFieldPosition: FieldPosition.LEFT_FIELD,
        inning: 3,
        isReentry: false,
        notes: 'Strategic change',
      },
    ];

    validCommand = {
      startGameCommand,
      atBatSequences,
      substitutions,
      endGameNaturally: true,
      maxAttempts: 3,
      continueOnFailure: false,
      enableNotifications: true,
      operationDelay: 100,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid CompleteGameWorkflowCommand with all required fields', () => {
      const command = validCommand;

      expect(command.startGameCommand).toBeDefined();
      expect(Array.isArray(command.atBatSequences)).toBe(true);
      expect(Array.isArray(command.substitutions)).toBe(true);
      expect(typeof command.endGameNaturally).toBe('boolean');
      expect(typeof command.maxAttempts).toBe('number');
      expect(typeof command.continueOnFailure).toBe('boolean');
      expect(typeof command.enableNotifications).toBe('boolean');
      expect(typeof command.operationDelay).toBe('number');
    });

    it('should handle optional fields with undefined values', () => {
      const minimalCommand: CompleteGameWorkflowCommand = {
        startGameCommand,
        atBatSequences: [],
        substitutions: [],
      };

      expect(minimalCommand.endGameNaturally).toBeUndefined();
      expect(minimalCommand.maxAttempts).toBeUndefined();
      expect(minimalCommand.continueOnFailure).toBeUndefined();
      expect(minimalCommand.enableNotifications).toBeUndefined();
      expect(minimalCommand.operationDelay).toBeUndefined();
    });

    it('should maintain proper data types for all fields', () => {
      const command = validCommand;

      expect(command.startGameCommand).toEqual(startGameCommand);
      expect(command.atBatSequences).toEqual(atBatSequences);
      expect(command.substitutions).toEqual(substitutions);
      expect(command.endGameNaturally).toBe(true);
      expect(command.maxAttempts).toBe(3);
      expect(command.continueOnFailure).toBe(false);
      expect(command.enableNotifications).toBe(true);
      expect(command.operationDelay).toBe(100);
    });
  });

  describe('CompleteGameWorkflowCommandValidator', () => {
    describe('successful validation', () => {
      it('should pass validation for valid command with all fields', () => {
        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(validCommand);
        }).not.toThrow();
      });

      it('should pass validation for minimal command with required fields only', () => {
        const minimalCommand: CompleteGameWorkflowCommand = {
          startGameCommand,
          atBatSequences: [],
          substitutions: [],
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(minimalCommand);
        }).not.toThrow();
      });

      it('should pass validation with empty arrays', () => {
        const commandWithEmptyArrays: CompleteGameWorkflowCommand = {
          startGameCommand,
          atBatSequences: [],
          substitutions: [],
          endGameNaturally: true,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(commandWithEmptyArrays);
        }).not.toThrow();
      });
    });

    describe('basic field validation', () => {
      it('should reject command without startGameCommand', () => {
        const invalidCommand = {
          ...validCommand,
          startGameCommand: undefined as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        try {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect(error).toBeInstanceOf(CompleteGameWorkflowCommandValidationError);
          expect((error as Error).message).toBe('startGameCommand is required');
        }
      });

      it('should reject command with null startGameCommand', () => {
        const invalidCommand = {
          ...validCommand,
          startGameCommand: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);
      });
    });

    describe('at-bat sequences validation', () => {
      it('should reject non-array atBatSequences', () => {
        const invalidCommand = {
          ...validCommand,
          atBatSequences: 'not an array' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        try {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe('atBatSequences must be an array');
        }
      });

      it('should reject atBatSequences exceeding 200 limit', () => {
        const tooManyAtBats = Array.from({ length: 201 }, () => ({
          gameId,
          batterId: PlayerId.generate(),
          result: AtBatResultType.SINGLE,
          runnerAdvances: [],
        }));

        const invalidCommand = {
          ...validCommand,
          atBatSequences: tooManyAtBats,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        try {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe(
            'atBatSequences cannot exceed 200 at-bats for safety limits'
          );
        }
      });

      it('should accept atBatSequences at the 200 limit', () => {
        const exactlyLimitAtBats = Array.from({ length: 200 }, () => ({
          gameId,
          batterId: PlayerId.generate(),
          result: AtBatResultType.SINGLE,
          runnerAdvances: [],
        }));

        const commandAtLimit = {
          ...validCommand,
          atBatSequences: exactlyLimitAtBats,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(commandAtLimit);
        }).not.toThrow();
      });

      it('should reject null atBatSequences', () => {
        const invalidCommand = {
          ...validCommand,
          atBatSequences: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);
      });
    });

    describe('substitutions validation', () => {
      it('should reject non-array substitutions', () => {
        const invalidCommand = {
          ...validCommand,
          substitutions: 'not an array' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        try {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe('substitutions must be an array');
        }
      });

      it('should reject substitutions exceeding 50 limit', () => {
        const tooManySubstitutions = Array.from({ length: 51 }, (_, i) => ({
          gameId,
          teamLineupId: TeamLineupId.generate(),
          battingSlot: (i % 9) + 1,
          outgoingPlayerId: PlayerId.generate(),
          incomingPlayerId: PlayerId.generate(),
          incomingPlayerName: `Sub Player ${i}`,
          incomingJerseyNumber: JerseyNumber.fromNumber((i % 99) + 1),
          newFieldPosition: FieldPosition.LEFT_FIELD,
          inning: 3,
          isReentry: false,
          notes: `Sub ${i}`,
        }));

        const invalidCommand = {
          ...validCommand,
          substitutions: tooManySubstitutions,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        try {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        } catch (error) {
          expect((error as Error).message).toBe(
            'substitutions cannot exceed 50 substitutions for safety limits'
          );
        }
      });

      it('should accept substitutions at the 50 limit', () => {
        const exactlyLimitSubstitutions = Array.from({ length: 50 }, (_, i) => ({
          gameId,
          teamLineupId: TeamLineupId.generate(),
          battingSlot: (i % 9) + 1,
          outgoingPlayerId: PlayerId.generate(),
          incomingPlayerId: PlayerId.generate(),
          incomingPlayerName: `Sub Player ${i}`,
          incomingJerseyNumber: JerseyNumber.fromNumber((i % 99) + 1),
          newFieldPosition: FieldPosition.LEFT_FIELD,
          inning: 3,
          isReentry: false,
          notes: `Sub ${i}`,
        }));

        const commandAtLimit = {
          ...validCommand,
          substitutions: exactlyLimitSubstitutions,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(commandAtLimit);
        }).not.toThrow();
      });

      it('should reject null substitutions', () => {
        const invalidCommand = {
          ...validCommand,
          substitutions: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(invalidCommand);
        }).toThrow(CompleteGameWorkflowCommandValidationError);
      });
    });

    describe('workflow options validation', () => {
      describe('endGameNaturally validation', () => {
        it('should accept valid boolean values', () => {
          const trueCommand = { ...validCommand, endGameNaturally: true };
          const falseCommand = { ...validCommand, endGameNaturally: false };

          expect(() => CompleteGameWorkflowCommandValidator.validate(trueCommand)).not.toThrow();
          expect(() => CompleteGameWorkflowCommandValidator.validate(falseCommand)).not.toThrow();
        });

        it('should reject non-boolean values', () => {
          const invalidCommand = {
            ...validCommand,
            endGameNaturally: 'true' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteGameWorkflowCommandValidationError);

          try {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe('endGameNaturally must be a boolean if provided');
          }
        });

        it('should accept undefined endGameNaturally', () => {
          const commandWithUndefined = { ...validCommand };
          delete (commandWithUndefined as any).endGameNaturally; // eslint-disable-line @typescript-eslint/no-explicit-any

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(commandWithUndefined);
          }).not.toThrow();
        });
      });

      describe('maxAttempts validation', () => {
        it('should accept valid positive integers', () => {
          const validAttempts = [1, 3, 10, 20];

          validAttempts.forEach(attempts => {
            const command = { ...validCommand, maxAttempts: attempts };
            expect(() => CompleteGameWorkflowCommandValidator.validate(command)).not.toThrow();
          });
        });

        it('should reject zero or negative values', () => {
          const invalidAttempts = [0, -1, -5];

          invalidAttempts.forEach(attempts => {
            const invalidCommand = { ...validCommand, maxAttempts: attempts };

            expect(() => {
              CompleteGameWorkflowCommandValidator.validate(invalidCommand);
            }).toThrow(CompleteGameWorkflowCommandValidationError);

            try {
              CompleteGameWorkflowCommandValidator.validate(invalidCommand);
            } catch (error) {
              expect((error as Error).message).toBe(
                'maxAttempts must be a positive integer if provided'
              );
            }
          });
        });

        it('should reject values exceeding 20 limit', () => {
          const invalidCommand = { ...validCommand, maxAttempts: 21 };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteGameWorkflowCommandValidationError);

          try {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe('maxAttempts cannot exceed 20 for safety limits');
          }
        });

        it('should accept maxAttempts at the 20 limit', () => {
          const commandAtLimit = { ...validCommand, maxAttempts: 20 };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(commandAtLimit);
          }).not.toThrow();
        });

        it('should reject non-integer values', () => {
          const nonIntegers = [3.5, 2.1, NaN, Infinity];

          nonIntegers.forEach(attempts => {
            const invalidCommand = { ...validCommand, maxAttempts: attempts };

            expect(() => {
              CompleteGameWorkflowCommandValidator.validate(invalidCommand);
            }).toThrow(CompleteGameWorkflowCommandValidationError);
          });
        });

        it('should reject string values', () => {
          const invalidCommand = { ...validCommand, maxAttempts: '3' as any }; // eslint-disable-line @typescript-eslint/no-explicit-any

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteGameWorkflowCommandValidationError);
        });
      });

      describe('continueOnFailure validation', () => {
        it('should accept valid boolean values', () => {
          const trueCommand = { ...validCommand, continueOnFailure: true };
          const falseCommand = { ...validCommand, continueOnFailure: false };

          expect(() => CompleteGameWorkflowCommandValidator.validate(trueCommand)).not.toThrow();
          expect(() => CompleteGameWorkflowCommandValidator.validate(falseCommand)).not.toThrow();
        });

        it('should reject non-boolean values', () => {
          const invalidCommand = {
            ...validCommand,
            continueOnFailure: 1 as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteGameWorkflowCommandValidationError);

          try {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe(
              'continueOnFailure must be a boolean if provided'
            );
          }
        });
      });

      describe('enableNotifications validation', () => {
        it('should accept valid boolean values', () => {
          const trueCommand = { ...validCommand, enableNotifications: true };
          const falseCommand = { ...validCommand, enableNotifications: false };

          expect(() => CompleteGameWorkflowCommandValidator.validate(trueCommand)).not.toThrow();
          expect(() => CompleteGameWorkflowCommandValidator.validate(falseCommand)).not.toThrow();
        });

        it('should reject non-boolean values', () => {
          const invalidCommand = {
            ...validCommand,
            enableNotifications: 'yes' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteGameWorkflowCommandValidationError);

          try {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe(
              'enableNotifications must be a boolean if provided'
            );
          }
        });
      });

      describe('operationDelay validation', () => {
        it('should accept valid non-negative integers', () => {
          const validDelays = [0, 100, 1000, 5000, 30000];

          validDelays.forEach(delay => {
            const command = { ...validCommand, operationDelay: delay };
            expect(() => CompleteGameWorkflowCommandValidator.validate(command)).not.toThrow();
          });
        });

        it('should reject negative values', () => {
          const invalidDelays = [-1, -100, -1000];

          invalidDelays.forEach(delay => {
            const invalidCommand = { ...validCommand, operationDelay: delay };

            expect(() => {
              CompleteGameWorkflowCommandValidator.validate(invalidCommand);
            }).toThrow(CompleteGameWorkflowCommandValidationError);

            try {
              CompleteGameWorkflowCommandValidator.validate(invalidCommand);
            } catch (error) {
              expect((error as Error).message).toBe(
                'operationDelay must be a non-negative integer if provided'
              );
            }
          });
        });

        it('should reject values exceeding 30000ms limit', () => {
          const invalidCommand = { ...validCommand, operationDelay: 30001 };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          }).toThrow(CompleteGameWorkflowCommandValidationError);

          try {
            CompleteGameWorkflowCommandValidator.validate(invalidCommand);
          } catch (error) {
            expect((error as Error).message).toBe(
              'operationDelay cannot exceed 30000ms (30 seconds) for reasonable performance'
            );
          }
        });

        it('should accept operationDelay at the 30000ms limit', () => {
          const commandAtLimit = { ...validCommand, operationDelay: 30000 };

          expect(() => {
            CompleteGameWorkflowCommandValidator.validate(commandAtLimit);
          }).not.toThrow();
        });

        it('should reject non-integer values', () => {
          const nonIntegers = [100.5, 2.1, NaN, Infinity];

          nonIntegers.forEach(delay => {
            const invalidCommand = { ...validCommand, operationDelay: delay };

            expect(() => {
              CompleteGameWorkflowCommandValidator.validate(invalidCommand);
            }).toThrow(CompleteGameWorkflowCommandValidationError);
          });
        });
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle commands with maximum allowed values', () => {
        const maxCommand: CompleteGameWorkflowCommand = {
          startGameCommand,
          atBatSequences: Array.from({ length: 200 }, () => atBatSequences[0]!),
          substitutions: Array.from({ length: 50 }, () => substitutions[0]!),
          endGameNaturally: true,
          maxAttempts: 20,
          continueOnFailure: true,
          enableNotifications: true,
          operationDelay: 30000,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(maxCommand);
        }).not.toThrow();
      });

      it('should handle commands with minimum allowed values', () => {
        const minCommand: CompleteGameWorkflowCommand = {
          startGameCommand,
          atBatSequences: [],
          substitutions: [],
          endGameNaturally: false,
          maxAttempts: 1,
          continueOnFailure: false,
          enableNotifications: false,
          operationDelay: 0,
        };

        expect(() => {
          CompleteGameWorkflowCommandValidator.validate(minCommand);
        }).not.toThrow();
      });

      it('should validate all combinations of boolean options', () => {
        const booleanCombinations = [
          { endGameNaturally: true, continueOnFailure: true, enableNotifications: true },
          { endGameNaturally: true, continueOnFailure: true, enableNotifications: false },
          { endGameNaturally: true, continueOnFailure: false, enableNotifications: true },
          { endGameNaturally: true, continueOnFailure: false, enableNotifications: false },
          { endGameNaturally: false, continueOnFailure: true, enableNotifications: true },
          { endGameNaturally: false, continueOnFailure: true, enableNotifications: false },
          { endGameNaturally: false, continueOnFailure: false, enableNotifications: true },
          { endGameNaturally: false, continueOnFailure: false, enableNotifications: false },
        ];

        booleanCombinations.forEach(options => {
          const command = { ...validCommand, ...options };
          expect(() => CompleteGameWorkflowCommandValidator.validate(command)).not.toThrow();
        });
      });
    });
  });

  describe('CompleteGameWorkflowCommandFactory', () => {
    describe('createSimple', () => {
      it('should create simple command with default options', () => {
        const command = CompleteGameWorkflowCommandFactory.createSimple(
          startGameCommand,
          atBatSequences
        );

        expect(command.startGameCommand).toBe(startGameCommand);
        expect(command.atBatSequences).toBe(atBatSequences);
        expect(command.substitutions).toEqual([]);
        expect(command.endGameNaturally).toBe(true);
        expect(command.maxAttempts).toBe(3);
        expect(command.continueOnFailure).toBe(false);
        expect(command.enableNotifications).toBe(false);
        expect(command.operationDelay).toBe(0);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteGameWorkflowCommandFactory.createSimple(startGameCommand, atBatSequences);
        }).not.toThrow();
      });

      it('should throw validation error for invalid inputs', () => {
        const invalidAtBats = Array.from({ length: 201 }, () => atBatSequences[0]!);

        expect(() => {
          CompleteGameWorkflowCommandFactory.createSimple(startGameCommand, invalidAtBats);
        }).toThrow(CompleteGameWorkflowCommandValidationError);
      });
    });

    describe('createFull', () => {
      it('should create command with all specified options', () => {
        const options = {
          endGameNaturally: false,
          maxAttempts: 5,
          continueOnFailure: true,
          enableNotifications: true,
          operationDelay: 1000,
        };

        const command = CompleteGameWorkflowCommandFactory.createFull(
          startGameCommand,
          atBatSequences,
          substitutions,
          options
        );

        expect(command.startGameCommand).toBe(startGameCommand);
        expect(command.atBatSequences).toBe(atBatSequences);
        expect(command.substitutions).toBe(substitutions);
        expect(command.endGameNaturally).toBe(false);
        expect(command.maxAttempts).toBe(5);
        expect(command.continueOnFailure).toBe(true);
        expect(command.enableNotifications).toBe(true);
        expect(command.operationDelay).toBe(1000);
      });

      it('should use default options when not specified', () => {
        const command = CompleteGameWorkflowCommandFactory.createFull(
          startGameCommand,
          atBatSequences,
          substitutions
        );

        expect(command.endGameNaturally).toBe(true);
        expect(command.maxAttempts).toBe(3);
        expect(command.continueOnFailure).toBe(false);
        expect(command.enableNotifications).toBe(false);
        expect(command.operationDelay).toBe(0);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteGameWorkflowCommandFactory.createFull(
            startGameCommand,
            atBatSequences,
            substitutions
          );
        }).not.toThrow();
      });
    });

    describe('createDemo', () => {
      it('should create demo command with appropriate settings', () => {
        const command = CompleteGameWorkflowCommandFactory.createDemo(
          startGameCommand,
          atBatSequences,
          substitutions
        );

        expect(command.startGameCommand).toBe(startGameCommand);
        expect(command.atBatSequences).toBe(atBatSequences);
        expect(command.substitutions).toBe(substitutions);
        expect(command.endGameNaturally).toBe(true);
        expect(command.maxAttempts).toBe(2);
        expect(command.continueOnFailure).toBe(true); // Demo should continue despite errors
        expect(command.enableNotifications).toBe(true);
        expect(command.operationDelay).toBe(1000); // 1 second delay for demo pacing
      });

      it('should handle empty substitutions', () => {
        const command = CompleteGameWorkflowCommandFactory.createDemo(
          startGameCommand,
          atBatSequences
        );

        expect(command.substitutions).toEqual([]);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteGameWorkflowCommandFactory.createDemo(
            startGameCommand,
            atBatSequences,
            substitutions
          );
        }).not.toThrow();
      });
    });

    describe('createTesting', () => {
      it('should create testing command with appropriate settings', () => {
        const command = CompleteGameWorkflowCommandFactory.createTesting(
          startGameCommand,
          atBatSequences,
          substitutions
        );

        expect(command.startGameCommand).toBe(startGameCommand);
        expect(command.atBatSequences).toBe(atBatSequences);
        expect(command.substitutions).toBe(substitutions);
        expect(command.endGameNaturally).toBe(false); // Testing may want specific scenarios
        expect(command.maxAttempts).toBe(1); // Fail fast in testing
        expect(command.continueOnFailure).toBe(false);
        expect(command.enableNotifications).toBe(false); // No notifications during testing
        expect(command.operationDelay).toBe(0); // No delay for fast testing
      });

      it('should handle empty substitutions', () => {
        const command = CompleteGameWorkflowCommandFactory.createTesting(
          startGameCommand,
          atBatSequences
        );

        expect(command.substitutions).toEqual([]);
      });

      it('should validate the created command', () => {
        expect(() => {
          CompleteGameWorkflowCommandFactory.createTesting(
            startGameCommand,
            atBatSequences,
            substitutions
          );
        }).not.toThrow();
      });
    });

    describe('factory error handling', () => {
      it('should throw validation errors for invalid factory inputs', () => {
        const invalidAtBats = Array.from({ length: 201 }, () => atBatSequences[0]!);

        expect(() => {
          CompleteGameWorkflowCommandFactory.createSimple(startGameCommand, invalidAtBats);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        expect(() => {
          CompleteGameWorkflowCommandFactory.createDemo(startGameCommand, invalidAtBats);
        }).toThrow(CompleteGameWorkflowCommandValidationError);

        expect(() => {
          CompleteGameWorkflowCommandFactory.createTesting(startGameCommand, invalidAtBats);
        }).toThrow(CompleteGameWorkflowCommandValidationError);
      });
    });
  });

  describe('CompleteGameWorkflowCommandValidationError', () => {
    it('should have correct error name and message', () => {
      const error = new CompleteGameWorkflowCommandValidationError('Test error message');

      expect(error.name).toBe('CompleteGameWorkflowCommandValidationError');
      expect(error.message).toBe('Test error message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new CompleteGameWorkflowCommandValidationError('Test error');
      }).toThrow(CompleteGameWorkflowCommandValidationError);

      try {
        throw new CompleteGameWorkflowCommandValidationError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(CompleteGameWorkflowCommandValidationError);
        expect((error as Error).message).toBe('Test error');
      }
    });
  });
});
