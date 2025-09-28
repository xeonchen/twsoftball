/**
 * @file useSubstitutePlayer Hook Tests
 *
 * Comprehensive test suite for the useSubstitutePlayer hook following TDD principles.
 * Tests cover successful substitutions, error scenarios, validation, and integration patterns.
 *
 * @remarks
 * These tests verify:
 * - Successful integration with SubstitutePlayer use case
 * - Proper command mapping from UI to Application layer
 * - Error handling and user-friendly error messages
 * - Loading states and async operation management
 * - Type safety and parameter validation
 * - DI Container integration patterns
 */

import { renderHook, act } from '@testing-library/react';
import {
  FieldPosition,
  GameId,
  PlayerId,
  TeamLineupId,
  JerseyNumber,
} from '@twsoftball/application';
import { SubstitutePlayerCommandFactory } from '@twsoftball/application/dtos/SubstitutePlayerCommand';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAppServicesContext } from '../../../shared/lib';

import { useSubstitutePlayer } from './useSubstitutePlayer';
import type { SubstitutePlayerData, SubstitutePlayerResult } from './useSubstitutePlayer';

// Mock the shared/lib context
vi.mock('../../../shared/lib', () => ({
  useAppServicesContext: vi.fn(),
}));

// Mock Application layer exports
vi.mock('@twsoftball/application/dtos/SubstitutePlayerCommand', () => ({
  SubstitutePlayerCommandFactory: {
    createRegular: vi.fn(),
    createReentry: vi.fn(),
  },
}));

// Cast to mocks for TypeScript
const mockUseAppServicesContext = useAppServicesContext as vi.MockedFunction<
  typeof useAppServicesContext
>;
const mockCreateRegular = SubstitutePlayerCommandFactory.createRegular as vi.MockedFunction<
  typeof SubstitutePlayerCommandFactory.createRegular
>;
const mockCreateReentry = SubstitutePlayerCommandFactory.createReentry as vi.MockedFunction<
  typeof SubstitutePlayerCommandFactory.createReentry
>;

// Create persistent mock reference for tests
const mockSubstitutePlayerUseCase = {
  execute: vi.fn(),
};

describe('useSubstitutePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset context mock after clearAllMocks
    mockUseAppServicesContext.mockReturnValue({
      services: {
        applicationServices: {
          substitutePlayer: mockSubstitutePlayerUseCase,
        },
        gameAdapter: {} as {
          recordAtBat?: (...args: unknown[]) => unknown;
          [key: string]: unknown;
        },
      },
      isInitializing: false,
      error: null,
    });

    // Set up command factory mocks to return commands that match test expectations
    mockCreateRegular.mockImplementation(
      (
        gameId,
        teamLineupId,
        battingSlot,
        outgoingPlayerId,
        incomingPlayerId,
        incomingPlayerName,
        jerseyNumber,
        position,
        inning,
        notes
      ) => ({
        gameId,
        teamLineupId,
        battingSlot,
        outgoingPlayerId,
        incomingPlayerId,
        incomingPlayerName,
        incomingJerseyNumber: jerseyNumber,
        newFieldPosition: position,
        inning,
        isReentry: false,
        notes,
      })
    );

    mockCreateReentry.mockImplementation(
      (
        gameId,
        teamLineupId,
        battingSlot,
        outgoingPlayerId,
        incomingPlayerId,
        incomingPlayerName,
        jerseyNumber,
        position,
        inning,
        notes
      ) => ({
        gameId,
        teamLineupId,
        battingSlot,
        outgoingPlayerId,
        incomingPlayerId,
        incomingPlayerName,
        incomingJerseyNumber: jerseyNumber,
        newFieldPosition: position,
        inning,
        isReentry: true,
        notes,
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Structure', () => {
    test('returns correct structure with initial state', () => {
      const { result } = renderHook(() => useSubstitutePlayer());

      expect(result.current).toMatchObject({
        substitutePlayer: expect.any(Function),
        isLoading: false,
        error: null,
        lastResult: null,
      });
    });

    test('maintains stable function references', () => {
      const { result, rerender } = renderHook(() => useSubstitutePlayer());
      const initialSubstitutePlayer = result.current.substitutePlayer;

      rerender();

      expect(result.current.substitutePlayer).toBe(initialSubstitutePlayer);
    });
  });

  describe('Successful Substitutions', () => {
    test('calls SubstitutePlayer use case with correct command for regular substitution', async () => {
      const mockResult = {
        success: true,
        gameState: { gameId: new GameId('game-123') },
        substitutionDetails: {
          battingSlot: 3,
          outgoingPlayerName: 'John Original',
          incomingPlayerName: 'Mike Substitute',
          newFieldPosition: FieldPosition.PITCHER,
          inning: 5,
          wasReentry: false,
          timestamp: new Date(),
        },
        positionChanged: true,
        reentryUsed: false,
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 3,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'Mike Substitute',
          jerseyNumber: '99',
          position: FieldPosition.PITCHER,
        },
        inning: 5,
        isReentry: false,
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      // Verify use case was called with correct command structure
      expect(mockSubstitutePlayerUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: expect.any(GameId),
          teamLineupId: expect.any(TeamLineupId),
          battingSlot: 3,
          outgoingPlayerId: expect.any(PlayerId),
          incomingPlayerId: expect.any(PlayerId),
          incomingPlayerName: 'Mike Substitute',
          incomingJerseyNumber: expect.any(JerseyNumber),
          newFieldPosition: FieldPosition.PITCHER,
          inning: 5,
          isReentry: false,
        })
      );

      expect(actualResult).toMatchObject({
        success: true,
        positionChanged: true,
        reentryUsed: false,
      });
    });

    test('calls SubstitutePlayer use case with correct command for re-entry substitution', async () => {
      const mockResult = {
        success: true,
        gameState: { gameId: new GameId('game-123') },
        substitutionDetails: {
          battingSlot: 1,
          outgoingPlayerName: 'Relief Pitcher',
          incomingPlayerName: 'John Starter',
          newFieldPosition: FieldPosition.FIRST_BASE,
          inning: 8,
          wasReentry: true,
          timestamp: new Date(),
        },
        positionChanged: true,
        reentryUsed: true,
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 1,
        outgoingPlayerId: 'relief-player',
        incomingPlayer: {
          id: 'original-starter',
          name: 'John Starter',
          jerseyNumber: '12',
          position: FieldPosition.FIRST_BASE,
        },
        inning: 8,
        isReentry: true,
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      expect(mockSubstitutePlayerUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          battingSlot: 1,
          incomingPlayerName: 'John Starter',
          newFieldPosition: FieldPosition.FIRST_BASE,
          inning: 8,
          isReentry: true,
        })
      );

      expect(actualResult).toMatchObject({
        success: true,
        reentryUsed: true,
      });
    });

    test('updates loading state correctly during successful substitution', async () => {
      const mockResult = {
        success: true,
        gameState: { gameId: new GameId('game-123') },
        substitutionDetails: {},
        positionChanged: false,
        reentryUsed: false,
      };

      // Add delay to mock async operation
      mockSubstitutePlayerUseCase.execute.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResult), 100))
      );

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 1,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.CATCHER,
        },
        inning: 3,
        isReentry: false,
      };

      // Initially not loading
      expect(result.current.isLoading).toBe(false);

      // Call substitution and wait for completion
      await act(async () => {
        await result.current.substitutePlayer(substitutionData);
      });

      // Should not be loading after completion
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Error Handling', () => {
    test('handles substitution errors gracefully', async () => {
      const mockErrorResult = {
        success: false,
        gameState: { gameId: new GameId('game-123') },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Outgoing player not found in batting slot'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockErrorResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 3,
        outgoingPlayerId: 'wrong-player',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.SHORTSTOP,
        },
        inning: 5,
        isReentry: false,
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      expect(actualResult).toMatchObject({
        success: false,
        errors: ['Outgoing player not found in batting slot'],
      });

      expect(result.current.error).toBe('Outgoing player not found in batting slot');
      expect(result.current.isLoading).toBe(false);
    });

    test('handles re-entry rule violations', async () => {
      const mockErrorResult = {
        success: false,
        gameState: { gameId: new GameId('game-123') },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Player is not an original starter'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockErrorResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 2,
        outgoingPlayerId: 'current-player',
        incomingPlayer: {
          id: 'non-starter-player',
          name: 'Non Starter',
          jerseyNumber: '88',
          position: FieldPosition.LEFT_FIELD,
        },
        inning: 6,
        isReentry: true, // Attempting re-entry for non-starter
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      expect(actualResult).toMatchObject({
        success: false,
        errors: ['Player is not an original starter'],
      });

      expect(result.current.error).toBe('Player is not an original starter');
    });

    test('handles multiple re-entry attempts', async () => {
      const mockErrorResult = {
        success: false,
        gameState: { gameId: new GameId('game-123') },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Starter can only re-enter once per game'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockErrorResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 4,
        outgoingPlayerId: 'current-player',
        incomingPlayer: {
          id: 'already-reentered-starter',
          name: 'Already Reentered',
          jerseyNumber: '11',
          position: FieldPosition.RIGHT_FIELD,
        },
        inning: 9,
        isReentry: true,
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      expect(actualResult).toMatchObject({
        success: false,
        errors: ['Starter can only re-enter once per game'],
      });
    });

    test('handles timing constraint violations', async () => {
      const mockErrorResult = {
        success: false,
        gameState: { gameId: new GameId('game-123') },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Cannot substitute in same inning player entered'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockErrorResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 5,
        outgoingPlayerId: 'incoming-player', // Player who just entered
        incomingPlayer: {
          id: 'replacement-player',
          name: 'Quick Replace',
          jerseyNumber: '77',
          position: FieldPosition.CENTER_FIELD,
        },
        inning: 3, // Same inning
        isReentry: false,
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      expect(actualResult).toMatchObject({
        success: false,
        errors: ['Cannot substitute in same inning player entered'],
      });
    });

    test('handles jersey number conflicts', async () => {
      const mockErrorResult = {
        success: false,
        gameState: { gameId: new GameId('game-123') },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Jersey number already in use by another player'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockErrorResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 6,
        outgoingPlayerId: 'player-out',
        incomingPlayer: {
          id: 'player-in',
          name: 'Duplicate Jersey',
          jerseyNumber: '5', // Already assigned
          position: FieldPosition.THIRD_BASE,
        },
        inning: 4,
        isReentry: false,
      };

      let actualResult: SubstitutePlayerResult | undefined;

      await act(async () => {
        actualResult = await result.current.substitutePlayer(substitutionData);
      });

      expect(actualResult).toMatchObject({
        success: false,
        errors: ['Jersey number already in use by another player'],
      });
    });

    test('handles infrastructure errors', async () => {
      mockSubstitutePlayerUseCase.execute.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 1,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.PITCHER,
        },
        inning: 5,
        isReentry: false,
      };

      let thrownError: Error | undefined;

      await act(async () => {
        try {
          await result.current.substitutePlayer(substitutionData);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Database connection failed');
      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('State Management', () => {
    test('clears error on successful substitution', async () => {
      const { result } = renderHook(() => useSubstitutePlayer());

      // First, cause an error
      mockSubstitutePlayerUseCase.execute.mockResolvedValue({
        success: false,
        errors: ['Some error'],
        gameState: {},
        positionChanged: false,
        reentryUsed: false,
      });

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 1,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.CATCHER,
        },
        inning: 5,
        isReentry: false,
      };

      await act(async () => {
        await result.current.substitutePlayer(substitutionData);
      });

      expect(result.current.error).toBe('Some error');

      // Now succeed
      mockSubstitutePlayerUseCase.execute.mockResolvedValue({
        success: true,
        gameState: {},
        substitutionDetails: {},
        positionChanged: false,
        reentryUsed: false,
      });

      await act(async () => {
        await result.current.substitutePlayer(substitutionData);
      });

      expect(result.current.error).toBe(null);
    });

    test('stores last successful result', async () => {
      const mockResult = {
        success: true,
        gameState: { gameId: new GameId('game-123') },
        substitutionDetails: {
          battingSlot: 2,
          outgoingPlayerName: 'Old Player',
          incomingPlayerName: 'New Player',
          newFieldPosition: FieldPosition.SHORTSTOP,
          inning: 4,
          wasReentry: false,
          timestamp: new Date(),
        },
        positionChanged: true,
        reentryUsed: false,
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSubstitutePlayer());

      const substitutionData: SubstitutePlayerData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 2,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'New Player',
          jerseyNumber: '88',
          position: FieldPosition.SHORTSTOP,
        },
        inning: 4,
        isReentry: false,
      };

      await act(async () => {
        await result.current.substitutePlayer(substitutionData);
      });

      expect(result.current.lastResult).toMatchObject({
        success: true,
        positionChanged: true,
        reentryUsed: false,
      });
    });
  });

  describe('Input Validation', () => {
    test('validates required fields', async () => {
      const { result } = renderHook(() => useSubstitutePlayer());

      const invalidData = {
        gameId: '',
        teamLineupId: 'team-456',
        battingSlot: 1,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.PITCHER,
        },
        inning: 5,
        isReentry: false,
      } as SubstitutePlayerData;

      let thrownError: Error | undefined;

      await act(async () => {
        try {
          await result.current.substitutePlayer(invalidData);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(result.current.error).toMatch(/required/i);
    });

    test('validates batting slot range', async () => {
      const { result } = renderHook(() => useSubstitutePlayer());

      const invalidData = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 0, // Invalid
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'player-2',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.PITCHER,
        },
        inning: 5,
        isReentry: false,
      } as SubstitutePlayerData;

      let thrownError: Error | undefined;

      await act(async () => {
        try {
          await result.current.substitutePlayer(invalidData);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(result.current.error).toMatch(/batting slot/i);
    });
  });
});
