/**
 * @file CompleteGameWorkflowResult
 * Result DTO for complete game workflow execution.
 *
 * @remarks
 * This result provides comprehensive information about the execution
 * of a complete game workflow, including statistics, timing information,
 * error details, and the final game state. It serves as a complete
 * record of the entire workflow execution for audit and analysis purposes.
 *
 * **Result Components**:
 * - Game creation and initialization results
 * - Aggregated statistics from all operations
 * - Performance and timing information
 * - Complete error and warning logs
 * - Final game state and completion status
 *
 * The result enables thorough analysis of workflow execution,
 * performance optimization, and debugging of complex game scenarios.
 */

import { GameId } from '@twsoftball/domain';

import { GameStartResult } from './GameStartResult';
import { GameStateDTO } from './GameStateDTO';

/**
 * Result of executing a complete game workflow from start to finish.
 *
 * @remarks
 * This result provides comprehensive information about the entire
 * game workflow execution, including detailed statistics, performance
 * metrics, and complete audit information for all operations performed.
 *
 * **Success Criteria**:
 * The workflow is considered successful if the game was started and
 * at least some operations completed successfully, even if the complete
 * workflow couldn't finish due to early termination or partial failures.
 *
 * **Statistical Information**:
 * Provides detailed counts and metrics for all operations attempted
 * and completed during the workflow execution.
 */
export interface CompleteGameWorkflowResult {
  /** Whether the overall game workflow succeeded */
  readonly success: boolean;

  /** Unique identifier of the game that was created */
  readonly gameId: GameId;

  /** Result of the game initialization operation */
  readonly gameStartResult?: GameStartResult;

  /** Final game state after workflow completion */
  readonly finalGameState?: GameStateDTO;

  /**
   * Total number of at-bats that were attempted during the workflow.
   *
   * @remarks
   * Includes both successful and failed at-bat attempts. This count
   * may be less than the number provided in the command if the workflow
   * terminated early due to errors or natural game ending conditions.
   */
  readonly totalAtBats: number;

  /**
   * Total number of at-bats that completed successfully.
   *
   * @remarks
   * Count of at-bats that were recorded without errors. The difference
   * between totalAtBats and successfulAtBats indicates how many
   * at-bat operations failed during execution.
   */
  readonly successfulAtBats: number;

  /**
   * Total number of runs scored during the workflow.
   *
   * @remarks
   * Aggregated count of all runs scored from successful at-bat operations.
   * Used for workflow validation and statistics generation.
   */
  readonly totalRuns: number;

  /**
   * Total number of substitutions that were attempted during the workflow.
   *
   * @remarks
   * Includes both successful and failed substitution attempts across
   * all phases of the workflow execution.
   */
  readonly totalSubstitutions: number;

  /**
   * Total number of substitutions that completed successfully.
   *
   * @remarks
   * Count of substitutions that were processed without errors. Failed
   * substitutions are tracked separately and detailed in error logs.
   */
  readonly successfulSubstitutions: number;

  /**
   * Number of innings that were completed during the workflow.
   *
   * @remarks
   * Count of full innings (both top and bottom halves) that were
   * completed. Partial innings are not counted in this total.
   */
  readonly completedInnings: number;

  /**
   * Whether the game reached a natural completion state.
   *
   * @remarks
   * True if the game ended due to normal game rules (e.g., 9 innings
   * with a winner), false if the workflow terminated early due to
   * errors, early termination conditions, or running out of operations.
   */
  readonly gameCompleted: boolean;

  /**
   * Total execution time for the complete workflow in milliseconds.
   *
   * @remarks
   * Includes time for all operations, retries, delays, and coordination
   * overhead. Useful for performance analysis and workflow optimization.
   */
  readonly executionTimeMs: number;

  /**
   * Total number of retry attempts used across all operations.
   *
   * @remarks
   * Aggregate count of all retry attempts needed for any operations
   * during the workflow. High retry counts may indicate system issues
   * or configuration problems that need attention.
   */
  readonly totalRetryAttempts: number;

  /**
   * Whether any compensation actions were applied during execution.
   *
   * @remarks
   * True if any failed operations triggered compensation or rollback
   * actions to maintain system consistency. Indicates that some
   * operations encountered issues but were handled gracefully.
   */
  readonly compensationApplied: boolean;

  /**
   * Array of detailed error messages if the workflow failed or encountered issues.
   *
   * @remarks
   * Contains comprehensive error information from all failed operations,
   * including context about when and why each failure occurred. Essential
   * for debugging complex workflow issues.
   */
  readonly errors?: string[];

  /**
   * Array of warning messages for non-critical issues encountered.
   *
   * @remarks
   * Contains warnings about issues that didn't prevent workflow completion
   * but may indicate potential problems or areas for improvement.
   */
  readonly warnings?: string[];

  /**
   * Detailed performance metrics for workflow analysis.
   *
   * @remarks
   * Optional detailed timing and performance information for advanced
   * analysis and optimization of workflow execution patterns.
   */
  readonly performanceMetrics?: WorkflowPerformanceMetrics;
}

/**
 * Detailed performance metrics for workflow execution analysis.
 *
 * @remarks
 * Provides granular timing and performance information for different
 * phases of the workflow execution, enabling detailed analysis and
 * optimization of complex game scenarios.
 */
export interface WorkflowPerformanceMetrics {
  /** Time spent on game initialization in milliseconds */
  readonly initializationTimeMs: number;

  /** Average time per at-bat operation in milliseconds */
  readonly averageAtBatTimeMs: number;

  /** Average time per substitution operation in milliseconds */
  readonly averageSubstitutionTimeMs: number;

  /** Time spent on inning management operations in milliseconds */
  readonly inningManagementTimeMs: number;

  /** Time spent on notification operations in milliseconds */
  readonly notificationTimeMs: number;

  /** Time spent on error handling and recovery in milliseconds */
  readonly errorHandlingTimeMs: number;
}
