/**
 * @file Lightweight Test Utilities for Lineup Management
 *
 * Memory-optimized test utilities specifically for lineup management tests.
 * This file provides minimal, focused mocks to reduce memory usage.
 */

import { FieldPosition } from '@twsoftball/application';
import { vi } from 'vitest';

import type { BenchPlayer, PositionAssignment } from '../shared/lib/types';

/**
 * Minimal mock data constants - shared across tests to reduce memory
 */
export const MOCK_GAME_ID = 'game-123';

export const MOCK_LINEUP_DATA: PositionAssignment[] = [
  { battingSlot: 1, playerId: 'player-1', fieldPosition: FieldPosition.SHORTSTOP },
  { battingSlot: 2, playerId: 'player-2', fieldPosition: FieldPosition.SECOND_BASE },
  { battingSlot: 3, playerId: 'player-3', fieldPosition: FieldPosition.FIRST_BASE },
  { battingSlot: 4, playerId: 'player-4', fieldPosition: FieldPosition.THIRD_BASE },
  { battingSlot: 5, playerId: 'player-5', fieldPosition: FieldPosition.CATCHER },
  { battingSlot: 6, playerId: 'player-6', fieldPosition: FieldPosition.PITCHER },
  { battingSlot: 7, playerId: 'player-7', fieldPosition: FieldPosition.LEFT_FIELD },
  { battingSlot: 8, playerId: 'player-8', fieldPosition: FieldPosition.CENTER_FIELD },
  { battingSlot: 9, playerId: 'player-9', fieldPosition: FieldPosition.RIGHT_FIELD },
  { battingSlot: 10, playerId: 'player-10', fieldPosition: FieldPosition.EXTRA_PLAYER },
];

export const MOCK_BENCH_PLAYERS: BenchPlayer[] = [
  {
    id: 'bench-1',
    name: 'Bench Player 1',
    jerseyNumber: '15',
    isStarter: false,
    hasReentered: false,
    entryInning: null,
  },
  {
    id: 'bench-2',
    name: 'Bench Player 2',
    jerseyNumber: '16',
    isStarter: false,
    hasReentered: false,
    entryInning: null,
  },
  {
    id: 'starter-sub-1',
    name: 'Substituted Starter',
    jerseyNumber: '7',
    isStarter: true,
    hasReentered: false,
    entryInning: null,
  },
];

export const MOCK_GAME_STORE = {
  currentGame: {
    id: MOCK_GAME_ID,
    homeTeam: 'Warriors',
    awayTeam: 'Eagles',
    status: 'active',
  },
  activeGameState: {
    currentInning: 5,
    isTopHalf: true,
    currentBatter: {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '12',
      position: 'SS' as FieldPosition,
      battingOrder: 1,
    },
    bases: { first: null, second: null, third: null },
    outs: 0,
  },
};

/**
 * Creates fresh copies of mock data to prevent reference sharing
 */
export function createFreshLineupData(): PositionAssignment[] {
  return MOCK_LINEUP_DATA.map(assignment => ({ ...assignment }));
}

export function createFreshBenchData(): BenchPlayer[] {
  return MOCK_BENCH_PLAYERS.map(player => ({ ...player }));
}

/**
 * Lightweight mock adapter factory - creates only what's needed
 */
export function createMockGameAdapter(): {
  getTeamLineup: ReturnType<typeof vi.fn>;
  makeSubstitution: ReturnType<typeof vi.fn>;
} {
  return {
    getTeamLineup: vi.fn().mockResolvedValue({
      success: true,
      gameId: { value: MOCK_GAME_ID },
      activeLineup: createFreshLineupData(),
      benchPlayers: createFreshBenchData(),
      substitutionHistory: [],
    }),
    makeSubstitution: vi.fn().mockResolvedValue({
      success: true,
      gameId: { value: MOCK_GAME_ID },
      substitution: {
        inning: 5,
        battingSlot: 1,
        outgoingPlayer: { playerId: { value: 'player-1' }, name: 'John Doe' },
        incomingPlayer: { playerId: { value: 'bench-1' }, name: 'Bench Player 1' },
        timestamp: new Date(),
        isReentry: false,
      },
    }),
  };
}

/**
 * Memory-optimized test cleanup utility
 */
export function cleanupTestMemory(): void {
  // Force garbage collection if available
  // eslint-disable-next-line no-undef, @typescript-eslint/no-explicit-any
  if (typeof global !== 'undefined' && (global as any).gc) {
    // eslint-disable-next-line no-undef, @typescript-eslint/no-explicit-any
    (global as any).gc();
  }
}

/**
 * Creates minimal mock services context
 */
export function createMockServices(adapter = createMockGameAdapter()): {
  services: {
    gameAdapter: ReturnType<typeof createMockGameAdapter>;
  };
  isInitializing: boolean;
  error: null;
} {
  return {
    services: {
      gameAdapter: adapter,
    },
    isInitializing: false,
    error: null,
  };
}
