/**
 * @file RunnerAdvanceDTO.test.ts
 * Unit tests for RunnerAdvanceDTO interface and related functionality.
 */

import { PlayerId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach } from 'vitest';

import { RunnerAdvanceDTO } from './RunnerAdvanceDTO';

describe('RunnerAdvanceDTO', () => {
  let playerId: PlayerId;

  beforeEach(() => {
    playerId = PlayerId.generate();
  });

  describe('Interface Contract', () => {
    it('should define required properties', () => {
      const advance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'FIRST',
        toBase: 'SECOND',
        advanceReason: 'BATTED_BALL',
      };

      expect(advance.playerId).toBe(playerId);
      expect(advance.fromBase).toBe('FIRST');
      expect(advance.toBase).toBe('SECOND');
      expect(advance.advanceReason).toBe('BATTED_BALL');
    });

    it('should allow all valid fromBase values', () => {
      const fromBases: RunnerAdvanceDTO['fromBase'][] = ['FIRST', 'SECOND', 'THIRD', null];

      fromBases.forEach(fromBase => {
        const advance: RunnerAdvanceDTO = {
          playerId,
          fromBase,
          toBase: 'HOME',
          advanceReason: 'BATTED_BALL',
        };
        expect(advance.fromBase).toBe(fromBase);
      });
    });

    it('should allow all valid toBase values', () => {
      const toBases: RunnerAdvanceDTO['toBase'][] = ['FIRST', 'SECOND', 'THIRD', 'HOME', 'OUT'];

      toBases.forEach(toBase => {
        const advance: RunnerAdvanceDTO = {
          playerId,
          fromBase: 'FIRST',
          toBase,
          advanceReason: 'BATTED_BALL',
        };
        expect(advance.toBase).toBe(toBase);
      });
    });

    it('should allow all valid reason values', () => {
      const reasons: RunnerAdvanceDTO['advanceReason'][] = [
        'BATTED_BALL',
        'WALK',
        'ERROR',
        'STOLEN_BASE',
        'WILD_PITCH',
      ];

      reasons.forEach(reason => {
        const advance: RunnerAdvanceDTO = {
          playerId,
          fromBase: 'FIRST',
          toBase: 'SECOND',
          advanceReason: reason,
        };
        expect(advance.advanceReason).toBe(reason);
      });
    });
  });

  describe('Baseball Scenarios', () => {
    it('should represent batter becoming runner', () => {
      const batterAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: null, // Batter starts at home plate
        toBase: 'FIRST',
        advanceReason: 'BATTED_BALL',
      };

      expect(batterAdvance.fromBase).toBeNull();
      expect(batterAdvance.toBase).toBe('FIRST');
      expect(batterAdvance.advanceReason).toBe('BATTED_BALL');
    });

    it('should represent runner scoring', () => {
      const scoringAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'THIRD',
        toBase: 'HOME',
        advanceReason: 'BATTED_BALL',
      };

      expect(scoringAdvance.fromBase).toBe('THIRD');
      expect(scoringAdvance.toBase).toBe('HOME');
      expect(scoringAdvance.advanceReason).toBe('BATTED_BALL');
    });

    it('should represent runner being put out', () => {
      const outAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'FIRST',
        toBase: 'OUT',
        advanceReason: 'BATTED_BALL',
      };

      expect(outAdvance.fromBase).toBe('FIRST');
      expect(outAdvance.toBase).toBe('OUT');
      expect(outAdvance.advanceReason).toBe('BATTED_BALL');
    });

    it('should represent multi-base advance', () => {
      const multiBaseAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'FIRST',
        toBase: 'THIRD',
        advanceReason: 'BATTED_BALL',
      };

      expect(multiBaseAdvance.fromBase).toBe('FIRST');
      expect(multiBaseAdvance.toBase).toBe('THIRD');
      expect(multiBaseAdvance.advanceReason).toBe('BATTED_BALL');
    });

    it('should represent walk forcing runner', () => {
      const walkAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'FIRST',
        toBase: 'SECOND',
        advanceReason: 'WALK',
      };

      expect(walkAdvance.fromBase).toBe('FIRST');
      expect(walkAdvance.toBase).toBe('SECOND');
      expect(walkAdvance.advanceReason).toBe('WALK');
    });

    it('should represent error allowing advance', () => {
      const errorAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'SECOND',
        toBase: 'HOME',
        advanceReason: 'ERROR',
      };

      expect(errorAdvance.fromBase).toBe('SECOND');
      expect(errorAdvance.toBase).toBe('HOME');
      expect(errorAdvance.advanceReason).toBe('ERROR');
    });

    it('should represent stolen base', () => {
      const stolenBase: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'FIRST',
        toBase: 'SECOND',
        advanceReason: 'STOLEN_BASE',
      };

      expect(stolenBase.fromBase).toBe('FIRST');
      expect(stolenBase.toBase).toBe('SECOND');
      expect(stolenBase.advanceReason).toBe('STOLEN_BASE');
    });

    it('should represent wild pitch advance', () => {
      const wildPitchAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'THIRD',
        toBase: 'HOME',
        advanceReason: 'WILD_PITCH',
      };

      expect(wildPitchAdvance.fromBase).toBe('THIRD');
      expect(wildPitchAdvance.toBase).toBe('HOME');
      expect(wildPitchAdvance.advanceReason).toBe('WILD_PITCH');
    });
  });

  describe('Statistical Scenarios', () => {
    it('should distinguish earned vs unearned advances', () => {
      const earnedAdvance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'SECOND',
        toBase: 'HOME',
        advanceReason: 'BATTED_BALL',
      };

      const unearnedAdvance: RunnerAdvanceDTO = {
        playerId: PlayerId.generate(),
        fromBase: 'SECOND',
        toBase: 'HOME',
        advanceReason: 'ERROR',
      };

      expect(earnedAdvance.advanceReason).toBe('BATTED_BALL');
      expect(unearnedAdvance.advanceReason).toBe('ERROR');
    });

    it('should support RBI calculation scenarios', () => {
      // RBI scenarios: run scores due to batter's action
      const rbiAdvances: RunnerAdvanceDTO[] = [
        {
          playerId: PlayerId.generate(),
          fromBase: 'THIRD',
          toBase: 'HOME',
          advanceReason: 'BATTED_BALL',
        },
        {
          playerId: PlayerId.generate(),
          fromBase: 'SECOND',
          toBase: 'HOME',
          advanceReason: 'WALK', // Walk with bases loaded
        },
      ];

      // Non-RBI scenario: run scores due to error
      const nonRbiAdvance: RunnerAdvanceDTO = {
        playerId: PlayerId.generate(),
        fromBase: 'THIRD',
        toBase: 'HOME',
        advanceReason: 'ERROR',
      };

      rbiAdvances.forEach(advance => {
        expect(advance.toBase).toBe('HOME');
        expect(['BATTED_BALL', 'WALK']).toContain(advance.advanceReason);
      });

      expect(nonRbiAdvance.toBase).toBe('HOME');
      expect(nonRbiAdvance.advanceReason).toBe('ERROR');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain immutability with readonly properties', () => {
      const advance: RunnerAdvanceDTO = {
        playerId,
        fromBase: 'FIRST',
        toBase: 'SECOND',
        advanceReason: 'BATTED_BALL',
      };

      // TypeScript should prevent these assignments at compile time
      // advance.playerId = PlayerId.generate(); // readonly property

      // advance.fromBase = 'THIRD'; // readonly property

      expect(advance.playerId).toBe(playerId);
      expect(advance.fromBase).toBe('FIRST');
    });

    it('should work with different PlayerId instances', () => {
      const runner1 = PlayerId.generate();
      const runner2 = PlayerId.generate();

      const advance1: RunnerAdvanceDTO = {
        playerId: runner1,
        fromBase: 'FIRST',
        toBase: 'SECOND',
        advanceReason: 'BATTED_BALL',
      };

      const advance2: RunnerAdvanceDTO = {
        playerId: runner2,
        fromBase: 'THIRD',
        toBase: 'HOME',
        advanceReason: 'BATTED_BALL',
      };

      expect(advance1.playerId).toBe(runner1);
      expect(advance2.playerId).toBe(runner2);
      expect(advance1.playerId).not.toBe(advance2.playerId);
    });
  });
});
