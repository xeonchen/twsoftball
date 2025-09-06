/**
 * @file UseCaseErrorHandler.test.ts
 * Comprehensive tests for the UseCaseErrorHandler utility class.
 */

/* eslint-disable @typescript-eslint/unbound-method*/

import { GameId, Game, DomainError } from '@twsoftball/domain';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GameRepository } from '../ports/out/GameRepository';
import { Logger } from '../ports/out/Logger';

import { UseCaseErrorHandler, ErrorResultBuilder } from './UseCaseErrorHandler';

// Mock interfaces for testing
interface TestResult {
  success: boolean;
  gameId: GameId;
  errors: string[];
  gameContext?: Game | null;
}

describe('UseCaseErrorHandler', () => {
  let mockGameRepository: GameRepository;
  let mockLogger: Logger;
  let gameId: GameId;
  let mockGame: Game;
  let resultBuilder: ErrorResultBuilder<TestResult>;

  beforeEach(() => {
    // Mock dependencies
    mockGameRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      exists: vi.fn(),
      findByStatus: vi.fn(),
      findByDateRange: vi.fn(),
      delete: vi.fn(),
    } as GameRepository;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
    } as Logger;

    // Test data
    gameId = GameId.generate();
    mockGame = {} as Game; // Mock game object

    // Result builder for testing
    resultBuilder = (game: Game | null, errors: string[]): TestResult => ({
      success: false,
      gameId,
      errors,
      gameContext: game,
    });
  });

  describe('handleError', () => {
    describe('Domain Error Handling', () => {
      it('should preserve domain error messages as user-friendly', async () => {
        // Arrange
        const domainError = new DomainError('Invalid batting order');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          domainError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.errors).toEqual(['Invalid batting order']);
        expect(result.gameContext).toBe(mockGame);
      });

      it('should load game context for domain errors', async () => {
        // Arrange
        const domainError = new DomainError('Game already ended');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        await UseCaseErrorHandler.handleError(
          domainError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      });
    });

    describe('Infrastructure Error Handling', () => {
      it('should categorize database save errors', async () => {
        // Arrange
        const dbError = new Error('Database connection failed during save');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          dbError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.errors).toEqual([
          'Failed to save game state: Database connection failed during save',
        ]);
      });

      it('should categorize event store errors', async () => {
        // Arrange
        const eventError = new Error('Event store is unavailable');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          eventError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.errors).toEqual(['Failed to store events: Event store is unavailable']);
      });

      it('should categorize database load errors', async () => {
        // Arrange
        const loadError = new Error('Failed to load game from database');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          loadError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.errors).toEqual([
          'Failed to load game data: Failed to load game from database',
        ]);
      });

      it('should handle generic Error objects', async () => {
        // Arrange
        const genericError = new Error('Something unexpected happened');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          genericError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.errors).toEqual([
          'An unexpected error occurred: Something unexpected happened',
        ]);
      });
    });

    describe('Unknown Error Handling', () => {
      it('should handle non-Error objects', async () => {
        // Arrange
        const unknownError = 'string error';
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          unknownError,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.errors).toEqual(['An unexpected error occurred during operation']);
      });

      it('should handle null/undefined errors', async () => {
        // Arrange
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          null,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.errors).toEqual(['An unexpected error occurred during operation']);
      });
    });

    describe('Game Context Loading', () => {
      it('should provide game context when loading succeeds', async () => {
        // Arrange
        const error = new Error('Test error');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          error,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.gameContext).toBe(mockGame);
      });

      it('should provide null context when game loading fails', async () => {
        // Arrange
        const error = new Error('Test error');
        const loadError = new Error('Repository error');
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockRejectedValue(loadError);

        // Act
        const result = await UseCaseErrorHandler.handleError(
          error,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(result.gameContext).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to load game state for error result context',
          expect.objectContaining({
            gameId: gameId.value,
            operation: 'recordAtBat',
            loadError,
          })
        );
      });
    });

    describe('Logging', () => {
      it('should log errors with proper context', async () => {
        // Arrange
        const error = new Error('Test error');
        const additionalData = { batterId: 'player-123', result: 'HOME_RUN' };
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        await UseCaseErrorHandler.handleError(
          error,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder,
          additionalData
        );

        // Assert
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to execute recordAtBat',
          error,
          expect.objectContaining({
            gameId: gameId.value,
            operation: 'recordAtBat',
            batterId: 'player-123',
            result: 'HOME_RUN',
          })
        );
      });

      it('should log non-Error objects as wrapped errors', async () => {
        // Arrange
        const error = 'string error';
        (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

        // Act
        await UseCaseErrorHandler.handleError(
          error,
          gameId,
          mockGameRepository,
          mockLogger,
          'recordAtBat',
          resultBuilder
        );

        // Assert
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to execute recordAtBat',
          expect.any(Error),
          expect.objectContaining({
            gameId: gameId.value,
            operation: 'recordAtBat',
          })
        );
      });
    });
  });

  describe('handleErrorSync', () => {
    it('should handle errors synchronously without game loading', () => {
      // Arrange
      const error = new DomainError('Invalid input');

      // Act
      const result = UseCaseErrorHandler.handleErrorSync(
        error,
        gameId,
        mockLogger,
        'validateInput',
        resultBuilder
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Invalid input']);
      expect(result.gameContext).toBeNull();
      expect(mockGameRepository.findById).not.toHaveBeenCalled();
    });

    it('should log errors with additional context', () => {
      // Arrange
      const error = new Error('Validation failed');
      const additionalData = { field: 'homeTeamName', value: 'invalid' };

      // Act
      UseCaseErrorHandler.handleErrorSync(
        error,
        gameId,
        mockLogger,
        'validateInput',
        resultBuilder,
        additionalData
      );

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute validateInput',
        error,
        expect.objectContaining({
          gameId: gameId.value,
          operation: 'validateInput',
          field: 'homeTeamName',
          value: 'invalid',
        })
      );
    });
  });

  describe('Error Message Patterns', () => {
    it('should handle case-insensitive error message matching', async () => {
      // Arrange
      const errors = [
        new Error('DATABASE CONNECTION FAILED'),
        new Error('Event Store Unavailable'),
        new Error('Failed to SAVE entity'),
        new Error('Cannot LOAD resource'),
      ];
      (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

      // Act & Assert
      const dbResult = await UseCaseErrorHandler.handleError(
        errors[0],
        gameId,
        mockGameRepository,
        mockLogger,
        'test',
        resultBuilder
      );
      expect(dbResult.errors[0]).toContain('Failed to save game state');

      const eventResult = await UseCaseErrorHandler.handleError(
        errors[1],
        gameId,
        mockGameRepository,
        mockLogger,
        'test',
        resultBuilder
      );
      expect(eventResult.errors[0]).toContain('Failed to store events');

      const saveResult = await UseCaseErrorHandler.handleError(
        errors[2],
        gameId,
        mockGameRepository,
        mockLogger,
        'test',
        resultBuilder
      );
      expect(saveResult.errors[0]).toContain('Failed to save game state');

      const loadResult = await UseCaseErrorHandler.handleError(
        errors[3],
        gameId,
        mockGameRepository,
        mockLogger,
        'test',
        resultBuilder
      );
      expect(loadResult.errors[0]).toContain('Failed to load game data');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex error scenarios with repository failures', async () => {
      // Arrange
      const primaryError = new Error('Event store corruption detected');
      const repositoryError = new Error('Database timeout');
      (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockRejectedValue(repositoryError);

      // Act
      const result = await UseCaseErrorHandler.handleError(
        primaryError,
        gameId,
        mockGameRepository,
        mockLogger,
        'recordAtBat',
        resultBuilder,
        { attempt: 3 }
      );

      // Assert
      expect(result.errors).toEqual(['Failed to store events: Event store corruption detected']);
      expect(result.gameContext).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute recordAtBat',
        primaryError,
        expect.objectContaining({ attempt: 3 })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load game state for error result context',
        expect.objectContaining({ loadError: repositoryError })
      );
    });

    it('should work with different result builder patterns', async () => {
      // Arrange
      interface CustomResult {
        status: 'error';
        message: string;
        game?: Game | null;
      }

      const customBuilder: ErrorResultBuilder<CustomResult> = (game, errors) => ({
        status: 'error',
        message: errors.join('; '),
        game,
      });

      const error = new DomainError('Custom validation failed');
      (mockGameRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockGame);

      // Act
      const result = await UseCaseErrorHandler.handleError(
        error,
        gameId,
        mockGameRepository,
        mockLogger,
        'customOperation',
        customBuilder
      );

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Custom validation failed');
      expect(result.game).toBe(mockGame);
    });
  });
});
