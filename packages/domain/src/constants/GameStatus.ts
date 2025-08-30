/**
 * Enumeration of possible game lifecycle states in softball.
 *
 * @remarks
 * GameStatus tracks the high-level state of a softball game through its complete
 * lifecycle. These states control which operations are permitted and how the
 * game progresses:
 *
 * **State Transitions**:
 * NOT_STARTED → IN_PROGRESS → COMPLETED
 *
 * **Business Rules**:
 * - NOT_STARTED: Game setup phase, lineups can be modified, no at-bats recorded
 * - IN_PROGRESS: Active gameplay, at-bats recorded, scores tracked, lineups locked
 * - COMPLETED: Game finished (regulation or mercy rule), no further modifications
 *
 * **Domain Context**: Status determines what operations are valid at any point.
 * For example, lineup changes are only allowed before game starts, while
 * at-bat recording is only valid during active gameplay.
 *
 * @example
 * ```typescript
 * // Game lifecycle progression
 * let status = GameStatus.NOT_STARTED;
 *
 * // Start the game
 * status = GameStatus.IN_PROGRESS;
 *
 * // Complete the game (regulation or mercy rule)
 * status = GameStatus.COMPLETED;
 *
 * // Use status to control operations
 * if (status === GameStatus.IN_PROGRESS) {
 *   // Allow at-bat recording
 * }
 * ```
 */
export enum GameStatus {
  /** Game has been created but not yet started - setup phase */
  NOT_STARTED = 'NOT_STARTED',
  /** Game is actively being played - gameplay phase */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Game has finished (regulation, mercy rule, or forfeit) - final phase */
  COMPLETED = 'COMPLETED',
}
