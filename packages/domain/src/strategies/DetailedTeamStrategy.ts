import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { SoftballRules } from '../rules/SoftballRules.js';
import { PlayerId } from '../value-objects/PlayerId.js';

import { BaseTeamStrategy } from './BaseTeamStrategy.js';
import type { TeamPlayer, BattingSlotState } from './TeamStrategy.js';

/**
 * Represents a change in a player's field position during the game.
 *
 * @remarks
 * Position changes track defensive adjustments made during gameplay, such as:
 * - Strategic repositioning based on batter tendencies
 * - Moving players between positions for defensive optimization
 * - Pitcher/fielder position swaps
 *
 * This information is crucial for understanding defensive strategy and
 * maintaining accurate game records.
 */
export interface PositionChange {
  /** The position the player was playing before the change */
  readonly from: FieldPosition;
  /** The position the player moved to */
  readonly to: FieldPosition;
  /** When the position change occurred (for future game timing features) */
  readonly timestamp?: Date;
}

/**
 * Detailed substitution and participation history for a player.
 *
 * @remarks
 * This interface tracks comprehensive player information throughout the game,
 * enabling proper enforcement of softball re-entry rules and providing
 * detailed game analytics.
 *
 * **Re-entry Rules in Softball**:
 * - **Starters**: Can re-enter the game once after being substituted out,
 *   but only in their original batting slot
 * - **Substitutes**: Cannot re-enter the game once they've been removed
 * - **Violations**: Result in illegal lineup and potential forfeit
 *
 * **Historical Tracking**: Enables post-game analysis of:
 * - Player utilization patterns
 * - Coaching substitution strategies
 * - Position flexibility and defensive adjustments
 */
export interface PlayerSubstitutionHistory {
  /** Whether this player was in the starting lineup */
  readonly isStarter: boolean;
  /** Number of times this player has been substituted out */
  readonly timesSubstituted: number;
  /** Whether this player is eligible to re-enter the game */
  readonly canReenter: boolean;
  /** History of all position changes during the game */
  readonly positionChanges: PositionChange[];
}

/**
 * Comprehensive team strategy implementation with full player tracking.
 *
 * @remarks
 * DetailedTeamStrategy provides complete team management capabilities including:
 *
 * **Core Features**:
 * - Complete batting lineup management (1-20 slots)
 * - Comprehensive substitution history tracking
 * - Re-entry rule enforcement for starters vs. substitutes
 * - Position change history and validation
 * - Full roster tracking (active and bench players)
 *
 * **Softball-Specific Rules Enforced**:
 * - **Batting Order**: Players must maintain their assigned batting slot
 * - **Re-entry**: Starters can re-enter once, substitutes cannot
 * - **Position Requirements**: Validates defensive position coverage
 * - **Lineup Limits**: Supports 1-20 batting slots with Extra Player rules
 *
 * **Business Logic**:
 * - Prevents duplicate players in multiple slots
 * - Enforces valid batting slot ranges (1-20)
 * - Tracks detailed substitution history for rule compliance
 * - Maintains data integrity across complex lineup changes
 *
 * **Use Cases**:
 * - Tournament play requiring detailed record keeping
 * - Competitive leagues with strict substitution rules
 * - Statistical analysis and game review
 * - Coaching tools for lineup optimization
 *
 * @example
 * ```typescript
 * const strategy = new DetailedTeamStrategy();
 *
 * // Add starting lineup
 * await strategy.addPlayer(pitcher, 1, FieldPosition.PITCHER);
 * await strategy.addPlayer(catcher, 2, FieldPosition.CATCHER);
 *
 * // Handle substitution with re-entry tracking
 * strategy.substitutePlayer(1, pitcher.playerId, reliefPitcher, FieldPosition.PITCHER);
 *
 * // Check if starter can re-enter
 * const history = strategy.getPlayerSubstitutionHistory(pitcher.playerId);
 * if (history?.canReenter) {
 *   strategy.substitutePlayer(1, reliefPitcher.playerId, pitcher, FieldPosition.PITCHER);
 * }
 *
 * // Validate lineup for game start
 * if (strategy.isLineupValid()) {
 *   // Ready for play
 * }
 * ```
 */
export class DetailedTeamStrategy extends BaseTeamStrategy {
  /** All players that have been part of this team, indexed by player ID */
  private readonly allPlayers = new Map<string, TeamPlayer>();

  /** Substitution and participation history for each player */
  private readonly playerHistories = new Map<string, PlayerSubstitutionHistory>();

  /**
   * Adds a new player to the batting lineup at the specified slot.
   *
   * @param player - The player to add to the lineup
   * @param battingSlot - The batting slot number (1-20) to assign
   * @param fieldPosition - The defensive position for this player
   *
   * @throws {DomainError} When batting slot is invalid, occupied, or player already in lineup
   *
   * @remarks
   * This method handles initial lineup construction, typically used before
   * game start. Players added through this method are considered "starters"
   * and are eligible for re-entry according to softball rules.
   *
   * **Validation Rules**:
   * - Batting slot must be between 1 and 20 (inclusive)
   * - Batting slot must not already be occupied
   * - Player cannot already be in the lineup
   * - All parameters must be valid and defined
   *
   * **Starter Benefits**:
   * - Can re-enter the game once after substitution
   * - Original batting slot is preserved for re-entry
   * - Position changes are tracked but don't affect re-entry eligibility
   */
  addPlayer(
    player: TeamPlayer,
    battingSlot: number,
    fieldPosition: FieldPosition,
    rules: SoftballRules = new SoftballRules()
  ): void {
    DetailedTeamStrategy.validateBattingSlot(battingSlot, rules);

    if (this.lineupSlots.has(battingSlot)) {
      throw new DomainError(`Batting slot ${battingSlot} is already occupied`);
    }

    if (this.isPlayerInLineup(player.playerId)) {
      throw new DomainError('Player is already in the lineup');
    }

    // Add player to lineup
    this.lineupSlots.set(battingSlot, {
      slotNumber: battingSlot,
      currentPlayer: player,
      currentPosition: fieldPosition,
    });

    // Track player in roster
    this.allPlayers.set(player.playerId.value, player);

    // Initialize history as starter
    this.playerHistories.set(player.playerId.value, {
      isStarter: true,
      timesSubstituted: 0,
      canReenter: true,
      positionChanges: [],
    });
  }

  /**
   * Processes a player substitution in the lineup.
   *
   * @param battingSlot - The batting slot number (1-20) where substitution occurs
   * @param outgoingPlayerId - The player being substituted out
   * @param incomingPlayer - The new player entering the game
   * @param fieldPosition - The field position for the incoming player
   *
   * @throws {DomainError} When batting slot is invalid, players are not eligible, or re-entry rules are violated
   *
   * @remarks
   * This method handles the complex logic of player substitutions, including:
   *
   * **Validation Checks**:
   * - Batting slot must be valid and occupied
   * - Outgoing player must be the current occupant of the slot
   * - Incoming player must not already be in the lineup
   * - Re-entry rules must be respected
   *
   * **Re-entry Rule Enforcement**:
   * - **Starters**: Can re-enter once after being substituted out
   * - **Non-starters**: Cannot re-enter once removed from the game
   * - **Tracking**: Updates substitution history for both players
   *
   * **State Management**:
   * - Updates batting lineup with new player
   * - Maintains player roster and history records
   * - Preserves data integrity across complex substitution patterns
   */
  substitutePlayer(
    battingSlot: number,
    outgoingPlayerId: PlayerId,
    incomingPlayer: TeamPlayer,
    fieldPosition: FieldPosition,
    rules: SoftballRules = new SoftballRules()
  ): void {
    DetailedTeamStrategy.validateBattingSlot(battingSlot, rules);

    const currentSlot = this.lineupSlots.get(battingSlot);
    if (!currentSlot) {
      throw new DomainError(`No player found in batting slot ${battingSlot}`);
    }

    if (!currentSlot.currentPlayer.playerId.equals(outgoingPlayerId)) {
      throw new DomainError(
        `Player ${outgoingPlayerId.value} is not in batting slot ${battingSlot}`
      );
    }

    // Check if incoming player is already in lineup
    if (this.isPlayerInLineup(incomingPlayer.playerId)) {
      throw new DomainError('Player is already in the lineup');
    }

    // Check re-entry rules for incoming player
    const incomingHistory = this.playerHistories.get(incomingPlayer.playerId.value);
    if (incomingHistory && !incomingHistory.canReenter) {
      throw new DomainError('Player cannot re-enter the game');
    }

    // Update outgoing player history
    const outgoingHistory = this.playerHistories.get(outgoingPlayerId.value)!;
    this.playerHistories.set(outgoingPlayerId.value, {
      ...outgoingHistory,
      timesSubstituted: outgoingHistory.timesSubstituted + 1,
      canReenter: outgoingHistory.isStarter && outgoingHistory.timesSubstituted === 0,
    });

    // Update or create incoming player history
    if (incomingHistory) {
      // Player is re-entering - they can no longer re-enter again
      this.playerHistories.set(incomingPlayer.playerId.value, {
        ...incomingHistory,
        canReenter: false,
      });
    } else {
      // New player (substitute) - cannot re-enter
      this.playerHistories.set(incomingPlayer.playerId.value, {
        isStarter: false,
        timesSubstituted: 0,
        canReenter: false,
        positionChanges: [],
      });
    }

    // Update lineup and roster
    this.lineupSlots.set(battingSlot, {
      slotNumber: battingSlot,
      currentPlayer: incomingPlayer,
      currentPosition: fieldPosition,
    });

    this.allPlayers.set(incomingPlayer.playerId.value, incomingPlayer);
  }

  /**
   * Changes a player's field position without substitution.
   *
   * @param playerId - The player changing positions
   * @param newPosition - The new field position
   *
   * @throws {DomainError} When player is not in lineup or position is invalid
   *
   * @remarks
   * This method handles defensive position changes during the game, such as:
   * - Strategic repositioning based on batter tendencies
   * - Moving players between positions for defensive optimization
   * - Handling pitcher/fielder position swaps
   *
   * **Position History**: All position changes are tracked in the player's
   * history for game analysis and coaching review. This information can
   * reveal defensive strategies and player versatility.
   *
   * **Batting Order**: Unlike substitution, position changes do not affect
   * the batting order or re-entry eligibility. The player maintains their
   * batting slot and substitution status.
   */
  changePlayerPosition(playerId: PlayerId, newPosition: FieldPosition): void {
    let targetSlot: BattingSlotState | undefined;
    let slotNumber: number | undefined;

    // Find the player's current slot
    const entries = Array.from(this.lineupSlots.entries());
    const foundEntry = entries.find(([, state]) => state.currentPlayer.playerId.equals(playerId));
    if (foundEntry) {
      [slotNumber, targetSlot] = foundEntry;
    }

    if (!targetSlot || slotNumber === undefined) {
      throw new DomainError('Player is not currently in the lineup');
    }

    const oldPosition = targetSlot.currentPosition;

    // Update position in lineup
    this.lineupSlots.set(slotNumber, {
      ...targetSlot,
      currentPosition: newPosition,
    });

    // Track position change in history
    const history = this.playerHistories.get(playerId.value)!;
    this.playerHistories.set(playerId.value, {
      ...history,
      positionChanges: [
        ...history.positionChanges,
        {
          from: oldPosition,
          to: newPosition,
          timestamp: new Date(),
        },
      ],
    });
  }

  /**
   * Gets the substitution and participation history for a specific player.
   *
   * @param playerId - The unique identifier of the player
   * @returns The player's history or undefined if player not tracked
   *
   * @remarks
   * This method provides comprehensive tracking information for a player,
   * including their substitution status, re-entry eligibility, and position
   * change history.
   *
   * **Information Provided**:
   * - Whether player was a starter or substitute
   * - Number of times substituted out
   * - Current re-entry eligibility
   * - Complete position change history
   *
   * **Use Cases**:
   * - Validating re-entry eligibility before substitutions
   * - Post-game analysis of player utilization
   * - Coaching decisions based on player history
   * - Rule compliance verification
   */
  getPlayerSubstitutionHistory(playerId: PlayerId): PlayerSubstitutionHistory | undefined {
    return this.playerHistories.get(playerId.value);
  }

  /**
   * Gets all players that have been part of this team's roster.
   *
   * @returns Array of all players who have been added to the team
   *
   * @remarks
   * This method returns the complete roster of players who have participated
   * in the game, including:
   * - Current active players in the lineup
   * - Players who have been substituted out
   * - Bench players who entered as substitutes
   *
   * **Roster Management**: Maintains the complete team roster throughout
   * the game, enabling comprehensive team management and post-game analysis.
   *
   * **Immutability**: Returns a new array to prevent external modification
   * of the internal roster state.
   */
  getAllPlayers(): TeamPlayer[] {
    return Array.from(this.allPlayers.values());
  }
}
