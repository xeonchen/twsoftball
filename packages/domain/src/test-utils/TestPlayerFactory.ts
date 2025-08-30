import { PlayerId } from '../value-objects/PlayerId';
import { JerseyNumber } from '../value-objects/JerseyNumber';
import type { TeamPlayer } from '../strategies/TeamStrategy';

/**
 * Factory for creating test players with consistent patterns.
 *
 * @remarks
 * This utility eliminates duplicated player creation code across test files.
 * Provides sensible defaults while allowing customization for specific test scenarios.
 * All created players are valid according to domain rules.
 *
 * @example
 * ```typescript
 * // Create single player
 * const player = TestPlayerFactory.createPlayer('1', '10', 'John Smith');
 *
 * // Create multiple players with defaults
 * const players = TestPlayerFactory.createPlayers(9);
 *
 * // Create player with specific PlayerId
 * const playerId = new PlayerId('specific-id');
 * const player = TestPlayerFactory.createPlayerWithId(playerId);
 * ```
 */
export class TestPlayerFactory {
  /**
   * Default player names used for bulk creation.
   * Provides realistic variety for testing lineup scenarios.
   */
  public static readonly DEFAULT_NAMES = [
    'John Smith',
    'Jane Doe',
    'Mike Johnson',
    'Sarah Wilson',
    'Bob Davis',
    'Lisa Brown',
    'Tom Miller',
    'Amy Garcia',
    'Chris Lee',
    'Rachel Adams',
    'David Clark',
    'Maria Rodriguez',
    'Kevin White',
    'Jennifer Taylor',
    'Mark Anderson',
    'Nicole Thomas',
    'Ryan Jackson',
    'Ashley Martinez',
    'Daniel Harris',
    'Stephanie Lewis',
  ] as const;

  /**
   * Default jersey numbers used for bulk creation.
   * Covers common softball jersey number patterns.
   */
  public static readonly DEFAULT_JERSEYS = [
    '10',
    '15',
    '22',
    '7',
    '5',
    '12',
    '18',
    '3',
    '25',
    '8',
    '11',
    '16',
    '23',
    '9',
    '6',
    '13',
    '19',
    '4',
    '26',
    '14',
  ] as const;

  /**
   * Creates a single player with specified attributes.
   *
   * @param id - Unique identifier for the player (will be used as PlayerId suffix)
   * @param jersey - Jersey number (must be valid according to JerseyNumber rules)
   * @param name - Player's full name
   * @returns A valid TeamPlayer object
   *
   * @throws {DomainError} If jersey number is invalid
   *
   * @example
   * ```typescript
   * const player = TestPlayerFactory.createPlayer('1', '10', 'John Smith');
   * expect(player.playerId.value).toBe('player-1');
   * expect(player.jerseyNumber.value).toBe('10');
   * expect(player.name).toBe('John Smith');
   * ```
   */
  public static createPlayer(id: string, jersey: string, name: string): TeamPlayer {
    return {
      playerId: new PlayerId(`player-${id}`),
      jerseyNumber: new JerseyNumber(jersey),
      name,
    };
  }

  /**
   * Creates multiple players with default names and jersey numbers.
   *
   * @param count - Number of players to create (1-20, matching available defaults)
   * @returns Array of valid TeamPlayer objects with unique IDs and jersey numbers
   *
   * @throws {Error} If count exceeds available defaults (20 players max)
   *
   * @example
   * ```typescript
   * const players = TestPlayerFactory.createPlayers(9);
   * expect(players).toHaveLength(9);
   * expect(players[0].name).toBe('John Smith');
   * expect(players[0].jerseyNumber.value).toBe('10');
   * ```
   */
  public static createPlayers(count: number): TeamPlayer[] {
    if (count < 1 || count > this.DEFAULT_NAMES.length) {
      throw new Error(
        `Cannot create ${count} players. Must be between 1 and ${this.DEFAULT_NAMES.length}`
      );
    }

    return Array.from({ length: count }, (_, index) => ({
      playerId: new PlayerId(`player-${index + 1}`),
      jerseyNumber: new JerseyNumber(this.DEFAULT_JERSEYS[index]!),
      name: this.DEFAULT_NAMES[index]!,
    }));
  }

  /**
   * Creates a player using an existing PlayerId.
   * Uses defaults for jersey number and name based on the PlayerId.
   *
   * @param playerId - Existing PlayerId instance to use
   * @param jersey - Optional jersey number (defaults based on PlayerId)
   * @param name - Optional player name (defaults based on PlayerId)
   * @returns A valid TeamPlayer object using the provided PlayerId
   *
   * @example
   * ```typescript
   * const playerId = new PlayerId('custom-player-id');
   * const player = TestPlayerFactory.createPlayerWithId(playerId);
   * expect(player.playerId).toBe(playerId);
   * expect(player.jerseyNumber.value).toBe('99'); // default
   * expect(player.name).toBe('Test Player'); // default
   * ```
   */
  public static createPlayerWithId(
    playerId: PlayerId,
    jersey: string = '99',
    name: string = 'Test Player'
  ): TeamPlayer {
    return {
      playerId,
      jerseyNumber: new JerseyNumber(jersey),
      name,
    };
  }

  /**
   * Creates players with custom jersey numbers but default names.
   * Useful when testing jersey number validation scenarios.
   *
   * @param jerseyNumbers - Array of jersey numbers to assign
   * @returns Array of TeamPlayer objects with specified jersey numbers
   *
   * @throws {DomainError} If any jersey number is invalid
   *
   * @example
   * ```typescript
   * const players = TestPlayerFactory.createPlayersWithJerseys(['1', '99', '00']);
   * expect(players).toHaveLength(3);
   * expect(players[0].jerseyNumber.value).toBe('1');
   * expect(players[2].jerseyNumber.value).toBe('00');
   * ```
   */
  public static createPlayersWithJerseys(jerseyNumbers: string[]): TeamPlayer[] {
    return jerseyNumbers.map((jersey, index) => ({
      playerId: new PlayerId(`player-${index + 1}`),
      jerseyNumber: new JerseyNumber(jersey),
      name: this.DEFAULT_NAMES[index % this.DEFAULT_NAMES.length]!,
    }));
  }

  /**
   * Creates players with custom names but default jersey numbers.
   * Useful when testing name-related scenarios or creating specific team rosters.
   *
   * @param names - Array of player names to assign
   * @returns Array of TeamPlayer objects with specified names
   *
   * @example
   * ```typescript
   * const players = TestPlayerFactory.createPlayersWithNames(['Star Player', 'Rookie Player']);
   * expect(players).toHaveLength(2);
   * expect(players[0].name).toBe('Star Player');
   * expect(players[1].name).toBe('Rookie Player');
   * ```
   */
  public static createPlayersWithNames(names: string[]): TeamPlayer[] {
    return names.map((name, index) => ({
      playerId: new PlayerId(`player-${index + 1}`),
      jerseyNumber: new JerseyNumber(this.DEFAULT_JERSEYS[index % this.DEFAULT_JERSEYS.length]!),
      name,
    }));
  }
}
