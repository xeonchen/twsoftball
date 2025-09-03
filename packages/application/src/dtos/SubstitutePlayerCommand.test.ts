/**
 * @file SubstitutePlayerCommand.test.ts
 * Comprehensive tests for the SubstitutePlayerCommand DTO interface and validation scenarios.
 */

import { GameId, PlayerId, TeamLineupId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { SubstitutePlayerCommand } from './SubstitutePlayerCommand';

describe('SubstitutePlayerCommand', () => {
  // Test data factories
  const createValidCommand = (
    overrides: Partial<SubstitutePlayerCommand> = {}
  ): SubstitutePlayerCommand => ({
    gameId: new GameId('test-game-123'),
    teamLineupId: new TeamLineupId('test-lineup-456'),
    battingSlot: 1,
    outgoingPlayerId: new PlayerId('outgoing-player-789'),
    incomingPlayerId: new PlayerId('incoming-player-012'),
    incomingPlayerName: 'John Substitute',
    incomingJerseyNumber: JerseyNumber.fromNumber(99),
    newFieldPosition: FieldPosition.PITCHER,
    inning: 5,
    isReentry: false,
    ...overrides,
  });

  describe('Interface Structure', () => {
    it('should accept all required fields for regular substitution', () => {
      const command = createValidCommand();

      expect(command.gameId).toBeInstanceOf(GameId);
      expect(command.teamLineupId).toBeInstanceOf(TeamLineupId);
      expect(command.battingSlot).toBe(1);
      expect(command.outgoingPlayerId).toBeInstanceOf(PlayerId);
      expect(command.incomingPlayerId).toBeInstanceOf(PlayerId);
      expect(command.incomingPlayerName).toBe('John Substitute');
      expect(command.incomingJerseyNumber).toBeInstanceOf(JerseyNumber);
      expect(command.newFieldPosition).toBe(FieldPosition.PITCHER);
      expect(command.inning).toBe(5);
      expect(command.isReentry).toBe(false);
    });

    it('should accept optional fields', () => {
      const timestamp = new Date();
      const command = createValidCommand({
        notes: 'Strategic substitution for defensive improvement',
        timestamp,
      });

      expect(command.notes).toBe('Strategic substitution for defensive improvement');
      expect(command.timestamp).toBe(timestamp);
    });

    it('should work without optional fields', () => {
      const command = createValidCommand();

      expect(command.notes).toBeUndefined();
      expect(command.timestamp).toBeUndefined();
    });
  });

  describe('Batting Slot Scenarios', () => {
    it('should support all valid batting slot positions (1-20)', () => {
      for (let slot = 1; slot <= 20; slot++) {
        const command = createValidCommand({ battingSlot: slot });
        expect(command.battingSlot).toBe(slot);
      }
    });

    it('should handle different batting positions for different players', () => {
      const leadoffHitter = createValidCommand({
        battingSlot: 1,
        outgoingPlayerId: new PlayerId('leadoff-original'),
        incomingPlayerId: new PlayerId('leadoff-substitute'),
        incomingPlayerName: 'Speed Johnson',
      });

      const cleanupHitter = createValidCommand({
        battingSlot: 4,
        outgoingPlayerId: new PlayerId('cleanup-original'),
        incomingPlayerId: new PlayerId('cleanup-substitute'),
        incomingPlayerName: 'Power Davis',
      });

      expect(leadoffHitter.battingSlot).toBe(1);
      expect(cleanupHitter.battingSlot).toBe(4);
      expect(leadoffHitter.incomingPlayerName).toBe('Speed Johnson');
      expect(cleanupHitter.incomingPlayerName).toBe('Power Davis');
    });

    it('should handle extra player positions (10-20)', () => {
      const extraPlayerCommand = createValidCommand({
        battingSlot: 12,
        newFieldPosition: FieldPosition.EXTRA_PLAYER,
        incomingPlayerName: 'Extra Player Smith',
      });

      expect(extraPlayerCommand.battingSlot).toBe(12);
      expect(extraPlayerCommand.newFieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
    });
  });

  describe('Field Position Scenarios', () => {
    it('should support all valid field positions', () => {
      const positions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
        FieldPosition.EXTRA_PLAYER,
      ];

      positions.forEach((position, index) => {
        const command = createValidCommand({
          newFieldPosition: position,
          incomingPlayerName: `Player for ${position}`,
          battingSlot: index + 1,
        });

        expect(command.newFieldPosition).toBe(position);
      });
    });

    it('should handle pitcher substitutions', () => {
      const pitcherSubstitution = createValidCommand({
        battingSlot: 1,
        outgoingPlayerId: new PlayerId('starter-pitcher'),
        incomingPlayerId: new PlayerId('relief-pitcher'),
        incomingPlayerName: 'Relief Johnson',
        incomingJerseyNumber: JerseyNumber.fromNumber(45),
        newFieldPosition: FieldPosition.PITCHER,
        inning: 6,
        notes: 'Starter reached pitch count limit',
      });

      expect(pitcherSubstitution.newFieldPosition).toBe(FieldPosition.PITCHER);
      expect(pitcherSubstitution.notes).toContain('pitch count limit');
    });

    it('should handle defensive specialists', () => {
      const defensiveSpecialist = createValidCommand({
        battingSlot: 7,
        newFieldPosition: FieldPosition.CENTER_FIELD,
        incomingPlayerName: 'Defense Wilson',
        notes: 'Defensive replacement for late innings',
      });

      expect(defensiveSpecialist.newFieldPosition).toBe(FieldPosition.CENTER_FIELD);
      expect(defensiveSpecialist.notes).toContain('Defensive replacement');
    });
  });

  describe('Jersey Number Scenarios', () => {
    it('should handle different jersey number formats', () => {
      const singleDigit = createValidCommand({
        incomingJerseyNumber: JerseyNumber.fromNumber(1),
      });
      const doubleDigit = createValidCommand({
        incomingJerseyNumber: JerseyNumber.fromNumber(99),
      });
      const midNumber = createValidCommand({
        incomingJerseyNumber: JerseyNumber.fromNumber(50),
      });

      expect(singleDigit.incomingJerseyNumber.value).toBe('1');
      expect(doubleDigit.incomingJerseyNumber.value).toBe('99');
      expect(midNumber.incomingJerseyNumber.value).toBe('50');
    });
  });

  describe('Re-entry Scenarios', () => {
    it('should support starter re-entry', () => {
      const reentryCommand = createValidCommand({
        battingSlot: 3,
        outgoingPlayerId: new PlayerId('substitute-player'),
        incomingPlayerId: new PlayerId('original-starter'),
        incomingPlayerName: 'Original Smith',
        isReentry: true,
        notes: 'Starter re-entering for final innings',
      });

      expect(reentryCommand.isReentry).toBe(true);
      expect(reentryCommand.notes).toContain('re-entering');
    });

    it('should support regular substitution (non-reentry)', () => {
      const regularSubstitution = createValidCommand({
        isReentry: false,
      });

      expect(regularSubstitution.isReentry).toBe(false);
    });

    it('should handle starter returning to different position', () => {
      const positionChangeReentry = createValidCommand({
        outgoingPlayerId: new PlayerId('substitute-pitcher'),
        incomingPlayerId: new PlayerId('original-pitcher'),
        incomingPlayerName: 'John Original',
        newFieldPosition: FieldPosition.FIRST_BASE, // Different from original position
        isReentry: true,
        notes: 'Starter returning at first base',
      });

      expect(positionChangeReentry.isReentry).toBe(true);
      expect(positionChangeReentry.newFieldPosition).toBe(FieldPosition.FIRST_BASE);
    });
  });

  describe('Timing Scenarios', () => {
    it('should handle early inning substitutions', () => {
      const earlySubstitution = createValidCommand({
        inning: 2,
        notes: 'Early strategic substitution',
      });

      expect(earlySubstitution.inning).toBe(2);
    });

    it('should handle late inning substitutions', () => {
      const lateSubstitution = createValidCommand({
        inning: 9,
        notes: 'Late game defensive substitution',
      });

      expect(lateSubstitution.inning).toBe(9);
    });

    it('should handle extra inning scenarios', () => {
      const extraInningSubstitution = createValidCommand({
        inning: 12,
        notes: 'Extra innings strategic move',
      });

      expect(extraInningSubstitution.inning).toBe(12);
    });

    it('should include timestamp when provided', () => {
      const timestamp = new Date('2024-08-30T15:30:00Z');
      const command = createValidCommand({ timestamp });

      expect(command.timestamp).toBe(timestamp);
    });
  });

  describe('Strategic Substitution Scenarios', () => {
    it('should handle pinch hitter scenarios', () => {
      const pinchHitter = createValidCommand({
        battingSlot: 9, // Typically pitcher's spot
        outgoingPlayerId: new PlayerId('pitcher-batting'),
        incomingPlayerId: new PlayerId('pinch-hitter'),
        incomingPlayerName: 'Clutch Henderson',
        newFieldPosition: FieldPosition.EXTRA_PLAYER, // Won't play defense
        notes: 'Pinch hitter for pitcher in crucial situation',
      });

      expect(pinchHitter.battingSlot).toBe(9);
      expect(pinchHitter.newFieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
      expect(pinchHitter.notes).toContain('Pinch hitter');
    });

    it('should handle defensive replacement scenarios', () => {
      const defensiveReplacement = createValidCommand({
        battingSlot: 7,
        outgoingPlayerId: new PlayerId('offensive-player'),
        incomingPlayerId: new PlayerId('defensive-specialist'),
        incomingPlayerName: 'Glove Master',
        newFieldPosition: FieldPosition.CENTER_FIELD,
        inning: 8,
        notes: 'Defensive specialist for late innings',
      });

      expect(defensiveReplacement.newFieldPosition).toBe(FieldPosition.CENTER_FIELD);
      expect(defensiveReplacement.inning).toBe(8);
      expect(defensiveReplacement.notes).toContain('Defensive specialist');
    });

    it('should handle platoon substitutions', () => {
      const platoonSubstitution = createValidCommand({
        battingSlot: 5,
        outgoingPlayerId: new PlayerId('lefty-batter'),
        incomingPlayerId: new PlayerId('righty-batter'),
        incomingPlayerName: 'Right Hand Pete',
        notes: 'Platoon substitution vs left-handed pitcher',
      });

      expect(platoonSubstitution.notes).toContain('Platoon substitution');
    });
  });

  describe('Complex Game Scenarios', () => {
    it('should handle multiple substitutions in same inning', () => {
      const firstSubstitution = createValidCommand({
        battingSlot: 1,
        incomingPlayerId: new PlayerId('first-substitute'),
        incomingPlayerName: 'First Sub',
        inning: 5,
      });

      const secondSubstitution = createValidCommand({
        battingSlot: 3,
        incomingPlayerId: new PlayerId('second-substitute'),
        incomingPlayerName: 'Second Sub',
        inning: 5, // Same inning, different slot
      });

      expect(firstSubstitution.battingSlot).toBe(1);
      expect(secondSubstitution.battingSlot).toBe(3);
      expect(firstSubstitution.inning).toBe(secondSubstitution.inning);
    });

    it('should handle injury substitutions', () => {
      const injurySubstitution = createValidCommand({
        battingSlot: 4,
        outgoingPlayerId: new PlayerId('injured-player'),
        incomingPlayerId: new PlayerId('replacement-player'),
        incomingPlayerName: 'Quick Replacement',
        inning: 3,
        notes: 'Emergency substitution due to injury',
      });

      expect(injurySubstitution.notes).toContain('injury');
    });

    it('should handle tournament format substitutions', () => {
      const tournamentSubstitution = createValidCommand({
        battingSlot: 12, // Extended lineup
        outgoingPlayerId: new PlayerId('tired-player'),
        incomingPlayerId: new PlayerId('fresh-player'),
        incomingPlayerName: 'Fresh Legs',
        newFieldPosition: FieldPosition.RIGHT_FIELD,
        notes: 'Tournament rotation - keeping players fresh',
      });

      expect(tournamentSubstitution.battingSlot).toBe(12);
      expect(tournamentSubstitution.notes).toContain('Tournament rotation');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity between player IDs', () => {
      const outgoing = new PlayerId('outgoing-123');
      const incoming = new PlayerId('incoming-456');

      const command = createValidCommand({
        outgoingPlayerId: outgoing,
        incomingPlayerId: incoming,
      });

      expect(command.outgoingPlayerId.equals(outgoing)).toBe(true);
      expect(command.incomingPlayerId.equals(incoming)).toBe(true);
      expect(command.outgoingPlayerId.equals(command.incomingPlayerId)).toBe(false);
    });

    it('should maintain referential integrity with team and game identifiers', () => {
      const gameId = new GameId('game-789');
      const teamLineupId = new TeamLineupId('team-012');

      const command = createValidCommand({
        gameId,
        teamLineupId,
      });

      expect(command.gameId.equals(gameId)).toBe(true);
      expect(command.teamLineupId.equals(teamLineupId)).toBe(true);
    });

    it('should preserve all command data without mutation', () => {
      const originalCommand = createValidCommand({
        notes: 'Original notes',
        timestamp: new Date('2024-08-30T14:00:00Z'),
      });

      // Verify original data is preserved
      expect(originalCommand.notes).toBe('Original notes');
      expect(originalCommand.timestamp?.toISOString()).toBe('2024-08-30T14:00:00.000Z');

      // Create new command with different data
      const newCommand = createValidCommand({
        notes: 'Different notes',
        timestamp: new Date('2024-08-30T16:00:00Z'),
      });

      // Verify original is unchanged
      expect(originalCommand.notes).toBe('Original notes');
      expect(newCommand.notes).toBe('Different notes');
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum batting slot position', () => {
      const maxSlotCommand = createValidCommand({
        battingSlot: 20,
        incomingPlayerName: 'Max Position Player',
      });

      expect(maxSlotCommand.battingSlot).toBe(20);
    });

    it('should handle minimum inning value', () => {
      const firstInningCommand = createValidCommand({
        inning: 1,
        notes: 'Very early substitution',
      });

      expect(firstInningCommand.inning).toBe(1);
    });

    it('should handle empty notes', () => {
      const commandWithEmptyNotes = createValidCommand({
        notes: '',
      });

      expect(commandWithEmptyNotes.notes).toBe('');
    });

    it('should handle long player names', () => {
      const longNameCommand = createValidCommand({
        incomingPlayerName: 'Francisco Antonio Rodriguez-Martinez Jr.',
      });

      expect(longNameCommand.incomingPlayerName).toBe('Francisco Antonio Rodriguez-Martinez Jr.');
    });

    it('should handle detailed notes', () => {
      const detailedNotes = `Strategic substitution: bringing in defensive specialist for late innings.
        Player has excellent range in center field and strong arm.
        Will help preserve narrow lead in critical game situation.`;

      const detailedCommand = createValidCommand({
        notes: detailedNotes,
      });

      expect(detailedCommand.notes).toBe(detailedNotes);
    });
  });
});
