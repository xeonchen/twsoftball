import { describe, it, expect } from 'vitest';
import { SubstitutionValidator } from './SubstitutionValidator';
import { BattingSlot } from '../value-objects/BattingSlot';
import { PlayerId } from '../value-objects/PlayerId';
import { DomainError } from '../errors/DomainError';

describe('SubstitutionValidator', () => {
  // Test data helpers
  const starterId = new PlayerId('starter-123');
  const sub1Id = new PlayerId('sub1-456');
  const sub2Id = new PlayerId('sub2-789');
  const nonStarterId = new PlayerId('non-starter-999');

  describe('validateSubstitution', () => {
    describe('Valid Substitutions', () => {
      it('should allow substitution of starter with new player', () => {
        const slot = BattingSlot.createWithStarter(5, starterId);

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slot,
            sub1Id,
            3, // inning
            false // not a re-entry
          );
        }).not.toThrow();
      });

      it('should allow starter re-entry after being substituted', () => {
        // Starter plays innings 1-2, sub plays innings 3-4, starter re-enters inning 5
        const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
          sub1Id,
          3,
          false
        );

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithSub,
            starterId, // original starter returning
            5, // inning
            true // re-entry
          );
        }).not.toThrow();
      });

      it('should allow multiple substitutions of non-starters', () => {
        // Starter → Sub1 → Sub2
        const slotWithMultipleSubs = BattingSlot.createWithStarter(5, starterId)
          .substitutePlayer(sub1Id, 3, false)
          .substitutePlayer(sub2Id, 5, false);

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithMultipleSubs,
            nonStarterId,
            7, // inning
            false // new substitute
          );
        }).not.toThrow();
      });
    });

    describe('Invalid Re-entry Attempts', () => {
      it('should reject re-entry of non-starter player', () => {
        // Sub1 was substituted out, cannot re-enter
        const slotWithSub = BattingSlot.createWithStarter(5, starterId)
          .substitutePlayer(sub1Id, 3, false)
          .substitutePlayer(sub2Id, 5, false);

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithSub,
            sub1Id, // non-starter trying to re-enter
            7, // inning
            true // claiming re-entry
          );
        }).toThrow(DomainError);
        expect(() => {
          SubstitutionValidator.validateSubstitution(slotWithSub, sub1Id, 7, true);
        }).toThrow('Player was not the original starter in this batting slot');
      });

      it('should reject second re-entry attempt by starter', () => {
        // Starter plays 1-2, sub plays 3-4, starter re-enters 5-6, sub plays 7+
        const slotWithReentry = BattingSlot.createWithStarter(5, starterId)
          .substitutePlayer(sub1Id, 3, false)
          .substitutePlayer(starterId, 5, true) // First re-entry
          .substitutePlayer(sub2Id, 7, false);

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithReentry,
            starterId, // starter trying to re-enter again
            9, // inning
            true // second re-entry attempt
          );
        }).toThrow(DomainError);
        expect(() => {
          SubstitutionValidator.validateSubstitution(slotWithReentry, starterId, 9, true);
        }).toThrow('Starter can only re-enter once');
      });

      it('should reject re-entry flag when player was not starter', () => {
        const slot = BattingSlot.createWithStarter(5, starterId);

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slot,
            sub1Id, // non-starter
            3, // inning
            true // incorrectly claiming re-entry
          );
        }).toThrow(DomainError);
        expect(() => {
          SubstitutionValidator.validateSubstitution(slot, sub1Id, 3, true);
        }).toThrow('Player was not the original starter in this batting slot');
      });
    });

    describe('Timing Validation', () => {
      it('should reject substitution in same inning player entered', () => {
        const slot = BattingSlot.createWithStarter(5, starterId); // Entered inning 1

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slot,
            sub1Id,
            1, // same inning starter entered
            false
          );
        }).toThrow(DomainError);
        expect(() => {
          SubstitutionValidator.validateSubstitution(slot, sub1Id, 1, false);
        }).toThrow('Cannot substitute in the same inning');
      });

      it('should reject substitution in past inning', () => {
        // Sub entered in inning 3, trying to substitute in inning 2
        const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
          sub1Id,
          3,
          false
        );

        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithSub,
            sub2Id,
            2, // before current player entered
            false
          );
        }).toThrow(DomainError);
      });
    });

    describe('Player Status Validation', () => {
      it('should allow substitution of any eligible player into the slot', () => {
        const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
          sub1Id,
          3,
          false
        );

        // Should allow substituting in the starter (as re-entry)
        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithSub,
            starterId, // starter re-entering
            5,
            true // re-entry
          );
        }).not.toThrow();

        // Should allow substituting in a new player
        expect(() => {
          SubstitutionValidator.validateSubstitution(
            slotWithSub,
            sub2Id, // new substitute
            5,
            false
          );
        }).not.toThrow();
      });
    });
  });

  describe('canPlayerReenter', () => {
    it('should return true for original starter who has not re-entered', () => {
      const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
        sub1Id,
        3,
        false
      );

      expect(SubstitutionValidator.canPlayerReenter(slotWithSub, starterId)).toBe(true);
    });

    it('should return false for non-starter', () => {
      const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
        sub1Id,
        3,
        false
      );

      expect(SubstitutionValidator.canPlayerReenter(slotWithSub, sub1Id)).toBe(false);
    });

    it('should return false for starter who has already re-entered', () => {
      const slotWithReentry = BattingSlot.createWithStarter(5, starterId)
        .substitutePlayer(sub1Id, 3, false)
        .substitutePlayer(starterId, 5, true); // Re-entered

      expect(SubstitutionValidator.canPlayerReenter(slotWithReentry, starterId)).toBe(false);
    });

    it('should return true for starter who is currently active but has not re-entered', () => {
      const slot = BattingSlot.createWithStarter(5, starterId);

      // Starter is still active and has not been substituted yet
      expect(SubstitutionValidator.canPlayerReenter(slot, starterId)).toBe(true);
    });
  });

  describe('hasPlayerBeenSubstituted', () => {
    it('should return false for current active player', () => {
      const slot = BattingSlot.createWithStarter(5, starterId);

      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slot, starterId)).toBe(false);
    });

    it('should return true for player who was substituted out', () => {
      const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
        sub1Id,
        3,
        false
      );

      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slotWithSub, starterId)).toBe(true);
      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slotWithSub, sub1Id)).toBe(false);
    });

    it('should return true for player who re-entered and was substituted again', () => {
      const slotWithReentry = BattingSlot.createWithStarter(5, starterId)
        .substitutePlayer(sub1Id, 3, false)
        .substitutePlayer(starterId, 5, true) // Re-entered
        .substitutePlayer(sub2Id, 7, false); // Substituted again

      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slotWithReentry, starterId)).toBe(true);
      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slotWithReentry, sub2Id)).toBe(false);
    });

    it('should return false for player who never played in the slot', () => {
      const slot = BattingSlot.createWithStarter(5, starterId);

      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slot, sub1Id)).toBe(false);
    });
  });

  describe('getSubstitutionHistory', () => {
    it('should return chronological substitution history', () => {
      const slotWithHistory = BattingSlot.createWithStarter(5, starterId)
        .substitutePlayer(sub1Id, 3, false)
        .substitutePlayer(starterId, 5, true)
        .substitutePlayer(sub2Id, 7, false);

      const history = SubstitutionValidator.getSubstitutionHistory(slotWithHistory);

      expect(history).toHaveLength(4);
      expect(history[0]).toBeDefined();
      expect(history[0]!.playerId.equals(starterId)).toBe(true);
      expect(history[0]!.enteredInning).toBe(1);
      expect(history[0]!.exitedInning).toBe(3);
      expect(history[0]!.wasStarter).toBe(true);
      expect(history[0]!.isReentry).toBe(false);

      expect(history[1]).toBeDefined();
      expect(history[1]!.playerId.equals(sub1Id)).toBe(true);
      expect(history[1]!.enteredInning).toBe(3);
      expect(history[1]!.exitedInning).toBe(5);
      expect(history[1]!.wasStarter).toBe(false);
      expect(history[1]!.isReentry).toBe(false);

      expect(history[2]).toBeDefined();
      expect(history[2]!.playerId.equals(starterId)).toBe(true);
      expect(history[2]!.enteredInning).toBe(5);
      expect(history[2]!.exitedInning).toBe(7);
      expect(history[2]!.wasStarter).toBe(false);
      expect(history[2]!.isReentry).toBe(true);

      expect(history[3]).toBeDefined();
      expect(history[3]!.playerId.equals(sub2Id)).toBe(true);
      expect(history[3]!.enteredInning).toBe(7);
      expect(history[3]!.exitedInning).toBeUndefined();
      expect(history[3]!.wasStarter).toBe(false);
      expect(history[3]!.isReentry).toBe(false);
    });

    it('should return single entry for starter who has not been substituted', () => {
      const slot = BattingSlot.createWithStarter(5, starterId);

      const history = SubstitutionValidator.getSubstitutionHistory(slot);

      expect(history).toHaveLength(1);
      expect(history[0]).toBeDefined();
      expect(history[0]!.playerId.equals(starterId)).toBe(true);
      expect(history[0]!.wasStarter).toBe(true);
      expect(history[0]!.isReentry).toBe(false);
    });
  });

  describe('validatePositionChange', () => {
    it('should allow position change for current active player', () => {
      const slot = BattingSlot.createWithStarter(5, starterId);

      expect(() => {
        SubstitutionValidator.validatePositionChange(slot, starterId, 3);
      }).not.toThrow();
    });

    it('should reject position change for player not in the slot', () => {
      const slot = BattingSlot.createWithStarter(5, starterId);

      expect(() => {
        SubstitutionValidator.validatePositionChange(slot, sub1Id, 3);
      }).toThrow(DomainError);
      expect(() => {
        SubstitutionValidator.validatePositionChange(slot, sub1Id, 3);
      }).toThrow('Player is not currently active in this batting slot');
    });

    it('should reject position change for substituted player', () => {
      const slotWithSub = BattingSlot.createWithStarter(5, starterId).substitutePlayer(
        sub1Id,
        3,
        false
      );

      expect(() => {
        SubstitutionValidator.validatePositionChange(slotWithSub, starterId, 5);
      }).toThrow(DomainError);
      expect(() => {
        SubstitutionValidator.validatePositionChange(slotWithSub, starterId, 5);
      }).toThrow('Player is not currently active in this batting slot');
    });
  });

  describe('Complex Substitution Scenarios', () => {
    it('should handle multiple substitutions with re-entry correctly', () => {
      // Complex scenario: Starter → Sub1 → Starter (re-entry) → Sub2
      let slot = BattingSlot.createWithStarter(1, starterId);

      // Substitute starter with sub1 in inning 3
      expect(() => {
        SubstitutionValidator.validateSubstitution(slot, sub1Id, 3, false);
      }).not.toThrow();
      slot = slot.substitutePlayer(sub1Id, 3, false);

      // Re-enter starter in inning 5
      expect(() => {
        SubstitutionValidator.validateSubstitution(slot, starterId, 5, true);
      }).not.toThrow();
      slot = slot.substitutePlayer(starterId, 5, true);

      // Substitute starter again with sub2 in inning 7
      expect(() => {
        SubstitutionValidator.validateSubstitution(slot, sub2Id, 7, false);
      }).not.toThrow();
      slot = slot.substitutePlayer(sub2Id, 7, false);

      // Verify final state
      expect(slot.getCurrentPlayer().equals(sub2Id)).toBe(true);
      expect(SubstitutionValidator.canPlayerReenter(slot, starterId)).toBe(false); // Already re-entered
      expect(SubstitutionValidator.canPlayerReenter(slot, sub1Id)).toBe(false); // Non-starter
      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slot, starterId)).toBe(true);
      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slot, sub1Id)).toBe(true);
      expect(SubstitutionValidator.hasPlayerBeenSubstituted(slot, sub2Id)).toBe(false);
    });

    it('should validate EP/DH substitution rules', () => {
      // EP/DH players follow same substitution rules as regular players
      const epSlot = BattingSlot.createWithStarter(10, starterId); // EP slot

      // Standard substitution should work
      expect(() => {
        SubstitutionValidator.validateSubstitution(epSlot, sub1Id, 3, false);
      }).not.toThrow();

      // Re-entry should work for starter
      const epWithSub = epSlot.substitutePlayer(sub1Id, 3, false);
      expect(() => {
        SubstitutionValidator.validateSubstitution(epWithSub, starterId, 5, true);
      }).not.toThrow();
    });
  });

  describe('Business Rules Documentation', () => {
    it('should document softball substitution and re-entry rules', () => {
      // This test serves as living documentation for softball substitution rules:

      // 1. Any player can be substituted at any time (between innings or during inning)
      const slot = BattingSlot.createWithStarter(1, starterId);
      expect(() =>
        SubstitutionValidator.validateSubstitution(slot, sub1Id, 2, false)
      ).not.toThrow();

      // 2. Only original starters can re-enter the game
      const withSub = slot.substitutePlayer(sub1Id, 2, false);
      expect(() =>
        SubstitutionValidator.validateSubstitution(withSub, starterId, 4, true)
      ).not.toThrow(); // Starter re-entry OK
      expect(() => SubstitutionValidator.validateSubstitution(withSub, sub1Id, 4, true)).toThrow(); // Non-starter re-entry NOT OK

      // 3. Starters can only re-enter once
      const withReentry = withSub.substitutePlayer(starterId, 4, true);
      const withSecondSub = withReentry.substitutePlayer(sub2Id, 6, false);
      expect(() =>
        SubstitutionValidator.validateSubstitution(withSecondSub, starterId, 8, true)
      ).toThrow(); // Second re-entry NOT OK

      // 4. Player must return to their original batting slot position
      // (This is enforced by the batting slot structure itself)
      expect(withReentry.position).toBe(1); // Same batting position

      // 5. Once a non-starter is removed, they cannot return
      const nonStarterRemoved = withSecondSub.substitutePlayer(nonStarterId, 8, false);
      const nonStarterOut = nonStarterRemoved.substitutePlayer(starterId, 10, false);
      expect(() =>
        SubstitutionValidator.validateSubstitution(nonStarterOut, nonStarterId, 12, true)
      ).toThrow();
    });
  });
});
