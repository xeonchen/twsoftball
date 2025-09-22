/**
 * @file UndoResult
 * Result DTO returned after attempting to undo actions in a softball game.
 *
 * @remarks
 * This result encapsulates the outcome of the UndoLastAction use case, providing
 * either successful undo operation details with the restored game state, or
 * detailed error information explaining why the undo could not be performed.
 *
 * The result follows the established pattern where success indicates whether the
 * operation completed successfully, with additional fields providing either
 * the successful outcome data or comprehensive error details.
 *
 * For successful undo operations, the result includes:
 * - Complete restored game state after compensation events
 * - Details about what actions were undone
 * - Event information for audit trail purposes
 * - Statistics about the undo operation (events created, aggregates affected)
 *
 * **Undo Operation Types**:
 * - **Simple**: Single action undo (at-bat, substitution)
 * - **Complex**: Multi-action undo (inning sequences, scoring plays)
 * - **Cascade**: Actions that trigger additional compensation (runner movements)
 *
 * @example
 * ```typescript
 * // Successful undo of last at-bat
 * const successResult: UndoResult = {
 *   success: true,
 *   gameId: GameId.create('game-123'),
 *   actionsUndone: 1,
 *   undoneActionTypes: ['AT_BAT'],
 *   restoredState: completeGameState,
 *   compensatingEvents: [
 *     'ActionUndone',
 *     'RunnerPositionReverted',
 *     'ScoreReverted'
 *   ],
 *   undoStack: { canUndo: true, canRedo: true }
 * };
 *
 * // Failed undo due to no actions available
 * const errorResult: UndoResult = {
 *   success: false,
 *   gameId: GameId.create('game-123'),
 *   actionsUndone: 0,
 *   errors: ['No actions available to undo', 'Game is in NOT_STARTED state']
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { GameStateDTO } from './GameStateDTO.js';

/**
 * Information about the undo/redo stack state after the operation.
 *
 * @remarks
 * This provides UI components with the information needed to enable/disable
 * undo and redo buttons appropriately. It tracks the current position in
 * the action history and available operations.
 */
export interface UndoStackInfo {
  /** Whether additional undo operations are available */
  readonly canUndo: boolean;

  /** Whether redo operations are available (actions were previously undone) */
  readonly canRedo: boolean;

  /** Current position in the action history (0 = no actions, positive = actions available) */
  readonly historyPosition: number;

  /** Total number of actions in the history that can be undone/redone */
  readonly totalActions: number;

  /** Description of what the next undo operation would affect */
  readonly nextUndoDescription?: string;

  /** Description of what the next redo operation would affect */
  readonly nextRedoDescription?: string;
}

/**
 * Details about a specific action that was undone.
 *
 * @remarks
 * This provides detailed information about each action that was reversed,
 * enabling better user feedback and audit trail documentation.
 */
export interface UndoneActionDetail {
  /** Type of action that was undone */
  readonly actionType:
    | 'AT_BAT'
    | 'SUBSTITUTION'
    | 'INNING_END'
    | 'GAME_START'
    | 'GAME_END'
    | 'OTHER';

  /** Human-readable description of what was undone */
  readonly description: string;

  /** When the original action was performed */
  readonly originalTimestamp: Date;

  /** When the undo compensation was applied */
  readonly undoTimestamp: Date;

  /** Number of domain events generated to compensate this action */
  readonly compensatingEventCount: number;

  /** Aggregates that were modified during undo */
  readonly affectedAggregates: ('Game' | 'TeamLineup' | 'InningState')[];
}

/**
 * Result DTO returned after attempting to undo actions in a game.
 *
 * @remarks
 * This interface provides the complete outcome of undo operations, including
 * either the successfully restored game state with operation details, or
 * comprehensive error information for failed attempts.
 *
 * Success scenarios include:
 * - Single action undo (most common case)
 * - Multi-action undo sequence
 * - Complex cascade undo with multiple aggregate updates
 * - Cross-inning undo operations
 *
 * Error scenarios include:
 * - No actions available to undo (empty history)
 * - Game in invalid state for undo (not started, completed)
 * - Concurrency conflicts during compensation
 * - Domain rule violations preventing undo
 * - Infrastructure failures (event store, repository)
 *
 * The result provides comprehensive information for UI feedback,
 * audit logging, and troubleshooting purposes.
 */
export interface UndoResult {
  /** Whether the undo operation was successful */
  readonly success: boolean;

  /**
   * Game where the undo operation was attempted
   * Provided for both successful and failed operations
   */
  readonly gameId: GameId;

  /**
   * Number of actions that were successfully undone
   * 0 for failed operations, 1+ for successful operations
   */
  readonly actionsUndone: number;

  /**
   * Types of actions that were undone
   * Empty for failed operations
   * Ordered from most recent to oldest action
   */
  readonly undoneActionTypes?: (
    | 'AT_BAT'
    | 'SUBSTITUTION'
    | 'INNING_END'
    | 'GAME_START'
    | 'GAME_END'
    | 'OTHER'
  )[];

  /**
   * Complete game state after successful undo operation
   * Undefined for failed operations
   *
   * @remarks
   * Contains the fully restored game state with all compensating
   * events applied. This represents the functional equivalent of
   * the game state before the undone actions were performed.
   *
   * Includes:
   * - Restored bases state and runner positions
   * - Reverted score and statistics
   * - Previous batter and inning state
   * - Original lineup positions (if substitution undone)
   * - Updated action history and undo stack
   */
  readonly restoredState?: GameStateDTO;

  /**
   * Types of compensating events that were generated
   * Undefined for failed operations
   *
   * @remarks
   * Lists the domain event types created to achieve the undo operation.
   * Useful for audit purposes and understanding the compensation strategy.
   *
   * Common event types:
   * - ActionUndone: General undo marker event
   * - RunnerPositionReverted: Base runner state rollback
   * - ScoreReverted: Score and statistics rollback
   * - LineupPositionRestored: Player position restoration
   * - InningStateReverted: Inning and batter restoration
   */
  readonly compensatingEvents?: string[];

  /**
   * Current undo/redo stack information after operation
   * Undefined for failed operations
   *
   * @remarks
   * Provides UI components with current undo/redo availability.
   * Essential for proper button states and user feedback.
   */
  readonly undoStack?: UndoStackInfo;

  /**
   * Detailed information about each undone action
   * Undefined for failed operations
   * Ordered from most recent to oldest undone action
   *
   * @remarks
   * Provides comprehensive details for each action that was undone,
   * supporting detailed audit trails and user feedback.
   */
  readonly undoneActionDetails?: UndoneActionDetail[];

  /**
   * Total number of domain events generated during undo
   * 0 for failed operations
   *
   * @remarks
   * Indicates the complexity of the undo operation and provides
   * metrics for performance monitoring and audit purposes.
   */
  readonly totalEventsGenerated?: number;

  /**
   * Time when the undo operation was completed
   * Undefined for failed operations
   */
  readonly completionTimestamp?: Date;

  /**
   * Detailed error messages for failed undo operations
   * Undefined for successful operations
   *
   * @remarks
   * Comprehensive error information for troubleshooting and user feedback.
   * Includes both user-friendly messages and technical details.
   *
   * Common error types:
   * - 'No actions available to undo'
   * - 'Game is not in a valid state for undo operations'
   * - 'Cannot undo: would violate game rules'
   * - 'Concurrency conflict: game state changed during undo'
   * - 'Infrastructure error: failed to store compensating events'
   */
  readonly errors?: string[];

  /**
   * Optional warning messages about the undo operation
   * Can be present for both successful and failed operations
   *
   * @remarks
   * Warnings provide additional context that doesn't prevent the operation
   * but may be important for users to understand.
   *
   * Example warnings:
   * - 'Undoing this action affects player statistics'
   * - 'Complex undo operation affected multiple innings'
   * - 'Some derived statistics may need recalculation'
   */
  readonly warnings?: string[];
}
