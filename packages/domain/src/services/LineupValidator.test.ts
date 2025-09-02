import { describe, it, expect } from 'vitest';

import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import { SoftballRules } from '../rules/SoftballRules';
import { TestPlayerFactory } from '../test-utils';
import { BattingSlot } from '../value-objects/BattingSlot';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import { PlayerId } from '../value-objects/PlayerId';

import { LineupValidator, LineupEntry } from './LineupValidator';

describe('LineupValidator', () => {
  // Test data helpers using test utilities
  const createPlayer = (id: string): PlayerId => new PlayerId(id);
  const createJersey = (num: number): JerseyNumber => new JerseyNumber(num.toString());

  const createLineupData = (
    positions: number[],
    playerIds?: string[],
    jerseyNums?: number[]
  ): LineupEntry[] => {
    // Use test utilities when possible
    const players = TestPlayerFactory.createPlayers(positions.length);

    return positions.map((pos, i) => {
      // Use provided IDs/jerseys or fall back to test utility data
      const playerId = playerIds?.[i] ? new PlayerId(playerIds[i]) : players[i]!.playerId;
      const jerseyNum = jerseyNums?.[i]
        ? new JerseyNumber(jerseyNums[i].toString())
        : players[i]!.jerseyNumber;

      return {
        battingSlot: BattingSlot.createWithStarter(pos, playerId),
        jerseyNumber: jerseyNum,
        fieldPosition: FieldPosition.PITCHER, // Default position for tests
      };
    });
  };

  describe('validateLineupConfiguration', () => {
    describe('Minimum Players Requirement', () => {
      it('should throw error for lineup with less than 9 players', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8], // Only 8 players
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
          [1, 2, 3, 4, 5, 6, 7, 8]
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow(DomainError);
        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow('minimum 9 players');
      });

      it('should accept lineup with exactly 9 players', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 9], // Exactly 9 players
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
          [1, 2, 3, 4, 5, 6, 7, 8, 9]
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });
    });

    describe('Maximum Players Limitation', () => {
      it('should throw error for lineup with more than 20 players', () => {
        // Create 21 players - but we can only test this conceptually since BattingSlot max is 20
        // We'll test with an array that's too long conceptually
        const positions = Array.from({ length: 20 }, (_, i) => i + 1); // Max valid positions
        const playerIds = Array.from({ length: 21 }, (_, i) => `p${i + 1}`); // More players than positions
        const jerseyNums = Array.from({ length: 21 }, (_, i) => i + 1);

        // This simulates having more players than valid positions
        // In practice, we test the validator's size check directly
        expect(() => {
          LineupValidator.validateLineupConfiguration([
            ...createLineupData(positions, playerIds.slice(0, 20), jerseyNums.slice(0, 20)),
            // Can't actually create a 21st slot due to BattingSlot constraints
            // So we test the size validation logic directly in another test
          ]);
        }).not.toThrow(); // This should pass since we have exactly 20

        // Test the size validation with custom rules that limit to 20 players
        const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
        // Remove the duplicate slot and create a proper oversized array for testing
        const validLineup = createLineupData(
          Array.from({ length: 20 }, (_, i) => i + 1),
          Array.from({ length: 20 }, (_, i) => `p${i + 1}`),
          Array.from({ length: 20 }, (_, i) => i + 1)
        );
        // Add one more entry to make it oversized (but manually since BattingSlot won't allow invalid slots)
        const oversizedManual = [
          ...validLineup,
          validLineup[0]!, // Duplicate first entry to make array longer
        ];
        expect(() => {
          LineupValidator.validateLineupConfiguration(oversizedManual, rules);
        }).toThrow(DomainError);
        expect(() => {
          LineupValidator.validateLineupConfiguration(oversizedManual, rules);
        }).toThrow('maximum 20 batting slots');
      });

      it('should accept lineup with exactly 20 players', () => {
        const positions = Array.from({ length: 20 }, (_, i) => i + 1);
        const playerIds = Array.from({ length: 20 }, (_, i) => `p${i + 1}`);
        const jerseyNums = Array.from({ length: 20 }, (_, i) => i + 1);

        const lineupData = createLineupData(positions, playerIds, jerseyNums);

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });
    });

    describe('Batting Slot Sequential Requirements', () => {
      it('should throw error if batting slots 1-9 are not completely filled before using 10-20', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 10], // Missing slot 9, but using slot 10
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p10'],
          [1, 2, 3, 4, 5, 6, 7, 8, 10]
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow(DomainError);
        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow('Batting slots 1-9 must be filled before using slots 10+');
      });

      it('should accept lineup with slots 1-9 filled and additional EP/DH slots', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Complete 1-9 plus EP slots
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'],
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });

      it('should throw error for gaps in EP/DH slots (missing slot 10 but using 11)', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 11], // Missing slot 10, using slot 11
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p11'],
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow(DomainError);
        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow('EP/DH slots must be used sequentially');
      });
    });

    describe('Jersey Number Uniqueness', () => {
      it('should throw error for duplicate jersey numbers', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
          [1, 2, 3, 4, 5, 6, 7, 8, 5] // Duplicate jersey 5
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow(DomainError);
        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow('Duplicate jersey number: 5');
      });

      it('should accept lineup with all unique jersey numbers', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
          [1, 2, 3, 4, 5, 6, 7, 8, 9] // All unique
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });
    });

    describe('Player Uniqueness', () => {
      it('should throw error for duplicate player IDs in different batting slots', () => {
        const duplicatePlayerId = 'duplicate-player';
        const lineupData: LineupEntry[] = [
          {
            battingSlot: BattingSlot.createWithStarter(1, createPlayer(duplicatePlayerId)),
            jerseyNumber: createJersey(1),
            fieldPosition: FieldPosition.PITCHER,
          },
          {
            battingSlot: BattingSlot.createWithStarter(2, createPlayer('p2')),
            jerseyNumber: createJersey(2),
            fieldPosition: FieldPosition.CATCHER,
          },
          {
            battingSlot: BattingSlot.createWithStarter(3, createPlayer(duplicatePlayerId)), // Duplicate
            jerseyNumber: createJersey(3),
            fieldPosition: FieldPosition.FIRST_BASE,
          },
          ...createLineupData(
            [4, 5, 6, 7, 8, 9],
            ['p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
            [4, 5, 6, 7, 8, 9]
          ),
        ];

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow(DomainError);
        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).toThrow('Player cannot occupy multiple batting slots');
      });

      it('should accept lineup where each player occupies exactly one batting slot', () => {
        const lineupData = createLineupData(
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'], // All unique
          [1, 2, 3, 4, 5, 6, 7, 8, 9]
        );

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });
    });

    describe('Field Position Assignments', () => {
      it('should validate that defensive positions are properly assigned', () => {
        const lineupData: LineupEntry[] = [
          {
            battingSlot: BattingSlot.createWithStarter(1, createPlayer('p1')),
            jerseyNumber: createJersey(1),
            fieldPosition: FieldPosition.PITCHER,
          },
          {
            battingSlot: BattingSlot.createWithStarter(2, createPlayer('p2')),
            jerseyNumber: createJersey(2),
            fieldPosition: FieldPosition.CATCHER,
          },
          {
            battingSlot: BattingSlot.createWithStarter(3, createPlayer('p3')),
            jerseyNumber: createJersey(3),
            fieldPosition: FieldPosition.FIRST_BASE,
          },
          {
            battingSlot: BattingSlot.createWithStarter(4, createPlayer('p4')),
            jerseyNumber: createJersey(4),
            fieldPosition: FieldPosition.SECOND_BASE,
          },
          {
            battingSlot: BattingSlot.createWithStarter(5, createPlayer('p5')),
            jerseyNumber: createJersey(5),
            fieldPosition: FieldPosition.THIRD_BASE,
          },
          {
            battingSlot: BattingSlot.createWithStarter(6, createPlayer('p6')),
            jerseyNumber: createJersey(6),
            fieldPosition: FieldPosition.SHORTSTOP,
          },
          {
            battingSlot: BattingSlot.createWithStarter(7, createPlayer('p7')),
            jerseyNumber: createJersey(7),
            fieldPosition: FieldPosition.LEFT_FIELD,
          },
          {
            battingSlot: BattingSlot.createWithStarter(8, createPlayer('p8')),
            jerseyNumber: createJersey(8),
            fieldPosition: FieldPosition.CENTER_FIELD,
          },
          {
            battingSlot: BattingSlot.createWithStarter(9, createPlayer('p9')),
            jerseyNumber: createJersey(9),
            fieldPosition: FieldPosition.RIGHT_FIELD,
          },
        ];

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });

      it('should allow SHORT_FIELDER position for 10th player in slow-pitch softball', () => {
        const lineupData: LineupEntry[] = [
          ...createLineupData(
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
            [1, 2, 3, 4, 5, 6, 7, 8, 9]
          ),
          {
            battingSlot: BattingSlot.createWithStarter(10, createPlayer('p10')),
            jerseyNumber: createJersey(10),
            fieldPosition: FieldPosition.SHORT_FIELDER, // 10th fielder
          },
        ];

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });

      it('should allow EXTRA_PLAYER position for designated hitters', () => {
        const lineupData: LineupEntry[] = [
          ...createLineupData(
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
            [1, 2, 3, 4, 5, 6, 7, 8, 9]
          ),
          {
            battingSlot: BattingSlot.createWithStarter(10, createPlayer('p10')),
            jerseyNumber: createJersey(10),
            fieldPosition: FieldPosition.EXTRA_PLAYER, // DH
          },
        ];

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });
    });

    describe('Complex Valid Lineups', () => {
      it('should accept a full 20-player lineup with mix of positions', () => {
        // Use TestPlayerFactory for cleaner player creation
        const fullPlayers = TestPlayerFactory.createPlayers(20);

        const lineupData = fullPlayers.map((player, i) => {
          const slotNumber = i + 1;

          // Get field position - use standard positions for first 9, then extras
          const standardPositions = [
            FieldPosition.PITCHER,
            FieldPosition.CATCHER,
            FieldPosition.FIRST_BASE,
            FieldPosition.SECOND_BASE,
            FieldPosition.THIRD_BASE,
            FieldPosition.SHORTSTOP,
            FieldPosition.LEFT_FIELD,
            FieldPosition.CENTER_FIELD,
            FieldPosition.RIGHT_FIELD,
          ];
          const fieldPosition = i < 9 ? standardPositions[i]! : FieldPosition.EXTRA_PLAYER;

          return {
            battingSlot: BattingSlot.createWithStarter(slotNumber, player.playerId),
            jerseyNumber: player.jerseyNumber,
            fieldPosition,
          };
        });

        expect(() => {
          LineupValidator.validateLineupConfiguration(lineupData);
        }).not.toThrow();
      });
    });
  });

  describe('validateBattingOrder', () => {
    it('should validate that batting slots are in correct sequential order', () => {
      const lineupData = createLineupData(
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      );

      expect(() => {
        LineupValidator.validateBattingOrder(lineupData);
      }).not.toThrow();
    });

    it('should throw error for out-of-order batting slots', () => {
      const lineupData = [
        {
          battingSlot: BattingSlot.createWithStarter(2, createPlayer('p2')), // Out of order
          jerseyNumber: createJersey(2),
          fieldPosition: FieldPosition.CATCHER,
        },
        {
          battingSlot: BattingSlot.createWithStarter(1, createPlayer('p1')), // Out of order
          jerseyNumber: createJersey(1),
          fieldPosition: FieldPosition.PITCHER,
        },
        ...createLineupData(
          [3, 4, 5, 6, 7, 8, 9],
          ['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
          [3, 4, 5, 6, 7, 8, 9]
        ),
      ];

      expect(() => {
        LineupValidator.validateBattingOrder(lineupData);
      }).toThrow(DomainError);
      expect(() => {
        LineupValidator.validateBattingOrder(lineupData);
      }).toThrow('Batting order must be sequential');
    });

    it('should throw error for duplicate batting slot positions', () => {
      const lineupData = [
        {
          battingSlot: BattingSlot.createWithStarter(1, createPlayer('p1')),
          jerseyNumber: createJersey(1),
          fieldPosition: FieldPosition.PITCHER,
        },
        {
          battingSlot: BattingSlot.createWithStarter(1, createPlayer('p2')), // Duplicate position
          jerseyNumber: createJersey(2),
          fieldPosition: FieldPosition.CATCHER,
        },
        ...createLineupData(
          [3, 4, 5, 6, 7, 8, 9],
          ['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
          [3, 4, 5, 6, 7, 8, 9]
        ),
      ];

      expect(() => {
        LineupValidator.validateBattingOrder(lineupData);
      }).toThrow(DomainError);
      expect(() => {
        LineupValidator.validateBattingOrder(lineupData);
      }).toThrow('Duplicate batting slot position');
    });
  });

  describe('isValidLineupSize', () => {
    it('should return true for valid lineup sizes with default rules (9-25)', () => {
      for (let size = 9; size <= 25; size += 1) {
        expect(LineupValidator.isValidLineupSize(size)).toBe(true);
      }
    });

    it('should return false for invalid lineup sizes with default rules', () => {
      expect(LineupValidator.isValidLineupSize(8)).toBe(false); // Too small
      expect(LineupValidator.isValidLineupSize(26)).toBe(false); // Too large
      expect(LineupValidator.isValidLineupSize(0)).toBe(false); // Zero
      expect(LineupValidator.isValidLineupSize(-1)).toBe(false); // Negative
    });

    it('should respect custom rules configuration', () => {
      const rules = new SoftballRules({ maxPlayersPerTeam: 20 });
      expect(LineupValidator.isValidLineupSize(9, rules)).toBe(true);
      expect(LineupValidator.isValidLineupSize(20, rules)).toBe(true);
      expect(LineupValidator.isValidLineupSize(21, rules)).toBe(false);
    });
  });

  describe('areJerseyNumbersUnique', () => {
    it('should return true when all jersey numbers are unique', () => {
      const jerseyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => createJersey(n));
      expect(LineupValidator.areJerseyNumbersUnique(jerseyNumbers)).toBe(true);
    });

    it('should return false when jersey numbers contain duplicates', () => {
      const jerseyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 5].map(n => createJersey(n)); // Duplicate 5
      expect(LineupValidator.areJerseyNumbersUnique(jerseyNumbers)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(LineupValidator.areJerseyNumbersUnique([])).toBe(true);
    });
  });

  describe('Business Rules Documentation', () => {
    it('should document softball lineup rules in tests', () => {
      // This test serves as living documentation of softball lineup rules:

      // 1. Minimum 9 players required (traditional baseball positions)
      const minimalLineup = createLineupData(
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      );
      expect(() => LineupValidator.validateLineupConfiguration(minimalLineup)).not.toThrow();

      // 2. Maximum 20 batting slots (9 starters + 11 EP/DH)
      const maxLineup = createLineupData(
        Array.from({ length: 20 }, (_, i) => i + 1),
        Array.from({ length: 20 }, (_, i) => `p${i + 1}`),
        Array.from({ length: 20 }, (_, i) => i + 1)
      );
      expect(() => LineupValidator.validateLineupConfiguration(maxLineup)).not.toThrow();

      // 3. Batting slots 1-9 must be filled before 10-20
      const invalidSequence = createLineupData(
        [1, 2, 3, 4, 5, 6, 7, 8, 10], // Skip 9, use 10
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p10'],
        [1, 2, 3, 4, 5, 6, 7, 8, 10]
      );
      expect(() => LineupValidator.validateLineupConfiguration(invalidSequence)).toThrow();

      // 4. Jersey numbers must be unique within the team
      const duplicateJersey = createLineupData(
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
        [1, 2, 3, 4, 5, 6, 7, 8, 1] // Duplicate 1
      );
      expect(() => LineupValidator.validateLineupConfiguration(duplicateJersey)).toThrow();

      // 5. Players cannot occupy multiple batting slots simultaneously
      const duplicatePlayer = 'same-player';
      const multipleSlots = [
        {
          battingSlot: BattingSlot.createWithStarter(1, createPlayer(duplicatePlayer)),
          jerseyNumber: createJersey(1),
          fieldPosition: FieldPosition.PITCHER,
        },
        {
          battingSlot: BattingSlot.createWithStarter(2, createPlayer(duplicatePlayer)),
          jerseyNumber: createJersey(2),
          fieldPosition: FieldPosition.CATCHER,
        },
        ...createLineupData(
          [3, 4, 5, 6, 7, 8, 9],
          ['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
          [3, 4, 5, 6, 7, 8, 9]
        ),
      ];
      expect(() => LineupValidator.validateLineupConfiguration(multipleSlots)).toThrow();
    });
  });
});
