import { AtBatResultType } from '../constants/AtBatResultType.js';
import { DomainError } from '../errors/DomainError.js';
import { GameId } from '../value-objects/GameId.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { DomainEvent } from './DomainEvent.js';

export class AtBatCompleted extends DomainEvent {
  readonly type = 'AtBatCompleted';

  constructor(
    /** The unique identifier of the game */
    readonly gameId: GameId,
    /** The unique identifier of the batter */
    readonly batterId: PlayerId,
    /** The batting slot position in the lineup (1-20) */
    readonly battingSlot: number,
    /** The result of the at-bat (hit, out, walk, etc.) */
    readonly result: AtBatResultType,
    /** The inning number when this at-bat occurred (1 or greater) */
    readonly inning: number,
    /**
     * Number of outs before this at-bat was completed (0-2).
     * If outs is 2 and the result causes an out, this creates the 3rd out and ends the inning.
     */
    readonly outs: number
  ) {
    super();
    AtBatCompleted.validateBattingSlot(battingSlot);
    AtBatCompleted.validateInning(inning);
    AtBatCompleted.validateOuts(outs);
  }

  private static validateBattingSlot(battingSlot: number): void {
    if (battingSlot < 1 || battingSlot > 20) {
      throw new DomainError('Batting slot must be between 1 and 20');
    }
  }

  private static validateInning(inning: number): void {
    if (inning < 1) {
      throw new DomainError('Inning must be 1 or greater');
    }
  }

  private static validateOuts(outs: number): void {
    if (outs < 0 || outs > 2) {
      throw new DomainError('Outs before at-bat must be between 0 and 2');
    }
  }
}
