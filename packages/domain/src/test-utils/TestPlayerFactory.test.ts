import { describe, it, expect } from 'vitest';

import { DomainError } from '../errors/DomainError.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { TestPlayerFactory } from './TestPlayerFactory.js';

describe('TestPlayerFactory', () => {
  describe('createPlayer', () => {
    it('should create player with specified attributes', () => {
      const player = TestPlayerFactory.createPlayer('1', '10', 'John Smith');

      expect(player.playerId).toBeInstanceOf(PlayerId);
      expect(player.playerId.value).toBe('player-1');
      expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(player.jerseyNumber.value).toBe('10');
      expect(player.name).toBe('John Smith');
    });

    it('should create different players with different IDs', () => {
      const player1 = TestPlayerFactory.createPlayer('1', '10', 'Player One');
      const player2 = TestPlayerFactory.createPlayer('2', '15', 'Player Two');

      expect(player1.playerId.equals(player2.playerId)).toBe(false);
      expect(player1.jerseyNumber.value).toBe('10');
      expect(player2.jerseyNumber.value).toBe('15');
      expect(player1.name).toBe('Player One');
      expect(player2.name).toBe('Player Two');
    });

    it('should throw DomainError for invalid jersey number', () => {
      expect(() => TestPlayerFactory.createPlayer('1', '', 'Valid Name')).toThrow(DomainError);
    });

    it('should handle special characters in name', () => {
      const player = TestPlayerFactory.createPlayer('1', '10', 'José García-Smith');
      expect(player.name).toBe('José García-Smith');
    });
  });

  describe('createPlayers', () => {
    it('should create specified number of players with defaults', () => {
      const players = TestPlayerFactory.createPlayers(5);

      expect(players).toHaveLength(5);
      players.forEach((player, index) => {
        expect(player.playerId.value).toBe(`player-${index + 1}`);
        expect(player.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[index]);
        expect(player.name).toBe(TestPlayerFactory.DEFAULT_NAMES[index]);
      });
    });

    it('should create maximum players (20)', () => {
      const players = TestPlayerFactory.createPlayers(20);

      expect(players).toHaveLength(20);
      expect(players[19]!.name).toBe(TestPlayerFactory.DEFAULT_NAMES[19]);
      expect(players[19]!.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[19]);
    });

    it('should create all players with unique IDs', () => {
      const players = TestPlayerFactory.createPlayers(10);
      const playerIds = players.map(p => p.playerId.value);
      const uniqueIds = new Set(playerIds);

      expect(uniqueIds.size).toBe(players.length);
    });

    it('should create all players with unique jersey numbers', () => {
      const players = TestPlayerFactory.createPlayers(10);
      const jerseys = players.map(p => p.jerseyNumber.value);
      const uniqueJerseys = new Set(jerseys);

      expect(uniqueJerseys.size).toBe(players.length);
    });

    it('should throw error for count below minimum (0)', () => {
      expect(() => TestPlayerFactory.createPlayers(0)).toThrow();
      expect(() => TestPlayerFactory.createPlayers(0)).toThrow('Cannot create 0 players');
    });

    it('should throw error for count above maximum (21)', () => {
      expect(() => TestPlayerFactory.createPlayers(21)).toThrow();
      expect(() => TestPlayerFactory.createPlayers(21)).toThrow('Cannot create 21 players');
    });

    it('should create exactly 9 players for standard lineup', () => {
      const players = TestPlayerFactory.createPlayers(9);

      expect(players).toHaveLength(9);
      expect(players[0]!.name).toBe('John Smith');
      expect(players[8]!.name).toBe('Chris Lee');
    });
  });

  describe('createPlayerWithId', () => {
    it('should create player with provided PlayerId and defaults', () => {
      const playerId = new PlayerId('custom-player-123');
      const player = TestPlayerFactory.createPlayerWithId(playerId);

      expect(player.playerId).toBe(playerId);
      expect(player.jerseyNumber.value).toBe('99'); // Default
      expect(player.name).toBe('Test Player'); // Default
    });

    it('should create player with custom jersey and name', () => {
      const playerId = new PlayerId('custom-player-456');
      const player = TestPlayerFactory.createPlayerWithId(playerId, '42', 'Custom Player');

      expect(player.playerId).toBe(playerId);
      expect(player.jerseyNumber.value).toBe('42');
      expect(player.name).toBe('Custom Player');
    });

    it('should throw DomainError for invalid custom jersey', () => {
      const playerId = new PlayerId('test-player');
      expect(() => TestPlayerFactory.createPlayerWithId(playerId, '', 'Valid Name')).toThrow(
        DomainError
      );
    });
  });

  describe('createPlayersWithJerseys', () => {
    it('should create players with specified jersey numbers', () => {
      const jerseys = ['1', '99', '50'];
      const players = TestPlayerFactory.createPlayersWithJerseys(jerseys);

      expect(players).toHaveLength(3);
      expect(players[0]!.jerseyNumber.value).toBe('1');
      expect(players[1]!.jerseyNumber.value).toBe('99');
      expect(players[2]!.jerseyNumber.value).toBe('50');
    });

    it('should use default names cycling through available names', () => {
      const jerseys = ['1', '2', '3'];
      const players = TestPlayerFactory.createPlayersWithJerseys(jerseys);

      expect(players[0]!.name).toBe(TestPlayerFactory.DEFAULT_NAMES[0]);
      expect(players[1]!.name).toBe(TestPlayerFactory.DEFAULT_NAMES[1]);
      expect(players[2]!.name).toBe(TestPlayerFactory.DEFAULT_NAMES[2]);
    });

    it('should cycle names when jersey array is longer than names array', () => {
      const jerseys = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
      const players = TestPlayerFactory.createPlayersWithJerseys(jerseys);

      expect(players).toHaveLength(25);
      // Should cycle back to first name after exhausting the 20 defaults
      expect(players[20]!.name).toBe(TestPlayerFactory.DEFAULT_NAMES[0]);
      expect(players[21]!.name).toBe(TestPlayerFactory.DEFAULT_NAMES[1]);
    });

    it('should throw DomainError for invalid jersey numbers', () => {
      expect(() => TestPlayerFactory.createPlayersWithJerseys(['', '10'])).toThrow(DomainError);
    });
  });

  describe('createPlayersWithNames', () => {
    it('should create players with specified names', () => {
      const names = ['Star Player', 'Rookie Player', 'Veteran Player'];
      const players = TestPlayerFactory.createPlayersWithNames(names);

      expect(players).toHaveLength(3);
      expect(players[0]!.name).toBe('Star Player');
      expect(players[1]!.name).toBe('Rookie Player');
      expect(players[2]!.name).toBe('Veteran Player');
    });

    it('should use default jerseys cycling through available jerseys', () => {
      const names = ['Player A', 'Player B', 'Player C'];
      const players = TestPlayerFactory.createPlayersWithNames(names);

      expect(players[0]!.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[0]);
      expect(players[1]!.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[1]);
      expect(players[2]!.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[2]);
    });

    it('should cycle jersey numbers when names array is longer than jerseys array', () => {
      const names = Array.from({ length: 25 }, (_, i) => `Player ${i + 1}`);
      const players = TestPlayerFactory.createPlayersWithNames(names);

      expect(players).toHaveLength(25);
      // Should cycle back to first jersey after exhausting the 20 defaults
      expect(players[20]!.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[0]);
      expect(players[21]!.jerseyNumber.value).toBe(TestPlayerFactory.DEFAULT_JERSEYS[1]);
    });
  });

  describe('DEFAULT_NAMES constant', () => {
    it('should have exactly 20 default names', () => {
      expect(TestPlayerFactory.DEFAULT_NAMES).toHaveLength(20);
    });

    it('should have all unique names', () => {
      const uniqueNames = new Set(TestPlayerFactory.DEFAULT_NAMES);
      expect(uniqueNames.size).toBe(TestPlayerFactory.DEFAULT_NAMES.length);
    });

    it('should have realistic softball player names', () => {
      expect(TestPlayerFactory.DEFAULT_NAMES[0]).toBe('John Smith');
      expect(TestPlayerFactory.DEFAULT_NAMES[1]).toBe('Jane Doe');
      expect(TestPlayerFactory.DEFAULT_NAMES).toContain('Mike Johnson');
    });
  });

  describe('DEFAULT_JERSEYS constant', () => {
    it('should have exactly 20 default jersey numbers', () => {
      expect(TestPlayerFactory.DEFAULT_JERSEYS).toHaveLength(20);
    });

    it('should have all unique jersey numbers', () => {
      const uniqueJerseys = new Set(TestPlayerFactory.DEFAULT_JERSEYS);
      expect(uniqueJerseys.size).toBe(TestPlayerFactory.DEFAULT_JERSEYS.length);
    });

    it('should have realistic softball jersey numbers', () => {
      expect(TestPlayerFactory.DEFAULT_JERSEYS[0]).toBe('10');
      expect(TestPlayerFactory.DEFAULT_JERSEYS[1]).toBe('15');
      expect(TestPlayerFactory.DEFAULT_JERSEYS).toContain('22');
    });
  });

  describe('integration with domain objects', () => {
    it('should create players that work with domain equality', () => {
      const player1 = TestPlayerFactory.createPlayer('same', '10', 'Same Player');
      const player2 = TestPlayerFactory.createPlayer('same', '10', 'Same Player');

      // Same ID should be equal
      expect(player1.playerId.equals(player2.playerId)).toBe(true);
      // Same jersey should be equal
      expect(player1.jerseyNumber.equals(player2.jerseyNumber)).toBe(true);
    });

    it('should create players compatible with TeamStrategy interfaces', () => {
      const players = TestPlayerFactory.createPlayers(1);
      const player = players[0]!;

      // Should have all required TeamPlayer properties
      expect(player).toHaveProperty('playerId');
      expect(player).toHaveProperty('jerseyNumber');
      expect(player).toHaveProperty('name');

      // Properties should be correct types
      expect(player.playerId).toBeInstanceOf(PlayerId);
      expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(typeof player.name).toBe('string');
    });
  });
});
