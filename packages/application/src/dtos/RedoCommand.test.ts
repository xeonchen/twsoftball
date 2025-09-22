/**
 * @file RedoCommand.test.ts
 * Comprehensive tests for the RedoCommand DTO.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import {
  RedoCommand,
  RedoCommandValidator,
  RedoCommandValidationError,
  RedoCommandFactory,
} from './RedoCommand.js';

describe('RedoCommand', () => {
  const mockGameId = new GameId('test-game-123');
  const mockTimestamp = new Date('2024-07-15T14:30:00Z');

  describe('Validation - RedoCommandValidator', () => {
    describe('Basic Field Validation', () => {
      it('should require gameId', () => {
        const command: RedoCommand = {
          gameId: null as unknown as GameId,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(RedoCommandValidationError);
        expect(() => RedoCommandValidator.validate(command)).toThrow('gameId is required');
      });
    });

    describe('Action Limit Validation', () => {
      it('should require positive integer actionLimit', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: 0,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'actionLimit must be a positive integer'
        );
      });

      it('should reject negative actionLimit', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: -1,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'actionLimit must be a positive integer'
        );
      });

      it('should reject non-integer actionLimit', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: 1.5,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'actionLimit must be a positive integer'
        );
      });

      it('should limit actionLimit to maximum 10', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: 11,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'actionLimit cannot exceed 10 actions for safety'
        );
      });

      it('should require confirmation for dangerous actionLimit (>3)', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: 5,
          confirmDangerous: false,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'confirmDangerous must be true'
        );
      });

      it('should allow dangerous actionLimit with confirmation', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: 5,
          confirmDangerous: true,
        };

        expect(() => RedoCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow actionLimit <= 3 without confirmation', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          actionLimit: 3,
        };

        expect(() => RedoCommandValidator.validate(command)).not.toThrow();
      });
    });

    describe('Notes Validation', () => {
      it('should limit notes length to 500 characters', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          notes: 'a'.repeat(501),
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'notes cannot exceed 500 characters'
        );
      });

      it('should not allow whitespace-only notes', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          notes: '   ',
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'notes cannot be only whitespace'
        );
      });

      it('should allow empty string notes', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          notes: '',
        };

        expect(() => RedoCommandValidator.validate(command)).not.toThrow();
      });

      it('should allow undefined notes', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
        };

        expect(() => RedoCommandValidator.validate(command)).not.toThrow();
      });
    });

    describe('Timestamp Validation', () => {
      it('should require valid Date object', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          timestamp: 'invalid' as unknown as Date,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date object'
        );
      });

      it('should require valid date value', () => {
        const command: RedoCommand = {
          gameId: mockGameId,
          timestamp: new Date('invalid'),
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'timestamp must be a valid Date'
        );
      });

      it('should not allow timestamp too far in future', () => {
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        const command: RedoCommand = {
          gameId: mockGameId,
          timestamp: futureTime,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 hour in the future'
        );
      });

      it('should not allow timestamp too far in past', () => {
        const pastTime = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
        const command: RedoCommand = {
          gameId: mockGameId,
          timestamp: pastTime,
        };

        expect(() => RedoCommandValidator.validate(command)).toThrow(
          'timestamp cannot be more than 1 year in the past'
        );
      });

      it('should allow reasonable timestamp', () => {
        const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        const command: RedoCommand = {
          gameId: mockGameId,
          timestamp: recentTime,
        };

        expect(() => RedoCommandValidator.validate(command)).not.toThrow();
      });
    });

    it('should pass validation for valid commands', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        notes: 'Valid redo',
      };

      expect(() => RedoCommandValidator.validate(command)).not.toThrow();
    });
  });

  describe('Factory Functions - RedoCommandFactory', () => {
    describe('createSimple', () => {
      it('should create valid simple redo command', () => {
        const command = RedoCommandFactory.createSimple(mockGameId, 'Redo last action');

        expect(command.gameId).toBe(mockGameId);
        expect(command.actionLimit).toBe(1);
        expect(command.notes).toBe('Redo last action');
        expect(command.timestamp).toBeInstanceOf(Date);
      });

      it('should work without notes', () => {
        const command = RedoCommandFactory.createSimple(mockGameId);
        expect(command.notes).toBeUndefined();
      });
    });

    describe('createMultiple', () => {
      it('should create valid multiple redo command', () => {
        const command = RedoCommandFactory.createMultiple(mockGameId, 3, 'Redo sequence', false);

        expect(command.actionLimit).toBe(3);
        expect(command.confirmDangerous).toBe(false);
        expect(command.notes).toBe('Redo sequence');
      });

      it('should set confirmDangerous for actionLimit > 3', () => {
        const command = RedoCommandFactory.createMultiple(mockGameId, 5, 'Dangerous redo');

        expect(command.confirmDangerous).toBe(true);
        expect(command.actionLimit).toBe(5);
      });
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('should accept minimal valid command with only required fields', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBeUndefined();
      expect(command.confirmDangerous).toBeUndefined();
      expect(command.notes).toBeUndefined();
      expect(command.timestamp).toBeUndefined();
    });

    it('should accept complete command with all optional fields', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 2,
        confirmDangerous: true,
        notes: 'Restoring correct sequence after review',
        timestamp: mockTimestamp,
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(2);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toBe('Restoring correct sequence after review');
      expect(command.timestamp).toBe(mockTimestamp);
    });

    it('should enforce readonly properties cannot be modified after creation', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
      };

      // These should cause TypeScript compilation errors (tested at compile time)
      // command.gameId = new GameId('different-game');
      // command.actionLimit = 2;

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(1);
    });
  });

  describe('GameId Field', () => {
    it('should require GameId as mandatory field', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.gameId).toBeInstanceOf(GameId);
    });

    it('should accept different GameId instances', () => {
      const gameId1 = new GameId('game-001');
      const gameId2 = new GameId('game-002');

      const command1: RedoCommand = { gameId: gameId1 };
      const command2: RedoCommand = { gameId: gameId2 };

      expect(command1.gameId).toBe(gameId1);
      expect(command2.gameId).toBe(gameId2);
      expect(command1.gameId).not.toBe(command2.gameId);
    });
  });

  describe('ActionLimit Field', () => {
    it('should default to undefined when not specified', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
      };

      expect(command.actionLimit).toBeUndefined();
    });

    it('should accept actionLimit of 1 for single action redo', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
      };

      expect(command.actionLimit).toBe(1);
    });

    it('should accept actionLimit of 2-3 for multiple action redo', () => {
      const command2: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 2,
      };

      const command3: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 3,
      };

      expect(command2.actionLimit).toBe(2);
      expect(command3.actionLimit).toBe(3);
    });

    it('should accept actionLimit above 3 for dangerous operations', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 5,
        confirmDangerous: true,
      };

      expect(command.actionLimit).toBe(5);
    });

    it('should accept zero actionLimit for no-op operations', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 0,
      };

      expect(command.actionLimit).toBe(0);
    });

    it('should accept large actionLimit values', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 100,
        confirmDangerous: true,
      };

      expect(command.actionLimit).toBe(100);
    });
  });

  describe('ConfirmDangerous Field', () => {
    it('should default to undefined when not specified', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
      };

      expect(command.confirmDangerous).toBeUndefined();
    });

    it('should accept explicit true value', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        confirmDangerous: true,
      };

      expect(command.confirmDangerous).toBe(true);
    });

    it('should accept explicit false value', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        confirmDangerous: false,
      };

      expect(command.confirmDangerous).toBe(false);
    });

    it('should work with high actionLimit for dangerous operations', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 10,
        confirmDangerous: true,
      };

      expect(command.confirmDangerous).toBe(true);
      expect(command.actionLimit).toBe(10);
    });
  });

  describe('Notes Field', () => {
    it('should default to undefined when not specified', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
      };

      expect(command.notes).toBeUndefined();
    });

    it('should accept simple note strings', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        notes: 'Simple redo note',
      };

      expect(command.notes).toBe('Simple redo note');
    });

    it('should accept empty string notes', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        notes: '',
      };

      expect(command.notes).toBe('');
    });

    it('should accept detailed audit notes', () => {
      const auditNote =
        'Restoring correct sequence after umpire review - original call was overturned per league rules section 4.2.1';
      const command: RedoCommand = {
        gameId: mockGameId,
        notes: auditNote,
      };

      expect(command.notes).toBe(auditNote);
    });

    it('should accept notes with special characters', () => {
      const specialNote = 'Redo: Player #23 "John Smith" substitution @ 3B position (inning 7)';
      const command: RedoCommand = {
        gameId: mockGameId,
        notes: specialNote,
      };

      expect(command.notes).toBe(specialNote);
    });

    it('should accept multiline notes', () => {
      const multilineNote = `Redo operation details:
- Restored at-bat for player #15
- Re-applied runner advancement
- Corrected scoring error`;

      const command: RedoCommand = {
        gameId: mockGameId,
        notes: multilineNote,
      };

      expect(command.notes).toBe(multilineNote);
    });
  });

  describe('Timestamp Field', () => {
    it('should default to undefined when not specified', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
      };

      expect(command.timestamp).toBeUndefined();
    });

    it('should accept valid Date objects', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        timestamp: mockTimestamp,
      };

      expect(command.timestamp).toBe(mockTimestamp);
      expect(command.timestamp).toBeInstanceOf(Date);
    });

    it('should accept current timestamp', () => {
      const now = new Date();
      const command: RedoCommand = {
        gameId: mockGameId,
        timestamp: now,
      };

      expect(command.timestamp).toBe(now);
    });

    it('should accept past timestamps', () => {
      const pastDate = new Date('2023-01-01T00:00:00Z');
      const command: RedoCommand = {
        gameId: mockGameId,
        timestamp: pastDate,
      };

      expect(command.timestamp).toBe(pastDate);
    });

    it('should accept future timestamps', () => {
      const futureDate = new Date('2025-12-31T23:59:59Z');
      const command: RedoCommand = {
        gameId: mockGameId,
        timestamp: futureDate,
      };

      expect(command.timestamp).toBe(futureDate);
    });
  });

  describe('Common Usage Patterns', () => {
    it('should support simple redo last undone action pattern', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        timestamp: mockTimestamp,
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(1);
      expect(command.timestamp).toBe(mockTimestamp);
      expect(command.confirmDangerous).toBeUndefined();
      expect(command.notes).toBeUndefined();
    });

    it('should support safe multi-action redo pattern', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 3,
        notes: 'Restoring sequence of corrected plays',
        timestamp: mockTimestamp,
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(3);
      expect(command.notes).toBe('Restoring sequence of corrected plays');
      expect(command.timestamp).toBe(mockTimestamp);
      expect(command.confirmDangerous).toBeUndefined();
    });

    it('should support dangerous operation with confirmation pattern', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 5,
        confirmDangerous: true,
        notes: 'League director authorized restoration of game state',
        timestamp: mockTimestamp,
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(5);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toBe('League director authorized restoration of game state');
      expect(command.timestamp).toBe(mockTimestamp);
    });

    it('should support system-generated timestamp pattern', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        notes: 'Automatic redo operation',
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(1);
      expect(command.notes).toBe('Automatic redo operation');
      expect(command.timestamp).toBeUndefined(); // Let system generate
    });

    it('should support no-op redo pattern', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 0,
        notes: 'Check redo availability only',
      };

      expect(command.gameId).toBe(mockGameId);
      expect(command.actionLimit).toBe(0);
      expect(command.notes).toBe('Check redo availability only');
    });
  });

  describe('Business Logic Validation Scenarios', () => {
    it('should represent command for redoing single at-bat', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        notes: 'Redo at-bat result after umpire overturned call',
        timestamp: mockTimestamp,
      };

      // This is a typical single action redo
      expect(command.actionLimit).toBe(1);
      expect(command.confirmDangerous).toBeUndefined();
      expect(command.notes).toContain('at-bat');
    });

    it('should represent command for redoing substitution', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        notes: 'Restore player substitution - original was valid',
        timestamp: mockTimestamp,
      };

      expect(command.actionLimit).toBe(1);
      expect(command.notes).toContain('substitution');
    });

    it('should represent command for redoing inning ending', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        confirmDangerous: true, // Inning endings are complex
        notes: 'Restore inning end state per official review',
        timestamp: mockTimestamp,
      };

      expect(command.actionLimit).toBe(1);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toContain('inning');
    });

    it('should represent command for redoing game completion', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 1,
        confirmDangerous: true, // Game completions are dangerous
        notes: 'Restore game completion - technical scoring error corrected',
        timestamp: mockTimestamp,
      };

      expect(command.actionLimit).toBe(1);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toContain('game completion');
    });

    it('should represent command for bulk redo operations', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 8,
        confirmDangerous: true,
        notes: 'League director authorized bulk restoration after equipment malfunction',
        timestamp: mockTimestamp,
      };

      expect(command.actionLimit).toBe(8);
      expect(command.confirmDangerous).toBe(true);
      expect(command.notes).toContain('bulk restoration');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle very large actionLimit values', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: Number.MAX_SAFE_INTEGER,
        confirmDangerous: true,
      };

      expect(command.actionLimit).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative actionLimit values (invalid but type-safe)', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: -1,
      };

      expect(command.actionLimit).toBe(-1);
    });

    it('should handle very long notes strings', () => {
      const longNotes = 'A'.repeat(10000);
      const command: RedoCommand = {
        gameId: mockGameId,
        notes: longNotes,
      };

      expect(command.notes).toBe(longNotes);
      expect(command.notes?.length).toBe(10000);
    });

    it('should handle extreme timestamp values', () => {
      const minDate = new Date(-8640000000000000); // JavaScript minimum date
      const maxDate = new Date(8640000000000000); // JavaScript maximum date

      const commandMin: RedoCommand = {
        gameId: mockGameId,
        timestamp: minDate,
      };

      const commandMax: RedoCommand = {
        gameId: mockGameId,
        timestamp: maxDate,
      };

      expect(commandMin.timestamp).toBe(minDate);
      expect(commandMax.timestamp).toBe(maxDate);
    });
  });

  describe('JSON Serialization Support', () => {
    it('should support JSON serialization for network transport', () => {
      const command: RedoCommand = {
        gameId: mockGameId,
        actionLimit: 2,
        confirmDangerous: true,
        notes: 'Test serialization',
        timestamp: mockTimestamp,
      };

      // Note: This would need custom serialization logic for GameId
      // but the DTO structure supports it
      const serializable = {
        gameId: command.gameId.value,
        actionLimit: command.actionLimit,
        confirmDangerous: command.confirmDangerous,
        notes: command.notes,
        timestamp: command.timestamp?.toISOString(),
      };

      expect(serializable.gameId).toBe('test-game-123');
      expect(serializable.actionLimit).toBe(2);
      expect(serializable.confirmDangerous).toBe(true);
      expect(serializable.notes).toBe('Test serialization');
      expect(serializable.timestamp).toBe('2024-07-15T14:30:00.000Z');
    });

    it('should validate all factory functions create valid commands', () => {
      const factories = [
        (): RedoCommand => RedoCommandFactory.createSimple(mockGameId),
        (): RedoCommand => RedoCommandFactory.createMultiple(mockGameId, 2, 'Multiple redo', false),
        (): RedoCommand => RedoCommandFactory.createMultiple(mockGameId, 5, 'Dangerous redo'),
      ];

      factories.forEach(factory => {
        const command = factory();
        expect(() => RedoCommandValidator.validate(command)).not.toThrow();
      });
    });
  });
});
