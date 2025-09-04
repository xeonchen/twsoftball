import { FieldPosition } from '../constants/FieldPosition';
import type { TeamPlayer, BattingSlotState } from '../strategies/TeamStrategy';

import { TestPlayerFactory } from './TestPlayerFactory';

/**
 * Builder for creating test lineups with consistent patterns.
 *
 * @remarks
 * This utility eliminates duplicated lineup construction code across test files.
 * Provides methods for creating standard softball lineups with proper positioning
 * and slot assignments. Supports both minimal (9-player) and full lineups.
 *
 * @example
 * ```typescript
 * // Create standard 9-player lineup
 * const lineup = TestLineupBuilder.createFullLineup();
 *
 * // Create lineup with specific players
 * const players = TestPlayerFactory.createPlayers(9);
 * const lineup = TestLineupBuilder.createFullLineup(players);
 *
 * // Create custom lineup configuration
 * const lineup = TestLineupBuilder.createCustomLineup([
 *   { player: player1, position: FieldPosition.PITCHER, slot: 1 },
 *   { player: player2, position: FieldPosition.CATCHER, slot: 2 },
 * ]);
 * ```
 */
export class TestLineupBuilder {
  /**
   * Standard defensive position assignments for a 9-player softball lineup.
   * Follows typical softball positioning strategy.
   */
  public static readonly STANDARD_POSITIONS: readonly FieldPosition[] = [
    FieldPosition.PITCHER, // Slot 1
    FieldPosition.CATCHER, // Slot 2
    FieldPosition.FIRST_BASE, // Slot 3
    FieldPosition.SECOND_BASE, // Slot 4
    FieldPosition.THIRD_BASE, // Slot 5
    FieldPosition.SHORTSTOP, // Slot 6
    FieldPosition.LEFT_FIELD, // Slot 7
    FieldPosition.CENTER_FIELD, // Slot 8
    FieldPosition.RIGHT_FIELD, // Slot 9
  ] as const;

  /**
   * Extended defensive position assignments for 10-player slow-pitch softball.
   * Includes the additional short fielder position.
   */
  public static readonly EXTENDED_POSITIONS: readonly FieldPosition[] = [
    ...TestLineupBuilder.STANDARD_POSITIONS,
    FieldPosition.SHORT_FIELDER, // Slot 10
  ] as const;

  /**
   * Creates a complete 9-player lineup with standard positions.
   *
   * @param players - Optional array of players to use (defaults to created players)
   * @returns Array of BattingSlotState representing a full lineup
   *
   * @throws {Error} If players array length doesn't match expected lineup size
   *
   * @example
   * ```typescript
   * // With default players
   * const lineup = TestLineupBuilder.createFullLineup();
   * expect(lineup).toHaveLength(9);
   * expect(lineup[0].currentPosition).toBe(FieldPosition.PITCHER);
   *
   * // With custom players
   * const players = TestPlayerFactory.createPlayers(9);
   * const lineup = TestLineupBuilder.createFullLineup(players);
   * expect(lineup[0].currentPlayer).toBe(players[0]);
   * ```
   */
  public static createFullLineup(players?: TeamPlayer[]): BattingSlotState[] {
    const lineupPlayers = players || TestPlayerFactory.createPlayers(9);

    if (lineupPlayers.length !== 9) {
      throw new Error(`Expected 9 players for full lineup, got ${lineupPlayers.length}`);
    }

    return lineupPlayers.map((player, index) => ({
      slotNumber: index + 1,
      currentPlayer: player,
      currentPosition: this.STANDARD_POSITIONS[index]!,
    }));
  }

  /**
   * Creates a minimal valid lineup for testing basic functionality.
   * Uses default players and standard positions.
   *
   * @param size - Size of lineup to create (1-9, defaults to 9)
   * @returns Array of BattingSlotState for the minimal lineup
   *
   * @example
   * ```typescript
   * // Minimal 9-player lineup
   * const lineup = TestLineupBuilder.createMinimalLineup();
   *
   * // Minimal 3-player lineup for testing
   * const smallLineup = TestLineupBuilder.createMinimalLineup(3);
   * expect(smallLineup).toHaveLength(3);
   * ```
   */
  public static createMinimalLineup(size: number = 9): BattingSlotState[] {
    if (size < 1 || size > 9) {
      throw new Error(`Lineup size must be between 1 and 9, got ${size}`);
    }

    const players = TestPlayerFactory.createPlayers(size);

    return players.map((player, index) => ({
      slotNumber: index + 1,
      currentPlayer: player,
      currentPosition: this.STANDARD_POSITIONS[index]!,
    }));
  }

  /**
   * Creates a custom lineup with specific player-position-slot assignments.
   *
   * @param slots - Array of custom slot configurations
   * @returns Array of BattingSlotState matching the provided specifications
   *
   * @example
   * ```typescript
   * const players = TestPlayerFactory.createPlayers(2);
   * const lineup = TestLineupBuilder.createCustomLineup([
   *   { player: players[0], position: FieldPosition.PITCHER, slot: 1 },
   *   { player: players[1], position: FieldPosition.CATCHER, slot: 9 }, // Non-sequential
   * ]);
   *
   * expect(lineup).toHaveLength(2);
   * expect(lineup[1].slotNumber).toBe(9);
   * ```
   */
  public static createCustomLineup(
    slots: Array<{
      player: TeamPlayer;
      position: FieldPosition;
      slot: number;
    }>
  ): BattingSlotState[] {
    return slots.map(({ player, position, slot }) => ({
      slotNumber: slot,
      currentPlayer: player,
      currentPosition: position,
    }));
  }

  /**
   * Creates a 10-player slow-pitch softball lineup with short fielder.
   *
   * @param players - Optional array of 10 players to use
   * @returns Array of BattingSlotState for 10-player lineup
   *
   * @throws {Error} If players array doesn't contain exactly 10 players
   *
   * @example
   * ```typescript
   * const lineup = TestLineupBuilder.createSlowPitchLineup();
   * expect(lineup).toHaveLength(10);
   * expect(lineup[9].currentPosition).toBe(FieldPosition.SHORT_FIELDER);
   * ```
   */
  public static createSlowPitchLineup(players?: TeamPlayer[]): BattingSlotState[] {
    const lineupPlayers = players || TestPlayerFactory.createPlayers(10);

    if (lineupPlayers.length !== 10) {
      throw new Error(`Expected 10 players for slow-pitch lineup, got ${lineupPlayers.length}`);
    }

    return lineupPlayers.map((player, index) => ({
      slotNumber: index + 1,
      currentPlayer: player,
      currentPosition: this.EXTENDED_POSITIONS[index]!,
    }));
  }

  /**
   * Creates a lineup with specific positions for all players.
   * Useful when testing position-specific validation logic.
   *
   * @param positions - Array of positions to assign to players
   * @param players - Optional players to use (defaults to created players)
   * @returns Array of BattingSlotState with specified positions
   *
   * @example
   * ```typescript
   * // All pitchers lineup (for testing position validation)
   * const allPitchers = Array(9).fill(FieldPosition.PITCHER);
   * const lineup = TestLineupBuilder.createLineupWithPositions(allPitchers);
   *
   * expect(lineup.every(slot => slot.currentPosition === FieldPosition.PITCHER)).toBe(true);
   * ```
   */
  public static createLineupWithPositions(
    positions: FieldPosition[],
    players?: TeamPlayer[]
  ): BattingSlotState[] {
    const lineupPlayers = players || TestPlayerFactory.createPlayers(positions.length);

    if (lineupPlayers.length !== positions.length) {
      throw new Error(
        `Players array length (${lineupPlayers.length}) must match positions array length (${positions.length})`
      );
    }

    return lineupPlayers.map((player, index) => ({
      slotNumber: index + 1,
      currentPlayer: player,
      currentPosition: positions[index]!,
    }));
  }

  /**
   * Creates lineup slots with non-sequential slot numbers.
   * Useful for testing slot number validation and gaps in lineups.
   *
   * @param slotNumbers - Array of specific slot numbers to use
   * @param players - Optional players to use (defaults to created players)
   * @returns Array of BattingSlotState with specified slot numbers
   *
   * @example
   * ```typescript
   * // Create lineup with gaps (slots 1, 3, 5)
   * const lineup = TestLineupBuilder.createLineupWithSlots([1, 3, 5]);
   * expect(lineup[0].slotNumber).toBe(1);
   * expect(lineup[1].slotNumber).toBe(3);
   * expect(lineup[2].slotNumber).toBe(5);
   * ```
   */
  public static createLineupWithSlots(
    slotNumbers: number[],
    players?: TeamPlayer[]
  ): BattingSlotState[] {
    const lineupPlayers = players || TestPlayerFactory.createPlayers(slotNumbers.length);

    if (lineupPlayers.length !== slotNumbers.length) {
      throw new Error(
        `Players array length (${lineupPlayers.length}) must match slot numbers array length (${slotNumbers.length})`
      );
    }

    return lineupPlayers.map((player, index) => ({
      slotNumber: slotNumbers[index]!,
      currentPlayer: player,
      currentPosition: this.STANDARD_POSITIONS[index % this.STANDARD_POSITIONS.length]!,
    }));
  }

  /**
   * Creates an empty lineup for testing initialization scenarios.
   *
   * @returns Empty array representing no lineup
   *
   * @example
   * ```typescript
   * const lineup = TestLineupBuilder.createEmptyLineup();
   * expect(lineup).toHaveLength(0);
   * expect(lineup).toEqual([]);
   * ```
   */
  public static createEmptyLineup(): BattingSlotState[] {
    return [];
  }
}
