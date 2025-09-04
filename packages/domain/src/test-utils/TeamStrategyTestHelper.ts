import { FieldPosition } from '../constants/FieldPosition';
import type { TeamPlayer, TeamStrategy, BattingSlotState } from '../strategies/TeamStrategy';

import { TestPlayerFactory } from './TestPlayerFactory';

/**
 * Test helper for team strategy testing operations.
 *
 * @remarks
 * This utility reduces code duplication in team strategy test files by providing
 * common setup operations and validation patterns. Follows the factory pattern
 * established by TestPlayerFactory.
 *
 * **Key Benefits:**
 * - Eliminates duplicated lineup setup code across strategy tests
 * - Provides standardized test scenarios for substitutions and position changes
 * - Offers consistent validation assertions for lineup states
 * - Supports both basic (9-player) and full (20-player) lineup scenarios
 *
 * **Common Use Cases:**
 * - Setting up valid lineups for testing strategy operations
 * - Creating substitution test scenarios with realistic data
 * - Testing position change operations
 * - Validating lineup state after operations
 *
 * @example
 * ```typescript
 * // Setup basic 9-player lineup
 * const players = TeamStrategyTestHelper.setupBasicLineup(strategy);
 *
 * // Setup full 20-player lineup for extensive testing
 * const fullPlayers = TeamStrategyTestHelper.setupFullLineup(strategy);
 *
 * // Create substitution test scenario
 * const sub = TeamStrategyTestHelper.createSubstitutionScenario();
 * strategy.substitutePlayer(sub.battingSlot, sub.substitutePlayer, sub.fieldPosition);
 *
 * // Validate lineup is in correct state
 * TeamStrategyTestHelper.assertLineupValid(strategy);
 * ```
 */
export class TeamStrategyTestHelper {
  /**
   * Default field positions used for lineup setup.
   * Represents typical softball defensive positions in batting order.
   */
  private static readonly DEFAULT_POSITIONS = [
    FieldPosition.PITCHER, // Slot 1
    FieldPosition.CATCHER, // Slot 2
    FieldPosition.FIRST_BASE, // Slot 3
    FieldPosition.SECOND_BASE, // Slot 4
    FieldPosition.THIRD_BASE, // Slot 5
    FieldPosition.SHORTSTOP, // Slot 6
    FieldPosition.LEFT_FIELD, // Slot 7
    FieldPosition.CENTER_FIELD, // Slot 8
    FieldPosition.RIGHT_FIELD, // Slot 9
    FieldPosition.SHORT_FIELDER, // Slot 10 (when using extra fielders)
    FieldPosition.EXTRA_PLAYER, // Slot 11 (when using extra fielders)
    FieldPosition.SHORT_FIELDER, // Slot 12 (when using extra fielders)
    FieldPosition.PITCHER, // Slot 13+ (rotate positions)
    FieldPosition.CATCHER,
    FieldPosition.FIRST_BASE,
    FieldPosition.SECOND_BASE,
    FieldPosition.THIRD_BASE,
    FieldPosition.SHORTSTOP,
    FieldPosition.LEFT_FIELD,
    FieldPosition.CENTER_FIELD, // Slot 20
  ] as const;

  /**
   * Sets up a basic lineup with the specified number of players.
   *
   * @param strategy - The team strategy to configure
   * @param playerCount - Number of players to create (1-20, defaults to 9)
   * @returns Array of created TeamPlayer objects
   *
   * @throws {Error} If playerCount is outside valid range (1-20)
   *
   * @example
   * ```typescript
   * // Setup standard 9-player lineup
   * const players = TeamStrategyTestHelper.setupBasicLineup(strategy);
   * expect(strategy.isLineupValid()).toBe(true);
   *
   * // Setup 12-player lineup for testing extended roster
   * const extendedPlayers = TeamStrategyTestHelper.setupBasicLineup(strategy, 12);
   * expect(extendedPlayers).toHaveLength(12);
   * ```
   *
   * @remarks
   * This method creates players using TestPlayerFactory defaults, assigns them
   * appropriate field positions, and configures the strategy's lineup.
   * The resulting lineup will be valid according to strategy rules.
   */
  public static setupBasicLineup(strategy: TeamStrategy, playerCount: number = 9): TeamPlayer[] {
    const players = TestPlayerFactory.createPlayers(playerCount);

    // Add players to the strategy - different strategies have different methods
    // DetailedTeamStrategy uses addPlayer, SimpleTeamStrategy uses setCurrentLineup
    if ('addPlayer' in strategy && typeof strategy.addPlayer === 'function') {
      // DetailedTeamStrategy path
      const detailedStrategy = strategy as {
        addPlayer: (player: TeamPlayer, battingSlot: number, position: FieldPosition) => void;
      };
      players.forEach((player, index) => {
        const position = this.DEFAULT_POSITIONS[index % this.DEFAULT_POSITIONS.length]!;
        detailedStrategy.addPlayer(player, index + 1, position);
      });
    } else if ('setCurrentLineup' in strategy && typeof strategy.setCurrentLineup === 'function') {
      // SimpleTeamStrategy path
      const simpleStrategy = strategy as {
        setCurrentLineup: (lineupData: BattingSlotState[]) => void;
      };
      const battingSlots: BattingSlotState[] = players.map((player, index) => ({
        slotNumber: index + 1,
        currentPlayer: player,
        currentPosition: this.DEFAULT_POSITIONS[index % this.DEFAULT_POSITIONS.length]!,
      }));
      simpleStrategy.setCurrentLineup(battingSlots);
    }

    return players;
  }

  /**
   * Sets up a full 20-player lineup for comprehensive testing scenarios.
   *
   * @param strategy - The team strategy to configure
   * @returns Array of 20 TeamPlayer objects
   *
   * @example
   * ```typescript
   * const players = TeamStrategyTestHelper.setupFullLineup(strategy);
   * expect(players).toHaveLength(20);
   * expect(strategy.getActivePlayerCount()).toBe(20);
   *
   * // Test with maximum roster size
   * const lastPlayer = players[19];
   * expect(lastPlayer.name).toBe('Stephanie Lewis');
   * ```
   *
   * @remarks
   * Creates the maximum allowed roster size for testing edge cases,
   * substitution limits, and complex lineup management scenarios.
   * All 20 players will have unique jersey numbers and player IDs.
   */
  public static setupFullLineup(strategy: TeamStrategy): TeamPlayer[] {
    return this.setupBasicLineup(strategy, 20);
  }

  /**
   * Asserts that the strategy's current lineup is valid.
   *
   * @param strategy - The team strategy to validate
   * @throws {Error} If the lineup is not valid according to strategy rules
   *
   * @example
   * ```typescript
   * // After setting up lineup
   * TeamStrategyTestHelper.setupBasicLineup(strategy);
   * TeamStrategyTestHelper.assertLineupValid(strategy); // Should not throw
   *
   * // After making changes
   * strategy.substitutePlayer(1, newPlayer, FieldPosition.PITCHER);
   * TeamStrategyTestHelper.assertLineupValid(strategy); // Verify still valid
   * ```
   *
   * @remarks
   * This is a convenience assertion that encapsulates the common pattern
   * of validating lineup state after operations. Provides clear error
   * messages for debugging test failures.
   */
  public static assertLineupValid(strategy: TeamStrategy): void {
    if (!strategy.isLineupValid()) {
      throw new Error('Expected lineup to be valid, but it was invalid');
    }
  }

  /**
   * Creates a realistic substitution test scenario.
   *
   * @returns Object containing substitution test data
   *
   * @example
   * ```typescript
   * const scenario = TeamStrategyTestHelper.createSubstitutionScenario();
   *
   * // Use in substitution tests
   * strategy.addPlayer(scenario.originalPlayer, scenario.battingSlot, scenario.fieldPosition);
   * strategy.substitutePlayer(scenario.battingSlot, scenario.substitutePlayer, scenario.fieldPosition);
   *
   * const currentLineup = strategy.getCurrentLineup();
   * expect(currentLineup[2].currentPlayer.playerId).toEqual(scenario.substitutePlayer.playerId);
   * ```
   *
   * @remarks
   * Returns a consistent test scenario with meaningful data for testing
   * player substitution functionality. The scenario uses slot 3 (first base)
   * as it's a common substitution position in softball strategy testing.
   */
  public static createSubstitutionScenario(): {
    originalPlayer: TeamPlayer;
    substitutePlayer: TeamPlayer;
    battingSlot: number;
    fieldPosition: FieldPosition;
  } {
    return {
      originalPlayer: TestPlayerFactory.createPlayer('original', '22', 'Mike Johnson'),
      substitutePlayer: TestPlayerFactory.createPlayer('substitute', '33', 'Sub Player'),
      battingSlot: 3,
      fieldPosition: FieldPosition.FIRST_BASE,
    };
  }

  /**
   * Creates a realistic position change test scenario.
   *
   * @returns Object containing position change test data
   *
   * @example
   * ```typescript
   * const scenario = TeamStrategyTestHelper.createPositionChangeScenario();
   *
   * // Setup initial state
   * strategy.addPlayer(scenario.player, scenario.battingSlot, scenario.fromPosition);
   *
   * // Test position change
   * strategy.changePlayerPosition(scenario.battingSlot, scenario.toPosition);
   *
   * const lineup = strategy.getCurrentLineup();
   * expect(lineup[0].currentPosition).toBe(scenario.toPosition);
   * ```
   *
   * @remarks
   * Provides a meaningful position change scenario (pitcher to catcher)
   * which represents a common strategic move in softball. Uses slot 1
   * as the primary test position.
   */
  public static createPositionChangeScenario(): {
    player: TeamPlayer;
    fromPosition: FieldPosition;
    toPosition: FieldPosition;
    battingSlot: number;
  } {
    return {
      player: TestPlayerFactory.createPlayer('position-test', '10', 'John Smith'),
      fromPosition: FieldPosition.PITCHER,
      toPosition: FieldPosition.CATCHER,
      battingSlot: 1,
    };
  }
}
