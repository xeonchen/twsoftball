import { describe, it, expect } from 'vitest';
import { AssertionHelpers } from './AssertionHelpers';
import { TestPlayerFactory } from './TestPlayerFactory';
import { TestLineupBuilder } from './TestLineupBuilder';
import { SimpleTeamStrategy } from '../strategies/SimpleTeamStrategy';
import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { JerseyNumber } from '../value-objects/JerseyNumber';

describe('AssertionHelpers', () => {
  describe('expectPlayerInSlot', () => {
    it('should pass when player is in expected slot', () => {
      const players = TestPlayerFactory.createPlayers(3);
      const lineup = TestLineupBuilder.createMinimalLineup(3);

      expect(() => {
        AssertionHelpers.expectPlayerInSlot(lineup, 1, players[0]!);
      }).not.toThrow();
    });

    it('should throw when slot does not exist', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createMinimalLineup(2);

      expect(() => {
        AssertionHelpers.expectPlayerInSlot(lineup, 5, players[0]!);
      }).toThrow('Expected slot 5 to exist in lineup, but it was not found');
    });

    it('should throw when wrong player is in slot', () => {
      const players = TestPlayerFactory.createPlayers(3);
      const lineup = TestLineupBuilder.createMinimalLineup(3);

      expect(() => {
        AssertionHelpers.expectPlayerInSlot(lineup, 1, players[2]!); // Wrong player
      }).toThrow();
    });

    it('should include player names and IDs in error message', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createMinimalLineup(2);

      expect(() => {
        AssertionHelpers.expectPlayerInSlot(lineup, 1, players[1]!);
      }).toThrow(/Expected player .+ in slot 1, but found .+/);
    });

    it('should use custom error message when provided', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createMinimalLineup(2);

      expect(() => {
        AssertionHelpers.expectPlayerInSlot(lineup, 1, players[1]!, 'Custom error message');
      }).toThrow('Custom error message');
    });
  });

  describe('expectLineupLength', () => {
    it('should pass when lineup has expected length', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(5);

      expect(() => {
        AssertionHelpers.expectLineupLength(lineup, 5);
      }).not.toThrow();
    });

    it('should throw when lineup has wrong length', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(3);

      expect(() => {
        AssertionHelpers.expectLineupLength(lineup, 5);
      }).toThrow('Expected lineup to have 5 players, but found 3');
    });

    it('should include player details in error message', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(2);

      expect(() => {
        AssertionHelpers.expectLineupLength(lineup, 5);
      }).toThrow(/Players: 1:John Smith, 2:Jane Doe/);
    });

    it('should use custom error message when provided', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(2);

      expect(() => {
        AssertionHelpers.expectLineupLength(lineup, 5, 'Custom length error');
      }).toThrow('Custom length error');
    });
  });

  describe('expectValidLineup', () => {
    it('should pass when strategy has valid lineup', () => {
      const strategy = new SimpleTeamStrategy();
      const lineup = TestLineupBuilder.createFullLineup();
      strategy.setCurrentLineup(lineup);

      expect(() => {
        AssertionHelpers.expectValidLineup(strategy);
      }).not.toThrow();
    });

    it('should throw when strategy has invalid lineup', () => {
      const strategy = new SimpleTeamStrategy();
      // Leave lineup empty (invalid for most strategies)

      expect(() => {
        AssertionHelpers.expectValidLineup(strategy);
      }).toThrow('Expected lineup to be valid, but strategy.isLineupValid() returned false');
    });

    it('should include lineup details in error message', () => {
      const strategy = new SimpleTeamStrategy();
      const partialLineup = TestLineupBuilder.createMinimalLineup(2);
      strategy.setCurrentLineup(partialLineup);

      expect(() => {
        AssertionHelpers.expectValidLineup(strategy);
      }).toThrow(/Current lineup: 2 players, slots: 1, 2/);
    });

    it('should use custom error message when provided', () => {
      const strategy = new SimpleTeamStrategy();

      expect(() => {
        AssertionHelpers.expectValidLineup(strategy, 'Custom validation error');
      }).toThrow('Custom validation error');
    });
  });

  describe('expectDomainError', () => {
    it('should pass when function throws DomainError', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(() => {
          throw new DomainError('Test error');
        });
      }).not.toThrow();
    });

    it('should pass when function throws DomainError with expected message', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(() => {
          throw new DomainError('Test error message');
        }, 'error message');
      }).not.toThrow();
    });

    it('should throw when function does not throw any error', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(() => {
          // Function that doesn't throw
        });
      }).toThrow('Expected function to throw DomainError, but no error was thrown');
    });

    it('should throw when function throws wrong error type', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(() => {
          throw new Error('Regular error');
        });
      }).toThrow('Expected DomainError to be thrown, but got Error: Regular error');
    });

    it('should throw when DomainError has wrong message', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(() => {
          throw new DomainError('Wrong message');
        }, 'expected message');
      }).toThrow(
        "Expected DomainError message to contain 'expected message', but got: 'Wrong message'"
      );
    });

    it('should work with real domain validation', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(() => {
          const invalidJersey = new JerseyNumber(''); // Invalid jersey number
          return invalidJersey; // Satisfy no-new rule
        }, 'cannot be empty');
      }).not.toThrow();
    });

    it('should use custom error message when provided', () => {
      expect(() => {
        AssertionHelpers.expectDomainError(
          () => {
            // Doesn't throw
          },
          undefined,
          'Custom assertion error'
        );
      }).toThrow('Custom assertion error');
    });
  });

  describe('expectNoError', () => {
    it('should pass when function does not throw', () => {
      expect(() => {
        AssertionHelpers.expectNoError(() => {
          const validPlayer = TestPlayerFactory.createPlayer('1', '10', 'Valid');
          expect(validPlayer).toBeDefined(); // Use the variable to avoid no-unused-vars
        });
      }).not.toThrow();
    });

    it('should throw when function throws any error', () => {
      expect(() => {
        AssertionHelpers.expectNoError(() => {
          throw new Error('Unexpected error');
        });
      }).toThrow('Expected function not to throw any error, but got Error: Unexpected error');
    });

    it('should include error type and message in failure', () => {
      expect(() => {
        AssertionHelpers.expectNoError(() => {
          throw new DomainError('Domain validation failed');
        });
      }).toThrow(
        'Expected function not to throw any error, but got DomainError: Domain validation failed'
      );
    });

    it('should use custom error message when provided', () => {
      expect(() => {
        AssertionHelpers.expectNoError(() => {
          throw new Error('Test error');
        }, 'Custom no error message');
      }).toThrow('Custom no error message');
    });
  });

  describe('expectPlayerPosition', () => {
    it('should pass when player has expected position', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectPlayerPosition(lineup, 1, FieldPosition.PITCHER);
      }).not.toThrow();
    });

    it('should throw when slot does not exist', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(3);

      expect(() => {
        AssertionHelpers.expectPlayerPosition(lineup, 5, FieldPosition.PITCHER);
      }).toThrow('Expected slot 5 to exist in lineup for position check');
    });

    it('should throw when player has wrong position', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectPlayerPosition(lineup, 1, FieldPosition.CATCHER); // Should be PITCHER
      }).toThrow('Expected player in slot 1 to play C, but found P');
    });

    it('should use custom error message when provided', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectPlayerPosition(
          lineup,
          1,
          FieldPosition.CATCHER,
          'Custom position error'
        );
      }).toThrow('Custom position error');
    });
  });

  describe('expectUniqueSlotNumbers', () => {
    it('should pass when all slot numbers are unique', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectUniqueSlotNumbers(lineup);
      }).not.toThrow();
    });

    it('should throw when slot numbers are duplicated', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 1 }, // Duplicate slot
      ]);

      expect(() => {
        AssertionHelpers.expectUniqueSlotNumbers(lineup);
      }).toThrow('Expected all slot numbers to be unique, but found duplicates: 1');
    });

    it('should include all slot numbers in error message', () => {
      const players = TestPlayerFactory.createPlayers(3);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 2 },
        { player: players[2]!, position: FieldPosition.FIRST_BASE, slot: 1 }, // Duplicate
      ]);

      expect(() => {
        AssertionHelpers.expectUniqueSlotNumbers(lineup);
      }).toThrow('All slots: 1, 2, 1');
    });

    it('should use custom error message when provided', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 1 },
      ]);

      expect(() => {
        AssertionHelpers.expectUniqueSlotNumbers(lineup, 'Custom slot uniqueness error');
      }).toThrow('Custom slot uniqueness error');
    });
  });

  describe('expectUniqueJerseyNumbers', () => {
    it('should pass when all jersey numbers are unique', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectUniqueJerseyNumbers(lineup);
      }).not.toThrow();
    });

    it('should throw when jersey numbers are duplicated', () => {
      const players = [
        TestPlayerFactory.createPlayer('1', '10', 'Player 1'),
        TestPlayerFactory.createPlayer('2', '10', 'Player 2'), // Duplicate jersey
      ];
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 2 },
      ]);

      expect(() => {
        AssertionHelpers.expectUniqueJerseyNumbers(lineup);
      }).toThrow('Expected all jersey numbers to be unique, but found duplicates: 10');
    });

    it('should use custom error message when provided', () => {
      const players = [
        TestPlayerFactory.createPlayer('1', '15', 'Player 1'),
        TestPlayerFactory.createPlayer('2', '15', 'Player 2'),
      ];
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 2 },
      ]);

      expect(() => {
        AssertionHelpers.expectUniqueJerseyNumbers(lineup, 'Custom jersey uniqueness error');
      }).toThrow('Custom jersey uniqueness error');
    });
  });

  describe('expectUniquePlayerIds', () => {
    it('should pass when all player IDs are unique', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectUniquePlayerIds(lineup);
      }).not.toThrow();
    });

    it('should throw when player IDs are duplicated', () => {
      const duplicatePlayer = TestPlayerFactory.createPlayer('1', '10', 'Player');
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: duplicatePlayer, position: FieldPosition.PITCHER, slot: 1 },
        { player: duplicatePlayer, position: FieldPosition.CATCHER, slot: 2 }, // Same player
      ]);

      expect(() => {
        AssertionHelpers.expectUniquePlayerIds(lineup);
      }).toThrow('Expected all player IDs to be unique, but found duplicates: player-1');
    });

    it('should use custom error message when provided', () => {
      const player = TestPlayerFactory.createPlayer('duplicate', '10', 'Player');
      const lineup = TestLineupBuilder.createCustomLineup([
        { player, position: FieldPosition.PITCHER, slot: 1 },
        { player, position: FieldPosition.CATCHER, slot: 2 },
      ]);

      expect(() => {
        AssertionHelpers.expectUniquePlayerIds(lineup, 'Custom ID uniqueness error');
      }).toThrow('Custom ID uniqueness error');
    });
  });

  describe('expectValidLineupStructure', () => {
    it('should pass when lineup has all unique elements', () => {
      const lineup = TestLineupBuilder.createFullLineup();

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(lineup);
      }).not.toThrow();
    });

    it('should throw when slots are duplicated', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 1 }, // Duplicate slot
      ]);

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(lineup);
      }).toThrow('Slot numbers must be unique');
    });

    it('should throw when players are duplicated', () => {
      const player = TestPlayerFactory.createPlayer('1', '10', 'Player');
      const lineup = TestLineupBuilder.createCustomLineup([
        { player, position: FieldPosition.PITCHER, slot: 1 },
        { player, position: FieldPosition.CATCHER, slot: 2 }, // Same player
      ]);

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(lineup);
      }).toThrow('Player IDs must be unique');
    });

    it('should throw when jersey numbers are duplicated', () => {
      const players = [
        TestPlayerFactory.createPlayer('1', '99', 'Player 1'),
        TestPlayerFactory.createPlayer('2', '99', 'Player 2'), // Duplicate jersey
      ];
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 2 },
      ]);

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(lineup);
      }).toThrow('Jersey numbers must be unique');
    });

    it('should include custom message prefix', () => {
      const players = TestPlayerFactory.createPlayers(2);
      const lineup = TestLineupBuilder.createCustomLineup([
        { player: players[0]!, position: FieldPosition.PITCHER, slot: 1 },
        { player: players[1]!, position: FieldPosition.CATCHER, slot: 1 },
      ]);

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(lineup, 'Lineup validation');
      }).toThrow('Lineup validation: Slot numbers must be unique');
    });
  });

  describe('expectValidSlotRange', () => {
    it('should pass when all slots are in valid range', () => {
      const lineup = TestLineupBuilder.createLineupWithSlots([1, 5, 10, 25]);

      expect(() => {
        AssertionHelpers.expectValidSlotRange(lineup);
      }).not.toThrow();
    });

    it('should throw when slots are below minimum', () => {
      const lineup = TestLineupBuilder.createLineupWithSlots([0, 5]);

      expect(() => {
        AssertionHelpers.expectValidSlotRange(lineup);
      }).toThrow('Expected all slot numbers to be between 1 and 25, but found invalid slots: 0');
    });

    it('should throw when slots are above maximum', () => {
      const lineup = TestLineupBuilder.createLineupWithSlots([1, 26]);

      expect(() => {
        AssertionHelpers.expectValidSlotRange(lineup);
      }).toThrow('Expected all slot numbers to be between 1 and 25, but found invalid slots: 26');
    });

    it('should use custom range', () => {
      const lineup = TestLineupBuilder.createLineupWithSlots([1, 15, 21]);

      expect(() => {
        AssertionHelpers.expectValidSlotRange(lineup, 1, 20);
      }).toThrow('Expected all slot numbers to be between 1 and 20, but found invalid slots: 21');
    });

    it('should use custom error message when provided', () => {
      const lineup = TestLineupBuilder.createLineupWithSlots([0]);

      expect(() => {
        AssertionHelpers.expectValidSlotRange(lineup, 1, 25, 'Custom range error');
      }).toThrow('Custom range error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty lineups', () => {
      const emptyLineup = TestLineupBuilder.createEmptyLineup();

      expect(() => {
        AssertionHelpers.expectLineupLength(emptyLineup, 0);
      }).not.toThrow();

      expect(() => {
        AssertionHelpers.expectUniqueSlotNumbers(emptyLineup);
      }).not.toThrow();

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(emptyLineup);
      }).not.toThrow();
    });

    it('should handle single-player lineups', () => {
      const lineup = TestLineupBuilder.createMinimalLineup(1);

      expect(() => {
        AssertionHelpers.expectLineupLength(lineup, 1);
      }).not.toThrow();

      expect(() => {
        AssertionHelpers.expectValidLineupStructure(lineup);
      }).not.toThrow();
    });
  });
});
