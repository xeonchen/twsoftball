/**
 * @file CompleteAtBatSequenceResult
 * Result DTO for orchestrated at-bat sequence operations.
 *
 * @remarks
 * This result provides comprehensive information about the execution
 * of a complete at-bat sequence, including the core at-bat result,
 * any follow-up actions that were executed, and the overall success
 * or failure of the orchestrated operation.
 *
 * **Result Components**:
 * - Core at-bat execution results
 * - Inning end processing results (if applicable)
 * - Substitution execution results (if any)
 * - Notification delivery status
 * - Error details and recovery information
 *
 * The result maintains full traceability of all operations within
 * the sequence, enabling proper error handling and audit logging.
 */

import { AtBatResult } from './AtBatResult';
import { InningEndResult } from './InningEndResult';
import { SubstitutionResult } from './SubstitutionResult';

/**
 * Result of executing a complete at-bat sequence with orchestrated follow-up actions.
 *
 * @remarks
 * This result provides detailed information about each phase of the
 * at-bat sequence execution, including success/failure status, data
 * from each operation, and any errors or warnings encountered.
 *
 * **Success Criteria**:
 * The overall sequence is considered successful if the core at-bat
 * operation succeeds, even if some follow-up actions fail. Individual
 * operation results provide specific success/failure information.
 *
 * **Error Handling**:
 * Errors from individual operations are preserved in their respective
 * result objects, while sequence-level errors are captured in the
 * main errors array.
 */
export interface CompleteAtBatSequenceResult {
  /** Whether the overall at-bat sequence succeeded */
  readonly success: boolean;

  /** Result of the core at-bat recording operation */
  readonly atBatResult: AtBatResult;

  /**
   * Result of inning end processing, if it was executed.
   *
   * @remarks
   * This will be undefined if:
   * - checkInningEnd was false in the command
   * - The at-bat did not end the inning
   * - The at-bat operation itself failed
   */
  readonly inningEndResult?: InningEndResult;

  /**
   * Results of any substitutions that were processed.
   *
   * @remarks
   * This array will contain results for all substitutions that were
   * attempted, whether successful or failed. Empty if no substitutions
   * were queued or if handleSubstitutions was false.
   */
  readonly substitutionResults: SubstitutionResult[];

  /**
   * Whether score change notifications were successfully sent.
   *
   * @remarks
   * This will be true only if:
   * - notifyScoreChanges was true in the command
   * - The at-bat resulted in score changes
   * - The notification service succeeded
   *
   * False indicates either notifications were disabled or delivery failed.
   */
  readonly scoreUpdateSent: boolean;

  /**
   * Number of retry attempts used during the sequence.
   *
   * @remarks
   * Indicates how many retry attempts were needed for operations
   * within the sequence. A value of 0 means all operations succeeded
   * on the first attempt.
   */
  readonly retryAttemptsUsed: number;

  /**
   * Total execution time for the complete sequence in milliseconds.
   *
   * @remarks
   * Includes time for all operations within the sequence, including
   * retries and any delays. Useful for performance monitoring and
   * optimization of complex workflows.
   */
  readonly executionTimeMs: number;

  /**
   * Array of error messages if the sequence failed or encountered issues.
   *
   * @remarks
   * Contains sequence-level errors (coordination, transaction, etc.).
   * Individual operation errors are contained within their respective
   * result objects. Empty array indicates no sequence-level errors.
   */
  readonly errors?: string[];

  /**
   * Array of warning messages for non-critical issues.
   *
   * @remarks
   * Contains warnings about issues that didn't prevent successful
   * completion but may require attention (e.g., notification delays,
   * partial substitution failures, performance concerns).
   */
  readonly warnings?: string[];
}
