import { describe, it, expect } from 'vitest';
import { BattingSlot, SlotHistory } from './BattingSlot';
import { PlayerId } from './PlayerId';
import { DomainError } from '../errors/DomainError';

describe('SlotHistory', () => {
  describe('Construction', () => {
    it('should create SlotHistory with required properties', () => {
      const playerId = new PlayerId('player-123');
      const history = new SlotHistory(playerId, 1, undefined, true, false);

      expect(history.playerId).toBe(playerId);
      expect(history.enteredInning).toBe(1);
      expect(history.exitedInning).toBeUndefined();
      expect(history.wasStarter).toBe(true);
      expect(history.isReentry).toBe(false);
    });

    it('should create SlotHistory with all properties', () => {
      const playerId = new PlayerId('player-456');
      const history = new SlotHistory(playerId, 3, 7, false, true);

      expect(history.playerId).toBe(playerId);
      expect(history.enteredInning).toBe(3);
      expect(history.exitedInning).toBe(7);
      expect(history.wasStarter).toBe(false);
      expect(history.isReentry).toBe(true);
    });

    it('should reject invalid entered inning (less than 1)', () => {
      const playerId = new PlayerId('player-123');

      expect(() => new SlotHistory(playerId, 0, undefined, true, false)).toThrow(DomainError);
      expect(() => new SlotHistory(playerId, 0, undefined, true, false)).toThrow(
        'Entered inning must be at least 1'
      );
    });

    it('should reject invalid exited inning (less than entered)', () => {
      const playerId = new PlayerId('player-123');

      expect(() => new SlotHistory(playerId, 5, 3, true, false)).toThrow(DomainError);
      expect(() => new SlotHistory(playerId, 5, 3, true, false)).toThrow(
        'Exited inning must be greater than entered inning'
      );
    });

    it('should reject same entered and exited inning', () => {
      const playerId = new PlayerId('player-123');

      expect(() => new SlotHistory(playerId, 4, 4, true, false)).toThrow(DomainError);
      expect(() => new SlotHistory(playerId, 4, 4, true, false)).toThrow(
        'Exited inning must be greater than entered inning'
      );
    });

    it('should allow valid exited inning greater than entered', () => {
      const playerId = new PlayerId('player-123');

      expect(() => new SlotHistory(playerId, 3, 6, true, false)).not.toThrow();

      const history = new SlotHistory(playerId, 3, 6, true, false);
      expect(history.exitedInning).toBe(6);
    });
  });

  describe('Equality', () => {
    it('should be equal when all properties are the same', () => {
      const playerId = new PlayerId('player-123');
      const history1 = new SlotHistory(playerId, 1, 5, true, false);
      const history2 = new SlotHistory(playerId, 1, 5, true, false);

      expect(history1.equals(history2)).toBe(true);
      expect(history2.equals(history1)).toBe(true);
    });

    it('should not be equal when player differs', () => {
      const playerId1 = new PlayerId('player-123');
      const playerId2 = new PlayerId('player-456');
      const history1 = new SlotHistory(playerId1, 1, 5, true, false);
      const history2 = new SlotHistory(playerId2, 1, 5, true, false);

      expect(history1.equals(history2)).toBe(false);
    });

    it('should not be equal when innings differ', () => {
      const playerId = new PlayerId('player-123');
      const history1 = new SlotHistory(playerId, 1, 5, true, false);
      const history2 = new SlotHistory(playerId, 2, 5, true, false);

      expect(history1.equals(history2)).toBe(false);
    });

    it('should not be equal when flags differ', () => {
      const playerId = new PlayerId('player-123');
      const history1 = new SlotHistory(playerId, 1, 5, true, false);
      const history2 = new SlotHistory(playerId, 1, 5, false, false);

      expect(history1.equals(history2)).toBe(false);
    });

    it('should not be equal when compared to null or undefined', () => {
      const playerId = new PlayerId('player-123');
      const history = new SlotHistory(playerId, 1, 5, true, false);

      expect(history.equals(null as unknown as SlotHistory)).toBe(false);
      expect(history.equals(undefined as unknown as SlotHistory)).toBe(false);
    });
  });

  describe('Query methods', () => {
    it('should identify if player is currently active (no exit inning)', () => {
      const playerId = new PlayerId('player-123');
      const activeHistory = new SlotHistory(playerId, 1, undefined, true, false);
      const inactiveHistory = new SlotHistory(playerId, 1, 5, true, false);

      expect(activeHistory.isCurrentlyActive()).toBe(true);
      expect(inactiveHistory.isCurrentlyActive()).toBe(false);
    });

    it('should calculate innings played', () => {
      const playerId = new PlayerId('player-123');
      const activeHistory = new SlotHistory(playerId, 2, undefined, true, false);
      const completedHistory = new SlotHistory(playerId, 3, 7, false, false);

      // Active player - innings played from entered to current (assume current is inning 9)
      expect(activeHistory.getInningsPlayed(9)).toBe(8); // innings 2,3,4,5,6,7,8,9

      // Completed history - innings from entered to exited
      expect(completedHistory.getInningsPlayed()).toBe(4); // innings 3,4,5,6
    });

    it('should require current inning for active players', () => {
      const playerId = new PlayerId('player-123');
      const activeHistory = new SlotHistory(playerId, 2, undefined, true, false);

      expect(() => activeHistory.getInningsPlayed()).toThrow(DomainError);
      expect(() => activeHistory.getInningsPlayed()).toThrow(
        'Current inning must be provided for active players'
      );
    });
  });
});

describe('BattingSlot', () => {
  describe('Construction', () => {
    it('should create BattingSlot with valid properties', () => {
      const playerId = new PlayerId('player-123');
      const history = [new SlotHistory(playerId, 1, undefined, true, false)];
      const slot = new BattingSlot(1, playerId, history);

      expect(slot.position).toBe(1);
      expect(slot.currentPlayer).toBe(playerId);
      expect(slot.history).toHaveLength(1);
      expect(slot.history[0]).toBe(history[0]);
    });

    it('should reject invalid position (less than 1)', () => {
      const playerId = new PlayerId('player-123');
      const history = [new SlotHistory(playerId, 1, undefined, true, false)];

      expect(() => new BattingSlot(0, playerId, history)).toThrow(DomainError);
      expect(() => new BattingSlot(0, playerId, history)).toThrow(
        'Batting position must be between 1 and 20'
      );
    });

    it('should reject invalid position (greater than 20)', () => {
      const playerId = new PlayerId('player-123');
      const history = [new SlotHistory(playerId, 1, undefined, true, false)];

      expect(() => new BattingSlot(21, playerId, history)).toThrow(DomainError);
      expect(() => new BattingSlot(21, playerId, history)).toThrow(
        'Batting position must be between 1 and 20'
      );
    });

    it('should accept all valid positions 1-20', () => {
      const playerId = new PlayerId('player-123');
      const history = [new SlotHistory(playerId, 1, undefined, true, false)];

      for (let i = 1; i <= 20; i += 1) {
        expect(() => new BattingSlot(i, playerId, history)).not.toThrow();
        const slot = new BattingSlot(i, playerId, history);
        expect(slot.position).toBe(i);
      }
    });

    it('should reject empty history', () => {
      const playerId = new PlayerId('player-123');

      expect(() => new BattingSlot(1, playerId, [])).toThrow(DomainError);
      expect(() => new BattingSlot(1, playerId, [])).toThrow(
        'Batting slot must have at least one history entry'
      );
    });

    it('should reject when current player not in active history', () => {
      const currentPlayerId = new PlayerId('player-123');
      const historyPlayerId = new PlayerId('player-456');
      const history = [new SlotHistory(historyPlayerId, 1, 5, true, false)]; // This player exited

      expect(() => new BattingSlot(1, currentPlayerId, history)).toThrow(DomainError);
      expect(() => new BattingSlot(1, currentPlayerId, history)).toThrow(
        'Current player must have an active history entry (no exit inning)'
      );
    });

    it('should accept when current player has active history entry', () => {
      const playerId = new PlayerId('player-123');
      const history = [
        new SlotHistory(new PlayerId('starter'), 1, 3, true, false),
        new SlotHistory(playerId, 4, undefined, false, false),
      ];

      expect(() => new BattingSlot(1, playerId, history)).not.toThrow();

      const slot = new BattingSlot(1, playerId, history);
      expect(slot.currentPlayer).toBe(playerId);
    });
  });

  describe('Factory methods', () => {
    it('should create new batting slot with starter', () => {
      const starterId = new PlayerId('starter-123');

      const slot = BattingSlot.createWithStarter(1, starterId);

      expect(slot.position).toBe(1);
      expect(slot.currentPlayer).toBe(starterId);
      expect(slot.history).toHaveLength(1);
      expect(slot.history[0]!.playerId).toBe(starterId);
      expect(slot.history[0]!.enteredInning).toBe(1);
      expect(slot.history[0]!.exitedInning).toBeUndefined();
      expect(slot.history[0]!.wasStarter).toBe(true);
      expect(slot.history[0]!.isReentry).toBe(false);
    });

    it('should reject invalid position in factory method', () => {
      const starterId = new PlayerId('starter-123');

      expect(() => BattingSlot.createWithStarter(0, starterId)).toThrow(DomainError);
      expect(() => BattingSlot.createWithStarter(21, starterId)).toThrow(DomainError);
    });
  });

  describe('Substitution', () => {
    it('should create new slot with substitution', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const originalSlot = BattingSlot.createWithStarter(3, starterId);

      const newSlot = originalSlot.substitutePlayer(substituteId, 5, false);

      expect(newSlot).not.toBe(originalSlot); // Immutable
      expect(newSlot.position).toBe(3);
      expect(newSlot.currentPlayer).toBe(substituteId);
      expect(newSlot.history).toHaveLength(2);

      // Original player should be marked as exited
      expect(newSlot.history[0]!.playerId).toBe(starterId);
      expect(newSlot.history[0]!.exitedInning).toBe(5);

      // New player should be active
      expect(newSlot.history[1]!.playerId).toBe(substituteId);
      expect(newSlot.history[1]!.enteredInning).toBe(5);
      expect(newSlot.history[1]!.exitedInning).toBeUndefined();
      expect(newSlot.history[1]!.wasStarter).toBe(false);
      expect(newSlot.history[1]!.isReentry).toBe(false);
    });

    it('should handle re-entry substitution', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const originalSlot = BattingSlot.createWithStarter(3, starterId);
      const withSubstitute = originalSlot.substitutePlayer(substituteId, 4, false);

      // Starter re-enters
      const withReentry = withSubstitute.substitutePlayer(starterId, 7, true);

      expect(withReentry.currentPlayer).toBe(starterId);
      expect(withReentry.history).toHaveLength(3);

      // Latest entry should be marked as re-entry
      const reentryHistory = withReentry.history[2]!;
      expect(reentryHistory.playerId).toBe(starterId);
      expect(reentryHistory.enteredInning).toBe(7);
      expect(reentryHistory.isReentry).toBe(true);
      expect(reentryHistory.wasStarter).toBe(false); // This specific entry is not a starter
    });

    it('should reject substitution in same inning as current player entered', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const slot = BattingSlot.createWithStarter(3, starterId);

      expect(() => slot.substitutePlayer(substituteId, 1, false)).toThrow(DomainError);
      expect(() => slot.substitutePlayer(substituteId, 1, false)).toThrow(
        'Cannot substitute in the same inning the current player entered'
      );
    });

    it('should reject substitution in past inning', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const slot = BattingSlot.createWithStarter(3, starterId);

      expect(() => slot.substitutePlayer(substituteId, 0, false)).toThrow(DomainError);
    });

    it('should preserve original slot immutability', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const originalSlot = BattingSlot.createWithStarter(3, starterId);

      originalSlot.substitutePlayer(substituteId, 5, false);

      // Original should be unchanged
      expect(originalSlot.currentPlayer).toBe(starterId);
      expect(originalSlot.history).toHaveLength(1);
      expect(originalSlot.history[0]!.exitedInning).toBeUndefined();
    });
  });

  describe('Query methods', () => {
    it('should get current player', () => {
      const playerId = new PlayerId('player-123');
      const slot = BattingSlot.createWithStarter(1, playerId);

      expect(slot.getCurrentPlayer()).toBe(playerId);
    });

    it('should get history', () => {
      const playerId = new PlayerId('player-123');
      const slot = BattingSlot.createWithStarter(1, playerId);

      const history = slot.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.playerId).toBe(playerId);

      // Should return a copy, not original array
      history.push(new SlotHistory(new PlayerId('other'), 2, undefined, false, false));
      expect(slot.getHistory()).toHaveLength(1);
    });

    it('should check if player was starter', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const slot = BattingSlot.createWithStarter(1, starterId);
      const withSubstitute = slot.substitutePlayer(substituteId, 5, false);

      expect(withSubstitute.wasPlayerStarter(starterId)).toBe(true);
      expect(withSubstitute.wasPlayerStarter(substituteId)).toBe(false);
      expect(withSubstitute.wasPlayerStarter(new PlayerId('never-played'))).toBe(false);
    });

    it('should check if player has played in slot', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const neverPlayedId = new PlayerId('never-played');
      const slot = BattingSlot.createWithStarter(1, starterId);
      const withSubstitute = slot.substitutePlayer(substituteId, 5, false);

      expect(withSubstitute.hasPlayerPlayed(starterId)).toBe(true);
      expect(withSubstitute.hasPlayerPlayed(substituteId)).toBe(true);
      expect(withSubstitute.hasPlayerPlayed(neverPlayedId)).toBe(false);
    });

    it('should get player history', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const slot = BattingSlot.createWithStarter(1, starterId);
      const withSubstitute = slot.substitutePlayer(substituteId, 5, false);
      const withReentry = withSubstitute.substitutePlayer(starterId, 7, true);

      const starterHistory = withReentry.getPlayerHistory(starterId);
      expect(starterHistory).toHaveLength(2);
      expect(starterHistory[0]!.enteredInning).toBe(1);
      expect(starterHistory[0]!.exitedInning).toBe(5);
      expect(starterHistory[1]!.enteredInning).toBe(7);
      expect(starterHistory[1]!.exitedInning).toBeUndefined();

      const substituteHistory = withReentry.getPlayerHistory(substituteId);
      expect(substituteHistory).toHaveLength(1);
      expect(substituteHistory[0]!.enteredInning).toBe(5);
      expect(substituteHistory[0]!.exitedInning).toBe(7);

      const neverPlayedHistory = withReentry.getPlayerHistory(new PlayerId('never-played'));
      expect(neverPlayedHistory).toHaveLength(0);
    });

    it('should get total innings played by player', () => {
      const starterId = new PlayerId('starter-123');
      const substituteId = new PlayerId('substitute-456');
      const slot = BattingSlot.createWithStarter(1, starterId);
      const withSubstitute = slot.substitutePlayer(substituteId, 5, false);
      const withReentry = withSubstitute.substitutePlayer(starterId, 7, true);

      // Starter: innings 1-4 (4 innings) + innings 7+ (ongoing)
      expect(withReentry.getTotalInningsPlayed(starterId, 9)).toBe(7); // 1,2,3,4,7,8,9

      // Substitute: innings 5-6 (2 innings)
      expect(withReentry.getTotalInningsPlayed(substituteId, 9)).toBe(2); // 5,6

      // Never played
      expect(withReentry.getTotalInningsPlayed(new PlayerId('never-played'), 9)).toBe(0);
    });

    it('should handle current inning parameter correctly', () => {
      const playerId = new PlayerId('player-123');
      const slot = BattingSlot.createWithStarter(1, playerId);

      // Started in inning 1, current is inning 5
      expect(slot.getTotalInningsPlayed(playerId, 5)).toBe(5); // innings 1,2,3,4,5

      // Started in inning 1, current is inning 1 (same inning)
      expect(slot.getTotalInningsPlayed(playerId, 1)).toBe(1); // just inning 1
    });
  });

  describe('Equality', () => {
    it('should be equal when all properties are the same', () => {
      const playerId = new PlayerId('player-123');
      const slot1 = BattingSlot.createWithStarter(1, playerId);
      const slot2 = BattingSlot.createWithStarter(1, playerId);

      expect(slot1.equals(slot2)).toBe(true);
      expect(slot2.equals(slot1)).toBe(true);
    });

    it('should not be equal when position differs', () => {
      const playerId = new PlayerId('player-123');
      const slot1 = BattingSlot.createWithStarter(1, playerId);
      const slot2 = BattingSlot.createWithStarter(2, playerId);

      expect(slot1.equals(slot2)).toBe(false);
    });

    it('should not be equal when current player differs', () => {
      const player1 = new PlayerId('player-123');
      const player2 = new PlayerId('player-456');
      const slot1 = BattingSlot.createWithStarter(1, player1);
      const slot2 = BattingSlot.createWithStarter(1, player2);

      expect(slot1.equals(slot2)).toBe(false);
    });

    it('should not be equal when history differs', () => {
      const playerId = new PlayerId('player-123');
      const substituteId = new PlayerId('substitute-456');
      const slot1 = BattingSlot.createWithStarter(1, playerId);
      const slot2 = slot1.substitutePlayer(substituteId, 5, false);

      expect(slot1.equals(slot2)).toBe(false);
    });

    it('should not be equal when compared to null or undefined', () => {
      const playerId = new PlayerId('player-123');
      const slot = BattingSlot.createWithStarter(1, playerId);

      expect(slot.equals(null as unknown as BattingSlot)).toBe(false);
      expect(slot.equals(undefined as unknown as BattingSlot)).toBe(false);
    });

    it('should not be equal when compared to different type', () => {
      const playerId = new PlayerId('player-123');
      const slot = BattingSlot.createWithStarter(1, playerId);

      expect(slot.equals({} as BattingSlot)).toBe(false);
      expect(slot.equals('not a slot' as unknown as BattingSlot)).toBe(false);
    });

    it('should handle edge case in history comparison', () => {
      const playerId = new PlayerId('player-123');
      const slot1 = BattingSlot.createWithStarter(1, playerId);

      // Create a mock slot with incomplete history array to test the edge case
      const incompleteSlot = Object.create(BattingSlot.prototype);
      incompleteSlot.position = 1;
      incompleteSlot.currentPlayer = playerId;
      incompleteSlot.history = []; // Empty history to trigger the length check

      expect(slot1.equals(incompleteSlot as BattingSlot)).toBe(false);
    });
  });

  describe('Value Object behavior', () => {
    it('should be immutable - no mutating methods', () => {
      const keys = Object.getOwnPropertyNames(BattingSlot.prototype);
      const mutatingMethods = keys.filter(
        key => key.startsWith('set') || key.startsWith('add') || key.startsWith('remove')
      );

      expect(mutatingMethods).toHaveLength(0);
    });

    it('should be immutable - properties are readonly', () => {
      const playerId = new PlayerId('player-123');
      const slot = BattingSlot.createWithStarter(1, playerId);

      // TypeScript enforces readonly, but we can check the properties exist
      expect(slot.position).toBe(1);
      expect(slot.currentPlayer).toBe(playerId);
      expect(Array.isArray(slot.history)).toBe(true);
    });

    it('should support JSON serialization', () => {
      const playerId = new PlayerId('serializable-player');
      const slot = BattingSlot.createWithStarter(5, playerId);

      const serialized = JSON.stringify(slot);
      const parsed = JSON.parse(serialized);

      expect(parsed.position).toBe(5);
      expect(parsed.currentPlayer.value).toBe('serializable-player');
      expect(parsed.history).toHaveLength(1);
      expect(parsed.history[0].playerId.value).toBe('serializable-player');
    });
  });
});
