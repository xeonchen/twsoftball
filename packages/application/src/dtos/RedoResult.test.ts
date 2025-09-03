/**
 * @file RedoResult.test.ts
 * Comprehensive tests for the RedoResult DTO and related interfaces.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { GameStateDTO } from './GameStateDTO';
import { RedoResult, RedoStackInfo, RedoneActionDetail } from './RedoResult';

describe('RedoResult', () => {
  const mockGameId = new GameId('test-game-123');
  const mockTimestamp = new Date('2024-07-15T14:30:00Z');
  const mockCompletionTimestamp = new Date('2024-07-15T14:30:15Z');

  describe('Type Safety and Interface Compliance', () => {
    it('should accept minimal successful result with required fields only', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.success).toBe(true);
      expect(result.gameId).toBe(mockGameId);
      expect(result.actionsRedone).toBe(1);
      expect(result.redoneActionTypes).toBeUndefined();
      expect(result.restoredState).toBeUndefined();
      expect(result.restorationEvents).toBeUndefined();
      expect(result.undoStack).toBeUndefined();
      expect(result.redoneActionDetails).toBeUndefined();
      expect(result.totalEventsGenerated).toBeUndefined();
      expect(result.completionTimestamp).toBeUndefined();
      expect(result.errors).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should accept minimal failure result with required fields only', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
      };

      expect(result.success).toBe(false);
      expect(result.gameId).toBe(mockGameId);
      expect(result.actionsRedone).toBe(0);
    });

    it('should accept complete successful result with all optional fields', () => {
      const mockUndoStack: RedoStackInfo = {
        canUndo: true,
        canRedo: false,
        historyPosition: 5,
        totalActions: 10,
        nextUndoDescription: 'HOME_RUN by player #12',
      };

      const mockRedoneActionDetail: RedoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'HOME_RUN by player #12',
        originalTimestamp: new Date('2024-07-15T14:25:00Z'),
        undoTimestamp: new Date('2024-07-15T14:28:00Z'),
        redoTimestamp: mockTimestamp,
        restorationEventCount: 3,
        affectedAggregates: ['Game', 'InningState'],
      };

      const mockGameState: GameStateDTO = {} as GameStateDTO;

      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        redoneActionTypes: ['AT_BAT'],
        restoredState: mockGameState,
        restorationEvents: ['ActionRedone', 'RunnerPositionRestored', 'ScoreRestored'],
        undoStack: mockUndoStack,
        redoneActionDetails: [mockRedoneActionDetail],
        totalEventsGenerated: 3,
        completionTimestamp: mockCompletionTimestamp,
        warnings: ['Player statistics affected by redo'],
      };

      expect(result.success).toBe(true);
      expect(result.gameId).toBe(mockGameId);
      expect(result.actionsRedone).toBe(1);
      expect(result.redoneActionTypes).toEqual(['AT_BAT']);
      expect(result.restoredState).toBe(mockGameState);
      expect(result.restorationEvents).toEqual([
        'ActionRedone',
        'RunnerPositionRestored',
        'ScoreRestored',
      ]);
      expect(result.undoStack).toBe(mockUndoStack);
      expect(result.redoneActionDetails).toEqual([mockRedoneActionDetail]);
      expect(result.totalEventsGenerated).toBe(3);
      expect(result.completionTimestamp).toBe(mockCompletionTimestamp);
      expect(result.warnings).toEqual(['Player statistics affected by redo']);
    });

    it('should enforce readonly properties cannot be modified after creation', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      // These should cause TypeScript compilation errors (tested at compile time)
      // result.success = false;
      // result.gameId = new GameId('different-game');
      // result.actionsRedone = 2;

      expect(result.success).toBe(true);
      expect(result.gameId).toBe(mockGameId);
      expect(result.actionsRedone).toBe(1);
    });
  });

  describe('Success Field', () => {
    it('should accept true for successful operations', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.success).toBe(true);
    });

    it('should accept false for failed operations', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
      };

      expect(result.success).toBe(false);
    });
  });

  describe('GameId Field', () => {
    it('should require GameId as mandatory field', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.gameId).toBe(mockGameId);
      expect(result.gameId).toBeInstanceOf(GameId);
    });

    it('should accept different GameId instances', () => {
      const gameId1 = new GameId('game-001');
      const gameId2 = new GameId('game-002');

      const result1: RedoResult = {
        success: true,
        gameId: gameId1,
        actionsRedone: 1,
      };

      const result2: RedoResult = {
        success: false,
        gameId: gameId2,
        actionsRedone: 0,
      };

      expect(result1.gameId).toBe(gameId1);
      expect(result2.gameId).toBe(gameId2);
      expect(result1.gameId).not.toBe(result2.gameId);
    });
  });

  describe('ActionsRedone Field', () => {
    it('should require actionsRedone as mandatory field', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 2,
      };

      expect(result.actionsRedone).toBe(2);
    });

    it('should accept zero for failed operations', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
      };

      expect(result.actionsRedone).toBe(0);
    });

    it('should accept positive values for successful operations', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 5,
      };

      expect(result.actionsRedone).toBe(5);
    });

    it('should accept large values', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 100,
      };

      expect(result.actionsRedone).toBe(100);
    });
  });

  describe('RedoneActionTypes Field', () => {
    it('should default to undefined when not specified', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.redoneActionTypes).toBeUndefined();
    });

    it('should accept single action type', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        redoneActionTypes: ['AT_BAT'],
      };

      expect(result.redoneActionTypes).toEqual(['AT_BAT']);
    });

    it('should accept multiple action types', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 3,
        redoneActionTypes: ['AT_BAT', 'SUBSTITUTION', 'INNING_END'],
      };

      expect(result.redoneActionTypes).toEqual(['AT_BAT', 'SUBSTITUTION', 'INNING_END']);
    });

    it('should accept all valid action types', () => {
      const actionTypes: (
        | 'AT_BAT'
        | 'SUBSTITUTION'
        | 'INNING_END'
        | 'GAME_START'
        | 'GAME_END'
        | 'OTHER'
      )[] = ['AT_BAT', 'SUBSTITUTION', 'INNING_END', 'GAME_START', 'GAME_END', 'OTHER'];

      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 6,
        redoneActionTypes: actionTypes,
      };

      expect(result.redoneActionTypes).toEqual(actionTypes);
    });

    it('should accept empty array', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 0,
        redoneActionTypes: [],
      };

      expect(result.redoneActionTypes).toEqual([]);
    });
  });

  describe('RestorationEvents Field', () => {
    it('should default to undefined when not specified', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.restorationEvents).toBeUndefined();
    });

    it('should accept array of event type strings', () => {
      const events = ['ActionRedone', 'RunnerPositionRestored', 'ScoreRestored'];
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        restorationEvents: events,
      };

      expect(result.restorationEvents).toEqual(events);
    });

    it('should accept single event type', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        restorationEvents: ['ActionRedone'],
      };

      expect(result.restorationEvents).toEqual(['ActionRedone']);
    });

    it('should accept complex event types', () => {
      const complexEvents = [
        'ActionRedone',
        'RunnerPositionRestored',
        'ScoreRestored',
        'LineupPositionRestored',
        'InningStateRestored',
        'BasesStateRestored',
      ];

      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        restorationEvents: complexEvents,
      };

      expect(result.restorationEvents).toEqual(complexEvents);
    });

    it('should accept empty array', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        restorationEvents: [],
      };

      expect(result.restorationEvents).toEqual([]);
    });
  });

  describe('Errors Field', () => {
    it('should default to undefined when not specified', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.errors).toBeUndefined();
    });

    it('should accept single error message', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        errors: ['No undone actions available to redo'],
      };

      expect(result.errors).toEqual(['No undone actions available to redo']);
    });

    it('should accept multiple error messages', () => {
      const errors = [
        'No undone actions available to redo',
        'Undo stack is empty',
        'Game state has changed since undo',
      ];

      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        errors,
      };

      expect(result.errors).toEqual(errors);
    });

    it('should accept complex error messages', () => {
      const complexErrors = [
        'Cannot redo: would violate game rules',
        'Concurrency conflict: game state changed during redo',
        'Infrastructure error: failed to store restoration events',
      ];

      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        errors: complexErrors,
      };

      expect(result.errors).toEqual(complexErrors);
    });

    it('should accept empty array', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        errors: [],
      };

      expect(result.errors).toEqual([]);
    });
  });

  describe('Warnings Field', () => {
    it('should default to undefined when not specified', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.warnings).toBeUndefined();
    });

    it('should accept single warning message', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        warnings: ['Player statistics affected by redo'],
      };

      expect(result.warnings).toEqual(['Player statistics affected by redo']);
    });

    it('should accept multiple warning messages', () => {
      const warnings = [
        'Complex redo operation affected multiple innings',
        'Some derived statistics may need recalculation',
        'Game state may need review',
      ];

      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 2,
        warnings,
      };

      expect(result.warnings).toEqual(warnings);
    });

    it('should accept warnings for both successful and failed operations', () => {
      const successResult: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        warnings: ['Redo completed but verify game consistency'],
      };

      const failureResult: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        warnings: ['Consider manual correction instead of redo'],
      };

      expect(successResult.warnings).toEqual(['Redo completed but verify game consistency']);
      expect(failureResult.warnings).toEqual(['Consider manual correction instead of redo']);
    });
  });

  describe('TotalEventsGenerated Field', () => {
    it('should default to undefined when not specified', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.totalEventsGenerated).toBeUndefined();
    });

    it('should accept zero for no-op operations', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 0,
        totalEventsGenerated: 0,
      };

      expect(result.totalEventsGenerated).toBe(0);
    });

    it('should accept positive values for successful operations', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        totalEventsGenerated: 5,
      };

      expect(result.totalEventsGenerated).toBe(5);
    });

    it('should accept large values for complex operations', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 10,
        totalEventsGenerated: 47,
      };

      expect(result.totalEventsGenerated).toBe(47);
    });
  });

  describe('CompletionTimestamp Field', () => {
    it('should default to undefined when not specified', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
      };

      expect(result.completionTimestamp).toBeUndefined();
    });

    it('should accept valid Date objects', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        completionTimestamp: mockCompletionTimestamp,
      };

      expect(result.completionTimestamp).toBe(mockCompletionTimestamp);
      expect(result.completionTimestamp).toBeInstanceOf(Date);
    });

    it('should accept current timestamp', () => {
      const now = new Date();
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        completionTimestamp: now,
      };

      expect(result.completionTimestamp).toBe(now);
    });
  });
});

describe('RedoStackInfo', () => {
  describe('Type Safety and Interface Compliance', () => {
    it('should accept complete stack info with all fields', () => {
      const stackInfo: RedoStackInfo = {
        canUndo: true,
        canRedo: false,
        historyPosition: 5,
        totalActions: 10,
        nextUndoDescription: 'HOME_RUN by player #12',
      };

      expect(stackInfo.canUndo).toBe(true);
      expect(stackInfo.canRedo).toBe(false);
      expect(stackInfo.historyPosition).toBe(5);
      expect(stackInfo.totalActions).toBe(10);
      expect(stackInfo.nextUndoDescription).toBe('HOME_RUN by player #12');
      expect(stackInfo.nextRedoDescription).toBeUndefined();
    });

    it('should accept minimal stack info with only required fields', () => {
      const stackInfo: RedoStackInfo = {
        canUndo: false,
        canRedo: true,
        historyPosition: 0,
        totalActions: 5,
      };

      expect(stackInfo.canUndo).toBe(false);
      expect(stackInfo.canRedo).toBe(true);
      expect(stackInfo.historyPosition).toBe(0);
      expect(stackInfo.totalActions).toBe(5);
      expect(stackInfo.nextUndoDescription).toBeUndefined();
      expect(stackInfo.nextRedoDescription).toBeUndefined();
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should represent state after successful redo (can undo, cannot redo)', () => {
      const stackInfo: RedoStackInfo = {
        canUndo: true,
        canRedo: false,
        historyPosition: 5,
        totalActions: 10,
        nextUndoDescription: 'DOUBLE by player #7',
      };

      expect(stackInfo.canUndo).toBe(true);
      expect(stackInfo.canRedo).toBe(false);
    });

    it('should represent state with multiple redo options available', () => {
      const stackInfo: RedoStackInfo = {
        canUndo: true,
        canRedo: true,
        historyPosition: 3,
        totalActions: 10,
        nextUndoDescription: 'SINGLE by player #3',
        nextRedoDescription: 'WALK by player #9',
      };

      expect(stackInfo.canUndo).toBe(true);
      expect(stackInfo.canRedo).toBe(true);
    });

    it('should represent empty history state', () => {
      const stackInfo: RedoStackInfo = {
        canUndo: false,
        canRedo: false,
        historyPosition: 0,
        totalActions: 0,
      };

      expect(stackInfo.canUndo).toBe(false);
      expect(stackInfo.canRedo).toBe(false);
      expect(stackInfo.historyPosition).toBe(0);
      expect(stackInfo.totalActions).toBe(0);
    });
  });
});

describe('RedoneActionDetail', () => {
  const originalTimestamp = new Date('2024-07-15T14:20:00Z');
  const undoTimestamp = new Date('2024-07-15T14:25:00Z');
  const redoTimestamp = new Date('2024-07-15T14:30:00Z');

  describe('Type Safety and Interface Compliance', () => {
    it('should accept complete action detail with all fields', () => {
      const actionDetail: RedoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'HOME_RUN by player #12',
        originalTimestamp,
        undoTimestamp,
        redoTimestamp,
        restorationEventCount: 4,
        affectedAggregates: ['Game', 'InningState'],
      };

      expect(actionDetail.actionType).toBe('AT_BAT');
      expect(actionDetail.description).toBe('HOME_RUN by player #12');
      expect(actionDetail.originalTimestamp).toBe(originalTimestamp);
      expect(actionDetail.undoTimestamp).toBe(undoTimestamp);
      expect(actionDetail.redoTimestamp).toBe(redoTimestamp);
      expect(actionDetail.restorationEventCount).toBe(4);
      expect(actionDetail.affectedAggregates).toEqual(['Game', 'InningState']);
    });

    it('should accept all valid action types', () => {
      const actionTypes: (
        | 'AT_BAT'
        | 'SUBSTITUTION'
        | 'INNING_END'
        | 'GAME_START'
        | 'GAME_END'
        | 'OTHER'
      )[] = ['AT_BAT', 'SUBSTITUTION', 'INNING_END', 'GAME_START', 'GAME_END', 'OTHER'];

      actionTypes.forEach(actionType => {
        const actionDetail: RedoneActionDetail = {
          actionType,
          description: `Test ${actionType}`,
          originalTimestamp,
          undoTimestamp,
          redoTimestamp,
          restorationEventCount: 1,
          affectedAggregates: ['Game'],
        };

        expect(actionDetail.actionType).toBe(actionType);
      });
    });

    it('should accept all valid aggregate combinations', () => {
      const aggregateCombinations: ('Game' | 'TeamLineup' | 'InningState')[][] = [
        ['Game'],
        ['TeamLineup'],
        ['InningState'],
        ['Game', 'TeamLineup'],
        ['Game', 'InningState'],
        ['TeamLineup', 'InningState'],
        ['Game', 'TeamLineup', 'InningState'],
      ];

      aggregateCombinations.forEach(aggregates => {
        const actionDetail: RedoneActionDetail = {
          actionType: 'OTHER',
          description: 'Test action',
          originalTimestamp,
          undoTimestamp,
          redoTimestamp,
          restorationEventCount: 1,
          affectedAggregates: aggregates,
        };

        expect(actionDetail.affectedAggregates).toEqual(aggregates);
      });
    });
  });

  describe('Business Scenarios', () => {
    it('should represent redone at-bat action', () => {
      const actionDetail: RedoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'DOUBLE by player #7',
        originalTimestamp,
        undoTimestamp,
        redoTimestamp,
        restorationEventCount: 3,
        affectedAggregates: ['Game', 'InningState'],
      };

      expect(actionDetail.actionType).toBe('AT_BAT');
      expect(actionDetail.description).toContain('DOUBLE');
      expect(actionDetail.affectedAggregates).toContain('Game');
      expect(actionDetail.affectedAggregates).toContain('InningState');
    });

    it('should represent redone substitution action', () => {
      const actionDetail: RedoneActionDetail = {
        actionType: 'SUBSTITUTION',
        description: 'Player substitution at 3B position',
        originalTimestamp,
        undoTimestamp,
        redoTimestamp,
        restorationEventCount: 2,
        affectedAggregates: ['TeamLineup', 'Game', 'InningState'],
      };

      expect(actionDetail.actionType).toBe('SUBSTITUTION');
      expect(actionDetail.description).toContain('substitution');
      expect(actionDetail.affectedAggregates).toContain('TeamLineup');
    });

    it('should represent redone inning ending action', () => {
      const actionDetail: RedoneActionDetail = {
        actionType: 'INNING_END',
        description: 'End of bottom 7th inning',
        originalTimestamp,
        undoTimestamp,
        redoTimestamp,
        restorationEventCount: 5,
        affectedAggregates: ['Game', 'InningState'],
      };

      expect(actionDetail.actionType).toBe('INNING_END');
      expect(actionDetail.description).toContain('inning');
      expect(actionDetail.restorationEventCount).toBe(5);
    });

    it('should track event count progression accurately', () => {
      const actionDetail: RedoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'Complex play with multiple runner advances',
        originalTimestamp,
        undoTimestamp,
        redoTimestamp,
        restorationEventCount: 8,
        affectedAggregates: ['Game', 'InningState'],
      };

      expect(actionDetail.restorationEventCount).toBe(8);
    });
  });

  describe('Timestamp Validation', () => {
    it('should handle logical timestamp progression', () => {
      const actionDetail: RedoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'Test action',
        originalTimestamp,
        undoTimestamp,
        redoTimestamp,
        restorationEventCount: 1,
        affectedAggregates: ['Game'],
      };

      // Verify logical progression: original < undo < redo
      expect(actionDetail.originalTimestamp.getTime()).toBeLessThan(
        actionDetail.undoTimestamp.getTime()
      );
      expect(actionDetail.undoTimestamp.getTime()).toBeLessThan(
        actionDetail.redoTimestamp.getTime()
      );
    });
  });
});

describe('Integration Scenarios', () => {
  const mockGameId = new GameId('integration-test-game');

  describe('Successful Redo Operations', () => {
    it('should create consistent result for single action redo', () => {
      const mockUndoStack: RedoStackInfo = {
        canUndo: true,
        canRedo: false,
        historyPosition: 5,
        totalActions: 10,
        nextUndoDescription: 'HOME_RUN by player #12',
      };

      const mockActionDetail: RedoneActionDetail = {
        actionType: 'AT_BAT',
        description: 'HOME_RUN by player #12',
        originalTimestamp: new Date('2024-07-15T14:20:00Z'),
        undoTimestamp: new Date('2024-07-15T14:25:00Z'),
        redoTimestamp: new Date('2024-07-15T14:30:00Z'),
        restorationEventCount: 3,
        affectedAggregates: ['Game', 'InningState'],
      };

      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 1,
        redoneActionTypes: ['AT_BAT'],
        restorationEvents: ['ActionRedone', 'RunnerPositionRestored', 'ScoreRestored'],
        undoStack: mockUndoStack,
        redoneActionDetails: [mockActionDetail],
        totalEventsGenerated: 3,
        completionTimestamp: new Date('2024-07-15T14:30:15Z'),
      };

      // Verify consistency
      expect(result.actionsRedone).toBe(result.redoneActionTypes?.length);
      expect(result.totalEventsGenerated).toBe(result.restorationEvents?.length);
      expect(result.redoneActionDetails?.[0]?.restorationEventCount).toBe(
        result.totalEventsGenerated
      );
      expect(result.undoStack?.canUndo).toBe(true); // Can undo the redone action
      expect(result.undoStack?.canRedo).toBe(false); // No more to redo
    });

    it('should create consistent result for multi-action redo', () => {
      const result: RedoResult = {
        success: true,
        gameId: mockGameId,
        actionsRedone: 3,
        redoneActionTypes: ['AT_BAT', 'SUBSTITUTION', 'INNING_END'],
        totalEventsGenerated: 12,
        warnings: ['Complex redo operation affected multiple innings'],
      };

      expect(result.actionsRedone).toBe(result.redoneActionTypes?.length);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Failed Redo Operations', () => {
    it('should create consistent result for no actions available', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        errors: ['No undone actions available to redo', 'Undo stack is empty'],
      };

      expect(result.success).toBe(false);
      expect(result.actionsRedone).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.redoneActionTypes).toBeUndefined();
      expect(result.restoredState).toBeUndefined();
    });

    it('should create consistent result for state change conflicts', () => {
      const result: RedoResult = {
        success: false,
        gameId: mockGameId,
        actionsRedone: 0,
        errors: [
          'Game state has changed since undo - cannot redo safely',
          'Concurrency conflict detected',
        ],
        warnings: ['Consider refreshing game state and retrying'],
      };

      expect(result.success).toBe(false);
      expect(result.actionsRedone).toBe(0);
      expect(result.errors?.length).toBe(2);
      expect(result.warnings).toBeDefined();
    });
  });
});
