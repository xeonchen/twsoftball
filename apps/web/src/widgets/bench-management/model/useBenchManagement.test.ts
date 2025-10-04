/**
 * @file useBenchManagement Hook Test Suite
 *
 * Tests for the bench management model hook, including integration with
 * existing features and business logic.
 */

import { renderHook, act } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { BenchPlayer } from '../../../shared/lib';
import type { PositionAssignment } from '../../../shared/lib';

import { useBenchManagement } from './useBenchManagement';
import type { BenchManagementConfig } from './useBenchManagement';

// Mock the features we integrate with
const mockUseSubstitutePlayerAPI = vi.fn();
const mockUseLineupManagement = vi.fn();

vi.mock('../../../features/substitute-player', () => ({
  useSubstitutePlayerAPI: (): unknown => mockUseSubstitutePlayerAPI(),
}));

vi.mock('../../../features/lineup-management', () => ({
  useLineupManagement: (): unknown => mockUseLineupManagement(),
}));

describe('useBenchManagement', () => {
  const mockBenchPlayers: BenchPlayer[] = [
    {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '12',
      isStarter: true,
      hasReentered: false,
      entryInning: null,
      position: FieldPosition.PITCHER,
    },
    {
      id: 'player-2',
      name: 'Jane Smith',
      jerseyNumber: '25',
      isStarter: false,
      hasReentered: false,
      entryInning: 3,
    },
    {
      id: 'player-3',
      name: 'Bob Wilson',
      jerseyNumber: '8',
      isStarter: true,
      hasReentered: true,
      entryInning: 5,
      position: FieldPosition.CATCHER,
    },
  ];

  const mockActiveLineup: PositionAssignment[] = [
    {
      playerId: 'active-player-1',
      battingSlot: 1,
      fieldPosition: FieldPosition.PITCHER,
    },
    {
      playerId: 'active-player-2',
      battingSlot: 2,
      fieldPosition: FieldPosition.CATCHER,
    },
  ];

  const defaultConfig: BenchManagementConfig = {
    gameId: 'game-123',
    teamLineupId: 'team-456',
    currentInning: 5,
  };

  const mockSubstitutePlayerAPI = {
    executeSubstitution: vi.fn(),
    isLoading: false,
    error: null,
  };

  const mockLineupManagement = {
    activeLineup: mockActiveLineup,
    benchPlayers: mockBenchPlayers,
    isLoading: false,
    error: null,
    makeSubstitution: vi.fn(),
    checkEligibility: vi.fn().mockReturnValue({ eligible: true, reason: null }),
    refreshLineup: vi.fn(),
    reset: vi.fn(),
    getAvailablePositions: vi.fn().mockReturnValue([]),
    findPlayerBySlot: vi.fn().mockReturnValue(null),
    findPlayerByPosition: vi.fn().mockReturnValue(null),
    getPlayerEligibility: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubstitutePlayerAPI.mockReturnValue(mockSubstitutePlayerAPI);
    mockUseLineupManagement.mockReturnValue(mockLineupManagement);
  });

  describe('Hook Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.benchPlayers).toEqual(mockBenchPlayers);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.getPlayerEligibility).toBe('function');
      expect(typeof result.current.executeQuickSubstitution).toBe('function');
    });

    it('forwards loading state from lineup management', () => {
      mockUseLineupManagement.mockReturnValue({
        ...mockLineupManagement,
        isLoading: true,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.isLoading).toBe(true);
    });

    it('forwards error state from lineup management', () => {
      const testError = 'Failed to load lineup';
      mockUseLineupManagement.mockReturnValue({
        ...mockLineupManagement,
        error: testError,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.error).toBe(testError);
    });

    it('prioritizes substitution error over lineup error', () => {
      mockUseLineupManagement.mockReturnValue({
        ...mockLineupManagement,
        error: 'Lineup error',
      });

      mockUseSubstitutePlayerAPI.mockReturnValue({
        ...mockSubstitutePlayerAPI,
        error: 'Substitution error',
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.error).toBe('Substitution error');
    });
  });

  describe('Player Eligibility', () => {
    it('returns eligibility for valid player', () => {
      const mockCheckEligibility = vi.fn().mockReturnValue({ eligible: true, reason: null });

      mockUseLineupManagement.mockReturnValue({
        ...mockLineupManagement,
        checkEligibility: mockCheckEligibility,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      const eligibility = result.current.getPlayerEligibility('player-1');

      expect(mockCheckEligibility).toHaveBeenCalledWith({
        playerId: 'player-1',
        inning: 5,
        isReentry: false,
      });
      expect(mockCheckEligibility).toHaveBeenCalledWith({
        playerId: 'player-1',
        inning: 5,
        isReentry: true,
      });
      expect(eligibility).toEqual({
        canSubstitute: true,
        canReenter: true, // Because player-1 is a starter and hasn't re-entered
        restrictions: [],
      });
    });

    it('returns default ineligible status for unknown player', () => {
      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      const eligibility = result.current.getPlayerEligibility('unknown-player');

      expect(eligibility).toEqual({
        canSubstitute: false,
        canReenter: false,
        restrictions: ['Player not found'],
      });
    });

    it('handles eligibility check errors gracefully', () => {
      const mockCheckEligibility = vi.fn().mockImplementation(() => {
        throw new Error('Eligibility check failed');
      });

      mockUseLineupManagement.mockReturnValue({
        ...mockLineupManagement,
        checkEligibility: mockCheckEligibility,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      const eligibility = result.current.getPlayerEligibility('player-1');

      expect(eligibility).toEqual({
        canSubstitute: false,
        canReenter: false,
        restrictions: ['Error checking eligibility'],
      });
    });
  });

  describe('Quick Substitution', () => {
    it('executes quick substitution successfully', async () => {
      const mockExecuteSubstitution = vi.fn().mockResolvedValue({
        success: true,
        substitutionDetails: {
          incomingPlayerName: 'John Doe',
          outgoingPlayerName: 'Previous Player',
          battingSlot: 3,
        },
      });

      mockUseSubstitutePlayerAPI.mockReturnValue({
        ...mockSubstitutePlayerAPI,
        executeSubstitution: mockExecuteSubstitution,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      let substitutionResult;
      await act(async () => {
        substitutionResult = await result.current.executeQuickSubstitution('player-1');
      });

      expect(mockExecuteSubstitution).toHaveBeenCalledWith({
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: expect.any(Number),
        outgoingPlayerId: expect.any(String),
        incomingPlayer: {
          id: 'player-1',
          name: 'John Doe',
          jerseyNumber: '12',
          position: expect.any(String),
        },
        inning: 5,
        isReentry: true, // player-1 is a starter, so it's re-entry
      });

      expect(substitutionResult).toEqual({
        success: true,
        substitutionDetails: {
          incomingPlayerName: 'John Doe',
          outgoingPlayerName: 'Previous Player',
          battingSlot: 3,
        },
      });
    });

    it('handles quick substitution failure', async () => {
      const mockExecuteSubstitution = vi.fn().mockResolvedValue({
        success: false,
        errors: ['Substitution failed'],
      });

      mockUseSubstitutePlayerAPI.mockReturnValue({
        ...mockSubstitutePlayerAPI,
        executeSubstitution: mockExecuteSubstitution,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      let substitutionResult;
      await act(async () => {
        substitutionResult = await result.current.executeQuickSubstitution('player-1');
      });

      expect(substitutionResult).toEqual({
        success: false,
        errors: ['Substitution failed'],
      });
    });

    it('throws error for unknown player in quick substitution', async () => {
      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      await act(async () => {
        await expect(result.current.executeQuickSubstitution('unknown-player')).rejects.toThrow(
          'Player not found'
        );
      });
    });

    it('handles re-entry substitutions correctly', async () => {
      const mockExecuteSubstitution = vi.fn().mockResolvedValue({
        success: true,
        reentryUsed: true,
      });

      mockUseSubstitutePlayerAPI.mockReturnValue({
        ...mockSubstitutePlayerAPI,
        executeSubstitution: mockExecuteSubstitution,
      });

      const reentryPlayer = {
        ...mockBenchPlayers[0]!,
        hasReentered: false, // Available for re-entry
      };

      const mockCheckEligibility = vi.fn().mockReturnValue({ eligible: true, reason: null });

      mockUseLineupManagement.mockReturnValue({
        ...mockLineupManagement,
        benchPlayers: [reentryPlayer],
        checkEligibility: mockCheckEligibility,
      });

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      await act(async () => {
        await result.current.executeQuickSubstitution('player-1');
      });

      expect(mockExecuteSubstitution).toHaveBeenCalledWith(
        expect.objectContaining({
          isReentry: true,
        })
      );
    });
  });

  describe('Integration with Features', () => {
    it('integrates with substitute player API correctly', () => {
      const customAPI = {
        executeSubstitution: vi.fn(),
        isLoading: true,
        error: 'API Error',
      };

      mockUseSubstitutePlayerAPI.mockReturnValue(customAPI);

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('API Error');
    });

    it('integrates with lineup management correctly', () => {
      const customLineup = {
        activeLineup: [],
        benchPlayers: [],
        isLoading: true,
        error: 'Lineup Error',
        makeSubstitution: vi.fn(),
        checkEligibility: vi.fn().mockReturnValue({ eligible: true, reason: null }),
        refreshLineup: vi.fn(),
        reset: vi.fn(),
        getAvailablePositions: vi.fn().mockReturnValue([]),
        findPlayerBySlot: vi.fn().mockReturnValue(null),
        findPlayerByPosition: vi.fn().mockReturnValue(null),
      };

      mockUseLineupManagement.mockReturnValue(customLineup);

      const { result } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.benchPlayers).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Lineup Error');
    });
  });

  describe('Configuration Changes', () => {
    it('updates when configuration changes', () => {
      const { result, rerender } = renderHook(config => useBenchManagement(config), {
        initialProps: defaultConfig,
      });

      const newConfig = {
        ...defaultConfig,
        currentInning: 7,
        gameId: 'new-game-456',
      };

      rerender(newConfig);

      // Should maintain state but use new config for operations
      expect(result.current).toBeDefined();
    });
  });

  describe('Performance and Optimization', () => {
    it('memoizes eligibility function correctly', () => {
      const { result, rerender } = renderHook(() => useBenchManagement(defaultConfig));

      const firstEligibilityFn = result.current.getPlayerEligibility;
      rerender();
      const secondEligibilityFn = result.current.getPlayerEligibility;

      expect(firstEligibilityFn).toBe(secondEligibilityFn);
    });

    it('memoizes quick substitution function correctly', () => {
      const { result, rerender } = renderHook(() => useBenchManagement(defaultConfig));

      const firstSubstitutionFn = result.current.executeQuickSubstitution;
      rerender();
      const secondSubstitutionFn = result.current.executeQuickSubstitution;

      expect(firstSubstitutionFn).toBe(secondSubstitutionFn);
    });
  });

  describe('Error Boundary Integration', () => {
    it('provides stable error states for UI consumption', () => {
      mockUseSubstitutePlayerAPI.mockReturnValue({
        ...mockSubstitutePlayerAPI,
        error: 'Persistent error',
      });

      const { result, rerender } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.error).toBe('Persistent error');

      rerender();
      expect(result.current.error).toBe('Persistent error');
    });

    it('clears errors when dependencies resolve successfully', () => {
      mockUseSubstitutePlayerAPI.mockReturnValueOnce({
        ...mockSubstitutePlayerAPI,
        error: 'Initial error',
      });

      const { result, rerender } = renderHook(() => useBenchManagement(defaultConfig));

      expect(result.current.error).toBe('Initial error');

      mockUseSubstitutePlayerAPI.mockReturnValueOnce({
        ...mockSubstitutePlayerAPI,
        error: null,
      });

      rerender();
      expect(result.current.error).toBe(null);
    });
  });
});
