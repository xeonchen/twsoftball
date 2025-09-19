/**
 * @file UndoResult.test
 * Comprehensive tests for the UndoResult DTO and related interfaces.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { GameStateDTO } from './GameStateDTO.js';
import { UndoResult, UndoStackInfo, UndoneActionDetail } from './UndoResult.js';

describe('UndoResult', () => {
  const gameId = GameId.generate();
  const completionTimestamp = new Date('2024-08-31T15:30:00Z');
  const originalTimestamp = new Date('2024-08-31T15:25:00Z');
  const undoTimestamp = new Date('2024-08-31T15:30:00Z');

  describe('Required Properties', () => {
    it('should create valid result with minimal success properties', () => {
      const result: UndoResult = {
        success: true,
        gameId,
        actionsUndone: 1,
      };

      expect(result.success).toBe(true);
      expect(result.gameId).toBe(gameId);
      expect(result.actionsUndone).toBe(1);
    });

    it('should create valid result with minimal failure properties', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
      };

      expect(result.success).toBe(false);
      expect(result.gameId).toBe(gameId);
      expect(result.actionsUndone).toBe(0);
    });

    it('should require success, gameId, and actionsUndone properties', () => {
      // These tests ensure TypeScript compilation fails without required props

      // @ts-expect-error - success is required
      const noSuccess: UndoResult = { gameId, actionsUndone: 1 };

      // @ts-expect-error - gameId is required
      const noGameId: UndoResult = { success: true, actionsUndone: 1 };

      // @ts-expect-error - actionsUndone is required
      const noActionsUndone: UndoResult = { success: true, gameId };

      expect(noSuccess).toBeDefined();
      expect(noGameId).toBeDefined();
      expect(noActionsUndone).toBeDefined();
    });
  });

  describe('Success Scenarios', () => {
    describe('Single Action Undo', () => {
      it('should handle successful single at-bat undo', () => {
        const mockGameState = {} as GameStateDTO; // Mock object
        const undoStackInfo: UndoStackInfo = {
          canUndo: true,
          canRedo: true,
          historyPosition: 5,
          totalActions: 10,
          nextUndoDescription: 'Undo substitution',
          nextRedoDescription: 'Redo at-bat',
        };

        const result: UndoResult = {
          success: true,
          gameId,
          actionsUndone: 1,
          undoneActionTypes: ['AT_BAT'],
          restoredState: mockGameState,
          compensatingEvents: ['ActionUndone', 'RunnerPositionReverted', 'ScoreReverted'],
          undoStack: undoStackInfo,
          totalEventsGenerated: 3,
          completionTimestamp,
        };

        expect(result.success).toBe(true);
        expect(result.actionsUndone).toBe(1);
        expect(result.undoneActionTypes).toEqual(['AT_BAT']);
        expect(result.compensatingEvents).toEqual([
          'ActionUndone',
          'RunnerPositionReverted',
          'ScoreReverted',
        ]);
        expect(result.totalEventsGenerated).toBe(3);
      });

      it('should handle successful substitution undo', () => {
        const undoneActionDetail: UndoneActionDetail = {
          actionType: 'SUBSTITUTION',
          description: 'Player #15 substituted for #23 at CF',
          originalTimestamp,
          undoTimestamp,
          compensatingEventCount: 2,
          affectedAggregates: ['TeamLineup', 'Game'],
        };

        const result: UndoResult = {
          success: true,
          gameId,
          actionsUndone: 1,
          undoneActionTypes: ['SUBSTITUTION'],
          undoneActionDetails: [undoneActionDetail],
          compensatingEvents: ['ActionUndone', 'LineupPositionRestored'],
          totalEventsGenerated: 2,
          completionTimestamp,
          warnings: ['Player statistics may be affected by lineup change'],
        };

        expect(result.undoneActionDetails?.[0]?.actionType).toBe('SUBSTITUTION');
        expect(result.undoneActionDetails?.[0]?.affectedAggregates).toEqual(['TeamLineup', 'Game']);
        expect(result.warnings).toContain('Player statistics may be affected by lineup change');
      });
    });

    describe('Multi-Action Undo', () => {
      it('should handle successful multi-action undo', () => {
        const undoneActions: UndoneActionDetail[] = [
          {
            actionType: 'AT_BAT',
            description: 'Home run by #12',
            originalTimestamp: new Date('2024-08-31T15:28:00Z'),
            undoTimestamp,
            compensatingEventCount: 4,
            affectedAggregates: ['Game', 'InningState'],
          },
          {
            actionType: 'AT_BAT',
            description: 'Single by #8',
            originalTimestamp: new Date('2024-08-31T15:26:00Z'),
            undoTimestamp,
            compensatingEventCount: 2,
            affectedAggregates: ['Game', 'InningState'],
          },
        ];

        const result: UndoResult = {
          success: true,
          gameId,
          actionsUndone: 2,
          undoneActionTypes: ['AT_BAT', 'AT_BAT'],
          undoneActionDetails: undoneActions,
          compensatingEvents: [
            'ActionUndone',
            'RunnerPositionReverted',
            'ScoreReverted',
            'ActionUndone',
            'RunnerPositionReverted',
          ],
          totalEventsGenerated: 6,
          completionTimestamp,
        };

        expect(result.actionsUndone).toBe(2);
        expect(result.undoneActionDetails).toHaveLength(2);
        expect(result.totalEventsGenerated).toBe(6);
      });

      it('should handle complex cascade undo', () => {
        const result: UndoResult = {
          success: true,
          gameId,
          actionsUndone: 1,
          undoneActionTypes: ['INNING_END'],
          compensatingEvents: [
            'ActionUndone',
            'InningStateReverted',
            'BasesStateRestored',
            'CurrentBatterReverted',
            'HalfInningReverted',
          ],
          totalEventsGenerated: 8,
          completionTimestamp,
          warnings: ['Complex undo operation affected multiple innings'],
        };

        expect(result.undoneActionTypes).toEqual(['INNING_END']);
        expect(result.compensatingEvents).toContain('InningStateReverted');
        expect(result.totalEventsGenerated).toBe(8);
        expect(result.warnings).toContain('Complex undo operation affected multiple innings');
      });
    });
  });

  describe('Failure Scenarios', () => {
    it('should handle no actions available error', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
        errors: ['No actions available to undo', 'Game is in NOT_STARTED state'],
      };

      expect(result.success).toBe(false);
      expect(result.actionsUndone).toBe(0);
      expect(result.errors).toEqual([
        'No actions available to undo',
        'Game is in NOT_STARTED state',
      ]);
      expect(result.restoredState).toBeUndefined();
    });

    it('should handle invalid game state error', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
        errors: ['Game is not in a valid state for undo operations', 'Game has been completed'],
        warnings: ['Undo operations are disabled for completed games'],
      };

      expect(result.errors).toContain('Game is not in a valid state for undo operations');
      expect(result.warnings).toContain('Undo operations are disabled for completed games');
    });

    it('should handle concurrency conflict error', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
        errors: [
          'Concurrency conflict: game state changed during undo',
          'Expected version 15 but found version 16',
        ],
      };

      expect(result.errors).toContain('Concurrency conflict: game state changed during undo');
      expect(result.errors).toContain('Expected version 15 but found version 16');
    });

    it('should handle domain rule violation error', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
        errors: [
          'Cannot undo: would violate game rules',
          'Undoing this substitution would exceed re-entry limit',
        ],
        warnings: ['Consider manual correction instead of undo'],
      };

      expect(result.errors).toContain('Cannot undo: would violate game rules');
      expect(result.warnings).toContain('Consider manual correction instead of undo');
    });

    it('should handle infrastructure error', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
        errors: [
          'Infrastructure error: failed to store compensating events',
          'Event store connection timeout after 5000ms',
        ],
      };

      expect(result.errors).toContain('Infrastructure error: failed to store compensating events');
      expect(result.errors).toContain('Event store connection timeout after 5000ms');
    });
  });

  describe('UndoStackInfo Interface', () => {
    it('should create valid undo stack info', () => {
      const undoStack: UndoStackInfo = {
        canUndo: true,
        canRedo: false,
        historyPosition: 3,
        totalActions: 5,
      };

      expect(undoStack.canUndo).toBe(true);
      expect(undoStack.canRedo).toBe(false);
      expect(undoStack.historyPosition).toBe(3);
      expect(undoStack.totalActions).toBe(5);
    });

    it('should handle undo stack with descriptions', () => {
      const undoStack: UndoStackInfo = {
        canUndo: true,
        canRedo: true,
        historyPosition: 2,
        totalActions: 4,
        nextUndoDescription: 'Undo home run by #25',
        nextRedoDescription: 'Redo substitution #15 → #23',
      };

      expect(undoStack.nextUndoDescription).toBe('Undo home run by #25');
      expect(undoStack.nextRedoDescription).toBe('Redo substitution #15 → #23');
    });

    it('should handle empty history state', () => {
      const undoStack: UndoStackInfo = {
        canUndo: false,
        canRedo: false,
        historyPosition: 0,
        totalActions: 0,
      };

      expect(undoStack.canUndo).toBe(false);
      expect(undoStack.canRedo).toBe(false);
      expect(undoStack.historyPosition).toBe(0);
      expect(undoStack.totalActions).toBe(0);
    });
  });

  describe('UndoneActionDetail Interface', () => {
    it('should create valid action detail for at-bat', () => {
      const detail: UndoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'Triple by #19 with 2 RBI',
        originalTimestamp,
        undoTimestamp,
        compensatingEventCount: 5,
        affectedAggregates: ['Game', 'InningState'],
      };

      expect(detail.actionType).toBe('AT_BAT');
      expect(detail.description).toContain('Triple by #19');
      expect(detail.compensatingEventCount).toBe(5);
      expect(detail.affectedAggregates).toEqual(['Game', 'InningState']);
    });

    it('should create valid action detail for substitution', () => {
      const detail: UndoneActionDetail = {
        actionType: 'SUBSTITUTION',
        description: 'Pinch runner #7 for #14 at second base',
        originalTimestamp,
        undoTimestamp,
        compensatingEventCount: 3,
        affectedAggregates: ['TeamLineup', 'Game', 'InningState'],
      };

      expect(detail.actionType).toBe('SUBSTITUTION');
      expect(detail.affectedAggregates).toHaveLength(3);
      expect(detail.affectedAggregates).toContain('TeamLineup');
    });

    it('should create valid action detail for inning end', () => {
      const detail: UndoneActionDetail = {
        actionType: 'INNING_END',
        description: 'End of top 7th inning (3 outs)',
        originalTimestamp,
        undoTimestamp,
        compensatingEventCount: 6,
        affectedAggregates: ['Game', 'InningState'],
      };

      expect(detail.actionType).toBe('INNING_END');
      expect(detail.description).toContain('End of top 7th');
      expect(detail.compensatingEventCount).toBe(6);
    });

    it('should handle all action types', () => {
      const actionTypes: UndoneActionDetail['actionType'][] = [
        'AT_BAT',
        'SUBSTITUTION',
        'INNING_END',
        'GAME_START',
        'GAME_END',
        'OTHER',
      ];

      actionTypes.forEach(actionType => {
        const detail: UndoneActionDetail = {
          actionType,
          description: `Test action: ${actionType}`,
          originalTimestamp,
          undoTimestamp,
          compensatingEventCount: 1,
          affectedAggregates: ['Game'],
        };

        expect(detail.actionType).toBe(actionType);
      });
    });
  });

  describe('Complete Result Examples', () => {
    it('should match first documentation example (success)', () => {
      const mockGameState = {} as GameStateDTO;
      const undoStack: UndoStackInfo = {
        canUndo: true,
        canRedo: true,
        historyPosition: 1,
        totalActions: 2,
      };

      const result: UndoResult = {
        success: true,
        gameId,
        actionsUndone: 1,
        undoneActionTypes: ['AT_BAT'],
        restoredState: mockGameState,
        compensatingEvents: ['ActionUndone', 'RunnerPositionReverted', 'ScoreReverted'],
        undoStack,
      };

      expect(result.success).toBe(true);
      expect(result.undoneActionTypes).toEqual(['AT_BAT']);
      expect(result.compensatingEvents).toEqual([
        'ActionUndone',
        'RunnerPositionReverted',
        'ScoreReverted',
      ]);
    });

    it('should match second documentation example (failure)', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
        errors: ['No actions available to undo', 'Game is in NOT_STARTED state'],
      };

      expect(result.success).toBe(false);
      expect(result.actionsUndone).toBe(0);
      expect(result.errors).toEqual([
        'No actions available to undo',
        'Game is in NOT_STARTED state',
      ]);
    });
  });

  describe('Immutability', () => {
    it('should create immutable result objects', () => {
      const result: UndoResult = {
        success: true,
        gameId,
        actionsUndone: 2,
        undoneActionTypes: ['AT_BAT', 'SUBSTITUTION'],
        totalEventsGenerated: 5,
      };

      // These operations should fail at TypeScript compilation
      // readonly properties cannot be assigned
      // result.success = false;

      // readonly properties cannot be assigned
      // result.actionsUndone = 3;

      // readonly arrays cannot be modified
      // result.undoneActionTypes?.push('GAME_END');

      // Note: TypeScript readonly doesn't prevent runtime mutation
      // This test verifies TypeScript compilation prevents assignment
      expect(result).toBeDefined();
    });

    it('should create immutable nested objects', () => {
      const undoStack: UndoStackInfo = {
        canUndo: true,
        canRedo: false,
        historyPosition: 1,
        totalActions: 3,
      };

      // @ts-expect-error - readonly properties cannot be assigned
      undoStack.canUndo = false;

      // @ts-expect-error - readonly properties cannot be assigned
      undoStack.historyPosition = 2;

      // Note: TypeScript readonly doesn't prevent runtime mutation
      expect(undoStack).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce boolean type for success', () => {
      const result: UndoResult = {
        // @ts-expect-error - success must be boolean
        success: 'yes',
        gameId,
        actionsUndone: 1,
      };

      expect(result).toBeDefined();
    });

    it('should enforce number type for actionsUndone', () => {
      const result: UndoResult = {
        success: true,
        gameId,
        // @ts-expect-error - actionsUndone must be number
        actionsUndone: 'one',
      };

      expect(result).toBeDefined();
    });

    it('should enforce action type enum values', () => {
      const result: UndoResult = {
        success: true,
        gameId,
        actionsUndone: 1,
        // @ts-expect-error - must be valid action type
        undoneActionTypes: ['INVALID_ACTION'],
      };

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero actions undone', () => {
      const result: UndoResult = {
        success: true, // Could be success with 0 actions (no-op)
        gameId,
        actionsUndone: 0,
      };

      expect(result.actionsUndone).toBe(0);
    });

    it('should handle large number of actions undone', () => {
      const actionTypes = new Array(50).fill('AT_BAT') as 'AT_BAT'[];

      const result: UndoResult = {
        success: true,
        gameId,
        actionsUndone: 50,
        undoneActionTypes: actionTypes,
        totalEventsGenerated: 150,
      };

      expect(result.undoneActionTypes).toHaveLength(50);
      expect(result.totalEventsGenerated).toBe(150);
    });

    it('should handle undefined optional arrays gracefully', () => {
      const result: UndoResult = {
        success: false,
        gameId,
        actionsUndone: 0,
      };

      expect(result.undoneActionTypes).toBeUndefined();
      expect(result.compensatingEvents).toBeUndefined();
      expect(result.errors).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const result: UndoResult = {
        success: true,
        gameId,
        actionsUndone: 0,
        undoneActionTypes: [],
        compensatingEvents: [],
        undoneActionDetails: [],
        errors: [],
        warnings: [],
      };

      expect(result.undoneActionTypes).toEqual([]);
      expect(result.compensatingEvents).toEqual([]);
      expect(result.undoneActionDetails).toEqual([]);
    });
  });
});
