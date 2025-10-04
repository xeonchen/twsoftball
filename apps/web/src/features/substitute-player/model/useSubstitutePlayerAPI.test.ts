/**
 * @file useSubstitutePlayerAPI Hook Test Suite
 *
 * Comprehensive test coverage for the useSubstitutePlayerAPI hook following TDD principles.
 * Tests API interface implementation, type conversions, and integration with useSubstitutePlayer.
 */

import { renderHook, act } from '@testing-library/react';
import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { SubstitutionRequestData } from '../../../shared/lib/types';

import type { SubstitutePlayerResult } from './useSubstitutePlayer';
import { useSubstitutePlayerAPI } from './useSubstitutePlayerAPI';

// Mock the useSubstitutePlayer hook
const mockSubstitutePlayer = vi.fn();
const mockUseSubstitutePlayer = vi.fn();

vi.mock('./useSubstitutePlayer', (): { useSubstitutePlayer: () => unknown } => ({
  useSubstitutePlayer: (): unknown => mockUseSubstitutePlayer(),
}));

describe('useSubstitutePlayerAPI', () => {
  const mockSharedRequestData: SubstitutionRequestData = {
    gameId: 'game-123',
    teamLineupId: 'team-456',
    battingSlot: 3,
    outgoingPlayerId: 'player-1',
    incomingPlayer: {
      id: 'player-2',
      name: 'John Doe',
      jerseyNumber: '99',
      position: FieldPosition.CATCHER,
    },
    inning: 5,
    isReentry: false,
    notes: 'Injury substitution',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementation
    mockUseSubstitutePlayer.mockReturnValue({
      substitutePlayer: mockSubstitutePlayer,
      isLoading: false,
      error: null,
    });
  });

  describe('Hook Interface', () => {
    it('returns correct interface structure', () => {
      const { result } = renderHook(() => useSubstitutePlayerAPI());

      expect(result.current).toMatchObject({
        executeSubstitution: expect.any(Function),
        isExecuting: expect.any(Boolean),
        substitutionError: null, // Initial state should be null
      });

      expect(typeof result.current.executeSubstitution).toBe('function');
      expect(typeof result.current.isExecuting).toBe('boolean');
      expect(
        result.current.substitutionError === null ||
          typeof result.current.substitutionError === 'string'
      ).toBe(true);
    });

    it('maintains stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useSubstitutePlayerAPI());

      const initialExecuteSubstitution = result.current.executeSubstitution;

      rerender();

      expect(result.current.executeSubstitution).toBe(initialExecuteSubstitution);
    });

    it('exposes loading state from underlying hook', () => {
      mockUseSubstitutePlayer.mockReturnValue({
        substitutePlayer: mockSubstitutePlayer,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      expect(result.current.isExecuting).toBe(true);
    });

    it('exposes error state from underlying hook', () => {
      mockUseSubstitutePlayer.mockReturnValue({
        substitutePlayer: mockSubstitutePlayer,
        isLoading: false,
        error: 'Connection failed',
      });

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      expect(result.current.substitutionError).toBe('Connection failed');
    });
  });

  describe('Data Type Conversion - Shared to Internal', () => {
    it('converts shared request data to internal format correctly', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await act(async () => {
        await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(mockSubstitutePlayer).toHaveBeenCalledWith({
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 3,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Doe',
          jerseyNumber: '99',
          position: FieldPosition.CATCHER,
        },
        inning: 5,
        isReentry: false,
        notes: 'Injury substitution',
      });
    });

    it('handles request data without optional notes', async () => {
      const requestDataWithoutNotes: SubstitutionRequestData = {
        ...mockSharedRequestData,
        notes: undefined,
      };

      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await act(async () => {
        await result.current.executeSubstitution(requestDataWithoutNotes);
      });

      expect(mockSubstitutePlayer).toHaveBeenCalledWith(
        expect.not.objectContaining({
          notes: expect.anything(),
        })
      );
    });

    it('preserves all incoming player information correctly', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await act(async () => {
        await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(mockSubstitutePlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          incomingPlayer: expect.objectContaining({
            id: 'player-2',
            name: 'John Doe',
            jerseyNumber: '99',
            position: FieldPosition.CATCHER,
          }),
        })
      );
    });
  });

  describe('Data Type Conversion - Internal to Shared', () => {
    it('converts minimal internal result to shared format correctly', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const sharedResult = await act(async () => {
        return await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(sharedResult).toEqual({
        success: true,
        positionChanged: false,
        reentryUsed: false,
      });
    });

    it('converts comprehensive internal result to shared format correctly', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: true,
        reentryUsed: false,
        gameState: {
          currentInning: 5,
          currentBattingSlot: 4,
          homeScore: 3,
          awayScore: 2,
        },
        substitutionDetails: {
          incomingPlayerName: 'John Doe',
          outgoingPlayerName: 'Jane Smith',
          battingSlot: 3,
        },
        errors: [],
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const sharedResult = await act(async () => {
        return await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(sharedResult).toEqual({
        success: true,
        positionChanged: true,
        reentryUsed: false,
        gameState: {
          currentInning: 5,
          currentBattingSlot: 4,
          homeScore: 3,
          awayScore: 2,
        },
        substitutionDetails: {
          incomingPlayerName: 'John Doe',
          outgoingPlayerName: 'Jane Smith',
          battingSlot: 3,
        },
        errors: [],
      });
    });

    it('handles failed internal result with errors correctly', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: false,
        positionChanged: false,
        reentryUsed: false,
        errors: ['Player is not eligible for substitution', 'Jersey number conflict detected'],
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const sharedResult = await act(async () => {
        return await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(sharedResult).toEqual({
        success: false,
        positionChanged: false,
        reentryUsed: false,
        errors: ['Player is not eligible for substitution', 'Jersey number conflict detected'],
      });
    });

    it('excludes undefined optional fields from shared result', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
        gameState: undefined,
        substitutionDetails: undefined,
        errors: undefined,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const sharedResult = await act(async () => {
        return await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(sharedResult).toEqual({
        success: true,
        positionChanged: false,
        reentryUsed: false,
      });

      expect(sharedResult).not.toHaveProperty('gameState');
      expect(sharedResult).not.toHaveProperty('substitutionDetails');
      expect(sharedResult).not.toHaveProperty('errors');
    });
  });

  describe('Error Handling', () => {
    it('propagates errors from underlying hook', async () => {
      const error = new Error('Network connection failed');
      mockSubstitutePlayer.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await expect(
        act(async () => {
          await result.current.executeSubstitution(mockSharedRequestData);
        })
      ).rejects.toThrow('Network connection failed');
    });

    it('handles non-Error rejections gracefully', async () => {
      mockSubstitutePlayer.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await expect(
        act(async () => {
          await result.current.executeSubstitution(mockSharedRequestData);
        })
      ).rejects.toBe('String error');
    });
  });

  describe('Integration Behavior', () => {
    it('passes through all operations to underlying hook', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: true,
        reentryUsed: true,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await act(async () => {
        await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(mockSubstitutePlayer).toHaveBeenCalledTimes(1);
    });

    it('maintains consistent behavior across multiple calls', async () => {
      const firstResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      const secondResult: SubstitutePlayerResult = {
        success: false,
        positionChanged: false,
        reentryUsed: false,
        errors: ['Player not found'],
      };

      mockSubstitutePlayer.mockResolvedValueOnce(firstResult).mockResolvedValueOnce(secondResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const firstSharedResult = await act(async () => {
        return await result.current.executeSubstitution(mockSharedRequestData);
      });

      const secondSharedResult = await act(async () => {
        return await result.current.executeSubstitution(mockSharedRequestData);
      });

      expect(firstSharedResult.success).toBe(true);
      expect(secondSharedResult.success).toBe(false);
      expect(secondSharedResult.errors).toEqual(['Player not found']);
    });
  });

  describe('Performance and Memory', () => {
    it('creates stable conversion functions across re-renders', () => {
      const { result, rerender } = renderHook(() => useSubstitutePlayerAPI());

      const initialFunction = result.current.executeSubstitution;

      // Trigger multiple re-renders
      rerender();
      rerender();
      rerender();

      expect(result.current.executeSubstitution).toBe(initialFunction);
    });

    it('does not create new internal data objects unnecessarily', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      await act(async () => {
        await result.current.executeSubstitution(mockSharedRequestData);
      });

      // Verify that the internal conversion produces expected structure
      const callArgs = mockSubstitutePlayer.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.objectContaining({
          gameId: 'game-123',
          teamLineupId: 'team-456',
          battingSlot: 3,
          outgoingPlayerId: 'player-1',
          incomingPlayer: expect.objectContaining({
            id: 'player-2',
            name: 'John Doe',
            jerseyNumber: '99',
            position: FieldPosition.CATCHER,
          }),
          inning: 5,
          isReentry: false,
          notes: 'Injury substitution',
        })
      );
    });
  });

  describe('Type Safety', () => {
    it('correctly handles various field position values', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: false,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const requestWithDifferentPosition: SubstitutionRequestData = {
        ...mockSharedRequestData,
        incomingPlayer: {
          ...mockSharedRequestData.incomingPlayer,
          position: FieldPosition.SHORT_FIELDER,
        },
      };

      await act(async () => {
        await result.current.executeSubstitution(requestWithDifferentPosition);
      });

      expect(mockSubstitutePlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          incomingPlayer: expect.objectContaining({
            position: FieldPosition.SHORT_FIELDER,
          }),
        })
      );
    });

    it('correctly handles boolean flags', async () => {
      const mockInternalResult: SubstitutePlayerResult = {
        success: true,
        positionChanged: false,
        reentryUsed: true,
      };

      mockSubstitutePlayer.mockResolvedValueOnce(mockInternalResult);

      const { result } = renderHook(() => useSubstitutePlayerAPI());

      const reentryRequest: SubstitutionRequestData = {
        ...mockSharedRequestData,
        isReentry: true,
      };

      await act(async () => {
        await result.current.executeSubstitution(reentryRequest);
      });

      expect(mockSubstitutePlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          isReentry: true,
        })
      );
    });
  });
});
