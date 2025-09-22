/**
 * @file RedoResult
 * Result DTO returned after attempting to redo actions in a softball game.
 *
 * @remarks
 * This result encapsulates the outcome of the RedoLastAction use case, providing
 * either successful redo operation details with the restored game state, or
 * detailed error information explaining why the redo could not be performed.
 *
 * The result follows the established pattern where success indicates whether the
 * operation completed successfully, with additional fields providing either
 * the successful outcome data or comprehensive error details.
 *
 * For successful redo operations, the result includes:
 * - Complete restored game state after re-applying undone actions
 * - Details about what actions were redone
 * - Event information for audit trail purposes
 * - Statistics about the redo operation (events created, aggregates affected)
 *
 * **Redo Operation Types**:
 * - **Simple**: Single action redo (at-bat, substitution)
 * - **Complex**: Multi-action redo (inning sequences, scoring plays)
 * - **Cascade**: Actions that trigger additional restoration (runner movements)
 *
 * @example
 * ```typescript
 * // Successful redo of last undone at-bat
 * const successResult: RedoResult = {
 *   success: true,
 *   gameId: GameId.create('game-123'),
 *   actionsRedone: 1,
 *   redoneActionTypes: ['AT_BAT'],
 *   restoredState: completeGameState,
 *   restorationEvents: [
 *     'ActionRedone',
 *     'RunnerPositionRestored',
 *     'ScoreRestored'
 *   ],
 *   undoStack: { canUndo: true, canRedo: false }
 * };
 *
 * // Failed redo due to no undone actions available
 * const errorResult: RedoResult = {
 *   success: false,
 *   gameId: GameId.create('game-123'),
 *   actionsRedone: 0,
 *   errors: ['No undone actions available to redo', 'Undo stack is empty']
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

import { GameStateDTO } from './GameStateDTO.js';

/**
 * Information about the undo/redo stack state after the redo operation.
 *
 * @remarks
 * This provides UI components with the information needed to enable/disable
 * undo and redo buttons appropriately after redo operations. It tracks the
 * current position in the action history and available operations.
 *
 * After a successful redo:
 * - canRedo typically becomes false (no more redone actions to redo)
 * - canUndo typically becomes true (can undo the redone action)
 * - historyPosition increases by the number of redone actions
 */
export interface RedoStackInfo {
  /** Whether additional undo operations are available */
  readonly canUndo: boolean;

  /** Whether additional redo operations are available (more actions were previously undone) */
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
 * Details about a specific action that was redone.
 *
 * @remarks
 * This provides detailed information about each action that was restored,
 * enabling better user feedback and audit trail documentation.
 */
export interface RedoneActionDetail {
  /** Type of action that was redone */
  readonly actionType:
    | 'AT_BAT'
    | 'SUBSTITUTION'
    | 'INNING_END'
    | 'GAME_START'
    | 'GAME_END'
    | 'OTHER';

  /** Human-readable description of what was redone */
  readonly description: string;

  /** When the original action was first performed */
  readonly originalTimestamp: Date;

  /** When the action was undone (creating the opportunity for redo) */
  readonly undoTimestamp: Date;

  /** When the redo restoration was applied */
  readonly redoTimestamp: Date;

  /** Number of domain events generated to restore this action */
  readonly restorationEventCount: number;

  /** Aggregates that were modified during redo */
  readonly affectedAggregates: ('Game' | 'TeamLineup' | 'InningState')[];
}

/**
 * Result DTO returned after attempting to redo actions in a game.
 *
 * @remarks
 * This interface provides the complete outcome of redo operations, including
 * either the successfully restored game state with operation details, or
 * comprehensive error information for failed attempts.
 *
 * Success scenarios include:
 * - Single action redo (most common case)
 * - Multi-action redo sequence
 * - Complex cascade redo with multiple aggregate updates
 * - Cross-inning redo operations
 *
 * Error scenarios include:
 * - No undone actions available to redo (empty undo stack)
 * - Game in invalid state for redo (not started, state changed)
 * - Concurrency conflicts during restoration
 * - Domain rule violations preventing redo
 * - Infrastructure failures (event store, repository)
 *
 * The result provides comprehensive information for UI feedback,
 * audit logging, and troubleshooting purposes.
 *
 * **Relationship to UndoResult**:
 * - Similar structure for consistency
 * - Complementary information (redo vs undo details)
 * - Same error handling patterns
 * - Compatible undo/redo stack information
 */
export interface RedoResult {
  /** Whether the redo operation was successful */
  readonly success: boolean;

  /**
   * Game where the redo operation was attempted
   * Provided for both successful and failed operations
   */
  readonly gameId: GameId;

  /**
   * Number of actions that were successfully redone
   * 0 for failed operations, 1+ for successful operations
   */
  readonly actionsRedone: number;

  /**
   * Types of actions that were redone
   * Empty for failed operations
   * Ordered from most recently redone to oldest redone action
   */
  readonly redoneActionTypes?: (
    | 'AT_BAT'
    | 'SUBSTITUTION'
    | 'INNING_END'
    | 'GAME_START'
    | 'GAME_END'
    | 'OTHER'
  )[];

  /**
   * Complete game state after successful redo operation
   * Undefined for failed operations
   *
   * @remarks
   * Contains the fully restored game state with all redone actions
   * re-applied. This represents the functional equivalent of
   * the game state after the original actions, but with complete
   * audit trail of the undo/redo sequence.
   *
   * Includes:
   * - Restored bases state and runner positions
   * - Re-applied score and statistics
   * - Current batter and inning state
   * - Restored lineup positions (if substitution redone)
   * - Updated action history and undo stack
   */
  readonly restoredState?: GameStateDTO;

  /**
   * Types of restoration events that were generated
   * Undefined for failed operations
   *
   * @remarks
   * Lists the domain event types created to achieve the redo operation.
   * Useful for audit purposes and understanding the restoration strategy.
   *
   * Common event types:
   * - ActionRedone: General redo marker event
   * - RunnerPositionRestored: Base runner state restoration
   * - ScoreRestored: Score and statistics restoration
   * - LineupPositionRestored: Player position restoration
   * - InningStateRestored: Inning and batter state restoration
   */
  readonly restorationEvents?: string[];

  /**
   * Current undo/redo stack information after operation
   * Undefined for failed operations
   *
   * @remarks
   * Provides UI components with current undo/redo availability.
   * Essential for proper button states and user feedback.
   * After successful redo, typically shows:
   * - canUndo: true (can undo the redone action)
   * - canRedo: depends on remaining undone actions
   */
  readonly undoStack?: RedoStackInfo;

  /**
   * Detailed information about each redone action
   * Undefined for failed operations
   * Ordered from most recently redone to oldest redone action
   *
   * @remarks
   * Provides comprehensive details for each action that was redone,
   * supporting detailed audit trails and user feedback.
   */
  readonly redoneActionDetails?: RedoneActionDetail[];

  /**
   * Total number of domain events generated during redo
   * 0 for failed operations
   *
   * @remarks
   * Indicates the complexity of the redo operation and provides
   * metrics for performance monitoring and audit purposes.
   *
   * Typically includes:
   * - Primary restoration events (1 per action)
   * - Compensating events to reverse undo effects
   * - Aggregate synchronization events
   * - Audit trail events
   */
  readonly totalEventsGenerated?: number;

  /**
   * Time when the redo operation was completed
   * Undefined for failed operations
   */
  readonly completionTimestamp?: Date;

  /**
   * Detailed error messages for failed redo operations
   * Undefined for successful operations
   *
   * @remarks
   * Comprehensive error information for troubleshooting and user feedback.
   * Includes both user-friendly messages and technical details.
   *
   * Common error types:
   * - 'No undone actions available to redo'
   * - 'Game state has changed since undo - cannot redo safely'
   * - 'Cannot redo: would violate game rules'
   * - 'Concurrency conflict: game state changed during redo'
   * - 'Infrastructure error: failed to store restoration events'
   * - 'Redo stack corruption detected'
   */
  readonly errors?: string[];

  /**
   * Optional warning messages about the redo operation
   * Can be present for both successful and failed operations
   *
   * @remarks
   * Warnings provide additional context that doesn't prevent the operation
   * but may be important for users to understand.
   *
   * Example warnings:
   * - 'Redoing this action affects player statistics'
   * - 'Complex redo operation affected multiple innings'
   * - 'Some derived statistics may need recalculation'
   * - 'Redo operation completed but game state may need review'
   * - 'Multiple aggregate updates required - verify game consistency'
   */
  readonly warnings?: string[];
}
