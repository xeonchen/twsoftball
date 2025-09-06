import { describe, it, expect } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';

import { TeamStrategy, TeamPlayer, BattingSlotState } from './TeamStrategy';

describe('TeamStrategy Interface Contracts', () => {
  // Mock implementation for testing interface contracts
  class MockTeamStrategy implements TeamStrategy {
    private readonly lineup: Map<number, BattingSlotState> = new Map();

    constructor(initialLineup: BattingSlotState[] = []) {
      initialLineup.forEach(slot => {
        this.lineup.set(slot.slotNumber, slot);
      });
    }

    getCurrentLineup(): BattingSlotState[] {
      return Array.from(this.lineup.values()).sort((a, b) => a.slotNumber - b.slotNumber);
    }

    isPlayerInLineup(playerId: PlayerId): boolean {
      return Array.from(this.lineup.values()).some(slot =>
        slot.currentPlayer.playerId.equals(playerId)
      );
    }

    getPlayerBattingSlot(playerId: PlayerId): number | undefined {
      const foundSlot = Array.from(this.lineup.values()).find(battingSlot =>
        battingSlot.currentPlayer.playerId.equals(playerId)
      );
      return foundSlot?.slotNumber;
    }

    getPlayerFieldPosition(playerId: PlayerId): FieldPosition | undefined {
      const foundSlot = Array.from(this.lineup.values()).find(battingSlot =>
        battingSlot.currentPlayer.playerId.equals(playerId)
      );
      return foundSlot?.currentPosition;
    }

    substitutePlayer(
      battingSlot: number,
      outgoingPlayerId: PlayerId,
      incomingPlayer: TeamPlayer,
      fieldPosition: FieldPosition
    ): void {
      const currentSlot = this.lineup.get(battingSlot);
      if (!currentSlot || !currentSlot.currentPlayer.playerId.equals(outgoingPlayerId)) {
        throw new Error('Invalid substitution');
      }

      this.lineup.set(battingSlot, {
        slotNumber: battingSlot,
        currentPlayer: incomingPlayer,
        currentPosition: fieldPosition,
      });
    }

    changePlayerPosition(playerId: PlayerId, newPosition: FieldPosition): void {
      const entries = Array.from(this.lineup.entries());
      const foundEntry = entries.find(([, battingSlot]) =>
        battingSlot.currentPlayer.playerId.equals(playerId)
      );
      if (foundEntry) {
        const [slotNumber, slot] = foundEntry;
        this.lineup.set(slotNumber, {
          ...slot,
          currentPosition: newPosition,
        });
        return;
      }
      throw new Error('Player not found in lineup');
    }

    isLineupValid(): boolean {
      return this.lineup.size >= 9 && this.lineup.size <= 20;
    }

    getActivePlayerCount(): number {
      return this.lineup.size;
    }
  }

  const createTestPlayer = (id: string, jersey: number, name: string): TeamPlayer => ({
    playerId: new PlayerId(id),
    jerseyNumber: new JerseyNumber(jersey.toString()),
    name,
  });

  const createTestSlot = (
    slotNumber: number,
    player: TeamPlayer,
    position: FieldPosition
  ): BattingSlotState => ({
    slotNumber,
    currentPlayer: player,
    currentPosition: position,
  });

  describe('TeamPlayer Interface', () => {
    it('should define required properties for team players', () => {
      const player = createTestPlayer('player-1', 15, 'John Doe');

      expect(player.playerId).toBeInstanceOf(PlayerId);
      expect(player.jerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(typeof player.name).toBe('string');
      expect(player.playerId.value).toBe('player-1');
      expect(player.jerseyNumber.value).toBe('15');
      expect(player.name).toBe('John Doe');
    });
  });

  describe('BattingSlotState Interface', () => {
    it('should define required properties for batting slot state', () => {
      const player = createTestPlayer('player-1', 10, 'Test Player');
      const slot = createTestSlot(3, player, FieldPosition.FIRST_BASE);

      expect(typeof slot.slotNumber).toBe('number');
      expect(slot.currentPlayer).toEqual(player);
      expect(slot.currentPosition).toBe(FieldPosition.FIRST_BASE);
    });

    it('should support all valid batting slot numbers', () => {
      const player = createTestPlayer('player-1', 5, 'Test Player');

      for (let slotNumber = 1; slotNumber <= 20; slotNumber += 1) {
        const slot = createTestSlot(slotNumber, player, FieldPosition.CENTER_FIELD);
        expect(slot.slotNumber).toBe(slotNumber);
      }
    });

    it('should support all field positions', () => {
      const player = createTestPlayer('player-1', 8, 'Test Player');

      Object.values(FieldPosition).forEach(position => {
        const slot = createTestSlot(1, player, position);
        expect(slot.currentPosition).toBe(position);
      });
    });
  });

  describe('TeamStrategy Interface Implementation', () => {
    let strategy: TeamStrategy;
    let player1: TeamPlayer;
    let player2: TeamPlayer;
    let player3: TeamPlayer;

    beforeEach(() => {
      player1 = createTestPlayer('player-1', 10, 'Alice');
      player2 = createTestPlayer('player-2', 15, 'Bob');
      player3 = createTestPlayer('player-3', 20, 'Charlie');

      const initialLineup = [
        createTestSlot(1, player1, FieldPosition.PITCHER),
        createTestSlot(2, player2, FieldPosition.CATCHER),
      ];

      strategy = new MockTeamStrategy(initialLineup);
    });

    describe('getCurrentLineup()', () => {
      it('should return current lineup sorted by slot number', () => {
        const lineup = strategy.getCurrentLineup();

        expect(lineup).toHaveLength(2);
        expect(lineup[0]?.slotNumber).toBe(1);
        expect(lineup[1]?.slotNumber).toBe(2);
        expect(lineup[0]?.currentPlayer).toEqual(player1);
        expect(lineup[1]?.currentPlayer).toEqual(player2);
      });

      it('should return empty array when no players in lineup', () => {
        const emptyStrategy = new MockTeamStrategy([]);
        const lineup = emptyStrategy.getCurrentLineup();

        expect(lineup).toHaveLength(0);
        expect(Array.isArray(lineup)).toBe(true);
      });
    });

    describe('isPlayerInLineup()', () => {
      it('should return true for players in the lineup', () => {
        expect(strategy.isPlayerInLineup(player1.playerId)).toBe(true);
        expect(strategy.isPlayerInLineup(player2.playerId)).toBe(true);
      });

      it('should return false for players not in the lineup', () => {
        expect(strategy.isPlayerInLineup(player3.playerId)).toBe(false);

        const unknownPlayer = new PlayerId('unknown-player');
        expect(strategy.isPlayerInLineup(unknownPlayer)).toBe(false);
      });
    });

    describe('getPlayerBattingSlot()', () => {
      it('should return correct batting slot for players in lineup', () => {
        expect(strategy.getPlayerBattingSlot(player1.playerId)).toBe(1);
        expect(strategy.getPlayerBattingSlot(player2.playerId)).toBe(2);
      });

      it('should return undefined for players not in lineup', () => {
        expect(strategy.getPlayerBattingSlot(player3.playerId)).toBeUndefined();

        const unknownPlayer = new PlayerId('unknown-player');
        expect(strategy.getPlayerBattingSlot(unknownPlayer)).toBeUndefined();
      });
    });

    describe('getPlayerFieldPosition()', () => {
      it('should return correct field position for players in lineup', () => {
        expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.PITCHER);
        expect(strategy.getPlayerFieldPosition(player2.playerId)).toBe(FieldPosition.CATCHER);
      });

      it('should return undefined for players not in lineup', () => {
        expect(strategy.getPlayerFieldPosition(player3.playerId)).toBeUndefined();

        const unknownPlayer = new PlayerId('unknown-player');
        expect(strategy.getPlayerFieldPosition(unknownPlayer)).toBeUndefined();
      });
    });

    describe('substitutePlayer()', () => {
      it('should successfully substitute a player in the lineup', () => {
        // Substitute player1 with player3 in slot 1
        strategy.substitutePlayer(1, player1.playerId, player3, FieldPosition.FIRST_BASE);

        const lineup = strategy.getCurrentLineup();
        const slot1 = lineup.find(slot => slot.slotNumber === 1);

        expect(slot1?.currentPlayer).toEqual(player3);
        expect(slot1?.currentPosition).toBe(FieldPosition.FIRST_BASE);
        expect(strategy.isPlayerInLineup(player1.playerId)).toBe(false);
        expect(strategy.isPlayerInLineup(player3.playerId)).toBe(true);
      });

      it('should throw error when substituting wrong player', () => {
        // Try to substitute player2 from slot 1 (where player1 actually is)
        expect(() => {
          strategy.substitutePlayer(1, player2.playerId, player3, FieldPosition.FIRST_BASE);
        }).toThrow('Invalid substitution');
      });

      it('should throw error when substituting from invalid slot', () => {
        // Try to substitute from slot 5 which doesn't exist
        expect(() => {
          strategy.substitutePlayer(5, player1.playerId, player3, FieldPosition.FIRST_BASE);
        }).toThrow('Invalid substitution');
      });
    });

    describe('changePlayerPosition()', () => {
      it('should successfully change player position', () => {
        // Change player1 from PITCHER to FIRST_BASE
        strategy.changePlayerPosition(player1.playerId, FieldPosition.FIRST_BASE);

        expect(strategy.getPlayerFieldPosition(player1.playerId)).toBe(FieldPosition.FIRST_BASE);
        expect(strategy.getPlayerBattingSlot(player1.playerId)).toBe(1); // Still in same slot
      });

      it('should throw error when changing position of player not in lineup', () => {
        expect(() => {
          strategy.changePlayerPosition(player3.playerId, FieldPosition.FIRST_BASE);
        }).toThrow('Player not found in lineup');
      });
    });

    describe('isLineupValid()', () => {
      it('should return false when lineup has fewer than 9 players', () => {
        const smallStrategy = new MockTeamStrategy([
          createTestSlot(1, player1, FieldPosition.PITCHER),
        ]);

        expect(smallStrategy.isLineupValid()).toBe(false);
      });

      it('should return true when lineup has 9-20 players (9-player boundary, 10-player standard, 11-12 common)', () => {
        const players = Array.from({ length: 10 }, (_, i) =>
          createTestPlayer(`player-${i}`, i + 1, `Player ${i}`)
        );
        const lineup = players.map((player, i) =>
          createTestSlot(i + 1, player, FieldPosition.PITCHER)
        );

        const validStrategy = new MockTeamStrategy(lineup);
        expect(validStrategy.isLineupValid()).toBe(true);
      });

      it('should return false when lineup has more than 20 players', () => {
        const players = Array.from({ length: 21 }, (_, i) =>
          createTestPlayer(`player-${i}`, i + 1, `Player ${i}`)
        );
        const lineup = players.map((player, i) =>
          createTestSlot(i + 1, player, FieldPosition.PITCHER)
        );

        const invalidStrategy = new MockTeamStrategy(lineup);
        expect(invalidStrategy.isLineupValid()).toBe(false);
      });
    });

    describe('getActivePlayerCount()', () => {
      it('should return correct number of active players', () => {
        expect(strategy.getActivePlayerCount()).toBe(2);

        // Add another player
        strategy.substitutePlayer(2, player2.playerId, player3, FieldPosition.CATCHER);
        expect(strategy.getActivePlayerCount()).toBe(2); // Still 2, just substituted
      });

      it('should return 0 for empty lineup', () => {
        const emptyStrategy = new MockTeamStrategy([]);
        expect(emptyStrategy.getActivePlayerCount()).toBe(0);
      });
    });
  });

  describe('Interface Type Safety', () => {
    it('should enforce readonly properties on TeamPlayer', () => {
      const player = createTestPlayer('player-1', 10, 'Test Player');

      // These would be TypeScript compile-time errors:
      // player.playerId = new PlayerId('different-id'); // Error: Cannot assign to 'playerId' because it is a read-only property
      // player.jerseyNumber = new JerseyNumber(99);    // Error: Cannot assign to 'jerseyNumber' because it is a read-only property
      // player.name = 'Different Name';                 // Error: Cannot assign to 'name' because it is a read-only property

      // Verify the values are accessible
      expect(player.playerId.value).toBe('player-1');
      expect(player.jerseyNumber.value).toBe('10');
      expect(player.name).toBe('Test Player');
    });

    it('should enforce readonly properties on BattingSlotState', () => {
      const player = createTestPlayer('player-1', 5, 'Test Player');
      const slot = createTestSlot(3, player, FieldPosition.SHORTSTOP);

      // These would be TypeScript compile-time errors:
      // slot.slotNumber = 5;                           // Error: Cannot assign to 'slotNumber' because it is a read-only property
      // slot.currentPlayer = anotherPlayer;            // Error: Cannot assign to 'currentPlayer' because it is a read-only property
      // slot.currentPosition = FieldPosition.PITCHER;  // Error: Cannot assign to 'currentPosition' because it is a read-only property

      // Verify the values are accessible
      expect(slot.slotNumber).toBe(3);
      expect(slot.currentPlayer).toEqual(player);
      expect(slot.currentPosition).toBe(FieldPosition.SHORTSTOP);
    });
  });

  describe('Integration with Domain Value Objects', () => {
    it('should work correctly with PlayerId equality', () => {
      const playerId1 = new PlayerId('same-id');
      const playerId2 = new PlayerId('same-id'); // Same value, different instance

      const player1 = {
        playerId: playerId1,
        jerseyNumber: new JerseyNumber('10'),
        name: 'Player 1',
      };
      const slot = createTestSlot(1, player1, FieldPosition.PITCHER);
      const strategy = new MockTeamStrategy([slot]);

      // Should work with different instances of same ID
      expect(strategy.isPlayerInLineup(playerId2)).toBe(true);
      expect(strategy.getPlayerBattingSlot(playerId2)).toBe(1);
    });

    it('should work correctly with JerseyNumber constraints', () => {
      // Test that valid jersey numbers work
      [1, 50, 99].forEach(jersey => {
        const player = createTestPlayer(`player-${jersey}`, jersey, `Player ${jersey}`);
        expect(player.jerseyNumber.value).toBe(jersey.toString());
      });

      // Invalid jersey numbers would throw during construction
      expect(() => createTestPlayer('invalid', 0, 'Invalid')).toThrow();
      expect(() => createTestPlayer('invalid', 100, 'Invalid')).toThrow();
    });

    it('should support all FieldPosition enum values', () => {
      const player = createTestPlayer('versatile-player', 42, 'Versatile Player');

      Object.values(FieldPosition).forEach(position => {
        const slot = createTestSlot(1, player, position);
        const strategy = new MockTeamStrategy([slot]);

        expect(strategy.getPlayerFieldPosition(player.playerId)).toBe(position);
      });
    });
  });
});
