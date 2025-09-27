/**
 * @file substitutePlayer API Tests
 *
 * Test suite for the substitutePlayer API function that integrates with the DI Container
 * and SubstitutePlayer use case. Tests cover successful operations, error handling,
 * and proper command/result transformation.
 *
 * @remarks
 * These tests verify:
 * - Direct API function integration with DI Container
 * - Proper command construction from API parameters
 * - Result transformation for API consumers
 * - Error handling and propagation
 * - Type safety and parameter validation
 * - Integration patterns with Application layer
 */

import {
  FieldPosition,
  GameId,
  PlayerId,
  TeamLineupId,
  JerseyNumber,
} from '@twsoftball/application';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { substitutePlayer } from './substitutePlayer';
import type { SubstitutePlayerAPIParams } from './substitutePlayer';

// Mock functions using vi.hoisted to ensure they're available during mock hoisting
const { mockSubstitutePlayerUseCase, mockContainer, mockCreateRegular, mockCreateReentry } =
  vi.hoisted(() => {
    const mockSubstitutePlayerUseCase = {
      execute: vi.fn(),
    };

    const mockContainer = {
      substitutePlayer: mockSubstitutePlayerUseCase,
    };

    const mockCreateRegular = vi.fn();
    const mockCreateReentry = vi.fn();

    return { mockSubstitutePlayerUseCase, mockContainer, mockCreateRegular, mockCreateReentry };
  });

// Mock the DI container access
vi.mock('../../../shared/api', () => ({
  getContainer: vi.fn(() => mockContainer),
}));

// Mock Application layer exports
vi.mock('@twsoftball/application/dtos/SubstitutePlayerCommand', () => ({
  SubstitutePlayerCommandFactory: {
    createRegular: mockCreateRegular,
    createReentry: mockCreateReentry,
  },
}));

describe('substitutePlayer API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

  describe('Successful Operations', () => {
    test('executes regular substitution successfully', async () => {
      const mockUseCaseResult = {
        success: true,
        gameState: {
          gameId: new GameId('game-123'),
          status: 'IN_PROGRESS',
        },
        substitutionDetails: {
          battingSlot: 3,
          outgoingPlayerName: 'John Original',
          incomingPlayerName: 'Mike Substitute',
          newFieldPosition: FieldPosition.PITCHER,
          inning: 5,
          wasReentry: false,
          timestamp: new Date('2023-08-15T14:30:00Z'),
        },
        positionChanged: true,
        reentryUsed: false,
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
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

      const result = await substitutePlayer(params);

      // Container access is tested implicitly through use case call

      // Verify use case was called
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

      // Verify result transformation
      expect(result).toMatchObject({
        success: true,
        positionChanged: true,
        reentryUsed: false,
        substitutionDetails: {
          battingSlot: 3,
          outgoingPlayerName: 'John Original',
          incomingPlayerName: 'Mike Substitute',
          newFieldPosition: FieldPosition.PITCHER,
          inning: 5,
          wasReentry: false,
        },
      });
    });

    test('executes re-entry substitution successfully', async () => {
      const mockUseCaseResult = {
        success: true,
        gameState: {
          gameId: new GameId('game-123'),
        },
        substitutionDetails: {
          battingSlot: 1,
          outgoingPlayerName: 'Relief Pitcher',
          incomingPlayerName: 'John Starter',
          newFieldPosition: FieldPosition.FIRST_BASE,
          inning: 8,
          wasReentry: true,
          timestamp: new Date('2023-08-15T15:45:00Z'),
        },
        positionChanged: true,
        reentryUsed: true,
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
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
        notes: 'Starter returning for final innings',
      };

      const result = await substitutePlayer(params);

      // Verify use case call for re-entry
      expect(mockSubstitutePlayerUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          isReentry: true,
          incomingPlayerName: 'John Starter',
          newFieldPosition: FieldPosition.FIRST_BASE,
          inning: 8,
          notes: 'Starter returning for final innings',
        })
      );

      expect(result).toMatchObject({
        success: true,
        reentryUsed: true,
        substitutionDetails: {
          wasReentry: true,
        },
      });
    });

    test('handles successful substitution with no position change', async () => {
      const mockUseCaseResult = {
        success: true,
        gameState: {
          gameId: new GameId('game-123'),
        },
        substitutionDetails: {
          battingSlot: 2,
          outgoingPlayerName: 'Player Out',
          incomingPlayerName: 'Player In',
          newFieldPosition: FieldPosition.CATCHER,
          previousFieldPosition: FieldPosition.CATCHER, // Same position
          inning: 4,
          wasReentry: false,
          timestamp: new Date(),
        },
        positionChanged: false, // No position change
        reentryUsed: false,
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 2,
        outgoingPlayerId: 'player-out',
        incomingPlayer: {
          id: 'player-in',
          name: 'Player In',
          jerseyNumber: '88',
          position: FieldPosition.CATCHER,
        },
        inning: 4,
        isReentry: false,
      };

      const result = await substitutePlayer(params);

      expect(result).toMatchObject({
        success: true,
        positionChanged: false,
        reentryUsed: false,
      });
    });
  });

  describe('Error Handling', () => {
    test('handles substitution rule violations', async () => {
      const mockUseCaseResult = {
        success: false,
        gameState: {
          gameId: new GameId('game-123'),
        },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Outgoing player not found in batting slot'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
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

      const result = await substitutePlayer(params);

      expect(result).toMatchObject({
        success: false,
        errors: ['Outgoing player not found in batting slot'],
        positionChanged: false,
        reentryUsed: false,
      });
    });

    test('handles re-entry rule violations', async () => {
      const mockUseCaseResult = {
        success: false,
        gameState: {
          gameId: new GameId('game-123'),
        },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Player is not an original starter'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
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
        isReentry: true,
      };

      const result = await substitutePlayer(params);

      expect(result).toMatchObject({
        success: false,
        errors: ['Player is not an original starter'],
      });
    });

    test('handles timing constraint violations', async () => {
      const mockUseCaseResult = {
        success: false,
        gameState: {
          gameId: new GameId('game-123'),
        },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Cannot substitute in same inning player entered'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 5,
        outgoingPlayerId: 'incoming-player',
        incomingPlayer: {
          id: 'replacement-player',
          name: 'Quick Replace',
          jerseyNumber: '77',
          position: FieldPosition.CENTER_FIELD,
        },
        inning: 3,
        isReentry: false,
      };

      const result = await substitutePlayer(params);

      expect(result).toMatchObject({
        success: false,
        errors: ['Cannot substitute in same inning player entered'],
      });
    });

    test('handles jersey number conflicts', async () => {
      const mockUseCaseResult = {
        success: false,
        gameState: {
          gameId: new GameId('game-123'),
        },
        positionChanged: false,
        reentryUsed: false,
        errors: ['Jersey number already in use by another player'],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
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

      const result = await substitutePlayer(params);

      expect(result).toMatchObject({
        success: false,
        errors: ['Jersey number already in use by another player'],
      });
    });

    test('handles multiple error messages', async () => {
      const mockUseCaseResult = {
        success: false,
        gameState: {
          gameId: new GameId('game-123'),
        },
        positionChanged: false,
        reentryUsed: false,
        errors: [
          'Starter can only re-enter once per game',
          'Player has already used their re-entry opportunity in inning 6',
        ],
      };

      mockSubstitutePlayerUseCase.execute.mockResolvedValue(mockUseCaseResult);

      const params: SubstitutePlayerAPIParams = {
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

      const result = await substitutePlayer(params);

      expect(result).toMatchObject({
        success: false,
        errors: [
          'Starter can only re-enter once per game',
          'Player has already used their re-entry opportunity in inning 6',
        ],
      });
    });

    test('handles infrastructure errors', async () => {
      mockSubstitutePlayerUseCase.execute.mockRejectedValue(
        new Error('Database connection failed')
      );

      const params: SubstitutePlayerAPIParams = {
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

      await expect(substitutePlayer(params)).rejects.toThrow('Database connection failed');
    });

    test('handles DI container resolution failures', async () => {
      // Mock getContainer to throw an error
      const { getContainer } = await import('../../../shared/api');
      vi.mocked(getContainer).mockImplementationOnce(() => {
        throw new Error('Service not registered');
      });

      const params: SubstitutePlayerAPIParams = {
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

      await expect(substitutePlayer(params)).rejects.toThrow('Service not registered');
    });
  });

  describe('Input Validation', () => {
    test('validates required parameters', async () => {
      const invalidParams = {
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
      } as SubstitutePlayerAPIParams;

      await expect(substitutePlayer(invalidParams)).rejects.toThrow(/required/i);
    });

    test('validates batting slot range', async () => {
      const invalidParams = {
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
      } as SubstitutePlayerAPIParams;

      await expect(substitutePlayer(invalidParams)).rejects.toThrow(/batting slot/i);
    });

    test('validates incoming player information', async () => {
      const invalidParams = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 3,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: '',
          name: 'John Sub',
          jerseyNumber: '99',
          position: FieldPosition.PITCHER,
        },
        inning: 5,
        isReentry: false,
      } as SubstitutePlayerAPIParams;

      await expect(substitutePlayer(invalidParams)).rejects.toThrow(/incoming player/i);
    });
  });

  describe('Command Factory Integration', () => {
    test('uses correct factory method for regular substitution', async () => {
      const { SubstitutePlayerCommandFactory } = await import(
        '@twsoftball/application/dtos/SubstitutePlayerCommand'
      );
      const mockCommand = { gameId: new GameId('game-123') };
      vi.mocked(SubstitutePlayerCommandFactory.createRegular).mockReturnValue(mockCommand);

      mockSubstitutePlayerUseCase.execute.mockResolvedValue({
        success: true,
        gameState: {},
        positionChanged: false,
        reentryUsed: false,
      });

      const params: SubstitutePlayerAPIParams = {
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

      await substitutePlayer(params);

      expect(SubstitutePlayerCommandFactory.createRegular).toHaveBeenCalledWith(
        expect.any(GameId),
        expect.any(TeamLineupId),
        1,
        expect.any(PlayerId),
        expect.any(PlayerId),
        'John Sub',
        expect.any(JerseyNumber),
        FieldPosition.PITCHER,
        5,
        undefined
      );
    });

    test('uses correct factory method for re-entry substitution', async () => {
      const { SubstitutePlayerCommandFactory } = await import(
        '@twsoftball/application/dtos/SubstitutePlayerCommand'
      );
      const mockCommand = { gameId: new GameId('game-123') };
      vi.mocked(SubstitutePlayerCommandFactory.createReentry).mockReturnValue(mockCommand);

      mockSubstitutePlayerUseCase.execute.mockResolvedValue({
        success: true,
        gameState: {},
        positionChanged: false,
        reentryUsed: true,
      });

      const params: SubstitutePlayerAPIParams = {
        gameId: 'game-123',
        teamLineupId: 'team-456',
        battingSlot: 2,
        outgoingPlayerId: 'player-1',
        incomingPlayer: {
          id: 'starter-player',
          name: 'John Starter',
          jerseyNumber: '12',
          position: FieldPosition.FIRST_BASE,
        },
        inning: 8,
        isReentry: true,
        notes: 'Returning starter',
      };

      await substitutePlayer(params);

      expect(SubstitutePlayerCommandFactory.createReentry).toHaveBeenCalledWith(
        expect.any(GameId),
        expect.any(TeamLineupId),
        2,
        expect.any(PlayerId),
        expect.any(PlayerId),
        'John Starter',
        expect.any(JerseyNumber),
        FieldPosition.FIRST_BASE,
        8,
        'Returning starter'
      );
    });
  });
});
