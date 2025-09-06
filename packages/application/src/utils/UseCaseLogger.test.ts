/**
 * @file UseCaseLogger.test.ts
 * Comprehensive tests for the UseCaseLogger utility class.
 */

/* eslint-disable @typescript-eslint/unbound-method*/

import { GameId } from '@twsoftball/domain';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Logger } from '../ports/out/Logger';

import { UseCaseLogger } from './UseCaseLogger';

describe('UseCaseLogger', () => {
  let mockLogger: Logger;
  let gameId: GameId;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
    } as Logger;

    gameId = GameId.generate();
  });

  describe('logOperationStart', () => {
    it('should log operation start with context and return start time', () => {
      // Arrange
      const context = {
        gameId: gameId.value,
        batterId: 'player-123',
        result: 'HOME_RUN',
      };

      // Act
      const startTime = UseCaseLogger.logOperationStart('recordAtBat', context, mockLogger);

      // Assert
      expect(typeof startTime).toBe('number');
      expect(startTime).toBeGreaterThan(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting recordAtBat operation',
        expect.objectContaining({
          operation: 'recordAtBat',
          startTime: expect.any(Number),
          gameId: gameId.value,
          batterId: 'player-123',
          result: 'HOME_RUN',
        })
      );
    });

    it('should handle empty context', () => {
      // Act
      const startTime = UseCaseLogger.logOperationStart('testOperation', {}, mockLogger);

      // Assert
      expect(startTime).toBeGreaterThan(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting testOperation operation',
        expect.objectContaining({
          operation: 'testOperation',
          startTime: expect.any(Number),
        })
      );
    });
  });

  describe('logOperationSuccess', () => {
    it('should log successful operation with duration and success data', () => {
      // Arrange
      const startTime = Date.now() - 100; // 100ms ago
      const context = {
        gameId: gameId.value,
        batterId: 'player-123',
      };
      const successData = {
        newScore: 5,
        inningEnded: false,
      };

      // Act
      UseCaseLogger.logOperationSuccess('recordAtBat', context, startTime, mockLogger, successData);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'recordAtBat completed successfully',
        expect.objectContaining({
          operation: 'recordAtBat',
          duration: expect.any(Number),
          success: true,
          gameId: gameId.value,
          batterId: 'player-123',
          newScore: 5,
          inningEnded: false,
        })
      );

      // Should also log performance metrics
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Operation performance metrics',
        expect.objectContaining({
          type: 'performance-metrics',
          operation: 'recordAtBat',
          duration: expect.any(Number),
          success: true,
        })
      );
    });

    it('should handle success without additional data', () => {
      // Arrange
      const startTime = Date.now() - 50;
      const context = { gameId: gameId.value };

      // Act
      UseCaseLogger.logOperationSuccess('testOperation', context, startTime, mockLogger);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'testOperation completed successfully',
        expect.objectContaining({
          operation: 'testOperation',
          duration: expect.any(Number),
          success: true,
          gameId: gameId.value,
        })
      );
    });
  });

  describe('logOperationError', () => {
    it('should log operation error with full error details and context', () => {
      // Arrange
      const error = new Error('Test error occurred');
      error.stack = 'Test stack trace';
      const startTime = Date.now() - 150;
      const context = {
        gameId: gameId.value,
        batterId: 'player-123',
        attemptedResult: 'HOME_RUN',
      };
      const errorData = {
        validationErrors: ['Invalid batting order'],
      };

      // Act
      UseCaseLogger.logOperationError(
        'recordAtBat',
        error,
        context,
        mockLogger,
        startTime,
        errorData
      );

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'recordAtBat failed',
        error,
        expect.objectContaining({
          operation: 'recordAtBat',
          duration: expect.any(Number),
          success: false,
          error: {
            name: 'Error',
            message: 'Test error occurred',
            stack: 'Test stack trace',
          },
          gameId: gameId.value,
          batterId: 'player-123',
          attemptedResult: 'HOME_RUN',
          validationErrors: ['Invalid batting order'],
        })
      );

      // Should also log performance metrics for failures
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Operation performance metrics',
        expect.objectContaining({
          type: 'performance-metrics',
          operation: 'recordAtBat',
          duration: expect.any(Number),
          success: false,
        })
      );
    });

    it('should handle error without start time', () => {
      // Arrange
      const error = new Error('Test error');
      const context = { gameId: gameId.value };

      // Act
      UseCaseLogger.logOperationError('testOperation', error, context, mockLogger);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'testOperation failed',
        error,
        expect.objectContaining({
          operation: 'testOperation',
          duration: undefined,
          success: false,
          gameId: gameId.value,
        })
      );

      // Should not log performance metrics without start time
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        'Operation performance metrics',
        expect.any(Object)
      );
    });

    it('should handle error without additional error data', () => {
      // Arrange
      const error = new Error('Simple error');
      const context = { gameId: gameId.value };
      const startTime = Date.now() - 75;

      // Act
      UseCaseLogger.logOperationError('testOperation', error, context, mockLogger, startTime);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'testOperation failed',
        error,
        expect.objectContaining({
          operation: 'testOperation',
          duration: expect.any(Number),
          success: false,
          error: {
            name: 'Error',
            message: 'Simple error',
            stack: expect.any(String),
          },
        })
      );
    });
  });

  describe('logDebugTrace', () => {
    it('should log debug trace with step and context', () => {
      // Arrange
      const context = {
        gameId: gameId.value,
        validationResult: 'passed',
        batterPosition: 3,
      };

      // Act
      UseCaseLogger.logDebugTrace('recordAtBat', 'lineup-validation-complete', context, mockLogger);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'recordAtBat: lineup-validation-complete',
        expect.objectContaining({
          operation: 'recordAtBat',
          step: 'lineup-validation-complete',
          timestamp: expect.any(Number),
          gameId: gameId.value,
          validationResult: 'passed',
          batterPosition: 3,
        })
      );
    });

    it('should handle empty debug context', () => {
      // Act
      UseCaseLogger.logDebugTrace('testOperation', 'test-step', {}, mockLogger);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'testOperation: test-step',
        expect.objectContaining({
          operation: 'testOperation',
          step: 'test-step',
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('logOperationWarning', () => {
    it('should log operation warning with message and context', () => {
      // Arrange
      const message = 'Player jersey number conflict resolved automatically';
      const context = {
        gameId: gameId.value,
        conflictedJersey: 15,
        reassignedTo: 25,
      };

      // Act
      UseCaseLogger.logOperationWarning('startNewGame', message, context, mockLogger);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'startNewGame: Player jersey number conflict resolved automatically',
        expect.objectContaining({
          operation: 'startNewGame',
          warning: message,
          timestamp: expect.any(Number),
          gameId: gameId.value,
          conflictedJersey: 15,
          reassignedTo: 25,
        })
      );
    });

    it('should handle warning with minimal context', () => {
      // Arrange
      const message = 'Minor validation issue';
      const context = { gameId: gameId.value };

      // Act
      UseCaseLogger.logOperationWarning('testOperation', message, context, mockLogger);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'testOperation: Minor validation issue',
        expect.objectContaining({
          operation: 'testOperation',
          warning: message,
          timestamp: expect.any(Number),
          gameId: gameId.value,
        })
      );
    });
  });

  describe('createLogContext', () => {
    it('should create standardized log context', () => {
      // Act
      const context = UseCaseLogger.createLogContext(gameId, 'recordAtBat');

      // Assert
      expect(context).toEqual({
        gameId,
        operation: 'recordAtBat',
        gameIdValue: gameId.value,
        timestamp: expect.any(Number),
      });
    });

    it('should include additional context data', () => {
      // Arrange
      const additionalContext = {
        batterId: 'player-123',
        result: 'HOME_RUN',
      };

      // Act
      const context = UseCaseLogger.createLogContext(gameId, 'recordAtBat', additionalContext);

      // Assert
      expect(context).toEqual({
        gameId,
        operation: 'recordAtBat',
        gameIdValue: gameId.value,
        timestamp: expect.any(Number),
        batterId: 'player-123',
        result: 'HOME_RUN',
      });
    });
  });

  describe('logBatchOperationMetrics', () => {
    it('should log batch operation metrics with success rates', () => {
      // Arrange
      const context = {
        gameIds: ['game-1', 'game-2', 'game-3'],
        source: 'bulk-import',
      };

      // Act
      UseCaseLogger.logBatchOperationMetrics('importGames', 10, 8, 5000, context, mockLogger);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch importGames completed',
        expect.objectContaining({
          operation: 'batch-importGames',
          totalItems: 10,
          successCount: 8,
          failureCount: 2,
          successRate: 0.8,
          duration: 5000,
          averageItemDuration: 500,
          gameIds: ['game-1', 'game-2', 'game-3'],
          source: 'bulk-import',
        })
      );
    });

    it('should handle zero items batch operation', () => {
      // Act
      UseCaseLogger.logBatchOperationMetrics('emptyBatch', 0, 0, 100, {}, mockLogger);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch emptyBatch completed',
        expect.objectContaining({
          totalItems: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          averageItemDuration: 0,
        })
      );
    });

    it('should handle all successful batch operation', () => {
      // Act
      UseCaseLogger.logBatchOperationMetrics(
        'allSuccess',
        5,
        5,
        2500,
        { type: 'perfect' },
        mockLogger
      );

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch allSuccess completed',
        expect.objectContaining({
          totalItems: 5,
          successCount: 5,
          failureCount: 0,
          successRate: 1.0,
          duration: 2500,
          averageItemDuration: 500,
          type: 'perfect',
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with complete operation lifecycle logging', () => {
      // Arrange
      const context = { gameId: gameId.value, batterId: 'player-123' };

      // Act - Complete operation lifecycle
      const startTime = UseCaseLogger.logOperationStart('recordAtBat', context, mockLogger);

      UseCaseLogger.logDebugTrace('recordAtBat', 'validation-complete', context, mockLogger);
      UseCaseLogger.logDebugTrace('recordAtBat', 'domain-update-complete', context, mockLogger);

      UseCaseLogger.logOperationSuccess('recordAtBat', context, startTime, mockLogger, {
        newScore: 3,
      });

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledTimes(4); // start + 2 traces + metrics
      expect(mockLogger.info).toHaveBeenCalledTimes(1); // success
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle operation lifecycle with warning and error', () => {
      // Arrange
      const context = { gameId: gameId.value, batterId: 'player-123' };
      const error = new Error('Operation failed');

      // Act - Operation with warning and error
      const startTime = UseCaseLogger.logOperationStart('recordAtBat', context, mockLogger);

      UseCaseLogger.logOperationWarning(
        'recordAtBat',
        'Minor validation issue detected',
        context,
        mockLogger
      );

      UseCaseLogger.logOperationError('recordAtBat', error, context, mockLogger, startTime);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledTimes(2); // start + metrics
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });
});
