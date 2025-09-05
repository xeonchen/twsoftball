/**
 * @file SubstitutePlayerCommand.test.ts
 * Comprehensive tests for the SubstitutePlayerCommand DTO interface and validation scenarios.
 */

import { GameId, PlayerId, TeamLineupId, JerseyNumber, FieldPosition } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import {
  SubstitutePlayerCommand,
  SubstitutePlayerCommandValidator,
  SubstitutePlayerCommandValidationError,
  SubstitutePlayerCommandFactory,
} from './SubstitutePlayerCommand';

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

  describe('Validation - SubstitutePlayerCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should require gameId', () => {
        const command = createValidCommand({ gameId: null as unknown as GameId });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          SubstitutePlayerCommandValidationError
        );
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'gameId is required'
        );
      });

      it('should require teamLineupId', () => {
        const command = createValidCommand({ teamLineupId: null as unknown as TeamLineupId });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'teamLineupId is required'
        );
      });

      it('should validate batting slot range (1-20)', () => {
        const invalidSlots = [0, 21, -1, 1.5];

        invalidSlots.forEach(slot => {
          const command = createValidCommand({ battingSlot: slot });
          expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
            'battingSlot must be an integer between 1 and 20'
          );
        });
      });

      it('should validate inning as positive integer', () => {
        const invalidInnings = [0, -1, 1.5];

        invalidInnings.forEach(inning => {
          const command = createValidCommand({ inning });
          expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
            'inning must be a positive integer'
          );
        });
      });

      it('should limit inning to maximum 15', () => {
        const command = createValidCommand({ inning: 16 });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'inning cannot exceed 15'
        );
      });

      it('should require boolean isReentry', () => {
        const command = createValidCommand({ isReentry: 'true' as unknown as boolean });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'isReentry must be a boolean'
        );
      });
    });

    describe('Player Field Validation', () => {
      it('should require outgoingPlayerId', () => {
        const command = createValidCommand({ outgoingPlayerId: null as unknown as PlayerId });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'outgoingPlayerId is required'
        );
      });

      it('should require incomingPlayerId', () => {
        const command = createValidCommand({ incomingPlayerId: null as unknown as PlayerId });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'incomingPlayerId is required'
        );
      });

      it('should prevent same player for outgoing and incoming', () => {
        const samePlayer = new PlayerId('same-player');
        const command = createValidCommand({
          outgoingPlayerId: samePlayer,
          incomingPlayerId: samePlayer,
        });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'outgoingPlayerId and incomingPlayerId cannot be the same player'
        );
      });

      it('should require incomingPlayerName', () => {
        const command = createValidCommand({ incomingPlayerName: '' });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'incomingPlayerName is required and cannot be empty'
        );
      });

      it('should limit incomingPlayerName length to 50 characters', () => {
        const command = createValidCommand({ incomingPlayerName: 'a'.repeat(51) });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'incomingPlayerName cannot exceed 50 characters'
        );
      });

      it('should require incomingJerseyNumber', () => {
        const command = createValidCommand({
          incomingJerseyNumber: null as unknown as JerseyNumber,
        });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'incomingJerseyNumber is required'
        );
      });
    });

    describe('Position Validation', () => {
      it('should validate field position', () => {
        const command = createValidCommand({
          newFieldPosition: 'INVALID_POSITION' as unknown as FieldPosition,
        });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'newFieldPosition must be a valid FieldPosition'
        );
      });

      it('should accept all valid field positions', () => {
        const validPositions = Object.values(FieldPosition);

        validPositions.forEach(position => {
          const command = createValidCommand({ newFieldPosition: position });
          expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
        });
      });
    });

    describe('Notes Validation', () => {
      it('should limit notes length to 500 characters', () => {
        const command = createValidCommand({ notes: 'a'.repeat(501) });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'notes cannot exceed 500 characters'
        );
      });

      it('should not allow whitespace-only notes', () => {
        const command = createValidCommand({ notes: '   ' });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'notes cannot be only whitespace'
        );
      });

      it('should allow empty string notes', () => {
        const command = createValidCommand({ notes: '' });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow undefined notes', () => {
        const command = createValidCommand();
        // Remove notes from command
        delete (command as unknown as { notes?: string }).notes;
        expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
      });
    });

    describe('Timestamp Validation', () => {
      it('should require valid Date object', () => {
        const command = createValidCommand({ timestamp: 'invalid' as unknown as Date });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date object'
        );
      });

      it('should require valid date value', () => {
        const command = createValidCommand({ timestamp: new Date('invalid') });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date'
        );
      });

      it('should not allow timestamp too far in future', () => {
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        const command = createValidCommand({ timestamp: futureTime });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 hour in the future'
        );
      });

      it('should not allow timestamp too far in past', () => {
        const pastTime = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
        const command = createValidCommand({ timestamp: pastTime });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 year in the past'
        );
      });

      it('should allow reasonable timestamp', () => {
        const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        const command = createValidCommand({ timestamp: recentTime });
        expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow undefined timestamp', () => {
        const command = createValidCommand();
        // Remove timestamp from command
        delete (command as unknown as { timestamp?: Date }).timestamp;
        expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
      });
    });

    it('should pass validation for valid commands', () => {
      const command = createValidCommand();
      expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
    });
  });

  describe('Factory Functions - SubstitutePlayerCommandFactory', () => {
    describe('createRegular', () => {
      it('should create valid regular substitution command', () => {
        const gameId = new GameId('test-game');
        const teamLineupId = new TeamLineupId('test-lineup');
        const outgoingPlayer = new PlayerId('outgoing');
        const incomingPlayer = new PlayerId('incoming');
        const jerseyNumber = JerseyNumber.fromNumber(15);

        const command = SubstitutePlayerCommandFactory.createRegular(
          gameId,
          teamLineupId,
          5,
          outgoingPlayer,
          incomingPlayer,
          'New Player',
          jerseyNumber,
          FieldPosition.SECOND_BASE,
          7,
          'Strategic substitution'
        );

        expect(command.gameId).toBe(gameId);
        expect(command.teamLineupId).toBe(teamLineupId);
        expect(command.battingSlot).toBe(5);
        expect(command.outgoingPlayerId).toBe(outgoingPlayer);
        expect(command.incomingPlayerId).toBe(incomingPlayer);
        expect(command.incomingPlayerName).toBe('New Player');
        expect(command.incomingJerseyNumber).toBe(jerseyNumber);
        expect(command.newFieldPosition).toBe(FieldPosition.SECOND_BASE);
        expect(command.inning).toBe(7);
        expect(command.isReentry).toBe(false);
        expect(command.notes).toBe('Strategic substitution');
        expect(command.timestamp).toBeInstanceOf(Date);
      });

      it('should work without optional notes', () => {
        const command = SubstitutePlayerCommandFactory.createRegular(
          new GameId('test'),
          new TeamLineupId('test'),
          1,
          new PlayerId('out'),
          new PlayerId('in'),
          'Player',
          JerseyNumber.fromNumber(1),
          FieldPosition.PITCHER,
          1
        );

        expect(command.notes).toBeUndefined();
      });
    });

    describe('createReentry', () => {
      it('should create valid reentry substitution command', () => {
        const gameId = new GameId('test-game');
        const teamLineupId = new TeamLineupId('test-lineup');
        const outgoingPlayer = new PlayerId('substitute');
        const returningPlayer = new PlayerId('original-starter');
        const jerseyNumber = JerseyNumber.fromNumber(5);

        const command = SubstitutePlayerCommandFactory.createReentry(
          gameId,
          teamLineupId,
          3,
          outgoingPlayer,
          returningPlayer,
          'Original Starter',
          jerseyNumber,
          FieldPosition.THIRD_BASE,
          8,
          'Starter returning for defense'
        );

        expect(command.isReentry).toBe(true);
        expect(command.incomingPlayerId).toBe(returningPlayer);
        expect(command.notes).toBe('Starter returning for defense');
      });

      it('should use default notes if none provided', () => {
        const command = SubstitutePlayerCommandFactory.createReentry(
          new GameId('test'),
          new TeamLineupId('test'),
          1,
          new PlayerId('out'),
          new PlayerId('returning'),
          'Returning Player',
          JerseyNumber.fromNumber(1),
          FieldPosition.PITCHER,
          1
        );

        expect(command.notes).toBe('Starter re-entry');
      });
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

    it('should validate all factory functions create valid commands', () => {
      const factories = [
        (): SubstitutePlayerCommand =>
          SubstitutePlayerCommandFactory.createRegular(
            new GameId('test'),
            new TeamLineupId('test'),
            1,
            new PlayerId('out'),
            new PlayerId('in'),
            'Player',
            JerseyNumber.fromNumber(1),
            FieldPosition.PITCHER,
            1
          ),
        (): SubstitutePlayerCommand =>
          SubstitutePlayerCommandFactory.createReentry(
            new GameId('test'),
            new TeamLineupId('test'),
            1,
            new PlayerId('out'),
            new PlayerId('returning'),
            'Returning Player',
            JerseyNumber.fromNumber(1),
            FieldPosition.PITCHER,
            1
          ),
      ];

      factories.forEach(factory => {
        const command = factory();
        expect(() => SubstitutePlayerCommandValidator.validate(command)).not.toThrow();
      });
    });
  });
});
