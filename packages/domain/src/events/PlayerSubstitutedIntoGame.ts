import { DomainEvent } from './DomainEvent';
import { GameId } from '../value-objects/GameId';
import { TeamLineupId } from '../value-objects/TeamLineupId';
import { PlayerId } from '../value-objects/PlayerId';
import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';

/**
 * Domain event representing a player substitution in the game.
 *
 * @remarks
 * This event captures when a player is substituted into the game, replacing
 * another player in both a specific batting slot and field position. In softball,
 * substitutions are permanent for the outgoing player (unless they were a starter
 * exercising re-entry rights).
 *
 * Key business rules captured:
 * - Both batting slot and field position must be specified for complete substitution
 * - Outgoing player is permanently out unless they were a starter (re-entry rules)
 * - Incoming player takes over both offensive (batting) and defensive (fielding) duties
 * - Timing is captured for statistical and rule enforcement purposes
 *
 * @example
 * ```typescript
 * // Substitute a player in the 5th batting slot and right field position
 * const substitution = new PlayerSubstitutedIntoGame(
 *   gameId,
 *   teamLineupId,
 *   5, // batting slot
 *   new PlayerId('original-player'),
 *   new PlayerId('substitute-player'),
 *   FieldPosition.RIGHT_FIELD,
 *   7 // inning when substitution occurs
 * );
 * ```
 */
export class PlayerSubstitutedIntoGame extends DomainEvent {
  readonly type = 'PlayerSubstitutedIntoGame';

  constructor(
    /** The unique identifier of the game where the substitution occurs */
    readonly gameId: GameId,
    /** The unique identifier of the team lineup being modified */
    readonly teamLineupId: TeamLineupId,
    /** The batting slot position in the lineup (1-20) */
    readonly battingSlot: number,
    /** The unique identifier of the player being substituted out */
    readonly outgoingPlayerId: PlayerId,
    /** The unique identifier of the player being substituted in */
    readonly incomingPlayerId: PlayerId,
    /** The field position the incoming player will play */
    readonly fieldPosition: FieldPosition,
    /** The inning number when this substitution occurs (1 or greater) */
    readonly inning: number
  ) {
    super();
    PlayerSubstitutedIntoGame.validateBattingSlot(battingSlot);
    PlayerSubstitutedIntoGame.validateInning(inning);
    PlayerSubstitutedIntoGame.validatePlayersDifferent(outgoingPlayerId, incomingPlayerId);
  }

  /**
   * Validates that the batting slot is within the allowed range for softball.
   *
   * @param battingSlot - The batting slot to validate
   * @throws {DomainError} When batting slot is not between 1 and 20
   *
   * @remarks
   * Softball allows up to 20 players in the batting order to accommodate
   * Extra Players (EP/DH) and flexible substitution strategies. Standard
   * games typically use 10-12 players, but tournament play can use more.
   */
  private static validateBattingSlot(battingSlot: number): void {
    if (battingSlot < 1 || battingSlot > 20) {
      throw new DomainError('Batting slot must be between 1 and 20');
    }
  }

  /**
   * Validates that the inning is a positive number.
   *
   * @param inning - The inning to validate
   * @throws {DomainError} When inning is less than 1
   *
   * @remarks
   * Substitutions can occur at any inning during the game. While most
   * substitutions happen between innings, they can also occur during
   * an inning between at-bats or during timeouts.
   */
  private static validateInning(inning: number): void {
    if (inning < 1) {
      throw new DomainError('Inning must be 1 or greater');
    }
  }

  /**
   * Validates that outgoing and incoming players are different.
   *
   * @param outgoingPlayer - The player being substituted out
   * @param incomingPlayer - The player being substituted in
   * @throws {DomainError} When both player IDs are the same
   *
   * @remarks
   * A substitution must involve two different players. While a starter
   * can re-enter the game later, they cannot substitute for themselves
   * in the same transaction.
   */
  private static validatePlayersDifferent(
    outgoingPlayer: PlayerId,
    incomingPlayer: PlayerId
  ): void {
    if (outgoingPlayer.equals(incomingPlayer)) {
      throw new DomainError('Outgoing and incoming players must be different');
    }
  }
}
