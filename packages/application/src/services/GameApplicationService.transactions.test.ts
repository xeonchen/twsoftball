/**
 * @file GameApplicationService.transactions.test.ts
 * Transaction Management tests for the GameApplicationService.
 *
 * @remarks
 * These tests verify the GameApplicationService's ability to manage
 * transactional operations, handle atomic operations, perform rollbacks,
 * and maintain ACID properties across multi-step business processes.
 *
 * **Test Coverage Areas**:
 * - Multi-operation atomic transactions
 * - Rollback scenarios and compensation
 * - Transaction boundary isolation
 * - Complex error handling in transactions
 *
 * **Testing Strategy**:
 * - Mock all use case dependencies for isolation
 * - Test both successful and failure scenarios
 * - Verify proper rollback and compensation behavior
 * - Ensure ACID properties are maintained
 *
 * The service follows hexagonal architecture principles and is tested
 * using dependency injection with comprehensive mocking.
 */

import { GameId, PlayerId } from '@twsoftball/domain';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test factory imports
import { createGameApplicationServiceMocks } from '../test-factories/mock-service-factories';
// Use case imports
import { EndInning } from '../use-cases/EndInning';
import { RecordAtBat } from '../use-cases/RecordAtBat';
import { RedoLastAction } from '../use-cases/RedoLastAction';
import { StartNewGame } from '../use-cases/StartNewGame';
import { SubstitutePlayer } from '../use-cases/SubstitutePlayer';
import { UndoLastAction } from '../use-cases/UndoLastAction';
// Note: These imports available for potential future test expansion
// import { SubstitutePlayerCommand } from '../dtos/SubstitutePlayerCommand';
// import { SubstitutionResult } from '../dtos/SubstitutionResult';
// DTO imports

// Port imports

import { GameApplicationService } from './GameApplicationService';

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

// Domain imports

describe('GameApplicationService', () => {
  let gameApplicationService: GameApplicationService;
  let mocks: ReturnType<typeof createGameApplicationServiceMocks>;

  // Test data
  const gameId = new GameId('test-game-123');
  const playerId = new PlayerId('player-456');

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

  describe('Transaction Management', () => {
    describe('executeInTransaction', () => {
      it('should execute multiple operations atomically', async () => {
        // Arrange
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({ success: true, data: 'op2' }),
          vi.fn().mockResolvedValue({ success: true, data: 'op3' }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(3);
        expect((result.results[0] as TestResult).data).toBe('op1');
        expect((result.results[1] as TestResult).data).toBe('op2');
        expect((result.results[2] as TestResult).data).toBe('op3');
        operations.forEach(op => expect(op).toHaveBeenCalled());
      });

      it('should rollback on any operation failure', async () => {
        // Arrange
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({ success: false, errors: ['Op2 failed'] }),
          vi.fn().mockResolvedValue({ success: true, data: 'op3' }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction failed at operation 1: Op2 failed');
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).not.toHaveBeenCalled(); // Should stop at failure
      });

      it('should handle operation exception and perform rollback', async () => {
        // Arrange
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockRejectedValue(new Error('Op2 exception')),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction exception at operation 1: Op2 exception');
        expect(mocks.functions.loggerError).toHaveBeenCalledWith(
          'Transaction failed with exception',
          expect.any(Error),
          expect.objectContaining({
            operation: 'multi-operation',
            failedAt: 1,
          })
        );
      });

      it('should handle undefined operations in transaction gracefully', async () => {
        // Arrange - Operations array with undefined element
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          undefined as unknown as () => Promise<unknown>,
          vi.fn().mockResolvedValue({ success: true, data: 'op3' }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'multi-operation-with-undefined',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction exception at operation 1: Operation at index 1 is undefined'
        );
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[2]).not.toHaveBeenCalled();
      });

      it('should handle operation failure with complex error structures', async () => {
        // Arrange - Operation that fails with complex error array
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({
            success: false,
            errors: [
              'Primary validation failed',
              'Secondary check failed',
              'Tertiary rule violated',
            ],
          }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'complex-error-transaction',
          operations,
          { gameId: gameId.value, complexErrorTest: true }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction failed at operation 1: Primary validation failed, Secondary check failed, Tertiary rule violated'
        );
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
      });

      it('should handle operation failure without error array', async () => {
        // Arrange - Operation that fails without errors array
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          vi.fn().mockResolvedValue({
            success: false,
            message: 'Operation failed but no errors array',
          }),
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'no-errors-array-transaction',
          operations,
          { gameId: gameId.value }
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction failed at operation 1: Operation failed');
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
      });

      it('should handle transaction system error gracefully', async (): Promise<void> => {
        // Test the catch block in executeInTransaction by creating operations that cause a system error
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'op1' }),
          (): never => {
            throw new Error('System operation failure');
          }, // This will trigger the catch block
        ];

        // Act
        const result = await gameApplicationService.executeInTransaction(
          'system-error-transaction',
          operations,
          { gameId: gameId.value }
        );

        // Assert - when a system error occurs during operation execution, rollback is attempted
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true); // Rollback is applied when system error occurs
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/Transaction exception at operation 1: System operation failure/),
          ])
        );
      });

      it('should maintain ACID properties during nested transaction workflows', async () => {
        // Given: Complex multi-step workflow with potential failure points
        let atBatExecuted = false;
        let inningProcessed = false;
        let scoresUpdated = false;

        const operations = [
          // Operation 1: Record at-bat (succeeds)
          vi.fn().mockImplementation(() => {
            atBatExecuted = true;
            return { success: true, data: 'at-bat-recorded', playerId: playerId.value };
          }),
          // Operation 2: Process inning change (succeeds)
          vi.fn().mockImplementation(() => {
            inningProcessed = true;
            return { success: true, data: 'inning-processed', newInning: 2 };
          }),
          // Operation 3: Update scores (fails at step 3 of 5)
          vi.fn().mockImplementation(() => {
            scoresUpdated = true;
            return {
              success: false,
              errors: ['Score calculation failed', 'Database constraint violation'],
            };
          }),
        ];

        // When: Operation fails at step 3 of 5
        const result = await gameApplicationService.executeInTransaction(
          'complex-game-workflow',
          operations,
          {
            gameId: gameId.value,
            workflowType: 'nested-transaction',
            totalSteps: 5,
            criticalSection: true,
          }
        );

        // Then: Steps 1-2 rolled back, state consistent, audit preserved
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.results).toHaveLength(2); // Only successful operations before failure
        expect(result.errors).toContain(
          'Transaction failed at operation 2: Score calculation failed, Database constraint violation'
        );

        // Verify all operations up to failure were executed
        expect(atBatExecuted).toBe(true);
        expect(inningProcessed).toBe(true);
        expect(scoresUpdated).toBe(true);

        // Verify rollback was logged with proper context
        expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'complex-game-workflow',
            operationsToRollback: 2,
            gameId: gameId.value,
            workflowType: 'nested-transaction',
          })
        );
      });

      it('should handle compensation chain failures gracefully', async () => {
        // Given: Workflow with compensation actions that will trigger rollback
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'primary-operation-succeeded' }),
          vi.fn().mockResolvedValue({ success: false, errors: ['Primary operation failed'] }),
        ];

        // When: Primary fails, compensation is triggered
        const result = await gameApplicationService.executeInTransaction(
          'compensation-chain-failure',
          operations,
          {
            gameId: gameId.value,
            compensationType: 'critical-rollback',
          }
        );

        // Then: Transaction fails and rollback is applied
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction failed at operation 1: Primary operation failed'
        );

        // Verify rollback was attempted
        expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'compensation-chain-failure',
            operationsToRollback: 1,
            gameId: gameId.value,
            compensationType: 'critical-rollback',
          })
        );
      });

      it('should verify transaction boundary isolation', async () => {
        // Given: Two concurrent transaction attempts
        let transaction1State = 'initial';
        let transaction2State = 'initial';

        const transaction1Operations = [
          vi.fn().mockImplementation(async () => {
            transaction1State = 'modified';
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 50));
            return { success: true, data: 'tx1-step1' };
          }),
          vi.fn().mockImplementation(() => {
            // This should fail and trigger rollback
            return { success: false, errors: ['Transaction 1 intentional failure'] };
          }),
        ];

        const transaction2Operations = [
          vi.fn().mockImplementation(() => {
            transaction2State = 'modified';
            return { success: true, data: 'tx2-step1' };
          }),
          vi.fn().mockImplementation(() => {
            return { success: true, data: 'tx2-step2' };
          }),
        ];

        // When: Both transactions execute concurrently
        const [result1, result2] = await Promise.all([
          gameApplicationService.executeInTransaction('concurrent-tx1', transaction1Operations, {
            gameId: gameId.value,
            isolationLevel: 'strict',
          }),
          gameApplicationService.executeInTransaction('concurrent-tx2', transaction2Operations, {
            gameId: gameId.value,
            isolationLevel: 'strict',
          }),
        ]);

        // Then: Transaction boundaries maintained, no cross-contamination
        expect(result1.success).toBe(false);
        expect(result1.rollbackApplied).toBe(true);
        expect(result2.success).toBe(true);
        expect(result2.rollbackApplied).toBe(false);

        // Verify state modifications occurred independently
        expect(transaction1State).toBe('modified');
        expect(transaction2State).toBe('modified');
      });

      it('should handle rollback scenarios when operations fail mid-process', async () => {
        // Given: Multi-step operation with mid-process failure
        const operationStates: string[] = [];

        const operations = [
          vi.fn().mockImplementation(() => {
            operationStates.push('step1-executed');
            return { success: true, data: 'step1-complete', rollbackData: 'step1-rollback-info' };
          }),
          vi.fn().mockImplementation(() => {
            operationStates.push('step2-executed');
            return { success: true, data: 'step2-complete', rollbackData: 'step2-rollback-info' };
          }),
          vi.fn().mockImplementation((): never => {
            operationStates.push('step3-started');
            // Simulate mid-process failure (after starting but before completing)
            throw new Error('Mid-process failure during step 3 execution');
          }),
          vi.fn().mockImplementation(() => {
            operationStates.push('step4-should-not-execute');
            return { success: true, data: 'step4-complete' };
          }),
        ];

        // When: Operation fails mid-process at step 3
        const result = await gameApplicationService.executeInTransaction(
          'mid-process-failure-transaction',
          operations,
          {
            gameId: gameId.value,
            rollbackStrategy: 'immediate',
            auditLevel: 'detailed',
          }
        );

        // Then: Proper rollback triggered, audit trail maintained
        expect(result.success).toBe(false);
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain(
          'Transaction exception at operation 2: Mid-process failure during step 3 execution'
        );

        // Verify execution sequence: steps 1,2,3 executed, step 4 never reached
        expect(operationStates).toEqual(['step1-executed', 'step2-executed', 'step3-started']);

        // Verify operations called in correct sequence
        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).toHaveBeenCalled();
        expect(operations[3]).not.toHaveBeenCalled();

        // Verify rollback logging with context
        expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
          'Performing transaction rollback',
          expect.objectContaining({
            transaction: 'mid-process-failure-transaction',
            operationsToRollback: 2, // steps 1 and 2 need rollback
            gameId: gameId.value,
            rollbackStrategy: 'immediate',
          })
        );
      });

      it('should handle transaction with operations returning different result formats', async () => {
        // Test various result formats to improve branch coverage
        const operations = [
          vi.fn().mockResolvedValue({ success: true, data: 'string-result' }),
          vi.fn().mockResolvedValue({ success: false, errors: ['operation-error'] }),
          vi.fn().mockResolvedValue({ success: true, complex: { nested: 'data' } }),
        ];

        const result = await gameApplicationService.executeInTransaction(
          'mixed-results-transaction',
          operations,
          { gameId: gameId.value, testMixedResults: true }
        );

        expect(result.success).toBe(false); // Should fail because second operation failed
        expect(result.rollbackApplied).toBe(true);
        expect(result.errors).toContain('Transaction failed at operation 1: operation-error');

        expect(operations[0]).toHaveBeenCalled();
        expect(operations[1]).toHaveBeenCalled();
        expect(operations[2]).not.toHaveBeenCalled(); // Should stop after failure
      });

      it('should handle executeWithCompensation with complex operation results', async () => {
        // Test compensation with complex result structures
        const complexResult = {
          success: false,
          data: { complexField: 'test' },
          metadata: { source: 'test', timestamp: Date.now() },
          errors: ['Complex operation failed'],
        };

        const operation = vi.fn().mockResolvedValue(complexResult);
        const compensation = vi.fn().mockResolvedValue({ compensated: true, rollbackData: 'test' });

        const result = await gameApplicationService.executeWithCompensation(
          'complex-compensation-test',
          operation,
          compensation,
          { gameId: gameId.value, complexTest: true }
        );

        expect(result).toEqual({
          ...complexResult,
          compensationApplied: true,
        });
        expect(operation).toHaveBeenCalled();
        expect(compensation).toHaveBeenCalled();

        expect(mocks.functions.loggerWarn).toHaveBeenCalledWith(
          'Applied compensation for failed operation',
          expect.objectContaining({
            operation: 'complex-compensation-test',
            gameId: gameId.value,
            complexTest: true,
          })
        );
      });
    });
  });
});
