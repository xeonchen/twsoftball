/**
 * @file UndoLastAction.test.ts
 * Comprehensive test suite for UndoLastAction use case.
 *
 * @remarks
 * This test suite follows TDD principles and focuses on testing the use case logic
 * for undoing the last action(s) performed in a softball game. Tests verify proper
 * event sourcing rollback, compensating event generation, multi-aggregate coordination,
 * and comprehensive error handling.
 *
 * Test coverage includes:
 * - Single action undo scenarios (at-bats, substitutions, inning endings)
 * - Multi-action undo operations with proper sequencing
 * - Complex cascade undo scenarios affecting multiple aggregates
 * - Event sourcing rollback patterns and compensating events
 * - Undo/redo stack management and state validation
 * - Error conditions (no actions, invalid states, concurrency conflicts)
 * - Infrastructure failure handling and recovery
 * - Comprehensive logging and audit trail verification
 */

import {
  GameId,
  PlayerId,
  Game,
  GameStatus,
  DomainError,
  DomainEvent,
  // AtBatCompleted,
  // PlayerSubstitutedIntoGame,
  // HalfInningEnded,
  // GameStarted,
  // GameCompleted,
  AtBatResultType,
} from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UndoCommand } from '../dtos/UndoCommand';
// import { UndoResult } from '../dtos/UndoResult';
import { EventStore } from '../ports/out/EventStore';
import { GameRepository } from '../ports/out/GameRepository';
import { Logger } from '../ports/out/Logger';
import {
  createAtBatCompletedEvent,
  createSubstitutionEvent,
  createInningEndEvent,
} from '../test-factories';

import { UndoLastAction } from './UndoLastAction';

describe('UndoLastAction Use Case', () => {
  // Test dependencies (mocks)
  let mockGameRepository: GameRepository;
  let mockEventStore: EventStore;
  let mockLogger: Logger;

  // Use case under test
  let undoLastAction: UndoLastAction;

  // Test data
  const gameId = GameId.generate();
  const batterId = PlayerId.generate();
  const substitutedPlayerId = PlayerId.generate();
  const substitutionPlayerId = PlayerId.generate();
  // Use recent timestamps to avoid validation issues
  const now = new Date();
  const timestamp = new Date(now.getTime() - 60 * 1000); // 1 minute ago

  // Common test setup helpers
  const createTestGame = (status: GameStatus = GameStatus.IN_PROGRESS): Game => {
    const game = Game.createNew(gameId, 'Home Dragons', 'Away Tigers');
    if (status === GameStatus.IN_PROGRESS) {
      game.startGame();
    }
    return game;
  };

  // Use factory functions for creating test events

  // Mock functions for GameRepository
  const mockFindById = vi.fn();
  const mockSave = vi.fn();
  const mockFindByStatus = vi.fn();
  const mockFindByDateRange = vi.fn();
  const mockExists = vi.fn();
  const mockDelete = vi.fn();

  // Mock functions for EventStore
  const mockAppend = vi.fn();
  const mockGetEvents = vi.fn();
  const mockGetGameEvents = vi.fn();
  const mockGetAllEvents = vi.fn();
  const mockGetEventsByType = vi.fn();
  const mockGetEventsByGameId = vi.fn();

  // Mock functions for Logger
  const mockDebug = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();
  const mockLog = vi.fn();
  const mockIsLevelEnabled = vi.fn().mockReturnValue(true);

  const createMockPorts = (): {
    gameRepository: GameRepository;
    eventStore: EventStore;
    logger: Logger;
  } => {
    const gameRepository = {
      findById: mockFindById,
      save: mockSave,
      findByStatus: mockFindByStatus,
      findByDateRange: mockFindByDateRange,
      exists: mockExists,
      delete: mockDelete,
    } as GameRepository;

    const eventStore = {
      append: mockAppend,
      getEvents: mockGetEvents,
      getGameEvents: mockGetGameEvents,
      getAllEvents: mockGetAllEvents,
      getEventsByType: mockGetEventsByType,
      getEventsByGameId: mockGetEventsByGameId,
    } as EventStore;

    const logger = {
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      log: mockLog,
      isLevelEnabled: mockIsLevelEnabled,
    } as Logger;

    return { gameRepository, eventStore, logger };
  };

  beforeEach(() => {
    const mocks = createMockPorts();
    mockGameRepository = mocks.gameRepository;
    mockEventStore = mocks.eventStore;
    mockLogger = mocks.logger;

    undoLastAction = new UndoLastAction(mockGameRepository, mockEventStore, mockLogger);

    // Setup default successful mock responses
    mockSave.mockResolvedValue(undefined);
    mockAppend.mockResolvedValue(undefined);
  });

  describe('Successful Single Action Undo Scenarios', () => {
    it('should undo last at-bat with proper state restoration', async () => {
      // Arrange
      const game = createTestGame();
      const lastAtBatEvent = createAtBatCompletedEvent(gameId, batterId, {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        result: AtBatResultType.SINGLE,
        outs: 2,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([lastAtBatEvent]);

      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'Scorer recorded single instead of double',
        timestamp,
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actionsUndone).toBe(1);
      expect(result.undoneActionTypes).toEqual(['AT_BAT']);
      expect(result.restoredState).toBeDefined();
      expect(result.totalEventsGenerated).toBeGreaterThan(0);
      expect(result.completionTimestamp).toBeInstanceOf(Date);

      // Verify compensating events were generated
      expect(mockAppend).toHaveBeenCalled();
      const appendCall = mockAppend.mock.calls[0];
      expect(appendCall?.[2]).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'ActionUndone' })])
      );

      // Verify logging
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Successfully undone 1 action(s)'),
        expect.objectContaining({ gameId: gameId.value })
      );
    });

    it('should undo substitution with lineup restoration', async () => {
      // Arrange
      const game = createTestGame();
      const lastSubstitutionEvent = createSubstitutionEvent(
        gameId,
        substitutionPlayerId,
        substitutedPlayerId,
        {
          timestamp: new Date(now.getTime() - 10 * 60 * 1000),
          position: 'CENTER_FIELD',
        }
      );

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([lastSubstitutionEvent]);

      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        notes: 'Wrong player substituted - manager wants #15 not #51',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.undoneActionTypes).toEqual(['SUBSTITUTION']);
      expect(result.undoneActionDetails).toHaveLength(1);
      expect(result.undoneActionDetails?.[0]?.actionType).toBe('SUBSTITUTION');
      expect(result.undoneActionDetails?.[0]?.affectedAggregates).toContain('TeamLineup');
      expect(result.compensatingEvents).toContain('LineupPositionRestored');

      // Verify proper logging
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Undoing SUBSTITUTION action'),
        expect.any(Object)
      );
    });

    it('should undo inning ending with complex state restoration', async () => {
      // Arrange
      const game = createTestGame();
      const lastInningEndEvent = createInningEndEvent(gameId, {
        timestamp: new Date(now.getTime() - 15 * 60 * 1000),
        inning: 5,
        isTopHalf: true,
        finalOuts: 3,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([lastInningEndEvent]);

      const command: UndoCommand = {
        gameId,
        actionLimit: 1,
        confirmDangerous: true,
        notes: 'Umpire ruled foul ball, not third out - continuing inning',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.undoneActionTypes).toEqual(['INNING_END']);
      expect(result.compensatingEvents).toEqual(
        expect.arrayContaining([
          'ActionUndone',
          'InningStateReverted',
          'BasesStateRestored',
          'CurrentBatterReverted',
          'HalfInningReverted',
        ])
      );
      expect(result.warnings).toContain('Complex undo operation affected multiple innings');

      // Verify dangerous operation handling
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('Dangerous undo operation confirmed'),
        expect.any(Object)
      );
    });

    it('should handle default actionLimit of 1', async () => {
      // Arrange
      const game = createTestGame();
      const lastEvent = createAtBatCompletedEvent(gameId, batterId, {
        timestamp: new Date(now.getTime() - 20 * 60 * 1000),
        result: AtBatResultType.SINGLE,
        outs: 2,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([lastEvent]);

      const command: UndoCommand = {
        gameId,
        // No actionLimit specified - should default to 1
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actionsUndone).toBe(1);
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringContaining('Using default actionLimit: 1'),
        expect.any(Object)
      );
    });
  });

  describe('Successful Multi-Action Undo Scenarios', () => {
    it('should undo multiple at-bats in sequence', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 2 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }), // Most recent
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 4 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }), // Second most recent
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 6 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }), // Third most recent
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        actionLimit: 3,
        notes: 'Correcting sequence of scoring errors from last three plays',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actionsUndone).toBe(3);
      expect(result.undoneActionTypes).toEqual(['AT_BAT', 'AT_BAT', 'AT_BAT']);
      expect(result.undoneActionDetails).toHaveLength(3);
      expect(result.totalEventsGenerated).toBeGreaterThanOrEqual(6); // At least 2 events per undo

      // Verify events were processed in reverse chronological order
      const actionDetails = result.undoneActionDetails;
      expect(actionDetails).toBeDefined();
      expect(new Date(actionDetails?.[0]?.originalTimestamp || 0).getTime()).toBeGreaterThan(
        new Date(actionDetails?.[1]?.originalTimestamp || 0).getTime()
      );
      expect(new Date(actionDetails?.[1]?.originalTimestamp || 0).getTime()).toBeGreaterThan(
        new Date(actionDetails?.[2]?.originalTimestamp || 0).getTime()
      );
    });

    it('should handle mixed action types in multi-undo', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createSubstitutionEvent(gameId, substitutionPlayerId, substitutedPlayerId, {
          timestamp: new Date(now.getTime() - 60 * 1000),
          position: 'CENTER_FIELD',
        }),
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 2 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        actionLimit: 2,
        notes: 'Undoing substitution and previous at-bat',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actionsUndone).toBe(2);
      expect(result.undoneActionTypes).toEqual(['SUBSTITUTION', 'AT_BAT']);
      expect(result.compensatingEvents).toEqual(
        expect.arrayContaining([
          'ActionUndone',
          'LineupPositionRestored',
          'ActionUndone',
          'RunnerPositionReverted',
        ])
      );

      // Verify different aggregates were affected
      const substitutionDetail = result.undoneActionDetails!.find(
        d => d.actionType === 'SUBSTITUTION'
      );
      const atBatDetail = result.undoneActionDetails!.find(d => d.actionType === 'AT_BAT');
      expect(substitutionDetail?.affectedAggregates).toContain('TeamLineup');
      expect(atBatDetail?.affectedAggregates).toContain('InningState');
    });

    it('should require confirmation for dangerous multi-action undo', async () => {
      // Arrange
      const game = createTestGame();
      const events = Array.from({ length: 5 }, (_, i) =>
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - (i + 1) * 2 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        })
      );

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        actionLimit: 5,
        confirmDangerous: true,
        notes: 'Mass correction needed due to scoring errors',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actionsUndone).toBe(5);
      expect(result.warnings).toContain(
        'Large number of actions undone - verify game state carefully'
      );

      // Verify dangerous operation was logged
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('Dangerous multi-action undo confirmed'),
        expect.objectContaining({ actionLimit: 5 })
      );
    });
  });

  describe('Undo Stack Management', () => {
    it('should return correct undo stack information after successful undo', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
        createSubstitutionEvent(gameId, substitutionPlayerId, substitutedPlayerId, {
          timestamp: new Date(now.getTime() - 10 * 60 * 1000),
          position: 'CENTER_FIELD',
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = { gameId, actionLimit: 1 };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.undoStack).toEqual({
        canUndo: true, // Still one more action available
        canRedo: true, // Action was just undone
        historyPosition: 1, // One action available for undo
        totalActions: 2, // Total actions in history
        nextUndoDescription: expect.stringContaining('SUBSTITUTION'),
        nextRedoDescription: expect.stringContaining('AT_BAT'),
      });
    });

    it('should indicate no more undo available when last action undone', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = { gameId, actionLimit: 1 };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.undoStack!.canUndo).toBe(false);
      expect(result.undoStack!.canRedo).toBe(true);
      expect(result.undoStack!.historyPosition).toBe(0);
      expect(result.undoStack!.nextUndoDescription).toBeUndefined();
    });
  });

  describe('Error Handling - No Actions Available', () => {
    it('should fail when game has no actions to undo', async () => {
      // Arrange
      const game = createTestGame();

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([]); // No events

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.actionsUndone).toBe(0);
      expect(result.errors).toContain('No actions available to undo');
      expect(result.restoredState).toBeUndefined();

      // Verify logging
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('No actions available to undo'),
        expect.any(Object)
      );
    });

    it('should fail when game is not started', async () => {
      // Arrange
      const game = createTestGame(GameStatus.NOT_STARTED);

      mockFindById.mockResolvedValue(game);

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining(['No actions available to undo', 'Game is in NOT_STARTED state'])
      );
    });

    it('should fail when game is completed', async () => {
      // Arrange
      const game = createTestGame();
      // Simulate completed game
      Object.defineProperty(game, 'status', { value: GameStatus.COMPLETED, writable: false });

      mockFindById.mockResolvedValue(game);

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Game is not in a valid state for undo operations');
      expect(result.warnings).toContain('Undo operations are disabled for completed games');
    });
  });

  describe('Error Handling - Dangerous Operations', () => {
    it('should fail dangerous operation without confirmation', async () => {
      // Arrange
      const game = createTestGame();
      const events = Array.from({ length: 10 }, (_, i) =>
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - (i + 1) * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        })
      );

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        actionLimit: 10,
        // Missing confirmDangerous: true
        notes: 'Attempting dangerous undo',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'confirmDangerous must be true for actionLimit greater than 3'
      );
    });

    it('should handle actionLimit exceeding available actions', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 10 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ]; // Only 2 events available

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        actionLimit: 5, // Requesting more than available
        confirmDangerous: true, // Required for actionLimit > 3
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true); // Should succeed but only undo available actions
      expect(result.actionsUndone).toBe(2); // Only what was available
      expect(result.warnings).toContain('Requested to undo 5 actions, but only 2 were available');
    });
  });

  describe('Error Handling - Game and Infrastructure', () => {
    it('should fail when game is not found', async () => {
      // Arrange
      mockFindById.mockResolvedValue(null);

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Game not found: ${gameId.value}`);

      // Verify error logging - check the main error log call
      expect(mockError).toHaveBeenCalledWith(
        'Undo operation failed',
        expect.any(Error),
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'undoLastAction',
        })
      );
    });

    it('should handle repository save failures', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);
      mockSave.mockRejectedValue(new Error('Database connection failed'));

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Infrastructure error: failed to save game state',
          'Database connection failed',
        ])
      );
    });

    it('should handle event store failures', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);
      mockAppend.mockRejectedValue(new Error('Event store connection timeout after 5000ms'));

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Infrastructure error: failed to store compensating events',
          'Event store connection timeout after 5000ms',
        ])
      );
    });

    it('should handle domain rule violations during undo', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createSubstitutionEvent(gameId, substitutionPlayerId, substitutedPlayerId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          position: 'CENTER_FIELD',
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      // Mock domain error during undo process
      mockSave.mockRejectedValue(
        new DomainError('Undoing this substitution would exceed re-entry limit')
      );

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Cannot undo: would violate game rules',
          'Undoing this substitution would exceed re-entry limit',
        ])
      );
      expect(result.warnings).toContain('Consider manual correction instead of undo');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle actionLimit of 0', async () => {
      // Arrange
      const game = createTestGame();

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([]);

      const command: UndoCommand = {
        gameId,
        actionLimit: 0,
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true); // No-op operation succeeds
      expect(result.actionsUndone).toBe(0);
      expect(result.totalEventsGenerated).toBe(0);
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('No-op undo operation'),
        expect.any(Object)
      );
    });

    it('should handle concurrent modification during undo', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      // Simulate optimistic locking failure
      const concurrencyError = new Error('Expected version 15 but found version 16');
      concurrencyError.name = 'ConcurrencyError';
      mockAppend.mockRejectedValue(concurrencyError);

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Concurrency conflict: game state changed during undo',
          'Expected version 15 but found version 16',
        ])
      );
    });

    it('should properly handle timestamps in undo operations', async () => {
      // Arrange
      const game = createTestGame();
      const originalTimestamp = new Date(now.getTime() - 10 * 60 * 1000);
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: originalTimestamp,
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const undoTimestamp = new Date(now.getTime() - 60 * 1000);
      const command: UndoCommand = {
        gameId,
        timestamp: undoTimestamp,
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.completionTimestamp).toEqual(undoTimestamp);
      expect(result.undoneActionDetails?.[0]?.originalTimestamp).toEqual(originalTimestamp);
      expect(result.undoneActionDetails?.[0]?.undoTimestamp).toEqual(undoTimestamp);
    });

    it('should generate system timestamp when not provided', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 10 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        // No timestamp provided
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.completionTimestamp).toBeInstanceOf(Date);
      expect(result.completionTimestamp!.getTime()).toBeCloseTo(Date.now(), -2); // Within ~100ms
    });
  });

  describe('Logging and Audit Trail', () => {
    it('should log comprehensive audit information for successful undo', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        notes: 'Test undo operation',
        timestamp,
      };

      // Act
      await undoLastAction.execute(command);

      // Assert
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Undo operation started'),
        expect.objectContaining({
          gameId: gameId.value,
          actionLimit: 1,
          notes: 'Test undo operation',
        })
      );

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Successfully undone 1 action(s)'),
        expect.objectContaining({
          gameId: gameId.value,
          actionsUndone: 1,
          eventsGenerated: expect.any(Number),
        })
      );
    });

    it('should log detailed error information for failed undo', async () => {
      // Arrange
      mockFindById.mockResolvedValue(null);

      const command: UndoCommand = { gameId };

      // Act
      await undoLastAction.execute(command);

      // Assert - check the main error log call
      expect(mockError).toHaveBeenCalledWith(
        'Undo operation failed',
        expect.any(Error),
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'undoLastAction',
          duration: expect.any(Number),
        })
      );
    });

    it('should log warnings for dangerous operations', async () => {
      // Arrange
      const game = createTestGame();
      const events = Array.from({ length: 5 }, (_, i) =>
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - (i + 1) * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        })
      );

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = {
        gameId,
        actionLimit: 5,
        confirmDangerous: true,
      };

      // Act
      await undoLastAction.execute(command);

      // Assert
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('Dangerous multi-action undo confirmed'),
        expect.objectContaining({ actionLimit: 5 })
      );
    });

    it('should include performance metrics in logging', async () => {
      // Arrange
      const game = createTestGame();
      const events = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(events);

      const command: UndoCommand = { gameId };

      // Act
      await undoLastAction.execute(command);

      // Assert
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Undo operation performance'),
        expect.objectContaining({
          gameId: gameId.value,
          duration: expect.any(Number),
          eventsProcessed: 1,
          compensatingEventsGenerated: expect.any(Number),
        })
      );
    });

    it('should handle event with eventType property instead of type', async () => {
      // Test coverage for line 659 - event type extraction
      const game = createTestGame();
      const customEvent = {
        ...createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
        type: 'AtBatCompleted',
        eventType: 'AtBatCompleted',
      } as DomainEvent;

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([customEvent]);

      const command: UndoCommand = { gameId };

      // Act
      await undoLastAction.execute(command);

      // Assert - Should handle eventType property correctly
      expect(mockAppend).toHaveBeenCalled();
    });

    it('should cover PlayerSubstitutedIntoGame event compensation', async () => {
      // Test coverage for line 667 - substitution event compensation
      const game = createTestGame();
      const substitutionEvent = {
        ...createSubstitutionEvent(gameId, substitutionPlayerId, substitutedPlayerId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          position: 'CENTER_FIELD',
        }),
        type: 'PlayerSubstitutedIntoGame',
      };

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([substitutionEvent]);

      const command: UndoCommand = { gameId };

      // Act
      await undoLastAction.execute(command);

      // Assert - Should create lineup position restored event
      expect(mockAppend).toHaveBeenCalled();
    });

    it('should handle undo stack info with error handling', async () => {
      // Test coverage for lines 846-854 - error handling in undo stack info
      const game = createTestGame();

      mockFindById.mockResolvedValue(game);
      // Mock getGameEvents to throw an error to trigger catch block
      mockGetGameEvents.mockRejectedValue(new Error('Event loading failed'));

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert - Should still return a result despite the error
      expect(result).toBeDefined();
      expect(result.success).toBe(false); // Should fail due to error
    });
  });

  describe('Edge Cases for Coverage', () => {
    it('should handle GameCompleted event type in action mapping', async () => {
      // Test line 822: 'GameCompleted' case in mapEventTypeToActionType
      const gameCompletedEvent = {
        eventId: `game-completed-${Date.now()}`,
        timestamp: new Date(),
        version: 1,
        type: 'GameCompleted',
        gameId: gameId,
        eventData: {},
      } as DomainEvent;

      const game = createTestGame();
      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([gameCompletedEvent]);

      const command: UndoCommand = {
        gameId,
        confirmDangerous: true, // GameCompleted is a dangerous event type
      };
      const result = await undoLastAction.execute(command);

      expect(result.success).toBe(true);
      if (result.undoStack?.nextUndoDescription) {
        expect(result.undoStack.nextUndoDescription).toContain('GAME_END');
      }
    });

    it('should handle unknown event type in action mapping', async () => {
      // Test line 824: default case in mapEventTypeToActionType
      const unknownEvent = {
        eventId: `unknown-event-${Date.now()}`,
        timestamp: new Date(),
        version: 1,
        type: 'UnknownCustomEvent',
        gameId: gameId,
        eventData: {},
      } as DomainEvent;

      const game = createTestGame();
      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([unknownEvent]);

      const command: UndoCommand = { gameId };
      const result = await undoLastAction.execute(command);

      expect(result.success).toBe(true);
      if (result.undoStack?.nextUndoDescription) {
        expect(result.undoStack.nextUndoDescription).toContain('OTHER');
      }
    });

    it('should handle event store failure in undo stack info building', async () => {
      // Test lines 848-854: catch block in buildUndoStackInfo
      const game = createTestGame();
      mockFindById.mockResolvedValue(game);
      // Make getGameEvents fail to force error in buildUndoStackInfo when no sortedEvents are provided
      mockGetGameEvents.mockRejectedValue(new Error('Event store failure'));

      const command: UndoCommand = { gameId, actionLimit: 0 }; // Use actionLimit 0 to trigger the path without sorted events
      const result = await undoLastAction.execute(command);

      expect(result.success).toBe(true);
      // Should return safe defaults despite event store failure
      expect(result.undoStack).toBeDefined();
      expect(result.undoStack!.canUndo).toBe(false);
      expect(result.undoStack!.canRedo).toBe(false); // No actions undone, so can't redo
      expect(result.undoStack!.historyPosition).toBe(0);
      expect(result.undoStack!.totalActions).toBe(0);
    });

    it('should cover event compensation edge cases for applyAggregateUpdates', async () => {
      // Test coverage for lines 692-702: edge case in generateEventCompensation
      const game = createTestGame();
      const testEvent = createAtBatCompletedEvent(gameId, batterId, {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        result: AtBatResultType.SINGLE,
        outs: 2,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([testEvent]);

      const command: UndoCommand = { gameId, notes: 'Test edge case compensation' };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert - Should handle event compensation creation successfully
      expect(result.success).toBe(true);
      expect(result.actionsUndone).toBe(1);
    });

    it('should handle all optional properties in success result creation', async () => {
      // Test coverage for lines 962-968: optional property assignments in createSuccessResult
      const game = createTestGame();
      const testEvents = [
        createAtBatCompletedEvent(gameId, batterId, {
          timestamp: new Date(now.getTime() - 5 * 60 * 1000),
          result: AtBatResultType.SINGLE,
          outs: 2,
        }),
        createSubstitutionEvent(gameId, substitutionPlayerId, substitutedPlayerId, {
          timestamp: new Date(now.getTime() - 4 * 60 * 1000),
          position: 'CENTER_FIELD',
        }),
      ];

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue(testEvents);

      const command: UndoCommand = {
        gameId,
        actionLimit: 2,
        notes: 'Test all optional properties',
      };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert - Should include all optional properties in success result
      expect(result.success).toBe(true);
      expect(result.restoredState).toBeDefined();
      expect(result.compensatingEvents).toBeDefined();
      expect(result.undoStack).toBeDefined();
      expect(result.undoneActionDetails).toBeDefined();
      expect(result.undoneActionDetails?.length).toBe(2);
    });

    it('should handle database connection error in error handling', async () => {
      // Test coverage for specific database error handling paths
      const game = createTestGame();
      const testEvent = createAtBatCompletedEvent(gameId, batterId, {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        result: AtBatResultType.SINGLE,
        outs: 2,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([testEvent]);

      // Mock database connection failure
      mockSave.mockRejectedValue(new Error('Database connection failed'));

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Infrastructure error: failed to save game state',
          'Database connection failed',
        ])
      );
    });

    it('should handle database error in persistence layer', async () => {
      // Test coverage for Database error handling path
      const game = createTestGame();
      const testEvent = createAtBatCompletedEvent(gameId, batterId, {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        result: AtBatResultType.SINGLE,
        outs: 2,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([testEvent]);

      // Mock generic Database error
      mockSave.mockRejectedValue(new Error('Database timeout during save operation'));

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Infrastructure error: failed to save game state',
          'Database timeout during save operation',
        ])
      );
    });

    it('should handle connection error in event store', async () => {
      // Test coverage for connection error in event store
      const game = createTestGame();
      const testEvent = createAtBatCompletedEvent(gameId, batterId, {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        result: AtBatResultType.SINGLE,
        outs: 2,
      });

      mockFindById.mockResolvedValue(game);
      mockGetGameEvents.mockResolvedValue([testEvent]);

      // Mock connection error in append operation
      mockAppend.mockRejectedValue(new Error('Event store connection timeout'));

      const command: UndoCommand = { gameId };

      // Act
      const result = await undoLastAction.execute(command);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Infrastructure error: failed to store compensating events',
          'Event store connection timeout',
        ])
      );
    });
  });
});
