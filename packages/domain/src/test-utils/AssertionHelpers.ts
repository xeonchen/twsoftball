import { FieldPosition } from '../constants/FieldPosition';
import { DomainError } from '../errors/DomainError';
import type { TeamPlayer, BattingSlotState, TeamStrategy } from '../strategies/TeamStrategy';

/**
 * Collection of common assertion helpers to eliminate duplication in test files.
 *
 * @remarks
 * This utility provides reusable assertion patterns commonly found across domain
 * tests, with better error messages and consistent validation logic. Helps reduce
 * code duplication while improving test readability and maintainability.
 *
 * @example
 * ```typescript
 * import { AssertionHelpers } from '../test-utils';
 *
 * // Validate lineup structure
 * AssertionHelpers.expectPlayerInSlot(lineup, 1, expectedPlayer);
 *
 * // Check error throwing with specific messages
 * AssertionHelpers.expectDomainError(() => invalidOperation(), 'Expected error message');
 *
 * // Validate lineup completeness
 * AssertionHelpers.expectValidLineup(strategy);
 * ```
 */
export class AssertionHelpers {
  /**
   * Asserts that a specific player occupies the expected slot in a lineup.
   *
   * @param lineup - The lineup to check
   * @param slotNumber - The batting slot number (1-based)
   * @param expectedPlayer - The player expected to be in that slot
   * @param customMessage - Optional custom error message
   *
   * @throws {Error} If the player is not found in the expected slot
   *
   * @example
   * ```typescript
   * const lineup = TestLineupBuilder.createFullLineup(players);
   * AssertionHelpers.expectPlayerInSlot(lineup, 1, players[0]);
   *
   * // With custom message
   * AssertionHelpers.expectPlayerInSlot(
   *   lineup, 3, pitcher,
   *   'Pitcher should be batting third'
   * );
   * ```
   */
  public static expectPlayerInSlot(
    lineup: BattingSlotState[],
    slotNumber: number,
    expectedPlayer: TeamPlayer,
    customMessage?: string
  ): void {
    const slot = lineup.find(s => s.slotNumber === slotNumber);

    if (!slot) {
      throw new Error(
        customMessage ||
          `Expected slot ${slotNumber} to exist in lineup, but it was not found. ` +
            `Available slots: ${lineup.map(s => s.slotNumber).join(', ')}`
      );
    }

    const actualPlayer = slot.currentPlayer;
    const playersMatch = actualPlayer.playerId.equals(expectedPlayer.playerId);

    if (!playersMatch) {
      throw new Error(
        customMessage ||
          `Expected player ${expectedPlayer.name} (${expectedPlayer.playerId.value}) ` +
            `in slot ${slotNumber}, but found ${actualPlayer.name} (${actualPlayer.playerId.value})`
      );
    }
  }

  /**
   * Asserts that a lineup has the expected length.
   * Provides detailed error message showing actual vs expected counts.
   *
   * @param lineup - The lineup to check
   * @param expectedLength - Expected number of players in lineup
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectLineupLength(lineup, 9, 'Full lineup should have 9 players');
   * ```
   */
  public static expectLineupLength(
    lineup: BattingSlotState[],
    expectedLength: number,
    customMessage?: string
  ): void {
    if (lineup.length !== expectedLength) {
      throw new Error(
        customMessage ||
          `Expected lineup to have ${expectedLength} players, but found ${lineup.length}. ` +
            `Players: ${lineup.map(s => `${s.slotNumber}:${s.currentPlayer.name}`).join(', ')}`
      );
    }
  }

  /**
   * Asserts that a team strategy has a valid lineup according to its own validation.
   *
   * @param strategy - The team strategy to validate
   * @param customMessage - Optional custom error message
   *
   * @throws {Error} If the lineup is not valid
   *
   * @example
   * ```typescript
   * const strategy = new SimpleTeamStrategy();
   * strategy.setCurrentLineup(lineupData);
   * AssertionHelpers.expectValidLineup(strategy);
   * ```
   */
  public static expectValidLineup(strategy: TeamStrategy, customMessage?: string): void {
    const isValid = strategy.isLineupValid();

    if (!isValid) {
      const lineup = strategy.getCurrentLineup();
      throw new Error(
        customMessage ||
          `Expected lineup to be valid, but strategy.isLineupValid() returned false. ` +
            `Current lineup: ${lineup.length} players, ` +
            `slots: ${lineup.map(s => s.slotNumber).join(', ')}`
      );
    }
  }

  /**
   * Asserts that a function throws a DomainError with optional message matching.
   *
   * @param fn - Function that should throw
   * @param expectedMessage - Optional message substring to match (case-sensitive)
   * @param customMessage - Optional custom error message for assertion failure
   *
   * @throws {Error} If the function doesn't throw or throws wrong error type/message
   *
   * @example
   * ```typescript
   * // Just check that it throws DomainError
   * AssertionHelpers.expectDomainError(() => new BattingSlot(0));
   *
   * // Check error message contains specific text
   * AssertionHelpers.expectDomainError(
   *   () => new JerseyNumber(''),
   *   'cannot be empty'
   * );
   * ```
   */
  public static expectDomainError(
    fn: () => void,
    expectedMessage?: string,
    customMessage?: string
  ): void {
    let actualError: Error | undefined;
    let threwError = false;

    try {
      fn();
    } catch (error) {
      threwError = true;
      actualError = error as Error;
    }

    if (!threwError) {
      throw new Error(
        customMessage ||
          `Expected function to throw DomainError${expectedMessage ? ` with message containing '${expectedMessage}'` : ''}, ` +
            'but no error was thrown'
      );
    }

    if (!(actualError instanceof DomainError)) {
      throw new Error(
        customMessage ||
          `Expected DomainError to be thrown, but got ${actualError?.constructor.name}: ${actualError?.message}`
      );
    }

    if (expectedMessage && !actualError.message.includes(expectedMessage)) {
      throw new Error(
        customMessage ||
          `Expected DomainError message to contain '${expectedMessage}', ` +
            `but got: '${actualError.message}'`
      );
    }
  }

  /**
   * Asserts that a function does NOT throw any error.
   *
   * @param fn - Function that should not throw
   * @param customMessage - Optional custom error message
   *
   * @throws {Error} If the function throws any error
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectNoError(() => {
   *   const player = TestPlayerFactory.createPlayer('1', '10', 'Valid Name');
   * });
   * ```
   */
  public static expectNoError(fn: () => void, customMessage?: string): void {
    try {
      fn();
    } catch (error) {
      throw new Error(
        customMessage ||
          `Expected function not to throw any error, but got ${(error as Error)?.constructor.name}: ${(error as Error)?.message}`
      );
    }
  }

  /**
   * Asserts that a player has the expected field position in a lineup slot.
   *
   * @param lineup - The lineup to check
   * @param slotNumber - The batting slot number
   * @param expectedPosition - Expected field position
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectPlayerPosition(lineup, 1, FieldPosition.PITCHER);
   * ```
   */
  public static expectPlayerPosition(
    lineup: BattingSlotState[],
    slotNumber: number,
    expectedPosition: FieldPosition,
    customMessage?: string
  ): void {
    const slot = lineup.find(s => s.slotNumber === slotNumber);

    if (!slot) {
      throw new Error(
        customMessage || `Expected slot ${slotNumber} to exist in lineup for position check`
      );
    }

    if (slot.currentPosition !== expectedPosition) {
      throw new Error(
        customMessage ||
          `Expected player in slot ${slotNumber} to play ${expectedPosition}, ` +
            `but found ${slot.currentPosition}`
      );
    }
  }

  /**
   * Asserts that all slots in a lineup have unique slot numbers.
   *
   * @param lineup - The lineup to check for duplicate slots
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectUniqueSlotNumbers(lineup);
   * ```
   */
  public static expectUniqueSlotNumbers(lineup: BattingSlotState[], customMessage?: string): void {
    const slotNumbers = lineup.map(s => s.slotNumber);
    const uniqueSlots = new Set(slotNumbers);

    if (uniqueSlots.size !== slotNumbers.length) {
      const duplicates = slotNumbers.filter((slot, index) => slotNumbers.indexOf(slot) !== index);

      throw new Error(
        customMessage ||
          `Expected all slot numbers to be unique, but found duplicates: ${duplicates.join(', ')}. ` +
            `All slots: ${slotNumbers.join(', ')}`
      );
    }
  }

  /**
   * Asserts that all players in a lineup have unique jersey numbers.
   *
   * @param lineup - The lineup to check for duplicate jerseys
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectUniqueJerseyNumbers(lineup);
   * ```
   */
  public static expectUniqueJerseyNumbers(
    lineup: BattingSlotState[],
    customMessage?: string
  ): void {
    const jerseyNumbers = lineup.map(s => s.currentPlayer.jerseyNumber.value);
    const uniqueJerseys = new Set(jerseyNumbers);

    if (uniqueJerseys.size !== jerseyNumbers.length) {
      const duplicates = jerseyNumbers.filter(
        (jersey, index) => jerseyNumbers.indexOf(jersey) !== index
      );

      throw new Error(
        customMessage ||
          `Expected all jersey numbers to be unique, but found duplicates: ${duplicates.join(', ')}. ` +
            `All jerseys: ${jerseyNumbers.join(', ')}`
      );
    }
  }

  /**
   * Asserts that all players in a lineup have unique player IDs.
   *
   * @param lineup - The lineup to check for duplicate players
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectUniquePlayerIds(lineup);
   * ```
   */
  public static expectUniquePlayerIds(lineup: BattingSlotState[], customMessage?: string): void {
    const playerIds = lineup.map(s => s.currentPlayer.playerId.value);
    const uniqueIds = new Set(playerIds);

    if (uniqueIds.size !== playerIds.length) {
      const duplicates = playerIds.filter((id, index) => playerIds.indexOf(id) !== index);

      throw new Error(
        customMessage ||
          `Expected all player IDs to be unique, but found duplicates: ${duplicates.join(', ')}. ` +
            `All IDs: ${playerIds.join(', ')}`
      );
    }
  }

  /**
   * Comprehensive lineup validation combining multiple checks.
   * Validates uniqueness of slots, players, and jersey numbers.
   *
   * @param lineup - The lineup to thoroughly validate
   * @param customMessage - Optional custom error message prefix
   *
   * @example
   * ```typescript
   * AssertionHelpers.expectValidLineupStructure(lineup);
   * ```
   */
  public static expectValidLineupStructure(
    lineup: BattingSlotState[],
    customMessage?: string
  ): void {
    const prefix = customMessage ? `${customMessage}: ` : '';

    this.expectUniqueSlotNumbers(lineup, `${prefix}Slot numbers must be unique`);
    this.expectUniquePlayerIds(lineup, `${prefix}Player IDs must be unique`);
    this.expectUniqueJerseyNumbers(lineup, `${prefix}Jersey numbers must be unique`);
  }

  /**
   * Asserts that slot numbers are within the valid range (1-25 typical).
   *
   * @param lineup - The lineup to check
   * @param minSlot - Minimum valid slot number (defaults to 1)
   * @param maxSlot - Maximum valid slot number (defaults to 25)
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * // Check standard range
   * AssertionHelpers.expectValidSlotRange(lineup);
   *
   * // Check custom range
   * AssertionHelpers.expectValidSlotRange(lineup, 1, 20);
   * ```
   */
  public static expectValidSlotRange(
    lineup: BattingSlotState[],
    minSlot: number = 1,
    maxSlot: number = 25,
    customMessage?: string
  ): void {
    const invalidSlots = lineup.filter(s => s.slotNumber < minSlot || s.slotNumber > maxSlot);

    if (invalidSlots.length > 0) {
      const badSlots = invalidSlots.map(s => s.slotNumber).join(', ');
      throw new Error(
        customMessage ||
          `Expected all slot numbers to be between ${minSlot} and ${maxSlot}, ` +
            `but found invalid slots: ${badSlots}`
      );
    }
  }
}
