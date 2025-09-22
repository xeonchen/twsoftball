/**
 * @file UndoCommand.test
 * Comprehensive tests for the UndoCommand DTO to verify all interface properties and usage patterns.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import {
  UndoCommand,
  UndoCommandValidator,
  UndoCommandValidationError,
  UndoCommandFactory,
} from './UndoCommand.js';

describe('UndoCommand', () => {
  const gameId = GameId.generate();
  const timestamp = new Date('2024-08-31T15:30:00Z');

  describe('Validation - UndoCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should require gameId', () => {
        const command: UndoCommand = {
          gameId: null as unknown as GameId,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(UndoCommandValidationError);
        expect(() => UndoCommandValidator.validate(command)).toThrow('gameId is required');
      });
    });

    describe('Action Limit Validation', () => {
      it('should require positive integer actionLimit', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 0,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'actionLimit must be a positive integer'
        );
      });

      it('should reject negative actionLimit', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: -1,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'actionLimit must be a positive integer'
        );
      });

      it('should reject non-integer actionLimit', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 1.5,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'actionLimit must be a positive integer'
        );
      });

      it('should limit actionLimit to maximum 10', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 11,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'actionLimit cannot exceed 10 actions for safety'
        );
      });

      it('should require confirmation for dangerous actionLimit (>3)', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 5,
          confirmDangerous: false,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'confirmDangerous must be true'
        );
      });

      it('should allow dangerous actionLimit with confirmation', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 5,
          confirmDangerous: true,
        };

        expect(() => UndoCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow actionLimit <= 3 without confirmation', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 3,
        };

        expect(() => UndoCommandValidator.validate(command)).not.toThrow();
      });
    });

    describe('Notes Validation', () => {
      it('should limit notes length to 500 characters', () => {
        const command: UndoCommand = {
          gameId,
          notes: 'a'.repeat(501),
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'notes cannot exceed 500 characters'
        );
      });

      it('should not allow whitespace-only notes', () => {
        const command: UndoCommand = {
          gameId,
          notes: '   ',
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'notes cannot be only whitespace'
        );
      });

      it('should allow empty string notes', () => {
        const command: UndoCommand = {
          gameId,
          notes: '',
        };

        expect(() => UndoCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow undefined notes', () => {
        const command: UndoCommand = {
          gameId,
        };

        expect(() => UndoCommandValidator.validate(command)).not.toThrow();
      });
    });

    describe('Timestamp Validation', () => {
      it('should require valid Date object', () => {
        const command: UndoCommand = {
          gameId,
          timestamp: 'invalid' as unknown as Date,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date object'
        );
      });

      it('should require valid date value', () => {
        const command: UndoCommand = {
          gameId,
          timestamp: new Date('invalid'),
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date'
        );
      });

      it('should not allow timestamp too far in future', () => {
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        const command: UndoCommand = {
          gameId,
          timestamp: futureTime,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 hour in the future'
        );
      });

      it('should not allow timestamp too far in past', () => {
        const pastTime = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
        const command: UndoCommand = {
          gameId,
          timestamp: pastTime,
        };

        expect(() => UndoCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 year in the past'
        );
      });

      it('should allow reasonable timestamp', () => {
        const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        const command: UndoCommand = {
          gameId,
          timestamp: recentTime,
        };

        expect(() => UndoCommandValidator.validate(command)).not.toThrow();
      });
    });

    it('should pass validation for valid commands', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'Valid undo',
      };

      expect(() => UndoCommandValidator.validate(command)).not.toThrow();
    });
  });

  describe('Factory Functions - UndoCommandFactory', () => {
    describe('createSimple', () => {
      it('should create valid simple undo command', () => {
        const command = UndoCommandFactory.createSimple(gameId, 'Undo last action');

        expect(command.gameId).toBe(gameId);
        expect(command.actionLimit).toBe(1);
        expect(command.notes).toBe('Undo last action');
        expect(command.timestamp).toBeInstanceOf(Date);
      });

      it('should work without notes', () => {
        const command = UndoCommandFactory.createSimple(gameId);
        expect(command.notes).toBeUndefined();
      });
    });

    describe('createMultiple', () => {
      it('should create valid multiple undo command', () => {
        const command = UndoCommandFactory.createMultiple(gameId, 3, 'Undo sequence', false);

        expect(command.actionLimit).toBe(3);
        expect(command.confirmDangerous).toBe(false);
        expect(command.notes).toBe('Undo sequence');
      });

      it('should set confirmDangerous for actionLimit > 3', () => {
        const command = UndoCommandFactory.createMultiple(gameId, 5, 'Dangerous undo');

        expect(command.confirmDangerous).toBe(true);
        expect(command.actionLimit).toBe(5);
      });
    });
  });

  describe('Required Properties', () => {
    it('should create valid command with only gameId', () => {
      const command: UndoCommand = {
        gameId,
      };

      expect(command.gameId).toBe(gameId);
      expect(command.actionLimit).toBeUndefined();
      expect(command.confirmDangerous).toBeUndefined();
      expect(command.notes).toBeUndefined();
      expect(command.timestamp).toBeUndefined();
    });

    it('should require gameId property', () => {
      // This test ensures TypeScript compilation fails without gameId
      // @ts-expect-error - gameId is required
      const invalidCommand: UndoCommand = {};

      // Runtime validation would catch this in real usage
      expect(invalidCommand).toBeDefined();
    });
  });

  describe('Optional Properties', () => {
    describe('actionLimit', () => {
      it('should accept actionLimit of 1 (default case)', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 1,
        };

        expect(command.actionLimit).toBe(1);
      });

      it('should accept actionLimit of 2-3 (moderate undo)', () => {
        const command2: UndoCommand = {
          gameId,
          actionLimit: 2,
        };

        const command3: UndoCommand = {
          gameId,
          actionLimit: 3,
        };

        expect(command2.actionLimit).toBe(2);
        expect(command3.actionLimit).toBe(3);
      });

      it('should accept actionLimit > 3 (dangerous undo)', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 5,
          confirmDangerous: true,
        };

        expect(command.actionLimit).toBe(5);
        expect(command.confirmDangerous).toBe(true);
      });

      it('should accept zero actionLimit (no-op case)', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 0,
        };

        expect(command.actionLimit).toBe(0);
      });

      it('should handle large actionLimit values', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 100,
          confirmDangerous: true,
        };

        expect(command.actionLimit).toBe(100);
      });
    });

    describe('confirmDangerous', () => {
      it('should accept confirmDangerous as true', () => {
        const command: UndoCommand = {
          gameId,
          confirmDangerous: true,
        };

        expect(command.confirmDangerous).toBe(true);
      });

      it('should accept confirmDangerous as false', () => {
        const command: UndoCommand = {
          gameId,
          confirmDangerous: false,
        };

        expect(command.confirmDangerous).toBe(false);
      });

      it('should work with dangerous operations', () => {
        const command: UndoCommand = {
          gameId,
          actionLimit: 10,
          confirmDangerous: true,
          notes: 'Mass correction needed due to scoring errors',
        };

        expect(command.confirmDangerous).toBe(true);
        expect(command.actionLimit).toBe(10);
      });
    });

    describe('notes', () => {
      it('should accept short notes', () => {
        const command: UndoCommand = {
          gameId,
          notes: 'Scorer error',
        };

        expect(command.notes).toBe('Scorer error');
      });

      it('should accept detailed notes', () => {
        const detailedNotes =
          "Umpire overturned call after video review. Original ruling was safe at second base, but replay showed runner was clearly out. Correcting at-bat result from single to fielder's choice with out at second base.";

        const command: UndoCommand = {
          gameId,
          notes: detailedNotes,
        };

        expect(command.notes).toBe(detailedNotes);
      });

      it('should accept empty string notes', () => {
        const command: UndoCommand = {
          gameId,
          notes: '',
        };

        expect(command.notes).toBe('');
      });

      it('should handle special characters in notes', () => {
        const command: UndoCommand = {
          gameId,
          notes: 'Player #23 → #24, position CF ↔ RF (double-switch)',
        };

        expect(command.notes).toContain('#23 → #24');
      });
    });

    describe('timestamp', () => {
      it('should accept valid timestamp', () => {
        const command: UndoCommand = {
          gameId,
          timestamp,
        };

        expect(command.timestamp).toBe(timestamp);
      });

      it('should accept current timestamp', () => {
        const now = new Date();
        const command: UndoCommand = {
          gameId,
          timestamp: now,
        };

        expect(command.timestamp).toBe(now);
      });

      it('should accept past timestamp', () => {
        const pastDate = new Date('2023-01-01T00:00:00Z');
        const command: UndoCommand = {
          gameId,
          timestamp: pastDate,
        };

        expect(command.timestamp).toBe(pastDate);
      });

      it('should accept future timestamp', () => {
        const futureDate = new Date('2025-12-31T23:59:59Z');
        const command: UndoCommand = {
          gameId,
          timestamp: futureDate,
        };

        expect(command.timestamp).toBe(futureDate);
      });
    });
  });

  describe('Complete Command Examples', () => {
    it('should create minimal undo command', () => {
      const command: UndoCommand = {
        gameId,
      };

      expect(command).toEqual({
        gameId,
      });
    });

    it('should create standard single action undo', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'Incorrect at-bat result recorded',
        timestamp,
      };

      expect(command).toEqual({
        gameId,
        actionLimit: 1,
        notes: 'Incorrect at-bat result recorded',
        timestamp,
      });
    });

    it('should create multi-action undo with confirmation', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 3,
        confirmDangerous: true,
        notes: 'Correcting sequence of scoring errors from last three plays',
        timestamp,
      };

      expect(command).toEqual({
        gameId,
        actionLimit: 3,
        confirmDangerous: true,
        notes: 'Correcting sequence of scoring errors from last three plays',
        timestamp,
      });
    });

    it('should create dangerous undo command', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 10,
        confirmDangerous: true,
        notes: 'League ruling: Game must be replayed from 5th inning due to umpire error',
        timestamp: new Date('2024-08-31T20:15:00Z'),
      };

      expect(command.actionLimit).toBe(10);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toContain('League ruling');
    });
  });

  describe('Immutability', () => {
    it('should create immutable command objects', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 2,
        confirmDangerous: false,
        notes: 'Original notes',
        timestamp,
      };

      // These operations should fail at TypeScript compilation
      // @ts-expect-error - readonly properties cannot be assigned
      command.gameId = GameId.generate();

      // @ts-expect-error - readonly properties cannot be assigned
      command.actionLimit = 5;

      // @ts-expect-error - readonly properties cannot be assigned
      command.confirmDangerous = true;

      // @ts-expect-error - readonly properties cannot be assigned
      command.notes = 'Modified notes';

      // @ts-expect-error - readonly properties cannot be assigned
      command.timestamp = new Date();

      // Note: TypeScript readonly doesn't prevent runtime mutation
      // This test verifies TypeScript compilation prevents assignment
      // but runtime mutation is still possible (JavaScript limitation)
      expect(command).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce GameId type for gameId', () => {
      const validGameId = GameId.generate();
      const command: UndoCommand = {
        gameId: validGameId,
      };

      expect(command.gameId).toBeInstanceOf(GameId);
    });

    it('should enforce number type for actionLimit', () => {
      const command: UndoCommand = {
        gameId,
        // @ts-expect-error - actionLimit must be number
        actionLimit: 'invalid',
      };

      // Runtime type checking would be handled by validation layer
      expect(command).toBeDefined();
    });

    it('should enforce boolean type for confirmDangerous', () => {
      const command: UndoCommand = {
        gameId,
        // @ts-expect-error - confirmDangerous must be boolean
        confirmDangerous: 'yes',
      };

      // Runtime type checking would be handled by validation layer
      expect(command).toBeDefined();
    });

    it('should enforce string type for notes', () => {
      const command: UndoCommand = {
        gameId,
        // @ts-expect-error - notes must be string
        notes: 123,
      };

      // Runtime type checking would be handled by validation layer
      expect(command).toBeDefined();
    });

    it('should enforce Date type for timestamp', () => {
      const command: UndoCommand = {
        gameId,
        // @ts-expect-error - timestamp must be Date
        timestamp: '2024-08-31',
      };

      // Runtime type checking would be handled by validation layer
      expect(command).toBeDefined();
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should support undo after at-bat scenario', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'Scorer recorded single instead of double - fixing hit type',
      };

      expect(command.actionLimit).toBe(1);
      expect(command.notes).toContain('fixing hit type');
    });

    it('should support undo after substitution scenario', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'Wrong player substituted - manager wants #15 not #51',
        timestamp,
      };

      expect(command.notes).toContain('Wrong player substituted');
    });

    it('should support undo after inning ending scenario', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 2,
        confirmDangerous: true,
        notes: 'Umpire ruled foul ball, not third out - continuing inning',
      };

      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toContain('continuing inning');
    });

    it('should support administrative undo scenario', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'League official correction per rule 7.13(b)',
      };

      expect(command.notes).toContain('League official');
    });

    it('should support emergency mass undo scenario', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 20,
        confirmDangerous: true,
        notes: 'System error corrupted game data - reverting to last known good state',
        timestamp,
      };

      expect(command.actionLimit).toBe(20);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toContain('System error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined optional properties gracefully', () => {
      const command: UndoCommand = {
        gameId,
      };

      expect(command.gameId).toBe(gameId);
      expect(command.actionLimit).toBeUndefined();
      expect(command.confirmDangerous).toBeUndefined();
      expect(command.notes).toBeUndefined();
      expect(command.timestamp).toBeUndefined();
    });

    it('should handle extreme actionLimit values', () => {
      const commands = [
        { gameId, actionLimit: 0 },
        { gameId, actionLimit: 1 },
        { gameId, actionLimit: 999999, confirmDangerous: true },
      ];

      commands.forEach(command => {
        expect(command.gameId).toBe(gameId);
        expect(typeof command.actionLimit).toBe('number');
      });
    });
  });

  describe('Documentation Examples', () => {
    it('should match first documentation example', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        timestamp: new Date(),
      };

      expect(command.gameId).toBe(gameId);
      expect(command.actionLimit).toBe(1);
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should match second documentation example', () => {
      const command: UndoCommand = {
        gameId,
        actionLimit: 3,
        notes: 'Correcting scoring error from previous plays',
        confirmDangerous: true,
        timestamp: new Date(),
      };

      expect(command.gameId).toBe(gameId);
      expect(command.actionLimit).toBe(3);
      expect(command.notes).toBe('Correcting scoring error from previous plays');
      expect(command.confirmDangerous).toBe(true);
      expect(command.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Factory Validation', () => {
    it('should validate all factory functions create valid commands', () => {
      const factories = [
        (): UndoCommand => UndoCommandFactory.createSimple(gameId),
        (): UndoCommand => UndoCommandFactory.createMultiple(gameId, 2, 'Multiple undo', false),
        (): UndoCommand => UndoCommandFactory.createMultiple(gameId, 5, 'Dangerous undo'),
      ];

      factories.forEach(factory => {
        const command = factory();
        expect(() => UndoCommandValidator.validate(command)).not.toThrow();
      });
    });
  });
});
