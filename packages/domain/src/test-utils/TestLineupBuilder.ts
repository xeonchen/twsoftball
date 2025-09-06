import { FieldPosition } from '../constants/FieldPosition';
import type { TeamPlayer, BattingSlotState } from '../strategies/TeamStrategy';

import { TestPlayerFactory } from './TestPlayerFactory';

/**
 * Builder for creating test lineups with consistent patterns.
 *
 * @remarks
 * This utility eliminates duplicated lineup construction code across test files.
 * Provides methods for creating softball lineups with proper positioning and slot
 * assignments. Supports common lineup configurations:
 *
 * - 9-player: Minimum/boundary case without SHORT_FIELDER
 * - 10-player standard: Most common configuration with SHORT_FIELDER
 * - 11-12 player: Common setups with 1-2 EXTRA_PLAYERs
 *
 * @example
 * ```typescript
 * // Create 10-player standard lineup
 * const lineup = TestLineupBuilder.createStandardLineup();
 *
 * // Create 9-player boundary case
 * const lineup = TestLineupBuilder.createNinePlayerLineup();
 *
 * // Create lineup with specific players
 * const players = TestPlayerFactory.createPlayers(10);
 * const lineup = TestLineupBuilder.createStandardLineup(players);
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
   * Standard defensive position assignments for a 10-player slow-pitch softball lineup.
   * This is the most common configuration in slow-pitch softball.
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
    FieldPosition.SHORT_FIELDER, // Slot 10 - Standard in slow-pitch
  ] as const;

  /**
   * Nine-player defensive positions for boundary case testing.
   * Traditional lineup without SHORT_FIELDER (valid but less frequent).
   */
  public static readonly NINE_PLAYER_POSITIONS: readonly FieldPosition[] = [
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
   * Creates a complete 10-player lineup with standard slow-pitch positions.
   *
   * This is the most common softball lineup configuration, including the
   * SHORT_FIELDER position that distinguishes slow-pitch from traditional baseball.
   *
   * @param players - Optional array of players to use (defaults to created players)
   * @returns Array of BattingSlotState representing the standard 10-player lineup
   *
   * @throws {Error} If players array length doesn't match expected lineup size
   *
   * @example
   * ```typescript
   * // With default players - most common configuration
   * const lineup = TestLineupBuilder.createStandardLineup();
   * expect(lineup).toHaveLength(10);
   * expect(lineup[0].currentPosition).toBe(FieldPosition.PITCHER);
   * expect(lineup[9].currentPosition).toBe(FieldPosition.SHORT_FIELDER);
   *
   * // With custom players
   * const players = TestPlayerFactory.createPlayers(10);
   * const lineup = TestLineupBuilder.createStandardLineup(players);
   * expect(lineup[0].currentPlayer).toBe(players[0]);
   * ```
   */
  public static createStandardLineup(players?: TeamPlayer[]): BattingSlotState[] {
    const lineupPlayers = players || TestPlayerFactory.createPlayers(10);

    if (lineupPlayers.length !== 10) {
      throw new Error(`Expected 10 players for standard lineup, got ${lineupPlayers.length}`);
    }

    return lineupPlayers.map((player, index) => ({
      slotNumber: index + 1,
      currentPlayer: player,
      currentPosition: this.STANDARD_POSITIONS[index]!,
    }));
  }

  /**
   * Creates a 9-player lineup for boundary case testing.
   *
   * This configuration represents the minimum valid lineup size, using traditional
   * positions without the SHORT_FIELDER. Valid but less frequent in slow-pitch softball.
   *
   * @param players - Optional array of players to use (defaults to created players)
   * @returns Array of BattingSlotState representing a 9-player boundary case lineup
   *
   * @throws {Error} If players array length doesn't match expected lineup size
   */
  public static createNinePlayerLineup(players?: TeamPlayer[]): BattingSlotState[] {
    const lineupPlayers = players || TestPlayerFactory.createPlayers(9);

    if (lineupPlayers.length !== 9) {
      throw new Error(`Expected 9 players for nine-player lineup, got ${lineupPlayers.length}`);
    }

    return lineupPlayers.map((player, index) => ({
      slotNumber: index + 1,
      currentPlayer: player,
      currentPosition: this.NINE_PLAYER_POSITIONS[index]!,
    }));
  }

  /**
   * Creates a complete lineup with standard positions (alias for createStandardLineup).
   *
   * @deprecated Use createStandardLineup() for 10-player standard or createNinePlayerLineup() for 9-player boundary cases
   * @param players - Optional array of players to use
   * @returns Array of BattingSlotState representing a standard 10-player lineup
   */
  public static createFullLineup(players?: TeamPlayer[]): BattingSlotState[] {
    return this.createStandardLineup(players);
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
   * This method is an alias for createStandardLineup(), representing the most
   * common slow-pitch softball configuration with SHORT_FIELDER.
   *
   * @param players - Optional array of 10 players to use
   * @returns Array of BattingSlotState for standard 10-player lineup
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
      currentPosition: this.STANDARD_POSITIONS[index]!,
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
      currentPosition:
        index < this.STANDARD_POSITIONS.length
          ? this.STANDARD_POSITIONS[index]!
          : FieldPosition.EXTRA_PLAYER,
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
