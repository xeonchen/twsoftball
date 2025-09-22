import { describe, it, expect } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition.js';

import { TestLineupBuilder } from './TestLineupBuilder.js';
import { TestPlayerFactory } from './TestPlayerFactory.js';

describe('TestLineupBuilder', () => {
  describe('STANDARD_POSITIONS constant', () => {
    it('should have exactly 10 positions for standard slow-pitch softball (10-player standard)', () => {
      expect(TestLineupBuilder.STANDARD_POSITIONS).toHaveLength(10);
    });

    it('should contain all standard slow-pitch field positions', () => {
      const positions = TestLineupBuilder.STANDARD_POSITIONS;
      expect(positions).toContain(FieldPosition.PITCHER);
      expect(positions).toContain(FieldPosition.CATCHER);
      expect(positions).toContain(FieldPosition.FIRST_BASE);
      expect(positions).toContain(FieldPosition.SECOND_BASE);
      expect(positions).toContain(FieldPosition.THIRD_BASE);
      expect(positions).toContain(FieldPosition.SHORTSTOP);
      expect(positions).toContain(FieldPosition.LEFT_FIELD);
      expect(positions).toContain(FieldPosition.CENTER_FIELD);
      expect(positions).toContain(FieldPosition.RIGHT_FIELD);
      expect(positions).toContain(FieldPosition.SHORT_FIELDER);
    });
  });

  describe('NINE_PLAYER_POSITIONS constant', () => {
    it('should have exactly 9 positions (9-player boundary case without SF)', () => {
      expect(TestLineupBuilder.NINE_PLAYER_POSITIONS).toHaveLength(9);
    });

    it('should include all baseball positions without SHORT_FIELDER (valid but less frequent)', () => {
      const ninePlayer = TestLineupBuilder.NINE_PLAYER_POSITIONS;
      expect(ninePlayer).toContain(FieldPosition.PITCHER);
      expect(ninePlayer).toContain(FieldPosition.CATCHER);
      expect(ninePlayer).toContain(FieldPosition.FIRST_BASE);
      expect(ninePlayer).toContain(FieldPosition.SECOND_BASE);
      expect(ninePlayer).toContain(FieldPosition.THIRD_BASE);
      expect(ninePlayer).toContain(FieldPosition.SHORTSTOP);
      expect(ninePlayer).toContain(FieldPosition.LEFT_FIELD);
      expect(ninePlayer).toContain(FieldPosition.CENTER_FIELD);
      expect(ninePlayer).toContain(FieldPosition.RIGHT_FIELD);
      expect(ninePlayer).not.toContain(FieldPosition.SHORT_FIELDER);
    });
  });

  describe('createFullLineup', () => {
    it('should create 10-player lineup with default players (standard configuration)', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(lineup).toHaveLength(10);
      lineup.forEach((slot, index) => {
        expect(slot.slotNumber).toBe(index + 1);
        expect(slot.currentPosition).toBe(TestLineupBuilder.STANDARD_POSITIONS[index]);
        expect(slot.currentPlayer.name).toBe(TestPlayerFactory.DEFAULT_NAMES[index]);
      });
    });

    it('should create lineup with provided players', () => {
      const players = TestPlayerFactory.createPlayers(10);
      const lineup = TestLineupBuilder.createFullLineup(players);

      expect(lineup).toHaveLength(10);
      lineup.forEach((slot, index) => {
        expect(slot.currentPlayer).toBe(players[index]);
        expect(slot.slotNumber).toBe(index + 1);
        expect(slot.currentPosition).toBe(TestLineupBuilder.STANDARD_POSITIONS[index]);
      });
    });

    it('should throw error for wrong number of players', () => {
      const players = TestPlayerFactory.createPlayers(8);
      expect(() => TestLineupBuilder.createFullLineup(players)).toThrow();
      expect(() => TestLineupBuilder.createFullLineup(players)).toThrow(
        'Expected 10 players for standard lineup, got 8'
      );
    });

    it('should assign positions correctly', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(lineup[0]!.currentPosition).toBe(FieldPosition.PITCHER);
      expect(lineup[1]!.currentPosition).toBe(FieldPosition.CATCHER);
      expect(lineup[2]!.currentPosition).toBe(FieldPosition.FIRST_BASE);
      expect(lineup[8]!.currentPosition).toBe(FieldPosition.RIGHT_FIELD);
    });
  });

  describe('createMinimalLineup', () => {
    it('should create 9-player lineup by default (boundary case)', () => {
      const lineup = TestLineupBuilder.createMinimalLineup();

      expect(lineup).toHaveLength(9);
      expect(lineup[0]!.slotNumber).toBe(1);
      expect(lineup[8]!.slotNumber).toBe(9);
    });

    it('should create lineup of specified size (flexible configuration)', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(5);

      expect(lineup).toHaveLength(5);
      lineup.forEach((slot, index) => {
        expect(slot.slotNumber).toBe(index + 1);
        expect(slot.currentPosition).toBe(TestLineupBuilder.STANDARD_POSITIONS[index]);
      });
    });

    it('should throw error for size below minimum', () => {
      expect(() => TestLineupBuilder.createMinimalLineup(0)).toThrow();
      expect(() => TestLineupBuilder.createMinimalLineup(0)).toThrow(
        'Lineup size must be between 1 and 9, got 0'
      );
    });

    it('should throw error for size above maximum', () => {
      expect(() => TestLineupBuilder.createMinimalLineup(10)).toThrow();
      expect(() => TestLineupBuilder.createMinimalLineup(10)).toThrow(
        'Lineup size must be between 1 and 9, got 10'
      );
    });

    it('should create single-player lineup', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(1);

      expect(lineup).toHaveLength(1);
      expect(lineup[0]!.slotNumber).toBe(1);
      expect(lineup[0]!.currentPosition).toBe(FieldPosition.PITCHER);
    });
  });

  describe('createCustomLineup', () => {
    it('should create lineup with custom slot configurations', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 9 }, // Non-sequential
      ]);

      expect(lineup).toHaveLength(2);
      expect(lineup[0]!.slotNumber).toBe(1);
      expect(lineup[0]!.currentPlayer).toBe(players[0]!);
      expect(lineup[0]!.currentPosition).toBe(FieldPosition.PITCHER);
      expect(lineup[1]!.slotNumber).toBe(9);
      expect(lineup[1]!.currentPlayer).toBe(players[1]!);
      expect(lineup[1]!.currentPosition).toBe(FieldPosition.CATCHER);
    });

    it('should handle empty configuration array', () => {
      const lineup = TestLineupBuilder.createCustomLineup([]);

      expect(lineup).toHaveLength(0);
      expect(lineup).toEqual([]);
    });

    it('should preserve order of slot configurations', () => {
      const players = TestPlayerFactory.createPlayers(3);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 5 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 1 },
        { player: players[2]!, position: FieldPosition.FIRST_BASE, slot: 3 },
      ]);

      expect(lineup).toHaveLength(3);
      expect(lineup[0]!.slotNumber).toBe(5); // First in config
      expect(lineup[1]!.slotNumber).toBe(1); // Second in config
      expect(lineup[2]!.slotNumber).toBe(3); // Third in config
    });
  });

  describe('createSlowPitchLineup', () => {
    it('should create 10-player lineup with default players (standard configuration)', () => {
      const lineup = TestLineupBuilder.createSlowPitchLineup();

      expect(lineup).toHaveLength(10);
      expect(lineup[9]!.currentPosition).toBe(FieldPosition.SHORT_FIELDER);
      lineup.forEach((slot, index) => {
        expect(slot.slotNumber).toBe(index + 1);
        expect(slot.currentPosition).toBe(TestLineupBuilder.STANDARD_POSITIONS[index]);
      });
    });

    it('should create lineup with provided 10 players (standard configuration)', () => {
      const players = TestPlayerFactory.createPlayers(10);
      const lineup = TestLineupBuilder.createSlowPitchLineup(players);

      expect(lineup).toHaveLength(10);
      lineup.forEach((slot, index) => {
        expect(slot.currentPlayer).toBe(players[index]);
      });
    });

    it('should throw error for wrong number of players', () => {
      const players = TestPlayerFactory.createPlayers(9);
      expect(() => TestLineupBuilder.createSlowPitchLineup(players)).toThrow();
      expect(() => TestLineupBuilder.createSlowPitchLineup(players)).toThrow(
        'Expected 10 players for slow-pitch lineup, got 9'
      );
    });
  });

  describe('createLineupWithPositions', () => {
    it('should assign specified positions to players', () => {
      const positions = [FieldPosition.PITCHER, FieldPosition.CATCHER, FieldPosition.FIRST_BASE];
      const lineup = TestLineupBuilder.createLineupWithPositions(positions);

      expect(lineup).toHaveLength(3);
      expect(lineup[0]!.currentPosition).toBe(FieldPosition.PITCHER);
      expect(lineup[1]!.currentPosition).toBe(FieldPosition.CATCHER);
      expect(lineup[2]!.currentPosition).toBe(FieldPosition.FIRST_BASE);
    });

    it('should use provided players', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const positions = [FieldPosition.PITCHER, FieldPosition.CATCHER];
      const lineup = TestLineupBuilder.createLineupWithPositions(positions, players);

      expect(lineup).toHaveLength(2);
      expect(lineup[0]!.currentPlayer).toBe(players[0]!);
      expect(lineup[1]!.currentPlayer).toBe(players[1]!);
    });

    it('should throw error for mismatched array lengths', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const positions = [FieldPosition.PITCHER]; // Only 1 position for 2 players

      expect(() => TestLineupBuilder.createLineupWithPositions(positions, players)).toThrow();
      expect(() => TestLineupBuilder.createLineupWithPositions(positions, players)).toThrow(
        'Players array length (2) must match positions array length (1)'
      );
    });

    it('should create all-pitcher lineup', () => {
      const allPitchers: FieldPosition[] = Array(3).fill(FieldPosition.PITCHER);
      const lineup = TestLineupBuilder.createLineupWithPositions(allPitchers);

      expect(lineup).toHaveLength(3);
      expect(lineup.every(slot => slot.currentPosition === FieldPosition.PITCHER)).toBe(true);
    });
  });

  describe('createLineupWithSlots', () => {
    it('should assign specified slot numbers', () => {
      const slotNumbers = [1, 3, 5];
      const lineup = TestLineupBuilder.createLineupWithSlots(slotNumbers);

      expect(lineup).toHaveLength(3);
      expect(lineup[0]!.slotNumber).toBe(1);
      expect(lineup[1]!.slotNumber).toBe(3);
      expect(lineup[2]!.slotNumber).toBe(5);
    });

    it('should use provided players', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const slotNumbers = [7, 2];
      const lineup = TestLineupBuilder.createLineupWithSlots(slotNumbers, players);

      expect(lineup).toHaveLength(2);
      expect(lineup[0]!.currentPlayer).toBe(players[0]!);
      expect(lineup[1]!.currentPlayer).toBe(players[1]!);
      expect(lineup[0]!.slotNumber).toBe(7);
      expect(lineup[1]!.slotNumber).toBe(2);
    });

    it('should assign EXTRA_PLAYER position when more slots than standard positions (13+ players boundary case)', () => {
      const slotNumbers = Array.from({ length: 13 }, (_, i) => i + 1); // Slots 1-13
      const lineup = TestLineupBuilder.createLineupWithSlots(slotNumbers);

      expect(lineup).toHaveLength(13);
      // First 10 players get standard positions (10-player standard)
      expect(lineup[0]!.currentPosition).toBe(FieldPosition.PITCHER);
      expect(lineup[9]!.currentPosition).toBe(FieldPosition.SHORT_FIELDER);
      // Players 11-13 are Extra Players (EP) - valid but less frequent
      expect(lineup[10]!.currentPosition).toBe(FieldPosition.EXTRA_PLAYER); // Slot 11 -> EP
      expect(lineup[11]!.currentPosition).toBe(FieldPosition.EXTRA_PLAYER); // Slot 12 -> EP
      expect(lineup[12]!.currentPosition).toBe(FieldPosition.EXTRA_PLAYER); // Slot 13 -> EP
    });

    it('should throw error for mismatched array lengths', () => {
      const players = TestPlayerFactory.createPlayers(3);
      const slotNumbers = [1, 2]; // Only 2 slots for 3 players

      expect(() => TestLineupBuilder.createLineupWithSlots(slotNumbers, players)).toThrow();
      expect(() => TestLineupBuilder.createLineupWithSlots(slotNumbers, players)).toThrow(
        'Players array length (3) must match slot numbers array length (2)'
      );
    });
  });

  describe('createEmptyLineup', () => {
    it('should return empty array', () => {
      const lineup = TestLineupBuilder.createEmptyLineup();

      expect(lineup).toHaveLength(0);
      expect(lineup).toEqual([]);
      expect(Array.isArray(lineup)).toBe(true);
    });
  });

  describe('integration with domain objects', () => {
    it('should create lineup compatible with TeamStrategy interfaces', () => {
      const lineup = TestLineupBuilder.createFullLineup();
      const slot = lineup[0]!;

      // Should have all required BattingSlotState properties
      expect(slot).toHaveProperty('slotNumber');
      expect(slot).toHaveProperty('currentPlayer');
      expect(slot).toHaveProperty('currentPosition');

      // Properties should be correct types
      expect(typeof slot.slotNumber).toBe('number');
      expect(slot.currentPlayer).toHaveProperty('playerId');
      expect(slot.currentPlayer).toHaveProperty('jerseyNumber');
      expect(slot.currentPlayer).toHaveProperty('name');
      expect(Object.values(FieldPosition)).toContain(slot.currentPosition);
    });

    it('should create lineups with unique slot numbers', () => {
      const lineup = TestLineupBuilder.createFullLineup();
      const slotNumbers = lineup.map(s => s.slotNumber);
      const uniqueSlots = new Set(slotNumbers);

      expect(uniqueSlots.size).toBe(slotNumbers.length);
    });

    it('should create lineups with unique players', () => {
      const lineup = TestLineupBuilder.createFullLineup();
      const playerIds = lineup.map(s => s.currentPlayer.playerId.value);
      const uniqueIds = new Set(playerIds);

      expect(uniqueIds.size).toBe(playerIds.length);
    });
  });
});
