/**
 * @file GameApplicationService.validation.test.ts
 * Business Rule Validation tests for the GameApplicationService.
 *
 * @remarks
 * These tests verify the GameApplicationService's ability to enforce
 * business rules, validate user permissions, and handle authentication
 * scenarios across game operations.
 *
 * **Test Coverage Areas**:
 * - User permission validation for game operations
 * - Authentication service integration
 * - Business rule enforcement
 * - Additional transaction edge cases
 *
 * **Testing Strategy**:
 * - Mock all use case dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify proper authorization and validation
 * - Ensure proper error handling for auth failures
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import { GameId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DTO imports
// DTO imports - imported for potential future use in validation test expansion
// Port imports
// Port imports - removed unused imports
// Test factory imports
import { createGameApplicationServiceMocks } from '../test-factories/mock-service-factories.js';
// Use case imports
import { EndInning } from '../use-cases/EndInning.js';
import { RecordAtBat } from '../use-cases/RecordAtBat.js';
import { RedoLastAction } from '../use-cases/RedoLastAction.js';
import { StartNewGame } from '../use-cases/StartNewGame.js';
import { SubstitutePlayer } from '../use-cases/SubstitutePlayer.js';
import { UndoLastAction } from '../use-cases/UndoLastAction.js';
// Note: These imports available for potential future test expansion
// import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand.js';
// import { SubstitutionResult } from '../dtos/SubstitutionResult.js';
// Test helper functions removed - not used in this test file
// DTO imports

// Port imports

import { GameApplicationService } from './GameApplicationService.js';

// Type definitions for test results
interface TestResult {
  success: boolean;
  data?: string;
  errors?: string[];
  attempts?: number;
  actionsUndone?: number;
  actionsRedone?: number;
  compensationApplied?: boolean;
  rollbackApplied?: boolean;
  results?: unknown[];
  message?: string;
  [key: string]: unknown;
}

// Type definitions - removed unused interfaces

// Domain imports

describe('GameApplicationService', () => {
  let gameApplicationService: GameApplicationService;
  let mocks: ReturnType<typeof createGameApplicationServiceMocks>;

  // Test data
  const gameId = new GameId('test-game-123');

  beforeEach(() => {
    // Reset all mock functions
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mocks = createGameApplicationServiceMocks();

    // Create service instance using the mock factory
    // Use type assertions because mocks only implement execute method,
    // but GameApplicationService only calls execute methods in these tests
    gameApplicationService = new GameApplicationService(
      mocks.mockStartNewGame as unknown as StartNewGame,
      mocks.mockRecordAtBat as unknown as RecordAtBat,
      mocks.mockSubstitutePlayer as unknown as SubstitutePlayer,
      mocks.mockEndInning as unknown as EndInning,
      mocks.mockUndoLastAction as unknown as UndoLastAction,
      mocks.mockRedoLastAction as unknown as RedoLastAction,
      mocks.mockLogger,
      mocks.mockNotificationService,
      mocks.mockAuthService
    );
  });

  describe('Business Rule Validation', () => {
    describe('validateGameOperationPermissions', () => {
      it('should validate user permissions for game operations', async () => {
        // Arrange
        mocks.functions.getCurrentUser.mockResolvedValue({ userId: 'user123' });
        mocks.functions.hasPermission.mockResolvedValue(true);

        // Act
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'RECORD_AT_BAT'
        );

        // Assert
        expect(result.valid).toBe(true);
        expect(result.userId).toBe('user123');
        expect(mocks.functions.hasPermission).toHaveBeenCalledWith('user123', 'RECORD_AT_BAT');
      });

      it('should reject operations for unauthorized users', async () => {
        // Arrange
        mocks.functions.getCurrentUser.mockResolvedValue({ userId: 'user123' });
        mocks.functions.hasPermission.mockResolvedValue(false);

        // Act
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'END_GAME'
        );

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('User does not have permission for END_GAME');
      });

      it('should handle authentication service failures', async () => {
        // Arrange
        mocks.functions.getCurrentUser.mockRejectedValue(new Error('Auth service down'));

        // Act
        const result = await gameApplicationService.validateGameOperationPermissions(
          gameId,
          'RECORD_AT_BAT'
        );

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Authentication failed: Auth service down');
      });
    });
    describe('Additional Transaction Edge Cases', () => {
      it('should handle transaction with empty operations array', async () => {
        // Test transaction behavior with no operations
        const operations: Array<() => Promise<TestResult>> = [];

        const result = await gameApplicationService.executeInTransaction(
          'empty-transaction',
          operations,
          { gameId: gameId.value }
        );

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(0);
        expect(result.rollbackApplied).toBe(false);
      });

      it('should handle transaction with single successful operation', async () => {
        // Test basic successful transaction
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'single-op-success' }),
        ];

        const result = await gameApplicationService.executeInTransaction(
          'single-success-transaction',
          operations,
          { gameId: gameId.value }
        );

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.rollbackApplied).toBe(false);
        expect((result.results[0] as TestResult).data).toBe('single-op-success');
      });

      it('should handle transaction debug logging correctly', async () => {
        // Test that debug logging works without causing issues
        const operations = [vi.fn().mockResolvedValue({ success: true, data: 'debug-test' })];

        const result = await gameApplicationService.executeInTransaction(
          'debug-logging-test',
          operations,
          { gameId: gameId.value, debugLevel: 'verbose' }
        );

        expect(result.success).toBe(true);
        expect(mocks.functions.loggerDebug).toHaveBeenCalledWith(
          'Starting transaction',
          expect.objectContaining({
            operation: 'debug-logging-test',
            operationCount: 1,
            gameId: gameId.value,
          })
        );
      });
    });
  });
});
