/**
 * @file RedoCommand
 * Command DTO for redoing the last undone action(s) performed in a softball game.
 *
 * @remarks
 * This command encapsulates the information needed to redo previously undone
 * actions in a softball game using event sourcing patterns. It supports
 * restoring various types of actions including at-bats, substitutions,
 * inning endings, and other game state modifications that were previously
 * compensated through undo operations.
 *
 * The redo operation works by analyzing undo events and creating events that
 * re-apply the original actions, effectively reversing the compensation while
 * maintaining the complete audit trail. This enables full undo/redo functionality
 * similar to text editors or other interactive applications.
 *
 * **Redo Strategy**:
 * - Re-applies original events by reversing compensating events
 * - Maintains complete audit trail with all redo operations logged
 * - Supports multiple levels of redo operations in sequence
 * - Coordinates across multiple aggregates (Game, TeamLineup, InningState)
 * - Handles complex scenarios like mid-inning redo operations
 *
 * **Supported Action Types for Redo**:
 * - At-bat results (restore hits, walks, outs with all runner movements)
 * - Player substitutions (re-apply lineup changes)
 * - Inning endings (restore inning transition state)
 * - Game status changes (re-apply status transitions)
 *
 * @example
 * ```typescript
 * // Redo last undone action in current game
 * const command: RedoCommand = {
 *   gameId: GameId.create('game-123'),
 *   actionLimit: 1, // Only redo last undone action
 *   timestamp: new Date()
 * };
 *
 * // Redo last 2 undone actions with confirmation notes
 * const multiCommand: RedoCommand = {
 *   gameId: GameId.create('game-123'),
 *   actionLimit: 2, // Redo last 2 undone actions
 *   notes: 'Restoring correct sequence after review',
 *   confirmDangerous: true,
 *   timestamp: new Date()
 * };
 * ```
 */

import { GameId } from '@twsoftball/domain';

/**
 * Command to redo the last undone action(s) performed in a softball game.
 *
 * @remarks
 * This interface defines the complete information needed to safely redo
 * previously undone actions in a game using event sourcing restoration patterns.
 * It includes safety mechanisms and context information to prevent
 * accidental state corruption.
 *
 * **Redo Mechanics**:
 * - Analyzes undo events to determine what can be redone
 * - Creates events that re-apply original domain events or their equivalent
 * - Maintains referential integrity across aggregates
 * - Preserves complete audit trail for legal/regulatory compliance
 *
 * **Safety Features**:
 * - Optional confirmation for dangerous operations
 * - Limited scope to prevent accidental large-scale changes
 * - Detailed notes for audit purposes
 * - Timestamp tracking for operation sequencing
 *
 * **Redo Categories**:
 * - **Simple**: Single event redo (most at-bats, substitutions)
 * - **Complex**: Multi-event redo (inning endings, scoring plays)
 * - **Dangerous**: Game state changes, multiple action restorations
 *
 * The command supports both single action redo (most common) and
 * multi-action redo for restoring sequences of undone actions.
 *
 * **Relationship to UndoCommand**:
 * - Complementary to UndoCommand - they work together to provide full undo/redo
 * - Similar parameter structure for consistency
 * - Same safety mechanisms and dangerous operation handling
 */
export interface RedoCommand {
  /** Game where the redo operation should be performed */
  readonly gameId: GameId;

  /**
   * Maximum number of recent undone actions to redo
   * Defaults to 1 if not specified
   *
   * @remarks
   * This limit prevents accidental large-scale redo operations that could
   * destabilize game state. Values above 3 are considered dangerous and
   * may require additional confirmation.
   *
   * Common values:
   * - 1: Redo last undone action (default, safest)
   * - 2-3: Restore recent sequence of undone actions
   * - 4+: Dangerous, requires confirmDangerous = true
   */
  readonly actionLimit?: number;

  /**
   * Force confirmation for potentially dangerous redo operations
   * Required for actionLimit > 3 or certain action types
   *
   * @remarks
   * Some redo operations are considered dangerous because they can
   * significantly impact game state or statistics. This flag provides
   * explicit confirmation that the user understands the consequences.
   *
   * Dangerous scenarios include:
   * - Redoing multiple actions (actionLimit > 3)
   * - Redoing inning endings (affects multiple innings)
   * - Redoing game completions (changes final scores)
   * - Redoing critical plays (walk-off hits, game winners)
   */
  readonly confirmDangerous?: boolean;

  /**
   * Optional descriptive notes about why this redo is being performed
   * Important for audit trails and understanding decision context
   *
   * @remarks
   * These notes become part of the redo events and provide
   * valuable context for future analysis. They help explain unusual
   * redo operations and support regulatory/legal requirements.
   *
   * Examples:
   * - "Restoring correct sequence after umpire review"
   * - "Re-applying valid substitution after confusion"
   * - "Restoring game state per league director instruction"
   * - "Technical correction - original action was valid"
   */
  readonly notes?: string;

  /**
   * When this redo command was issued
   * Optional - system can generate if not provided
   *
   * @remarks
   * Timestamp helps with event ordering and understanding the sequence
   * of actions. It's particularly important when multiple redo operations
   * might be performed in rapid succession or when coordinating with
   * undo operations.
   */
  readonly timestamp?: Date;
}
