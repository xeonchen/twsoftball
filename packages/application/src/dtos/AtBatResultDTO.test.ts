/**
 * @file AtBatResultDTO Tests
 * Tests for DTO representing an individual at-bat result with context.
 */

import { PlayerId, AtBatResultType } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { AtBatResultDTO } from './AtBatResultDTO';

describe('AtBatResultDTO', () => {
  let validAtBatResult: AtBatResultDTO;
  let batterId: PlayerId;
  let runner1: PlayerId;
  let runner2: PlayerId;

  beforeEach(() => {
    batterId = PlayerId.generate();
    runner1 = PlayerId.generate();
    runner2 = PlayerId.generate();

    validAtBatResult = {
      batterId,
      result: AtBatResultType.DOUBLE,
      inning: 3,
      rbi: 1,
      runnerAdvances: [
        {
          playerId: runner1,
          fromBase: 'SECOND',
          toBase: 'HOME',
          advanceReason: 'HIT',
        },
      ],
      timestamp: new Date('2024-08-30T15:15:00Z'),
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid AtBatResultDTO with all required fields', () => {
      const atBat = validAtBatResult;

      expect(atBat.batterId).toBeInstanceOf(PlayerId);
      expect(Object.values(AtBatResultType)).toContain(atBat.result);
      expect(typeof atBat.inning).toBe('number');
      expect(typeof atBat.rbi).toBe('number');
      expect(Array.isArray(atBat.runnerAdvances)).toBe(true);
      expect(atBat.timestamp).toBeInstanceOf(Date);
    });

    it('should handle all at-bat result types', () => {
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
        const atBat: AtBatResultDTO = {
          ...validAtBatResult,
          result: resultType,
        };

        expect(atBat.result).toBe(resultType);
      });
    });

    it('should maintain proper data types', () => {
      const atBat = validAtBatResult;

      expect(Number.isInteger(atBat.inning)).toBe(true);
      expect(Number.isInteger(atBat.rbi)).toBe(true);
      expect(atBat.inning).toBeGreaterThan(0);
      expect(atBat.rbi).toBeGreaterThanOrEqual(0);
    });
  });

  describe('RBI Scenarios', () => {
    it('should handle no RBI situation', () => {
      const noRBIAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.SINGLE,
        rbi: 0,
        runnerAdvances: [],
      };

      expect(noRBIAtBat.rbi).toBe(0);
      expect(noRBIAtBat.runnerAdvances).toHaveLength(0);
    });

    it('should handle single RBI situation', () => {
      const singleRBIAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.DOUBLE,
        rbi: 1,
        runnerAdvances: [
          {
            playerId: runner1,
            fromBase: 'SECOND',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ],
      };

      expect(singleRBIAtBat.rbi).toBe(1);
      expect(singleRBIAtBat.runnerAdvances).toHaveLength(1);
      expect(singleRBIAtBat.runnerAdvances[0]!.toBase).toBe('HOME');
    });

    it('should handle multiple RBI situation', () => {
      const multipleRBIAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.TRIPLE,
        rbi: 2,
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
        ],
      };

      expect(multipleRBIAtBat.rbi).toBe(2);
      expect(multipleRBIAtBat.runnerAdvances).toHaveLength(2);
    });

    it('should handle grand slam (4 RBI)', () => {
      const grandSlamAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.HOME_RUN,
        rbi: 4,
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
            playerId: PlayerId.generate(),
            fromBase: 'THIRD',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
          {
            playerId: batterId,
            fromBase: null, // Batter
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ],
      };

      expect(grandSlamAtBat.rbi).toBe(4);
      expect(grandSlamAtBat.runnerAdvances).toHaveLength(4);
      expect(grandSlamAtBat.result).toBe(AtBatResultType.HOME_RUN);
    });
  });

  describe('Runner Advances', () => {
    it('should handle empty runner advances', () => {
      const noAdvanceAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.STRIKEOUT,
        rbi: 0,
        runnerAdvances: [],
      };

      expect(noAdvanceAtBat.runnerAdvances).toHaveLength(0);
    });

    it('should handle batter advancing (fromBase: null)', () => {
      const batterAdvanceAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.SINGLE,
        rbi: 0,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null, // Batter
            toBase: 'FIRST',
            advanceReason: 'HIT',
          },
        ],
      };

      expect(batterAdvanceAtBat.runnerAdvances).toHaveLength(1);
      expect(batterAdvanceAtBat.runnerAdvances[0]!.fromBase).toBeNull();
      expect(batterAdvanceAtBat.runnerAdvances[0]!.toBase).toBe('FIRST');
      expect(batterAdvanceAtBat.runnerAdvances[0]!.playerId).toEqual(batterId);
    });

    it('should handle multiple base advances', () => {
      const multipleAdvanceAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.TRIPLE,
        rbi: 1,
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
            toBase: 'SECOND',
            advanceReason: 'FORCE',
          },
          {
            playerId: runner2,
            fromBase: 'SECOND',
            toBase: 'HOME',
            advanceReason: 'HIT',
          },
        ],
      };

      expect(multipleAdvanceAtBat.runnerAdvances).toHaveLength(3);
      expect(multipleAdvanceAtBat.runnerAdvances[1]!.advanceReason).toBe('FORCE');
    });

    it('should handle runner being out', () => {
      const runnerOutAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.FIELDERS_CHOICE,
        rbi: 0,
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

      expect(runnerOutAtBat.runnerAdvances).toHaveLength(2);
      expect(runnerOutAtBat.runnerAdvances[1]!.toBase).toBe('OUT');
    });
  });

  describe('Inning Context', () => {
    it('should handle various innings', () => {
      for (let inning = 1; inning <= 9; inning++) {
        const atBat: AtBatResultDTO = {
          ...validAtBatResult,
          inning,
        };

        expect(atBat.inning).toBe(inning);
      }
    });

    it('should handle extra innings', () => {
      const extraInningAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        inning: 10,
      };

      expect(extraInningAtBat.inning).toBe(10);
    });
  });

  describe('Timestamp Handling', () => {
    it('should maintain timestamp precision', () => {
      const timestamp = new Date('2024-08-30T15:30:45.123Z');
      const atBat: AtBatResultDTO = {
        ...validAtBatResult,
        timestamp,
      };

      expect(atBat.timestamp).toEqual(timestamp);
      expect(atBat.timestamp.getMilliseconds()).toBe(123);
    });

    it('should handle recent timestamps', () => {
      const recentTimestamp = new Date();
      const atBat: AtBatResultDTO = {
        ...validAtBatResult,
        timestamp: recentTimestamp,
      };

      expect(atBat.timestamp).toEqual(recentTimestamp);
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const atBat = validAtBatResult;

      expect(atBat.batterId).toBeInstanceOf(PlayerId);
      expect(Object.values(AtBatResultType)).toContain(atBat.result);

      atBat.runnerAdvances.forEach(advance => {
        expect(advance.playerId).toBeInstanceOf(PlayerId);
      });
    });

    it('should maintain consistency with advance reasons', () => {
      const atBat = validAtBatResult;

      atBat.runnerAdvances.forEach(advance => {
        expect(typeof advance.advanceReason).toBe('string');
        expect(advance.advanceReason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Special At-Bat Scenarios', () => {
    it('should handle sacrifice fly (RBI but no hit)', () => {
      const sacrificeFlyAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.SACRIFICE_FLY,
        rbi: 1,
        runnerAdvances: [
          {
            playerId: runner1,
            fromBase: 'THIRD',
            toBase: 'HOME',
            advanceReason: 'SACRIFICE',
          },
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'OUT',
            advanceReason: 'FLY_OUT',
          },
        ],
      };

      expect(sacrificeFlyAtBat.result).toBe(AtBatResultType.SACRIFICE_FLY);
      expect(sacrificeFlyAtBat.rbi).toBe(1);
    });

    it('should handle double play', () => {
      const doublePlayAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.DOUBLE_PLAY,
        rbi: 0,
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
      };

      expect(doublePlayAtBat.result).toBe(AtBatResultType.DOUBLE_PLAY);
      expect(doublePlayAtBat.runnerAdvances.filter(a => a.toBase === 'OUT')).toHaveLength(2);
    });

    it('should handle walk (no advance for other runners)', () => {
      const walkAtBat: AtBatResultDTO = {
        ...validAtBatResult,
        result: AtBatResultType.WALK,
        rbi: 0,
        runnerAdvances: [
          {
            playerId: batterId,
            fromBase: null,
            toBase: 'FIRST',
            advanceReason: 'WALK',
          },
        ],
      };

      expect(walkAtBat.result).toBe(AtBatResultType.WALK);
      expect(walkAtBat.rbi).toBe(0);
      expect(walkAtBat.runnerAdvances).toHaveLength(1);
    });
  });
});
