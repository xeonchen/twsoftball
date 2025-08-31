/**
 * @file PlayerInGameDTO Tests
 * Tests for DTO representing a player's complete in-game information and statistics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerInGameDTO } from './PlayerInGameDTO';
import { PlayerStatisticsDTO, FieldingStatisticsDTO } from './PlayerStatisticsDTO';
import { AtBatResultDTO } from './AtBatResultDTO';
import { PlayerId, JerseyNumber, FieldPosition, AtBatResultType } from '@twsoftball/domain';

describe('PlayerInGameDTO', () => {
  let validPlayerData: PlayerInGameDTO;
  let playerId: PlayerId;

  beforeEach(() => {
    playerId = PlayerId.generate();

    const fieldingStats: FieldingStatisticsDTO = {
      positions: [FieldPosition.FIRST_BASE, FieldPosition.LEFT_FIELD],
      putouts: 5,
      assists: 2,
      errors: 1,
      fieldingPercentage: 0.875,
    };

    const playerStats: PlayerStatisticsDTO = {
      playerId,
      name: 'John Smith',
      jerseyNumber: JerseyNumber.fromNumber(15),
      plateAppearances: 4,
      atBats: 3,
      hits: 2,
      singles: 1,
      doubles: 1,
      triples: 0,
      homeRuns: 0,
      walks: 1,
      strikeouts: 1,
      rbi: 2,
      runs: 1,
      battingAverage: 0.667,
      onBasePercentage: 0.75,
      sluggingPercentage: 1.0,
      fielding: fieldingStats,
    };

    const plateAppearances: AtBatResultDTO[] = [
      {
        batterId: playerId,
        result: AtBatResultType.SINGLE,
        inning: 1,
        rbi: 0,
        runnerAdvances: [],
        timestamp: new Date('2024-08-30T14:15:00Z'),
      },
      {
        batterId: playerId,
        result: AtBatResultType.DOUBLE,
        inning: 3,
        rbi: 2,
        runnerAdvances: [],
        timestamp: new Date('2024-08-30T15:00:00Z'),
      },
    ];

    validPlayerData = {
      playerId,
      name: 'John Smith',
      jerseyNumber: JerseyNumber.fromNumber(15),
      battingOrderPosition: 4,
      currentFieldPosition: FieldPosition.FIRST_BASE,
      preferredPositions: [FieldPosition.FIRST_BASE, FieldPosition.LEFT_FIELD],
      plateAppearances,
      statistics: playerStats,
    };
  });

  describe('Construction and Validation', () => {
    it('should create valid PlayerInGameDTO with all required fields', () => {
      const player = validPlayerData;

      expect(player.playerId).toBeInstanceOf(PlayerId);
      expect(player.name).toBe('John Smith');
      expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(player.battingOrderPosition).toBe(4);
      expect(player.currentFieldPosition).toBe(FieldPosition.FIRST_BASE);
      expect(Array.isArray(player.preferredPositions)).toBe(true);
      expect(Array.isArray(player.plateAppearances)).toBe(true);
      expect(typeof player.statistics).toBe('object');
    });

    it('should maintain proper data types', () => {
      const player = validPlayerData;

      expect(typeof player.name).toBe('string');
      expect(typeof player.battingOrderPosition).toBe('number');
      expect(Object.values(FieldPosition)).toContain(player.currentFieldPosition);
    });
  });

  describe('Jersey Number Handling', () => {
    it('should handle valid jersey numbers', () => {
      const player = validPlayerData;

      expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(player.jerseyNumber.value).toBe('15');
    });

    it('should handle different jersey number ranges', () => {
      const player1 = {
        ...validPlayerData,
        jerseyNumber: JerseyNumber.fromNumber(1),
      };

      const player99 = {
        ...validPlayerData,
        jerseyNumber: JerseyNumber.fromNumber(99),
      };

      expect(player1.jerseyNumber.value).toBe('1');
      expect(player99.jerseyNumber.value).toBe('99');
    });
  });

  describe('Batting Order Position', () => {
    it('should handle standard batting positions 1-9', () => {
      for (let position = 1; position <= 9; position++) {
        const player = {
          ...validPlayerData,
          battingOrderPosition: position,
        };

        expect(player.battingOrderPosition).toBe(position);
      }
    });

    it('should handle extra player positions 10-20', () => {
      const extraPlayer = {
        ...validPlayerData,
        battingOrderPosition: 12,
      };

      expect(extraPlayer.battingOrderPosition).toBe(12);
    });

    it('should handle bench player (position 0)', () => {
      const benchPlayer = {
        ...validPlayerData,
        battingOrderPosition: 0,
      };

      expect(benchPlayer.battingOrderPosition).toBe(0);
    });
  });

  describe('Field Positions', () => {
    it('should handle all infield positions', () => {
      const infieldPositions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
      ];

      infieldPositions.forEach(position => {
        const player = {
          ...validPlayerData,
          currentFieldPosition: position,
        };

        expect(player.currentFieldPosition).toBe(position);
      });
    });

    it('should handle outfield positions', () => {
      const outfieldPositions = [
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
        FieldPosition.LEFT_FIELD,
      ];

      outfieldPositions.forEach(position => {
        const player = {
          ...validPlayerData,
          currentFieldPosition: position,
        };

        expect(player.currentFieldPosition).toBe(position);
      });
    });

    it('should handle multiple preferred positions', () => {
      const versatilePlayer = {
        ...validPlayerData,
        preferredPositions: [
          FieldPosition.FIRST_BASE,
          FieldPosition.THIRD_BASE,
          FieldPosition.LEFT_FIELD,
        ],
      };

      expect(versatilePlayer.preferredPositions).toHaveLength(3);
      expect(versatilePlayer.preferredPositions).toContain(FieldPosition.FIRST_BASE);
      expect(versatilePlayer.preferredPositions).toContain(FieldPosition.THIRD_BASE);
      expect(versatilePlayer.preferredPositions).toContain(FieldPosition.LEFT_FIELD);
    });

    it('should handle empty preferred positions', () => {
      const player = {
        ...validPlayerData,
        preferredPositions: [],
      };

      expect(player.preferredPositions).toHaveLength(0);
    });
  });

  describe('Plate Appearances', () => {
    it('should handle multiple plate appearances', () => {
      const player = validPlayerData;

      expect(player.plateAppearances).toHaveLength(2);
      expect(player.plateAppearances[0]?.result).toBe(AtBatResultType.SINGLE);
      expect(player.plateAppearances[1]?.result).toBe(AtBatResultType.DOUBLE);
    });

    it('should handle empty plate appearances (new player)', () => {
      const newPlayer = {
        ...validPlayerData,
        plateAppearances: [],
      };

      expect(newPlayer.plateAppearances).toHaveLength(0);
    });

    it('should maintain chronological order', () => {
      const player = validPlayerData;

      for (let i = 1; i < player.plateAppearances.length; i++) {
        const previous = player.plateAppearances[i - 1];
        const current = player.plateAppearances[i];

        if (previous && current) {
          expect(previous.timestamp.getTime()).toBeLessThanOrEqual(current.timestamp.getTime());
        }
      }
    });

    it('should track RBI in plate appearances', () => {
      const player = validPlayerData;
      const totalRBI = player.plateAppearances.reduce((sum, pa) => sum + pa.rbi, 0);

      expect(totalRBI).toBe(2); // 0 + 2 from the mock data
      expect(player.statistics.rbi).toBe(2);
    });
  });

  describe('Statistics Integration', () => {
    it('should include comprehensive player statistics', () => {
      const player = validPlayerData;

      expect(player.statistics).toBeDefined();
      expect(player.statistics.playerId).toEqual(playerId);
      expect(player.statistics.name).toBe('John Smith');
      expect(player.statistics.battingAverage).toBe(0.667);
      expect(player.statistics.onBasePercentage).toBe(0.75);
      expect(player.statistics.sluggingPercentage).toBe(1.0);
    });

    it('should include fielding statistics', () => {
      const player = validPlayerData;

      expect(player.statistics.fielding).toBeDefined();
      expect(player.statistics.fielding.positions).toContain(FieldPosition.FIRST_BASE);
      expect(player.statistics.fielding.putouts).toBe(5);
      expect(player.statistics.fielding.assists).toBe(2);
      expect(player.statistics.fielding.errors).toBe(1);
      expect(player.statistics.fielding.fieldingPercentage).toBe(0.875);
    });

    it('should maintain consistency between plate appearances and statistics', () => {
      const player = validPlayerData;

      // Statistics should reflect the plate appearances
      expect(player.statistics.plateAppearances).toBe(4);
      expect(player.plateAppearances).toHaveLength(2); // Only showing last 2 PAs in this test
    });
  });

  describe('Domain Integration', () => {
    it('should properly use domain value objects', () => {
      const player = validPlayerData;

      expect(player.playerId).toBeInstanceOf(PlayerId);
      expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(player.statistics.playerId).toBeInstanceOf(PlayerId);
      expect(player.statistics.jerseyNumber).toBeInstanceOf(JerseyNumber);
    });

    it('should maintain data consistency across fields', () => {
      const player = validPlayerData;

      // Player ID should be consistent
      expect(player.playerId).toEqual(player.statistics.playerId);

      // Name should be consistent
      expect(player.name).toBe(player.statistics.name);

      // Jersey number should be consistent
      expect(player.jerseyNumber.value).toBe(player.statistics.jerseyNumber.value);
    });
  });

  describe('Player Role Scenarios', () => {
    it('should handle starting player', () => {
      const starter = {
        ...validPlayerData,
        battingOrderPosition: 1,
      };

      expect(starter.battingOrderPosition).toBe(1);
      expect(starter.battingOrderPosition).toBeGreaterThan(0);
    });

    it('should handle substitute player', () => {
      const substitute = {
        ...validPlayerData,
        battingOrderPosition: 5,
        plateAppearances: [], // Just entered game
      };

      expect(substitute.battingOrderPosition).toBe(5);
      expect(substitute.plateAppearances).toHaveLength(0);
    });

    it('should handle bench player', () => {
      const benchPlayer = {
        ...validPlayerData,
        battingOrderPosition: 0,
        currentFieldPosition: FieldPosition.LEFT_FIELD, // Generic outfield assignment
        plateAppearances: [],
      };

      expect(benchPlayer.battingOrderPosition).toBe(0);
      expect(benchPlayer.plateAppearances).toHaveLength(0);
    });

    it('should handle pinch hitter', () => {
      const pinchHitter = {
        ...validPlayerData,
        battingOrderPosition: 3, // Taking slot of another player
        plateAppearances: [
          {
            batterId: playerId,
            result: AtBatResultType.HOME_RUN,
            inning: 7,
            rbi: 3,
            runnerAdvances: [],
            timestamp: new Date(),
          },
        ],
      };

      expect(pinchHitter.battingOrderPosition).toBe(3);
      expect(pinchHitter.plateAppearances).toHaveLength(1);
      expect(pinchHitter.plateAppearances[0]?.result).toBe(AtBatResultType.HOME_RUN);
    });
  });
});
