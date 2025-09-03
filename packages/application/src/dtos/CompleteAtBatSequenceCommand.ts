/**
 * @file CompleteAtBatSequenceCommand
 * Command DTO for orchestrated at-bat sequence operations in GameApplicationService.
 *
 * @remarks
 * This command encapsulates the complete at-bat workflow, including the core
 * at-bat recording, optional inning end handling, substitution processing,
 * and notification management. It enables complex business operations that
 * span multiple use cases while maintaining consistency and proper error handling.
 *
 * **Workflow Coordination**:
 * - Core at-bat recording with full validation
 * - Automatic inning end detection and processing
 * - Post-at-bat substitution handling
 * - Score change notifications to external systems
 * - Error recovery and rollback capabilities
 *
 * **Business Context**:
 * An at-bat sequence represents the complete business process from when a
 * batter steps into the box until all resulting actions are completed,
 * including scoring, base running, inning changes, and team adjustments.
 *
 * @example
 * ```typescript
 * // Simple at-bat with automatic inning handling
 * const command: CompleteAtBatSequenceCommand = {
 *   gameId: GameId.create('game-123'),
 *   atBatCommand: {
 *     gameId: GameId.create('game-123'),
 *     batterId: PlayerId.create('player-456'),
 *     result: AtBatResultType.SINGLE,
 *     runnerAdvances: [...]
 *   },
 *   checkInningEnd: true,
 *   handleSubstitutions: true,
 *   notifyScoreChanges: true
 * };
 *
 * const result = await gameApplicationService.completeAtBatSequence(command);
 * if (result.success && result.inningEndResult?.success) {
 *   // Handle new inning state
 * }
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { RecordAtBatCommand } from './RecordAtBatCommand';
import { SubstitutePlayerCommand } from './SubstitutePlayerCommand';

/**
 * Command for executing a complete at-bat sequence with orchestrated follow-up actions.
 *
 * @remarks
 * This command enables complex business workflows that coordinate multiple
 * use cases in a single transaction-like operation. It provides fine-grained
 * control over which follow-up actions should be executed and how errors
 * should be handled.
 *
 * **Orchestration Features**:
 * - Automatic inning end detection and handling
 * - Post-at-bat substitution processing
 * - Real-time score change notifications
 * - Error recovery with partial success handling
 * - Audit logging for complete operation trail
 *
 * **Transaction Boundaries**:
 * The sequence maintains consistency across all operations, ensuring that
 * partial failures don't leave the game in an inconsistent state. Failed
 * operations can trigger compensating actions to restore proper game state.
 */
export interface CompleteAtBatSequenceCommand {
  /** Unique identifier for the game this sequence applies to */
  readonly gameId: GameId;

  /** Core at-bat command with all batting details */
  readonly atBatCommand: RecordAtBatCommand;

  /**
   * Whether to automatically check and handle inning end conditions.
   *
   * @remarks
   * When true, the service will detect if the at-bat ended the inning
   * and automatically execute the EndInning use case to advance the
   * game to the next half-inning or inning.
   *
   * @default true
   */
  readonly checkInningEnd?: boolean;

  /**
   * Whether to process any substitutions queued for after this at-bat.
   *
   * @remarks
   * Some substitutions are planned to occur after specific at-bats
   * (e.g., pinch hitter, defensive changes). When true, the service
   * will execute any pending substitutions for this timing.
   *
   * @default false
   */
  readonly handleSubstitutions?: boolean;

  /**
   * Optional substitutions to execute after the at-bat.
   *
   * @remarks
   * These substitutions will be executed only if the at-bat is successful
   * and the handleSubstitutions flag is true. They are processed in order
   * and any failure will trigger appropriate error handling.
   */
  readonly queuedSubstitutions?: SubstitutePlayerCommand[];

  /**
   * Whether to send score change notifications to external systems.
   *
   * @remarks
   * When true and the at-bat results in score changes, the service
   * will notify external systems (scoreboards, mobile apps, etc.)
   * of the updated game state.
   *
   * @default false
   */
  readonly notifyScoreChanges?: boolean;

  /**
   * Maximum number of retry attempts for failed operations.
   *
   * @remarks
   * If any part of the sequence fails due to transient issues,
   * the service will retry up to this number of times before
   * giving up and returning an error.
   *
   * @default 1
   */
  readonly maxRetryAttempts?: number;
}
