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
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useGameStore } from '../../../entities/game';
import { useAppServicesContext } from '../../../shared/lib';
import {
  MOCK_GAME_ID,
  MOCK_GAME_STORE,
  createFreshLineupData,
  createFreshBenchData,
  createMockGameAdapter,
  createMockServices,
  cleanupTestMemory,
} from '../../../test-utils/lineupTestUtils';

import { useLineupManagement } from './useLineupManagement';

// Mock game store with minimal implementation
vi.mock('../../../entities/game', () => ({
  useGameStore: vi.fn(),
}));

// Mock app services context with minimal implementation
vi.mock('../../../shared/lib', () => ({
  useAppServicesContext: vi.fn(),
}));

// Type-safe mock references
const mockUseGameStore = useGameStore as vi.MockedFunction<typeof useGameStore>;
const mockUseAppServicesContext = useAppServicesContext as vi.MockedFunction<
  typeof useAppServicesContext
>;

// Reusable mock adapter instance
let mockGameAdapter: ReturnType<typeof createMockGameAdapter>;

describe('useLineupManagement Hook - TDD Implementation', () => {
  beforeEach(() => {
    // Clear all mocks efficiently
    vi.clearAllMocks();

    // Create fresh mock adapter for this test
    mockGameAdapter = createMockGameAdapter();

    // Setup mock return values with minimal data
    mockUseGameStore.mockReturnValue(MOCK_GAME_STORE);
    mockUseAppServicesContext.mockReturnValue(createMockServices(mockGameAdapter));
  });

  afterEach(() => {
    // Comprehensive cleanup for memory optimization
    vi.restoreAllMocks();
    cleanupTestMemory();
  });

  describe('Initial Data Loading', () => {
    it('should load current lineup and bench players on mount', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.activeLineup).toEqual([]);
      expect(result.current.benchPlayers).toEqual([]);

      // Wait for data to load with optimized timing
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeLineup).toHaveLength(10);
      expect(result.current.benchPlayers).toHaveLength(3);

      // Clean up component reference
      unmount();
    });

    it('should call getTeamLineup with correct gameId', async () => {
      const { unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockGameAdapter.getTeamLineup).toHaveBeenCalledWith({
        gameId: MOCK_GAME_ID,
      });

      unmount();
    });

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Failed to load lineup';
      mockGameAdapter.getTeamLineup.mockRejectedValue(new Error(errorMessage));

      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.activeLineup).toEqual([]);
      expect(result.current.benchPlayers).toEqual([]);

      unmount();
    });
  });

  describe('Substitution Eligibility Validation', () => {
    it('should validate substitution eligibility for regular substitute', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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

      unmount();
    });

    it('should validate re-entry eligibility for starter', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'starter-sub-1',
        inning: 7,
        isReentry: true,
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBeNull();

      unmount();
    });

    it('should prevent re-entry for player who already re-entered', async () => {
      // Create bench data with re-entry efficiently
      const benchWithReentry = createFreshBenchData().map(player =>
        player.id === 'starter-sub-1' ? { ...player, hasReentered: true, entryInning: 6 } : player
      );

      mockGameAdapter.getTeamLineup.mockResolvedValue({
        success: true,
        gameId: { value: MOCK_GAME_ID },
        activeLineup: createFreshLineupData(),
        benchPlayers: benchWithReentry,
        substitutionHistory: [],
      });

      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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

      unmount();
    });

    it('should prevent non-starter from re-entering', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'bench-1',
        inning: 6,
        isReentry: true,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('Only original starters can re-enter the game');

      unmount();
    });

    it('should prevent substitution of active player', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const eligibility = result.current.checkEligibility({
        playerId: 'player-1',
        inning: 5,
        isReentry: false,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('Player is currently active in the lineup');

      unmount();
    });
  });

  describe('Player Substitution', () => {
    it('should perform valid substitution', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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
        gameId: MOCK_GAME_ID,
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'bench-1',
        battingSlot: 1,
        fieldPosition: FieldPosition.SHORTSTOP,
        isReentry: false,
      });

      unmount();
    });

    it('should handle re-entry substitution', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const reentryData = {
        outgoingPlayerId: 'player-2',
        incomingPlayerId: 'starter-sub-1',
        battingSlot: 2 as const,
        fieldPosition: FieldPosition.SECOND_BASE,
        isReentry: true,
      };

      await act(async () => {
        await result.current.makeSubstitution(reentryData);
      });

      expect(mockGameAdapter.makeSubstitution).toHaveBeenCalledWith({
        gameId: MOCK_GAME_ID,
        outgoingPlayerId: 'player-2',
        incomingPlayerId: 'starter-sub-1',
        battingSlot: 2,
        fieldPosition: FieldPosition.SECOND_BASE,
        isReentry: true,
      });

      unmount();
    });

    it('should prevent invalid substitutions', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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

      unmount();
    });

    it('should handle substitution errors from adapter', async () => {
      const errorMessage = 'Substitution failed';
      mockGameAdapter.makeSubstitution.mockRejectedValue(new Error(errorMessage));

      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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

      unmount();
    });
  });

  describe('Position Management', () => {
    it('should get available positions for substitution', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const availablePositions = result.current.getAvailablePositions('bench-1');

      expect(availablePositions).toContain(FieldPosition.SHORTSTOP);
      expect(availablePositions).toContain(FieldPosition.FIRST_BASE);
      expect(availablePositions).toHaveLength(10); // All 9 field positions + EP

      unmount();
    });

    it('should find player by batting slot', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const player = result.current.findPlayerBySlot(1);

      expect(player).toEqual({
        battingSlot: 1,
        playerId: 'player-1',
        fieldPosition: FieldPosition.SHORTSTOP,
      });

      unmount();
    });

    it('should find player by field position', async () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const player = result.current.findPlayerByPosition(FieldPosition.PITCHER);

      expect(player).toEqual({
        battingSlot: 6,
        playerId: 'player-6',
        fieldPosition: FieldPosition.PITCHER,
      });

      unmount();
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state during substitution', async () => {
      let resolvePromise: (value: unknown) => void;
      const substitutionPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockGameAdapter.makeSubstitution.mockReturnValue(substitutionPromise);

      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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
          gameId: { value: MOCK_GAME_ID },
          substitution: {},
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);

      unmount();
    });

    it('should clear error state on successful operations', async () => {
      // Setup error condition BEFORE hook initialization
      mockGameAdapter.getTeamLineup.mockRejectedValueOnce(new Error('Test error'));

      // First cause an error during initial load
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeTruthy();

      // Then perform successful operation
      mockGameAdapter.getTeamLineup.mockResolvedValueOnce({
        success: true,
        gameId: { value: MOCK_GAME_ID },
        activeLineup: createFreshLineupData(),
        benchPlayers: createFreshBenchData(),
        substitutionHistory: [],
      });

      await act(async () => {
        void result.current.refreshLineup();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeNull();

      unmount();
    });

    it('should provide reset function to clear state', () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeLineup).toEqual([]);
      expect(result.current.benchPlayers).toEqual([]);

      unmount();
    });
  });

  describe('Hook Interface', () => {
    it('should return correct hook interface', () => {
      const { result, unmount } = renderHook(() => useLineupManagement(MOCK_GAME_ID));

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

      unmount();
    });
  });
});
