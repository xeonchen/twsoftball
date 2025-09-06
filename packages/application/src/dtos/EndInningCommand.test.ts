/**
 * @file EndInningCommand Tests
 * Tests for command DTO to end innings/half-innings during a softball game.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  EndInningCommand,
  EndInningCommandValidator,
  EndInningCommandValidationError,
  EndInningCommandFactory,
} from './EndInningCommand';

describe('EndInningCommand', () => {
  let validCommand: EndInningCommand;
  let gameId: GameId;

  beforeEach(() => {
    gameId = GameId.generate();

    validCommand = {
      gameId,
      inning: 5,
      isTopHalf: true,
      endingReason: 'THREE_OUTS',
      finalOuts: 3,
      gameEnding: false,
      notes: 'Standard top half ending',
      timestamp: new Date('2024-08-30T15:30:00Z'),
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid EndInningCommand with all required fields', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(typeof command.inning).toBe('number');
      expect(typeof command.isTopHalf).toBe('boolean');
      expect(typeof command.endingReason).toBe('string');
      expect(typeof command.finalOuts).toBe('number');
      expect(typeof command.gameEnding).toBe('boolean');
      expect(typeof command.notes).toBe('string');
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should handle minimal required fields only', () => {
      const minimalCommand: EndInningCommand = {
        gameId,
        inning: 1,
        isTopHalf: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
      };

      expect(minimalCommand.gameEnding).toBeUndefined();
      expect(minimalCommand.notes).toBeUndefined();
      expect(minimalCommand.timestamp).toBeUndefined();
    });

    it('should maintain proper data types for all fields', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(Number.isInteger(command.inning)).toBe(true);
      expect(typeof command.isTopHalf).toBe('boolean');
      expect(['THREE_OUTS', 'MERCY_RULE', 'TIME_LIMIT', 'FORFEIT', 'WALKOFF', 'MANUAL']).toContain(
        command.endingReason
      );
      expect(Number.isInteger(command.finalOuts)).toBe(true);
      expect(command.finalOuts >= 0 && command.finalOuts <= 3).toBe(true);
    });
  });

  describe('Inning and Half-Inning States', () => {
    it('should handle top half ending (away team finished)', () => {
      const command: EndInningCommand = {
        ...validCommand,
        inning: 3,
        isTopHalf: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
      };

      expect(command.isTopHalf).toBe(true);
      expect(command.inning).toBe(3);
      expect(command.finalOuts).toBe(3);
    });

    it('should handle bottom half ending (home team finished)', () => {
      const command: EndInningCommand = {
        ...validCommand,
        inning: 7,
        isTopHalf: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
      };

      expect(command.isTopHalf).toBe(false);
      expect(command.inning).toBe(7);
      expect(command.finalOuts).toBe(3);
    });

    it('should handle various inning numbers', () => {
      const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15]; // Including extra innings

      innings.forEach(inningNum => {
        const command: EndInningCommand = {
          ...validCommand,
          inning: inningNum,
          isTopHalf: inningNum % 2 === 0, // Alternate top/bottom for variety
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
        };

        expect(command.inning).toBe(inningNum);
        expect(command.inning >= 1).toBe(true);
      });
    });

    it('should handle different out counts', () => {
      const outCounts = [0, 1, 2, 3];

      outCounts.forEach(outs => {
        const command: EndInningCommand = {
          ...validCommand,
          finalOuts: outs,
          endingReason: outs === 3 ? 'THREE_OUTS' : 'MERCY_RULE',
        };

        expect(command.finalOuts).toBe(outs);
        expect(command.finalOuts >= 0 && command.finalOuts <= 3).toBe(true);
      });
    });
  });

  describe('Ending Reasons', () => {
    const endingReasons = [
      'THREE_OUTS',
      'MERCY_RULE',
      'TIME_LIMIT',
      'FORFEIT',
      'WALKOFF',
      'MANUAL',
    ] as const;

    endingReasons.forEach(reason => {
      it(`should handle ${reason} ending reason`, () => {
        const command: EndInningCommand = {
          ...validCommand,
          endingReason: reason,
          finalOuts: reason === 'THREE_OUTS' ? 3 : 2, // Vary outs based on reason
        };

        expect(command.endingReason).toBe(reason);
        expect(endingReasons).toContain(command.endingReason);
      });
    });

    it('should handle three outs ending with proper context', () => {
      const command: EndInningCommand = {
        ...validCommand,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: false,
        notes: 'Strikeout to end the inning',
      };

      expect(command.endingReason).toBe('THREE_OUTS');
      expect(command.finalOuts).toBe(3);
      expect(command.gameEnding).toBe(false);
    });

    it('should handle mercy rule ending with game completion', () => {
      const command: EndInningCommand = {
        ...validCommand,
        endingReason: 'MERCY_RULE',
        finalOuts: 1, // Game ended mid-inning
        gameEnding: true,
        notes: 'Mercy rule invoked with 15-run lead after 5 innings',
      };

      expect(command.endingReason).toBe('MERCY_RULE');
      expect(command.finalOuts).toBe(1);
      expect(command.gameEnding).toBe(true);
      expect(command.notes).toContain('Mercy rule');
    });

    it('should handle walkoff ending scenario', () => {
      const command: EndInningCommand = {
        ...validCommand,
        inning: 7,
        isTopHalf: false, // Bottom half of 7th
        endingReason: 'WALKOFF',
        finalOuts: 1, // Game ended before 3 outs
        gameEnding: true,
        notes: 'Walkoff hit to win the game',
      };

      expect(command.endingReason).toBe('WALKOFF');
      expect(command.isTopHalf).toBe(false);
      expect(command.gameEnding).toBe(true);
      expect(command.finalOuts).toBeLessThan(3);
    });

    it('should handle time limit ending scenario', () => {
      const command: EndInningCommand = {
        ...validCommand,
        endingReason: 'TIME_LIMIT',
        finalOuts: 2, // Time expired mid-inning
        gameEnding: true,
        notes: 'Game ended due to 2-hour time limit',
      };

      expect(command.endingReason).toBe('TIME_LIMIT');
      expect(command.gameEnding).toBe(true);
      expect(command.notes).toContain('time limit');
    });

    it('should handle forfeit ending scenario', () => {
      const command: EndInningCommand = {
        ...validCommand,
        endingReason: 'FORFEIT',
        finalOuts: 0, // No outs when forfeit declared
        gameEnding: true,
        notes: 'Game forfeited due to insufficient players',
      };

      expect(command.endingReason).toBe('FORFEIT');
      expect(command.finalOuts).toBe(0);
      expect(command.gameEnding).toBe(true);
    });

    it('should handle manual ending scenario', () => {
      const command: EndInningCommand = {
        ...validCommand,
        endingReason: 'MANUAL',
        finalOuts: 2,
        gameEnding: false,
        notes: 'Inning ended by umpire for administrative reasons',
      };

      expect(command.endingReason).toBe('MANUAL');
      expect(command.gameEnding).toBe(false);
      expect(command.notes).toContain('administrative');
    });
  });

  describe('Game Ending Context', () => {
    it('should handle non-game-ending inning transition', () => {
      const command: EndInningCommand = {
        ...validCommand,
        inning: 3,
        isTopHalf: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: false,
      };

      expect(command.gameEnding).toBe(false);
      expect(command.inning).toBeLessThan(7); // Not regulation completion
    });

    it('should handle regulation game completion', () => {
      const command: EndInningCommand = {
        ...validCommand,
        inning: 7,
        isTopHalf: false, // Bottom of 7th
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: true,
        notes: 'Regulation 7 innings completed',
      };

      expect(command.gameEnding).toBe(true);
      expect(command.inning).toBe(7);
      expect(command.isTopHalf).toBe(false);
    });

    it('should handle extra innings game completion', () => {
      const command: EndInningCommand = {
        ...validCommand,
        inning: 9,
        isTopHalf: false, // Bottom of 9th
        endingReason: 'WALKOFF',
        finalOuts: 1,
        gameEnding: true,
        notes: 'Extra innings walkoff victory',
      };

      expect(command.gameEnding).toBe(true);
      expect(command.inning).toBeGreaterThan(7);
      expect(command.endingReason).toBe('WALKOFF');
    });

    it('should handle undefined gameEnding (normal transition)', () => {
      const { gameEnding, ...commandWithoutGameEnding } = validCommand;
      expect(gameEnding).toBeDefined(); // gameEnding from validCommand should exist

      const command: EndInningCommand = {
        ...commandWithoutGameEnding,
        // gameEnding is omitted to represent undefined
      };

      expect(command.gameEnding).toBeUndefined();
    });
  });

  describe('Notes and Timestamp', () => {
    it('should handle descriptive notes for various scenarios', () => {
      const scenarios = [
        'Strikeout looking to end the side',
        'Ground out to second base, runners stranded',
        'Mercy rule invoked after 15-run differential',
        'Time limit reached at 2:00 PM',
        'Walkoff double down the left field line',
        'Forfeit declared due to ejections',
      ];

      scenarios.forEach(note => {
        const command: EndInningCommand = {
          ...validCommand,
          notes: note,
        };

        expect(command.notes).toBe(note);
        expect(typeof command.notes).toBe('string');
        expect(command.notes!.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty notes', () => {
      const command: EndInningCommand = {
        ...validCommand,
        notes: '',
      };

      expect(command.notes).toBe('');
    });

    it('should handle undefined notes', () => {
      const { notes, ...commandWithoutNotes } = validCommand;
      expect(notes).toBeDefined(); // notes from validCommand should exist

      const command: EndInningCommand = {
        ...commandWithoutNotes,
      };

      expect(command.notes).toBeUndefined();
    });

    it('should handle precise timestamps', () => {
      const preciseTime = new Date('2024-08-30T16:45:23.456Z');
      const command: EndInningCommand = {
        ...validCommand,
        timestamp: preciseTime,
      };

      expect(command.timestamp).toEqual(preciseTime);
      expect(command.timestamp!.getMilliseconds()).toBe(456);
    });

    it('should handle undefined timestamp', () => {
      const { timestamp: _timestamp, ...commandWithoutTimestamp } = validCommand;
      const command: EndInningCommand = {
        ...commandWithoutTimestamp,
      };

      expect(command.timestamp).toBeUndefined();
    });
  });

  describe('Domain Integration', () => {
    it('should properly use GameId domain value object', () => {
      const command = validCommand;

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.gameId.value).toBeDefined();
      expect(typeof command.gameId.value).toBe('string');
    });

    it('should maintain consistency with softball rules', () => {
      const command = validCommand;

      // Verify inning constraints
      expect(command.inning >= 1).toBe(true);
      expect(Number.isInteger(command.inning)).toBe(true);

      // Verify out count constraints
      expect(command.finalOuts >= 0).toBe(true);
      expect(command.finalOuts <= 3).toBe(true);
      expect(Number.isInteger(command.finalOuts)).toBe(true);

      // Verify ending reason is valid
      const validReasons = [
        'THREE_OUTS',
        'MERCY_RULE',
        'TIME_LIMIT',
        'FORFEIT',
        'WALKOFF',
        'MANUAL',
      ];
      expect(validReasons).toContain(command.endingReason);
    });
  });

  describe('Specific Game Scenarios', () => {
    it('should handle standard inning ending (3 outs)', () => {
      const standardEnding: EndInningCommand = {
        gameId,
        inning: 4,
        isTopHalf: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: false,
        notes: 'Fly out to center field for third out',
      };

      expect(standardEnding.endingReason).toBe('THREE_OUTS');
      expect(standardEnding.finalOuts).toBe(3);
      expect(standardEnding.gameEnding).toBe(false);
    });

    it('should handle mercy rule game ending', () => {
      const mercyRuleEnding: EndInningCommand = {
        gameId,
        inning: 5,
        isTopHalf: false,
        endingReason: 'MERCY_RULE',
        finalOuts: 1,
        gameEnding: true,
        notes: '15-run mercy rule invoked after 5 complete innings',
        timestamp: new Date(),
      };

      expect(mercyRuleEnding.endingReason).toBe('MERCY_RULE');
      expect(mercyRuleEnding.gameEnding).toBe(true);
      expect(mercyRuleEnding.finalOuts).toBeLessThan(3);
      expect(mercyRuleEnding.notes).toContain('mercy rule');
    });

    it('should handle regulation completion', () => {
      const regulationEnd: EndInningCommand = {
        gameId,
        inning: 7,
        isTopHalf: false,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: true,
        notes: 'Game completed after regulation 7 innings',
      };

      expect(regulationEnd.inning).toBe(7);
      expect(regulationEnd.isTopHalf).toBe(false);
      expect(regulationEnd.gameEnding).toBe(true);
      expect(regulationEnd.endingReason).toBe('THREE_OUTS');
    });

    it('should handle walkoff win scenario', () => {
      const walkoffWin: EndInningCommand = {
        gameId,
        inning: 7,
        isTopHalf: false,
        endingReason: 'WALKOFF',
        finalOuts: 2, // Game ended before third out
        gameEnding: true,
        notes: 'Walkoff RBI single to right field wins the game',
        timestamp: new Date(),
      };

      expect(walkoffWin.endingReason).toBe('WALKOFF');
      expect(walkoffWin.isTopHalf).toBe(false); // Home team batting
      expect(walkoffWin.gameEnding).toBe(true);
      expect(walkoffWin.finalOuts).toBeLessThan(3);
    });

    it('should handle extra innings scenario', () => {
      const extraInnings: EndInningCommand = {
        gameId,
        inning: 10,
        isTopHalf: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: false, // Game continues to bottom half
        notes: 'Top of 10th inning completed, game tied 5-5',
      };

      expect(extraInnings.inning).toBeGreaterThan(7);
      expect(extraInnings.gameEnding).toBe(false);
      expect(extraInnings.isTopHalf).toBe(true);
    });
  });

  describe('Validation - EndInningCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should require gameId', () => {
        const command: EndInningCommand = {
          gameId: null as unknown as GameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          EndInningCommandValidationError
        );
        expect(() => EndInningCommandValidator.validate(command)).toThrow('gameId is required');
      });

      it('should require positive integer inning', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 0,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'inning must be a positive integer'
        );
      });

      it('should limit inning to maximum 20', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 21,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'inning cannot exceed 20'
        );
      });

      it('should require boolean isTopHalf', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: 'true' as unknown as boolean,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'isTopHalf must be a boolean'
        );
      });

      it('should require valid endingReason', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'INVALID_REASON' as unknown as EndInningCommand['endingReason'],
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'endingReason must be one of:'
        );
      });

      it('should require endingReason', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: null as unknown as EndInningCommand['endingReason'],
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'endingReason is required'
        );
      });
    });

    describe('Game State Validation', () => {
      it('should validate finalOuts range (0-3)', () => {
        const invalidOuts = [-1, 4, 1.5];

        invalidOuts.forEach(outs => {
          const command: EndInningCommand = {
            gameId,
            inning: 1,
            isTopHalf: true,
            endingReason: 'MERCY_RULE',
            finalOuts: outs,
          };

          expect(() => EndInningCommandValidator.validate(command)).toThrow(
            expect.objectContaining({
              message: 'finalOuts must be an integer between 0 and 3',
              name: 'EndInningCommandValidationError',
            }) as Error
          );
        });
      });

      it('should require boolean gameEnding if provided', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          gameEnding: 'true' as unknown as boolean,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'gameEnding must be a boolean'
        );
      });

      it('should require finalOuts to be 3 for THREE_OUTS reason', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 2,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'finalOuts must be 3 when endingReason is THREE_OUTS'
        );
      });

      it('should require gameEnding to be true for WALKOFF', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: false,
          endingReason: 'WALKOFF',
          finalOuts: 2,
          gameEnding: false,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'gameEnding must be true when endingReason is WALKOFF'
        );
      });
    });

    describe('Notes Validation', () => {
      it('should limit notes length to 500 characters', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          notes: 'a'.repeat(501),
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'notes cannot exceed 500 characters'
        );
      });

      it('should not allow whitespace-only notes', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          notes: '   ',
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'notes cannot be only whitespace'
        );
      });

      it('should allow empty string notes', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          notes: '',
        };

        expect(() => EndInningCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow undefined notes', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
        };

        expect(() => EndInningCommandValidator.validate(command)).not.toThrow();
      });
    });

    describe('Timestamp Validation', () => {
      it('should require valid Date object', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          timestamp: 'invalid' as unknown as Date,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date object'
        );
      });

      it('should require valid date value', () => {
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          timestamp: new Date('invalid'),
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date'
        );
      });

      it('should not allow timestamp too far in future', () => {
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          timestamp: futureTime,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 hour in the future'
        );
      });

      it('should not allow timestamp too far in past', () => {
        const pastTime = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          timestamp: pastTime,
        };

        expect(() => EndInningCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 year in the past'
        );
      });

      it('should allow reasonable timestamp', () => {
        const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        const command: EndInningCommand = {
          gameId,
          inning: 1,
          isTopHalf: true,
          endingReason: 'THREE_OUTS',
          finalOuts: 3,
          timestamp: recentTime,
        };

        expect(() => EndInningCommandValidator.validate(command)).not.toThrow();
      });
    });

    it('should pass validation for valid commands', () => {
      const command: EndInningCommand = {
        gameId,
        inning: 5,
        isTopHalf: true,
        endingReason: 'THREE_OUTS',
        finalOuts: 3,
        gameEnding: false,
        notes: 'Standard top half ending',
        timestamp: new Date(), // Use current time instead of old timestamp
      };
      expect(() => EndInningCommandValidator.validate(command)).not.toThrow();
    });
  });

  describe('Factory Functions - EndInningCommandFactory', () => {
    describe('createThreeOuts', () => {
      it('should create valid three outs command', () => {
        const command = EndInningCommandFactory.createThreeOuts(
          gameId,
          5,
          true,
          false,
          'Standard inning end'
        );

        expect(command.gameId).toBe(gameId);
        expect(command.inning).toBe(5);
        expect(command.isTopHalf).toBe(true);
        expect(command.endingReason).toBe('THREE_OUTS');
        expect(command.finalOuts).toBe(3);
        expect(command.gameEnding).toBe(false);
        expect(command.notes).toBe('Standard inning end');
        expect(command.timestamp).toBeInstanceOf(Date);
      });

      it('should work without optional parameters', () => {
        const command = EndInningCommandFactory.createThreeOuts(gameId, 7, false);

        expect(command.gameEnding).toBe(false);
        expect(command.notes).toBeUndefined();
      });
    });

    describe('createWalkoff', () => {
      it('should create valid walkoff command', () => {
        const command = EndInningCommandFactory.createWalkoff(gameId, 9, 2, 'Game-winning homer!');

        expect(command.inning).toBe(9);
        expect(command.isTopHalf).toBe(false);
        expect(command.endingReason).toBe('WALKOFF');
        expect(command.finalOuts).toBe(2);
        expect(command.gameEnding).toBe(true);
        expect(command.notes).toBe('Game-winning homer!');
      });

      it('should use default notes if none provided', () => {
        const command = EndInningCommandFactory.createWalkoff(gameId, 7, 1);

        expect(command.notes).toBe('Game-winning run scored');
      });
    });

    describe('createMercyRule', () => {
      it('should create valid mercy rule command', () => {
        const command = EndInningCommandFactory.createMercyRule(
          gameId,
          5,
          false,
          1,
          '15-run mercy rule'
        );

        expect(command.endingReason).toBe('MERCY_RULE');
        expect(command.gameEnding).toBe(true);
        expect(command.finalOuts).toBe(1);
        expect(command.notes).toBe('15-run mercy rule');
      });

      it('should use default notes if none provided', () => {
        const command = EndInningCommandFactory.createMercyRule(gameId, 5, false, 1);

        expect(command.notes).toBe('Mercy rule applied after 5 innings');
      });
    });

    describe('createForfeit', () => {
      it('should create valid forfeit command', () => {
        const command = EndInningCommandFactory.createForfeit(
          gameId,
          3,
          true,
          0,
          'Team forfeited due to ejections'
        );

        expect(command.endingReason).toBe('FORFEIT');
        expect(command.gameEnding).toBe(true);
        expect(command.finalOuts).toBe(0);
        expect(command.notes).toBe('Team forfeited due to ejections');
      });

      it('should use default notes if none provided', () => {
        const command = EndInningCommandFactory.createForfeit(gameId, 4, false, 2);

        expect(command.notes).toBe('Game ended due to forfeit');
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle forfeit with zero outs', () => {
      const forfeit: EndInningCommand = {
        gameId,
        inning: 3,
        isTopHalf: true,
        endingReason: 'FORFEIT',
        finalOuts: 0,
        gameEnding: true,
        notes: 'Game forfeited due to insufficient players after injuries',
      };

      expect(forfeit.finalOuts).toBe(0);
      expect(forfeit.endingReason).toBe('FORFEIT');
      expect(forfeit.gameEnding).toBe(true);
    });

    it('should handle time limit with partial inning', () => {
      const timeLimit: EndInningCommand = {
        gameId,
        inning: 6,
        isTopHalf: false,
        endingReason: 'TIME_LIMIT',
        finalOuts: 1,
        gameEnding: true,
        notes: '2-hour time limit reached, game called with 1 out',
      };

      expect(timeLimit.endingReason).toBe('TIME_LIMIT');
      expect(timeLimit.finalOuts).toBe(1);
      expect(timeLimit.gameEnding).toBe(true);
    });

    it('should handle manual administrative ending', () => {
      const manual: EndInningCommand = {
        gameId,
        inning: 2,
        isTopHalf: false,
        endingReason: 'MANUAL',
        finalOuts: 2,
        gameEnding: false,
        notes: 'Inning ended early for field maintenance',
      };

      expect(manual.endingReason).toBe('MANUAL');
      expect(manual.gameEnding).toBe(false);
      expect(manual.notes).toContain('field maintenance');
    });

    it('should validate all factory functions create valid commands', () => {
      const factories = [
        (): EndInningCommand => EndInningCommandFactory.createThreeOuts(gameId, 5, true),
        (): EndInningCommand => EndInningCommandFactory.createWalkoff(gameId, 7, 2),
        (): EndInningCommand => EndInningCommandFactory.createMercyRule(gameId, 5, false, 1),
        (): EndInningCommand => EndInningCommandFactory.createForfeit(gameId, 3, true, 0),
      ];

      factories.forEach(factory => {
        const command = factory();
        expect(() => EndInningCommandValidator.validate(command)).not.toThrow();
      });
    });
  });
});
