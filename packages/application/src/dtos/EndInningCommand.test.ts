/**
 * @file EndInningCommand Tests
 * Tests for command DTO to end innings/half-innings during a softball game.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { EndInningCommand } from './EndInningCommand';

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
  });
});
