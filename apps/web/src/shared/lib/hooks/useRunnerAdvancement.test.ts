/**
 * @file useRunnerAdvancement Hook Tests
 *
 * Test-first implementation for useRunnerAdvancement hook that manages runner
 * advancement UI state and validates movement rules.
 *
 * @remarks
 * This test file follows TDD methodology to drive the implementation of the
 * useRunnerAdvancement hook. The hook is responsible for:
 * - Managing runner advancement UI state during at-bat recording
 * - Calculating automatic advances based on hit types
 * - Validating base movement rules and preventing invalid advances
 * - Providing helper functions for forced advance scenarios
 * - Managing undo/redo state for runner positions
 *
 * Architecture compliance:
 * - Uses game store for current base state
 * - Integrates with domain rules for valid movements
 * - Type safety for runner advance data
 * - Clean separation of UI logic from business rules
 */

import { renderHook, act } from '@testing-library/react';
import { AtBatResultType } from '@twsoftball/application';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Application layer types (allowed imports)

// Mock the store
vi.mock('../store', () => ({
  useGameStore: vi.fn(),
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
    currentInning: 1,
    isTopHalf: true,
    currentBatter: {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '12',
      position: 'SS',
      battingOrder: 1,
    } as Player,
    bases: {
      first: null,
      second: null,
      third: null,
    },
    outs: 0,
  },
};

// Import the hook after mocks are set up
import { useGameStore } from '../store';
import type { Player } from '../store/gameStore';

import { useRunnerAdvancement } from './useRunnerAdvancement';

// Cast to mock for TypeScript
const mockUseGameStore = useGameStore as vi.MockedFunction<typeof useGameStore>;

describe('useRunnerAdvancement Hook - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock return values
    mockUseGameStore.mockReturnValue(defaultMockGameStore);
  });

  describe('Basic Runner State Management', () => {
    it('should initialize with empty runner advances', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      expect(result.current.runnerAdvances).toEqual([]);
    });

    it('should add runner advance when setRunnerAdvance is called', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        });
      });

      expect(result.current.runnerAdvances).toEqual([
        {
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        },
      ]);
    });

    it('should update existing runner advance when same runner is moved again', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        });
      });

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 3, // Updated destination
        });
      });

      expect(result.current.runnerAdvances).toEqual([
        {
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 3,
        },
      ]);
    });

    it('should clear all advances when clearAdvances is called', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        });
        result.current.setRunnerAdvance({
          runnerId: 'player-3',
          fromBase: 2,
          toBase: 3,
        });
      });

      expect(result.current.runnerAdvances).toHaveLength(2);

      act(() => {
        result.current.clearAdvances();
      });

      expect(result.current.runnerAdvances).toEqual([]);
    });
  });

  describe('Automatic Advance Calculation', () => {
    it('should calculate automatic advances for SINGLE', () => {
      // Setup: Runner on first base
      const storeWithRunner = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Jane Smith',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            } as Player,
            second: null,
            third: null,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithRunner);

      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.SINGLE);

      expect(advances).toEqual([
        {
          runnerId: 'player-1', // current batter
          fromBase: 0,
          toBase: 1,
        },
        {
          runnerId: 'player-2', // runner on first
          fromBase: 1,
          toBase: 2, // typically advances to second on single
        },
      ]);
    });

    it('should calculate automatic advances for DOUBLE', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.DOUBLE);

      expect(advances).toEqual([
        {
          runnerId: 'player-1', // current batter
          fromBase: 0,
          toBase: 2, // reaches second on double
        },
      ]);
    });

    it('should calculate automatic advances for HOME_RUN', () => {
      // Setup: Bases loaded
      const storeWithBasesLoaded = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            } as Player,
            second: {
              id: 'player-3',
              name: 'Runner 2',
              jerseyNumber: '9',
              position: 'LF',
              battingOrder: 3,
            } as Player,
            third: {
              id: 'player-4',
              name: 'Runner 3',
              jerseyNumber: '10',
              position: 'RF',
              battingOrder: 4,
            } as Player,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithBasesLoaded);

      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.HOME_RUN);

      expect(advances).toEqual([
        {
          runnerId: 'player-1', // batter
          fromBase: 0,
          toBase: 0, // scores home run
        },
        {
          runnerId: 'player-2', // runner on first
          fromBase: 1,
          toBase: 0, // scores
        },
        {
          runnerId: 'player-3', // runner on second
          fromBase: 2,
          toBase: 0, // scores
        },
        {
          runnerId: 'player-4', // runner on third
          fromBase: 3,
          toBase: 0, // scores
        },
      ]);
    });

    it('should calculate automatic advances for WALK', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.WALK);

      expect(advances).toEqual([
        {
          runnerId: 'player-1', // batter
          fromBase: 0,
          toBase: 1, // walks to first
        },
      ]);
    });

    it('should handle strikeout with no advances', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.STRIKEOUT);

      expect(advances).toEqual([]); // No advances on strikeout
    });
  });

  describe('Forced Advance Logic', () => {
    it('should calculate forced advances for walk with bases loaded', () => {
      // Setup: Bases loaded
      const storeWithBasesLoaded = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            } as Player,
            second: {
              id: 'player-3',
              name: 'Runner 2',
              jerseyNumber: '9',
              position: 'LF',
              battingOrder: 3,
            } as Player,
            third: {
              id: 'player-4',
              name: 'Runner 3',
              jerseyNumber: '10',
              position: 'RF',
              battingOrder: 4,
            } as Player,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithBasesLoaded);

      const { result } = renderHook(() => useRunnerAdvancement());

      const forcedAdvances = result.current.getForcedAdvances(AtBatResultType.WALK);

      expect(forcedAdvances).toEqual([
        {
          runnerId: 'player-1', // batter
          fromBase: 0,
          toBase: 1,
          isForced: true,
        },
        {
          runnerId: 'player-2', // runner on first forced to second
          fromBase: 1,
          toBase: 2,
          isForced: true,
        },
        {
          runnerId: 'player-3', // runner on second forced to third
          fromBase: 2,
          toBase: 3,
          isForced: true,
        },
        {
          runnerId: 'player-4', // runner on third forced home
          fromBase: 3,
          toBase: 0,
          isForced: true,
        },
      ]);
    });

    it('should calculate partial forced advances', () => {
      // Setup: Only first base occupied
      const storeWithRunnerOnFirst = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            } as Player,
            second: null,
            third: null,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithRunnerOnFirst);

      const { result } = renderHook(() => useRunnerAdvancement());

      const forcedAdvances = result.current.getForcedAdvances(AtBatResultType.WALK);

      expect(forcedAdvances).toEqual([
        {
          runnerId: 'player-1', // batter
          fromBase: 0,
          toBase: 1,
          isForced: true,
        },
        {
          runnerId: 'player-2', // runner on first forced to second
          fromBase: 1,
          toBase: 2,
          isForced: true,
        },
      ]);
    });

    it('should handle no forced advances for hits', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      const forcedAdvances = result.current.getForcedAdvances(AtBatResultType.SINGLE);

      expect(forcedAdvances).toEqual([]); // No forced advances on hits
    });
  });

  describe('Movement Validation Rules', () => {
    it('should validate that runners can advance to next base', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      expect(result.current.canAdvanceToBase('player-2', 1, 2)).toBe(true); // first to second
      expect(result.current.canAdvanceToBase('player-2', 2, 3)).toBe(true); // second to third
      expect(result.current.canAdvanceToBase('player-2', 3, 0)).toBe(true); // third to home
    });

    it('should prevent invalid base advances', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      expect(result.current.canAdvanceToBase('player-2', 1, 1)).toBe(false); // same base
      expect(result.current.canAdvanceToBase('player-2', 2, 1)).toBe(false); // backwards
      expect(result.current.canAdvanceToBase('player-2', 0, 3)).toBe(false); // skip bases
    });

    it('should validate movement sequences', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      expect(
        result.current.isValidAdvancement({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        })
      ).toBe(true);

      expect(
        result.current.isValidAdvancement({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 1, // invalid - same base
        })
      ).toBe(false);
    });

    it('should prevent base conflicts', () => {
      // Setup: Runner already on second
      const storeWithRunnerOnSecond = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: null,
            second: {
              id: 'player-3',
              name: 'Runner 2',
              jerseyNumber: '9',
              position: 'LF',
              battingOrder: 3,
            } as Player,
            third: null,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithRunnerOnSecond);

      const { result } = renderHook(() => useRunnerAdvancement());

      // Should prevent another runner from advancing to occupied base
      expect(result.current.canAdvanceToBase('player-2', 1, 2)).toBe(false); // second already occupied
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should track undo history for advances', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        });
      });

      expect(result.current.hasUndoableAdvances).toBe(true);
      expect(result.current.hasRedoableAdvances).toBe(false);
    });

    it('should undo last advance', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        });
      });

      expect(result.current.runnerAdvances).toHaveLength(1);

      act(() => {
        result.current.undoLastAdvance();
      });

      expect(result.current.runnerAdvances).toHaveLength(0);
      expect(result.current.hasUndoableAdvances).toBe(false);
      expect(result.current.hasRedoableAdvances).toBe(true);
    });

    it('should redo advances', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      const advance = {
        runnerId: 'player-2',
        fromBase: 1,
        toBase: 2,
      };

      act(() => {
        result.current.setRunnerAdvance(advance);
      });

      act(() => {
        result.current.undoLastAdvance();
      });

      expect(result.current.runnerAdvances).toHaveLength(0);

      act(() => {
        result.current.redoAdvance();
      });

      expect(result.current.runnerAdvances).toEqual([advance]);
      expect(result.current.hasRedoableAdvances).toBe(false);
    });

    it('should clear redo history when new advance is made', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-2',
          fromBase: 1,
          toBase: 2,
        });
      });

      act(() => {
        result.current.undoLastAdvance();
      });

      expect(result.current.hasRedoableAdvances).toBe(true);

      act(() => {
        result.current.setRunnerAdvance({
          runnerId: 'player-3',
          fromBase: 2,
          toBase: 3,
        });
      });

      expect(result.current.hasRedoableAdvances).toBe(false);
    });
  });

  describe('Integration with Game State', () => {
    it('should consider current base occupancy', () => {
      // Setup: Specific base configuration
      const storeWithSpecificBases = {
        ...defaultMockGameStore,
        activeGameState: {
          ...defaultMockGameStore.activeGameState,
          bases: {
            first: {
              id: 'player-2',
              name: 'Runner 1',
              jerseyNumber: '8',
              position: 'CF',
              battingOrder: 2,
            } as Player,
            second: null,
            third: {
              id: 'player-4',
              name: 'Runner 3',
              jerseyNumber: '10',
              position: 'RF',
              battingOrder: 4,
            } as Player,
          },
        },
      };

      mockUseGameStore.mockReturnValue(storeWithSpecificBases);

      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.SINGLE);

      // Should include current runners in calculations
      expect(advances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ runnerId: 'player-2' }), // runner from first
          expect.objectContaining({ runnerId: 'player-4' }), // runner from third
        ])
      );
    });

    it('should handle empty bases correctly', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      const advances = result.current.calculateAutomaticAdvances(AtBatResultType.SINGLE);

      // Only batter should advance
      expect(advances).toEqual([
        {
          runnerId: 'player-1',
          fromBase: 0,
          toBase: 1,
        },
      ]);
    });
  });

  describe('Hook Interface', () => {
    it('should return correct hook interface', () => {
      const { result } = renderHook(() => useRunnerAdvancement());

      expect(result.current).toMatchObject({
        runnerAdvances: expect.any(Array),
        setRunnerAdvance: expect.any(Function),
        calculateAutomaticAdvances: expect.any(Function),
        validateMovement: expect.any(Function),
        clearAdvances: expect.any(Function),
        getForcedAdvances: expect.any(Function),
        canAdvanceToBase: expect.any(Function),
        isValidAdvancement: expect.any(Function),
        undoLastAdvance: expect.any(Function),
        redoAdvance: expect.any(Function),
        hasUndoableAdvances: expect.any(Boolean),
        hasRedoableAdvances: expect.any(Boolean),
      });
    });
  });
});
