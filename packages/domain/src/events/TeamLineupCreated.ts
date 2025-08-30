import { DomainEvent } from './DomainEvent';
import { TeamLineupId } from '../value-objects/TeamLineupId';
import { GameId } from '../value-objects/GameId';

/**
 * Domain event representing the creation of a new team lineup.
 *
 * @remarks
 * This event is emitted when a new team lineup is created for a softball game.
 * It establishes the initial state of a team's batting order and defensive alignment
 * management system.
 *
 * The event serves as the foundation for all subsequent lineup modifications including
 * player additions, substitutions, position changes, and batting order adjustments.
 *
 * @example
 * ```typescript
 * const event = new TeamLineupCreated(
 *   teamLineupId,
 *   gameId,
 *   'Springfield Tigers'
 * );
 * ```
 */
export class TeamLineupCreated extends DomainEvent {
  readonly type = 'TeamLineupCreated';

  constructor(
    /** The unique identifier of the team lineup being created */
    readonly teamLineupId: TeamLineupId,
    /** The unique identifier of the game this lineup belongs to */
    readonly gameId: GameId,
    /** The name of the team this lineup represents */
    readonly teamName: string
  ) {
    super();
  }
}
