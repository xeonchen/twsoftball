/**
 * @file useLineupManagement Hook Tests
 *
 * Test-first implementation for useLineupManagement hook that manages lineup changes,
 * player substitutions, and eligibility validation.
 *
 * @remarks
 * This test file follows TDD methodology to drive the implementation of the useLineupManagement
 * hook. The hook is responsible for:
 * - Loading current lineup and bench players
 * - Managing player substitutions and field position changes
 * - Validating substitution eligibility based on game rules
 * - Handling re-entry validation for starters
 * - Providing UI state for lineup management components
 *
 * Architecture compliance:
 * - Uses DI Container pattern for application layer access
 * - No direct infrastructure imports
 * - Proper value object creation
 * - Type safety across layer boundaries
 */

import { renderHook, act } from '@testing-library/react';
import { GameId, PlayerId, FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock game store
vi.mock('../../../entities/game', () => ({
  useGameStore: vi.fn(),
}));

// Mock shared API
vi.mock('../../../shared/api', () => ({
  getContainer: vi.fn(() => ({
    gameAdapter: {
      getTeamLineup: vi.fn(),
      makeSubstitution: vi.fn(),
    },
  })),
}));

// Default mock game store data
const defaultMockGameStore = {
  currentGame: {
    id: 'game-123',
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
    bases: {
      first: null,
      second: null,
      third: null,
    },
    outs: 0,
  },
};

// Mock lineup data
const mockActiveLineup: PositionAssignment[] = [
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

const mockBenchPlayers: BenchPlayer[] = [
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
    entryInning: null, // Originally in lineup, now on bench
  },
];

// Import the hook after mocks are set up
import { useGameStore } from '../../../entities/game';
import { getContainer } from '../../../shared/api';
import type { BenchPlayer, PositionAssignment } from '../../../shared/lib/types';

import { useLineupManagement } from './useLineupManagement';

// Cast to mocks for TypeScript
const mockGetContainer = getContainer as vi.MockedFunction<typeof getContainer>;
const mockUseGameStore = useGameStore as vi.MockedFunction<typeof useGameStore>;

// Create persistent mock adapter reference for tests
const mockGameAdapter = {
  getTeamLineup: vi.fn(),
  makeSubstitution: vi.fn(),
};

describe('useLineupManagement Hook - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock return values
    mockUseGameStore.mockReturnValue(defaultMockGameStore);

    // Setup default lineup data
    mockGameAdapter.getTeamLineup.mockResolvedValue({
      success: true,
      gameId: new GameId('game-123'),
      activeLineup: mockActiveLineup,
      benchPlayers: mockBenchPlayers,
      substitutionHistory: [],
    });

    mockGameAdapter.makeSubstitution.mockResolvedValue({
      success: true,
      gameId: new GameId('game-123'),
      substitution: {
        inning: 5,
        battingSlot: 1,
        outgoingPlayer: { playerId: new PlayerId('player-1'), name: 'John Doe' },
        incomingPlayer: { playerId: new PlayerId('bench-1'), name: 'Bench Player 1' },
        timestamp: new Date(),
        isReentry: false,
      },
    });

    mockGetContainer.mockReturnValue({
      gameAdapter: mockGameAdapter,
    });
  });

  describe('Initial Data Loading', () => {
    it('should load current lineup and bench players on mount', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.activeLineup).toEqual([]);
      expect(result.current.benchPlayers).toEqual([]);

      // Wait for data to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeLineup).toHaveLength(10);
      expect(result.current.benchPlayers).toHaveLength(3);
      expect(result.current.activeLineup).toEqual(mockActiveLineup);
      expect(result.current.benchPlayers).toEqual(mockBenchPlayers);
    });

    it('should call getTeamLineup with correct gameId', async () => {
      renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockGameAdapter.getTeamLineup).toHaveBeenCalledWith({
        gameId: 'game-123',
      });
    });

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Failed to load lineup';
      mockGameAdapter.getTeamLineup.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.activeLineup).toEqual([]);
      expect(result.current.benchPlayers).toEqual([]);
    });
  });

  describe('Substitution Eligibility Validation', () => {
    it('should validate substitution eligibility for regular substitute', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'bench-1',
        inning: 5,
        isReentry: false,
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBeNull();
    });

    it('should validate re-entry eligibility for starter', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'starter-sub-1', // Starter who was substituted
        inning: 7,
        isReentry: true,
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBeNull();
    });

    it('should prevent re-entry for player who already re-entered', async () => {
      // Mock bench player who has already re-entered
      const benchWithReentry = mockBenchPlayers.map(player =>
        player.id === 'starter-sub-1' ? { ...player, hasReentered: true, entryInning: 6 } : player
      );

      mockGameAdapter.getTeamLineup.mockResolvedValue({
        success: true,
        gameId: new GameId('game-123'),
        activeLineup: mockActiveLineup,
        benchPlayers: benchWithReentry,
        substitutionHistory: [],
      });

      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'starter-sub-1',
        inning: 8,
        isReentry: true,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('Starter can only re-enter once per game');
    });

    it('should prevent non-starter from re-entering', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'bench-1', // Non-starter
        inning: 6,
        isReentry: true,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('Only original starters can re-enter the game');
    });

    it('should prevent substitution of active player', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'player-1', // Active player in lineup
        inning: 5,
        isReentry: false,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('Player is currently active in the lineup');
    });
  });

  describe('Player Substitution', () => {
    it('should perform valid substitution', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const substitutionData = {
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'bench-1',
        battingSlot: 1 as const,
        fieldPosition: FieldPosition.SHORTSTOP,
        isReentry: false,
      };

      await act(async () => {
        await result.current.makeSubstitution(substitutionData);
      });

      expect(mockGameAdapter.makeSubstitution).toHaveBeenCalledWith({
        gameId: 'game-123',
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'bench-1',
        battingSlot: 1,
        fieldPosition: FieldPosition.SHORTSTOP,
        isReentry: false,
      });
    });

    it('should handle re-entry substitution', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const reentryData = {
        outgoingPlayerId: 'player-2',
        incomingPlayerId: 'starter-sub-1', // Starter re-entering
        battingSlot: 2 as const,
        fieldPosition: FieldPosition.SECOND_BASE,
        isReentry: true,
      };

      await act(async () => {
        await result.current.makeSubstitution(reentryData);
      });

      expect(mockGameAdapter.makeSubstitution).toHaveBeenCalledWith({
        gameId: 'game-123',
        outgoingPlayerId: 'player-2',
        incomingPlayerId: 'starter-sub-1',
        battingSlot: 2,
        fieldPosition: FieldPosition.SECOND_BASE,
        isReentry: true,
      });
    });

    it('should prevent invalid substitutions', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const invalidSubstitution = {
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'player-1', // Same player
        battingSlot: 1 as const,
        fieldPosition: FieldPosition.SHORTSTOP,
        isReentry: false,
      };

      await act(async () => {
        try {
          await result.current.makeSubstitution(invalidSubstitution);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(mockGameAdapter.makeSubstitution).not.toHaveBeenCalled();
    });

    it('should handle substitution errors from adapter', async () => {
      const errorMessage = 'Substitution failed';
      mockGameAdapter.makeSubstitution.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const substitutionData = {
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'bench-1',
        battingSlot: 1 as const,
        fieldPosition: FieldPosition.SHORTSTOP,
        isReentry: false,
      };

      await act(async () => {
        try {
          await result.current.makeSubstitution(substitutionData);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Position Management', () => {
    it('should get available positions for substitution', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const availablePositions = result.current.getAvailablePositions('bench-1');

      expect(availablePositions).toContain(FieldPosition.SHORTSTOP);
      expect(availablePositions).toContain(FieldPosition.FIRST_BASE);
      expect(availablePositions).toHaveLength(10); // All 9 field positions + EP
    });

    it('should find player by batting slot', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const player = result.current.findPlayerBySlot(1);

      expect(player).toEqual({
        battingSlot: 1,
        playerId: 'player-1',
        fieldPosition: FieldPosition.SHORTSTOP,
      });
    });

    it('should find player by field position', async () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const player = result.current.findPlayerByPosition(FieldPosition.PITCHER);

      expect(player).toEqual({
        battingSlot: 6,
        playerId: 'player-6',
        fieldPosition: FieldPosition.PITCHER,
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state during substitution', async () => {
      let resolvePromise: (value: unknown) => void;
      const substitutionPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockGameAdapter.makeSubstitution.mockReturnValue(substitutionPromise);

      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        void result.current.makeSubstitution({
          outgoingPlayerId: 'player-1',
          incomingPlayerId: 'bench-1',
          battingSlot: 1,
          fieldPosition: FieldPosition.SHORTSTOP,
          isReentry: false,
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          gameId: new GameId('game-123'),
          substitution: {},
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error state on successful operations', async () => {
      // Setup error condition BEFORE hook initialization
      mockGameAdapter.getTeamLineup.mockRejectedValueOnce(new Error('Test error'));

      // First cause an error during initial load
      const { result } = renderHook(() => useLineupManagement('game-123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeTruthy();

      // Then perform successful operation
      mockGameAdapter.getTeamLineup.mockResolvedValueOnce({
        success: true,
        gameId: new GameId('game-123'),
        activeLineup: mockActiveLineup,
        benchPlayers: mockBenchPlayers,
        substitutionHistory: [],
      });

      await act(async () => {
        void result.current.refreshLineup();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeNull();
    });

    it('should provide reset function to clear state', () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeLineup).toEqual([]);
      expect(result.current.benchPlayers).toEqual([]);
    });
  });

  describe('Hook Interface', () => {
    it('should return correct hook interface', () => {
      const { result } = renderHook(() => useLineupManagement('game-123'));

      expect(result.current).toEqual({
        // Data
        activeLineup: expect.any(Array),
        benchPlayers: expect.any(Array),

        // State
        isLoading: expect.any(Boolean),
        error: null,

        // Actions
        makeSubstitution: expect.any(Function),
        checkEligibility: expect.any(Function),
        refreshLineup: expect.any(Function),
        reset: expect.any(Function),

        // Utilities
        getAvailablePositions: expect.any(Function),
        findPlayerBySlot: expect.any(Function),
        findPlayerByPosition: expect.any(Function),
      });
    });
  });
});
