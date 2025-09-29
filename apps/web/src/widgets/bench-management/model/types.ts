/**
 * @file Bench Management Widget Model Types
 *
 * Core type definitions for the bench management widget model layer.
 * These types define the business logic interfaces used throughout the widget.
 */

/**
 * Player eligibility information for substitution decisions
 *
 * @remarks
 * This interface encapsulates all the business rules and restrictions
 * that determine whether a player can be substituted into the game.
 * It provides a clear API for the UI layer to understand player status
 * without needing to know the underlying business logic.
 */
export interface PlayerEligibility {
  /** Whether the player can be substituted into the game */
  canSubstitute: boolean;
  /** Whether the player can re-enter after being substituted */
  canReenter: boolean;
  /** Array of restriction messages explaining why substitution might be limited */
  restrictions: string[];
}
