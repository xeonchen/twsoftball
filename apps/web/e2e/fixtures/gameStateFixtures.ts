/**
 * @file Game State Test Fixtures
 *
 * Provides mock game state data structures for E2E testing.
 * These fixtures enable clean E2E testing without test-specific code in production components.
 *
 * @remarks
 * Test Data Strategy:
 * - Provides realistic game state structures matching domain models
 * - Includes common scenarios: active games, bench players, substitution history
 * - Supports both simple and complex test scenarios
 * - Uses domain types from @twsoftball/domain for type safety
 * - Fixtures are immutable to prevent test interference
 *
 * Usage:
 * - Import fixtures in E2E tests for consistent test data
 * - Use with apiMocks.ts to inject data via Playwright route interception
 * - Combine fixtures to create complex game scenarios
 * - Override specific fields for scenario variations
 *
 * @example
 * ```typescript
 * import { mockActiveGame, mockLineup } from '../fixtures/gameStateFixtures';
 *
 * // Use in E2E test
 * await mockGameState(page, {
 *   ...mockActiveGame,
 *   currentInning: 7
 * });
 * ```
 */

/**
 * Mock player data structure for E2E tests
 *
 * @remarks
 * Represents a player in the lineup or bench with all relevant
 * attributes for testing substitution workflows and lineup management.
 */
export interface MockPlayer {
  /** Unique player identifier (UUID format) */
  readonly id: string;
  /** Player display name */
  readonly name: string;
  /** Jersey number (1-99) */
  readonly jersey: number;
  /** Current field position (undefined if on bench) */
  readonly position?: string;
  /** Batting slot position (1-based, undefined if not in lineup) */
  readonly battingSlot?: number;
  /** Whether player was in starting lineup */
  readonly isStarter: boolean;
  /** Whether player has used re-entry privilege */
  readonly hasReentered: boolean;
  /** Whether player is currently eligible for substitution */
  readonly isEligible?: boolean;
  /** Reason for ineligibility (if applicable) */
  readonly ineligibilityReason?: string;
}

/**
 * Mock game state structure for E2E tests
 *
 * @remarks
 * Complete game state including teams, lineup, bench players,
 * and current game status. Matches the structure expected by
 * the frontend application.
 */
export interface MockGameState {
  /** Unique game identifier */
  readonly gameId: string;
  /** Home team name */
  readonly homeTeam: string;
  /** Away team name */
  readonly awayTeam: string;
  /** Current game status */
  readonly status: 'waiting' | 'active' | 'completed';
  /** Current inning number */
  readonly currentInning: number;
  /** Whether it's the top of the inning */
  readonly isTopHalf: boolean;
  /** Home team score */
  readonly homeScore: number;
  /** Away team score */
  readonly awayScore: number;
  /** Active lineup (batting order) */
  readonly activeLineup: MockPlayer[];
  /** Bench players (available for substitution) */
  readonly bench: MockPlayer[];
  /** Number of outs in current half-inning */
  readonly outs: number;
}

/**
 * Mock substitution record for testing substitution history
 */
export interface MockSubstitution {
  /** Inning when substitution occurred */
  readonly inning: number;
  /** Player being substituted out */
  readonly outPlayerId: string;
  /** Player being substituted in */
  readonly inPlayerId: string;
  /** Position after substitution */
  readonly position: string;
  /** Timestamp of substitution */
  readonly timestamp: string;
}

/**
 * Mock lineup configuration for team setup
 */
export interface MockLineup {
  /** Team name */
  readonly teamName: string;
  /** List of players in batting order */
  readonly players: MockPlayer[];
}

// ==================== Mock Player Data ====================

/**
 * Mock starting lineup players
 *
 * @remarks
 * Provides a complete starting lineup with diverse positions
 * for testing standard game scenarios.
 */
export const mockStartingPlayers: ReadonlyArray<MockPlayer> = [
  {
    id: 'player-1',
    name: 'John Smith',
    jersey: 12,
    position: 'Pitcher',
    battingSlot: 1,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-2',
    name: 'Jane Doe',
    jersey: 24,
    position: 'Catcher',
    battingSlot: 2,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-3',
    name: 'Mike Johnson',
    jersey: 7,
    position: 'First Base',
    battingSlot: 3,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-4',
    name: 'Sarah Williams',
    jersey: 33,
    position: 'Second Base',
    battingSlot: 4,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-5',
    name: 'Tom Anderson',
    jersey: 18,
    position: 'Third Base',
    battingSlot: 5,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-6',
    name: 'Lisa Brown',
    jersey: 9,
    position: 'Shortstop',
    battingSlot: 6,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-7',
    name: 'David Garcia',
    jersey: 5,
    position: 'Left Field',
    battingSlot: 7,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-8',
    name: 'Emily Martinez',
    jersey: 21,
    position: 'Center Field',
    battingSlot: 8,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-9',
    name: 'Chris Wilson',
    jersey: 14,
    position: 'Right Field',
    battingSlot: 9,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'player-10',
    name: 'Amanda Taylor',
    jersey: 8,
    position: 'Extra Player',
    battingSlot: 10,
    isStarter: true,
    hasReentered: false,
    isEligible: true,
  },
] as const;

/**
 * Mock bench players (available for substitution)
 *
 * @remarks
 * Provides bench players with various eligibility states
 * for testing substitution workflows and validation.
 */
export const mockBenchPlayers: ReadonlyArray<MockPlayer> = [
  {
    id: 'bench-1',
    name: 'Tom Wilson',
    jersey: 15,
    isStarter: false,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'bench-2',
    name: 'Sarah Lee',
    jersey: 23,
    isStarter: false,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'bench-3',
    name: 'Kevin Moore',
    jersey: 17,
    isStarter: false,
    hasReentered: false,
    isEligible: true,
  },
  {
    id: 'bench-4',
    name: 'Rachel Green',
    jersey: 25,
    isStarter: false,
    hasReentered: false,
    isEligible: false,
    ineligibilityReason: 'Already substituted this inning',
  },
] as const;

/**
 * Mock re-entry eligible player (former starter)
 *
 * @remarks
 * Represents a starter who has been substituted out but
 * has not yet used their re-entry privilege.
 */
export const mockReentryPlayer: MockPlayer = {
  id: 'reentry-1',
  name: 'Former Starter',
  jersey: 99,
  isStarter: true,
  hasReentered: false,
  isEligible: true,
} as const;

// ==================== Mock Game States ====================

/**
 * Mock active game in progress
 *
 * @remarks
 * Standard active game state for testing lineup management
 * and substitution workflows during gameplay.
 *
 * @example
 * ```typescript
 * // Use in E2E test setup
 * await mockGameState(page, mockActiveGame);
 * ```
 */
export const mockActiveGame: MockGameState = {
  gameId: 'test-game-123',
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  status: 'active',
  currentInning: 5,
  isTopHalf: false,
  homeScore: 4,
  awayScore: 3,
  activeLineup: [...mockStartingPlayers],
  bench: [...mockBenchPlayers],
  outs: 1,
} as const;

/**
 * Mock game at start (no innings played)
 *
 * @remarks
 * Game state at the beginning of play, useful for testing
 * initial lineup setup and first-inning scenarios.
 */
export const mockGameStart: MockGameState = {
  gameId: 'test-game-start',
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  status: 'active',
  currentInning: 1,
  isTopHalf: true,
  homeScore: 0,
  awayScore: 0,
  activeLineup: [...mockStartingPlayers],
  bench: [...mockBenchPlayers],
  outs: 0,
} as const;

/**
 * Mock game with substitution history
 *
 * @remarks
 * Game state with previous substitutions for testing
 * re-entry rules and substitution tracking.
 */
export const mockGameWithSubstitutions: MockGameState = {
  gameId: 'test-game-subs',
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  status: 'active',
  currentInning: 7,
  isTopHalf: false,
  homeScore: 6,
  awayScore: 5,
  activeLineup: [
    // First player has been substituted
    {
      id: 'bench-1',
      name: 'Tom Wilson',
      jersey: 15,
      position: 'Pitcher',
      battingSlot: 1,
      isStarter: false,
      hasReentered: false,
      isEligible: true,
    },
    ...mockStartingPlayers.slice(1),
  ],
  bench: [
    // Original starter on bench (eligible for re-entry)
    {
      id: 'player-1',
      name: 'John Smith',
      jersey: 12,
      isStarter: true,
      hasReentered: false,
      isEligible: true,
    },
    ...mockBenchPlayers.slice(1),
  ],
  outs: 2,
} as const;

/**
 * Mock empty lineup (for error state testing)
 *
 * @remarks
 * Game state with no active lineup, useful for testing
 * empty state handling and error conditions.
 */
export const mockEmptyLineup: MockGameState = {
  gameId: 'test-game-empty',
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  status: 'waiting',
  currentInning: 1,
  isTopHalf: true,
  homeScore: 0,
  awayScore: 0,
  activeLineup: [],
  bench: [],
  outs: 0,
} as const;

// ==================== Mock Lineup Configurations ====================

/**
 * Mock standard lineup configuration
 *
 * @remarks
 * Complete lineup suitable for testing lineup editor
 * and team setup workflows.
 */
export const mockLineup: MockLineup = {
  teamName: 'Test Team',
  players: [...mockStartingPlayers],
} as const;

/**
 * Mock minimal lineup (9 players, no EP)
 *
 * @remarks
 * Minimum valid lineup for testing edge cases and
 * minimal team configurations.
 */
export const mockMinimalLineup: MockLineup = {
  teamName: 'Minimal Team',
  players: mockStartingPlayers.slice(0, 9),
} as const;

// ==================== Mock Substitution History ====================

/**
 * Mock substitution records for testing history tracking
 *
 * @remarks
 * Sample substitution history for testing substitution
 * tracking, reporting, and rule enforcement.
 */
export const mockSubstitutions: ReadonlyArray<MockSubstitution> = [
  {
    inning: 3,
    outPlayerId: 'player-1',
    inPlayerId: 'bench-1',
    position: 'Pitcher',
    timestamp: '2024-01-15T14:30:00Z',
  },
  {
    inning: 5,
    outPlayerId: 'player-4',
    inPlayerId: 'bench-2',
    position: 'Second Base',
    timestamp: '2024-01-15T15:15:00Z',
  },
] as const;

// ==================== Helper Functions ====================

/**
 * Create a custom game state by overriding default values
 *
 * @param overrides - Partial game state to merge with defaults
 * @returns Complete game state with overrides applied
 *
 * @example
 * ```typescript
 * // Create game in 7th inning
 * const lateGame = createCustomGameState({
 *   currentInning: 7,
 *   homeScore: 8,
 *   awayScore: 5
 * });
 * ```
 */
export function createCustomGameState(overrides: Partial<MockGameState>): MockGameState {
  return {
    ...mockActiveGame,
    ...overrides,
  };
}

/**
 * Create a custom player by overriding default values
 *
 * @param basePlayer - Base player to start from
 * @param overrides - Player properties to override
 * @returns Player with overrides applied
 *
 * @example
 * ```typescript
 * // Create ineligible player
 * const injuredPlayer = createCustomPlayer(mockBenchPlayers[0], {
 *   isEligible: false,
 *   ineligibilityReason: 'Player is injured'
 * });
 * ```
 */
export function createCustomPlayer(
  basePlayer: MockPlayer,
  overrides: Partial<MockPlayer>
): MockPlayer {
  return {
    ...basePlayer,
    ...overrides,
  };
}

/**
 * Create a lineup with specific number of players
 *
 * @param count - Number of players in lineup (1-10)
 * @returns Lineup with specified number of players
 *
 * @example
 * ```typescript
 * // Create lineup with 8 players
 * const shortLineup = createLineupWithPlayers(8);
 * ```
 */
export function createLineupWithPlayers(count: number): MockLineup {
  if (count < 1 || count > 10) {
    throw new Error('Player count must be between 1 and 10');
  }

  return {
    teamName: `Team with ${count} players`,
    players: mockStartingPlayers.slice(0, count),
  };
}
