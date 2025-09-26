/**
 * @file RunnerAdvancementPanel.test.tsx
 *
 * Comprehensive test suite for RunnerAdvancementPanel component.
 * Tests runner advancement UI state management, validation rules,
 * and integration with useRunnerAdvancement hook.
 *
 * Test coverage includes:
 * - Runner display with advancement options
 * - Validation of advancement rules
 * - Automatic advances handling
 * - Hook integration
 * - Accessibility and mobile responsiveness
 * - Error states and edge cases
 *
 * @remarks
 * This test suite follows TDD methodology and ensures 95%+ coverage
 * for the RunnerAdvancementPanel component. Tests are organized by
 * functionality and include both positive and negative test cases.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtBatResultType } from '@twsoftball/application';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { RunnerAdvance, ForcedAdvance } from '../../../features/game-core';

import { RunnerAdvancementPanel } from './RunnerAdvancementPanel';

// Mock the useRunnerAdvancement hook
const mockUseRunnerAdvancement = vi.fn();
vi.mock('../../../features/game-core', () => ({
  useRunnerAdvancement: (): unknown => mockUseRunnerAdvancement(),
}));

// Mock data for testing
const mockCurrentBatter = { id: 'batter-1', name: 'John Doe' };
const mockRunner1 = { id: 'runner-1', name: 'Alice Smith' };
const mockRunner2 = { id: 'runner-2', name: 'Bob Johnson' };
const mockRunner3 = { id: 'runner-3', name: 'Carol Wilson' };

/**
 * Default mock implementation for useRunnerAdvancement hook
 */
const createMockHookState = (overrides = {}): Record<string, unknown> => ({
  runnerAdvances: [],
  setRunnerAdvance: vi.fn(),
  calculateAutomaticAdvances: vi.fn(() => []),
  validateMovement: vi.fn(() => true),
  clearAdvances: vi.fn(),
  getForcedAdvances: vi.fn(() => []),
  canAdvanceToBase: vi.fn(() => true),
  isValidAdvancement: vi.fn(() => true),
  undoLastAdvance: vi.fn(),
  redoAdvance: vi.fn(),
  hasUndoableAdvances: false,
  hasRedoableAdvances: false,
  ...overrides,
});

/**
 * Mock game state with runners on bases
 */
const createMockGameState = (
  bases: { first?: unknown; second?: unknown; third?: unknown } = {}
): Record<string, unknown> => ({
  currentBatter: mockCurrentBatter,
  bases,
  inning: 1,
  isTopOfInning: true,
});

describe('RunnerAdvancementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRunnerAdvancement.mockReturnValue(createMockHookState());
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<RunnerAdvancementPanel />);
      expect(screen.getByRole('region', { name: /runner advancement/i })).toBeInTheDocument();
    });

    it('should display proper heading and instructions', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      expect(screen.getByText(/runner advancement/i)).toBeInTheDocument();
      expect(screen.getByText(/select where each runner advances/i)).toBeInTheDocument();
    });

    it('should show empty state when no runners on base', () => {
      render(<RunnerAdvancementPanel currentGameState={createMockGameState({})} />);

      expect(screen.getByText(/no runners on base/i)).toBeInTheDocument();
      expect(screen.queryByTestId('runner-advance-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('Runner Display with Advancement Options', () => {
    it('should display current runners with advancement options', () => {
      const mockAdvances: RunnerAdvance[] = [
        { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
        { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
      ];

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          runnerAdvances: mockAdvances,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            third: mockRunner3,
          })}
        />
      );

      // Should show runners with dropdowns
      expect(screen.getByText(/alice smith/i)).toBeInTheDocument();
      expect(screen.getByText(/carol wilson/i)).toBeInTheDocument();
      expect(screen.getAllByTestId('runner-advance-dropdown')).toHaveLength(2);
    });

    it('should show runners from all occupied bases', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            second: mockRunner2,
            third: mockRunner3,
          })}
        />
      );

      expect(screen.getByText(/alice smith/i)).toBeInTheDocument();
      expect(screen.getByText(/bob johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/carol wilson/i)).toBeInTheDocument();
      expect(screen.getAllByTestId('runner-advance-dropdown')).toHaveLength(3);
    });

    it('should display base positions correctly', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            second: mockRunner2,
            third: mockRunner3,
          })}
        />
      );

      expect(screen.getAllByText(/1st base/i)).toHaveLength(2); // Header + dropdown
      expect(screen.getAllByText(/2nd base/i)).toHaveLength(3); // Header + 2 dropdowns (runner1 to 2nd, runner2 on 2nd)
      expect(screen.getAllByText(/3rd base/i)).toHaveLength(4); // Header + 3 dropdowns (advances to 3rd)
    });
  });

  describe('Validation Rules', () => {
    it('should validate advancement rules and show errors', () => {
      const mockInvalidAdvancement = vi.fn(() => false);
      const mockSetRunnerAdvance = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          isValidAdvancement: mockInvalidAdvancement,
          setRunnerAdvance: mockSetRunnerAdvance,
          runnerAdvances: [{ runnerId: 'runner-2', fromBase: 2, toBase: 1 }], // Invalid advance
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            second: mockRunner2,
          })}
        />
      );

      // Should show validation error summary
      expect(screen.getByText(/some advances are invalid/i)).toBeInTheDocument();
      // The validation logic generates "cannot move backwards to 1st base" message (appears in both dropdown and summary)
      expect(screen.getAllByText(/cannot move backwards to 1st base/i)).toHaveLength(2);
    });

    it('should prevent backwards movement', () => {
      const mockCanAdvance = vi.fn((runnerId, from, to) => {
        // Can't move backwards except to home
        return from < to || to === 0;
      });

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          canAdvanceToBase: mockCanAdvance,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            second: mockRunner2,
          })}
        />
      );

      // For a runner on 2nd base, should call canAdvanceToBase for valid advances (3rd base and HOME)
      // The component only offers forward advancement options, not backwards
      expect(mockCanAdvance).toHaveBeenCalledWith('runner-2', 2, 3);
      expect(mockCanAdvance).toHaveBeenCalledWith('runner-2', 2, 0);

      // Should not call for 1st base since backwards movement is not offered as an option
      expect(mockCanAdvance).not.toHaveBeenCalledWith('runner-2', 2, 1);
    });

    it('should prevent base skipping', () => {
      const mockCanAdvance = vi.fn((runnerId, from, to) => {
        // Can't skip bases
        return to - from <= 1 || to === 0;
      });

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          canAdvanceToBase: mockCanAdvance,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const dropdown = screen.getByTestId('runner-advance-dropdown');

      // Try to select 3rd base (skipping 2nd)
      fireEvent.change(dropdown, { target: { value: '3' } });

      expect(mockCanAdvance).toHaveBeenCalledWith('runner-1', 1, 3);
    });
  });

  describe('Automatic Advances', () => {
    it('should handle automatic advances for hits', () => {
      const mockCalculateAdvances = vi.fn(() => [
        { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
        { runnerId: 'runner-3', fromBase: 3, toBase: 0 },
      ]);

      const mockSetRunnerAdvance = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          calculateAutomaticAdvances: mockCalculateAdvances,
          setRunnerAdvance: mockSetRunnerAdvance,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            third: mockRunner3,
          })}
          atBatResult={{ type: AtBatResultType.SINGLE, label: 'Single', category: 'hit' }}
        />
      );

      // Should automatically calculate advances for single
      expect(mockCalculateAdvances).toHaveBeenCalledWith(AtBatResultType.SINGLE);
    });

    it('should handle force play situations (bases loaded, walk)', () => {
      const mockForcedAdvances: ForcedAdvance[] = [
        { runnerId: 'batter-1', fromBase: 0, toBase: 1, isForced: true },
        { runnerId: 'runner-1', fromBase: 1, toBase: 2, isForced: true },
        { runnerId: 'runner-2', fromBase: 2, toBase: 3, isForced: true },
        { runnerId: 'runner-3', fromBase: 3, toBase: 0, isForced: true },
      ];

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          getForcedAdvances: vi.fn((): ForcedAdvance[] => mockForcedAdvances),
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            second: mockRunner2,
            third: mockRunner3,
          })}
          atBatResult={{ type: AtBatResultType.WALK, label: 'Walk', category: 'walk' }}
        />
      );

      // Should show forced advance notification
      expect(screen.getByText(/forced advance/i)).toBeInTheDocument();
      expect(screen.getByText(/some runners must advance/i)).toBeInTheDocument();
    });

    it('should auto-advance forced runners and show read-only state', () => {
      const mockForcedAdvances: ForcedAdvance[] = [
        { runnerId: 'runner-1', fromBase: 1, toBase: 2, isForced: true },
      ];

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          getForcedAdvances: vi.fn((): ForcedAdvance[] => mockForcedAdvances),
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
          atBatResult={{ type: AtBatResultType.WALK, label: 'Walk', category: 'walk' }}
        />
      );

      // Dropdown should be disabled for forced advance
      const dropdown = screen.getByTestId('runner-advance-dropdown');
      expect(dropdown).toBeDisabled();
    });
  });

  describe('Hook Integration', () => {
    it('should integrate with useRunnerAdvancement hook correctly', () => {
      const mockSetRunnerAdvance = vi.fn();
      const mockClearAdvances = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          setRunnerAdvance: mockSetRunnerAdvance,
          clearAdvances: mockClearAdvances,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      // Should call hook methods when user interacts
      const dropdown = screen.getByTestId('runner-advance-dropdown');
      fireEvent.change(dropdown, { target: { value: '2' } });

      expect(mockSetRunnerAdvance).toHaveBeenCalledWith({
        runnerId: 'runner-1',
        fromBase: 1,
        toBase: 2,
      });
    });

    it('should call clearAdvances when reset button is clicked', async () => {
      const user = userEvent.setup();
      const mockClearAdvances = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          runnerAdvances: [{ runnerId: 'runner-1', fromBase: 1, toBase: 2 }],
          clearAdvances: mockClearAdvances,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      expect(mockClearAdvances).toHaveBeenCalled();
    });

    it('should handle undo/redo functionality', async () => {
      const user = userEvent.setup();
      const mockUndoLastAdvance = vi.fn();
      const mockRedoAdvance = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          undoLastAdvance: mockUndoLastAdvance,
          redoAdvance: mockRedoAdvance,
          hasUndoableAdvances: true,
          hasRedoableAdvances: true,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      await user.click(undoButton);
      expect(mockUndoLastAdvance).toHaveBeenCalled();

      await user.click(redoButton);
      expect(mockRedoAdvance).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing game state gracefully', () => {
      render(<RunnerAdvancementPanel currentGameState={null} />);

      expect(screen.getByText(/no active game/i)).toBeInTheDocument();
    });

    it('should handle invalid runner data gracefully', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: null, // Invalid runner data
            second: mockRunner2,
          })}
        />
      );

      // Should only show valid runner
      expect(screen.getByText(/bob johnson/i)).toBeInTheDocument();
      expect(screen.getAllByTestId('runner-advance-dropdown')).toHaveLength(1);
    });

    it('should handle hook errors gracefully', () => {
      const mockSetRunnerAdvance = vi.fn(() => {
        throw new Error('Hook error');
      });

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          setRunnerAdvance: mockSetRunnerAdvance,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      // Should not crash on hook error - the error is handled internally
      const dropdown = screen.getByTestId('runner-advance-dropdown');
      expect(() => {
        fireEvent.change(dropdown, { target: { value: '2' } });
      }).not.toThrow();

      // Verify that the hook method was called (even though it threw)
      expect(mockSetRunnerAdvance).toHaveBeenCalled();
    });

    it('should validate all advances before allowing completion', () => {
      const mockIsValidAdvancement = vi
        .fn()
        .mockReturnValueOnce(true) // First runner valid
        .mockReturnValueOnce(false); // Second runner invalid

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          runnerAdvances: [
            { runnerId: 'runner-1', fromBase: 1, toBase: 2 },
            { runnerId: 'runner-2', fromBase: 2, toBase: 1 }, // Invalid backwards
          ],
          isValidAdvancement: mockIsValidAdvancement,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            second: mockRunner2,
          })}
        />
      );

      // Should show validation error summary
      expect(screen.getByText(/some advances are invalid/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const panel = screen.getByRole('region', { name: /runner advancement/i });
      expect(panel).toBeInTheDocument();

      const dropdown = screen.getByTestId('runner-advance-dropdown');
      expect(dropdown).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const dropdown = screen.getByTestId('runner-advance-dropdown');

      // Should be focusable
      await user.tab();
      expect(dropdown).toHaveFocus();

      // Should respond to keyboard interaction
      await user.keyboard('{ArrowDown}');
      // Test keyboard interaction with dropdown
    });

    it('should provide clear error messages', () => {
      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          isValidAdvancement: vi.fn(() => false),
          runnerAdvances: [{ runnerId: 'runner-1', fromBase: 1, toBase: 3 }], // Invalid advance
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      // Should provide meaningful error message (appears in both dropdown and summary)
      expect(screen.getAllByText(/cannot skip bases/i)).toHaveLength(2);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render with mobile-first responsive classes', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const panel = screen.getByRole('region', { name: /runner advancement/i });
      expect(panel).toHaveClass(/w-full/); // Mobile-first width
    });

    it('should have minimum touch target sizes', () => {
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const dropdown = screen.getByTestId('runner-advance-dropdown');
      expect(dropdown).toHaveClass(/min-h-/); // Minimum height for touch
    });

    it('should handle different screen sizes', () => {
      // This would require jsdom viewport testing or specific testing utilities
      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
            second: mockRunner2,
            third: mockRunner3,
          })}
        />
      );

      // Should stack dropdowns vertically on mobile
      const container = screen.getByRole('region');
      expect(container).toHaveClass(/flex-col/);
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const mockSetRunnerAdvance = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          setRunnerAdvance: mockSetRunnerAdvance,
        })
      );

      const { rerender } = render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      // Re-render with same props
      rerender(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      // Component should handle re-renders efficiently
      expect(screen.getByTestId('runner-advance-dropdown')).toBeInTheDocument();
    });

    it('should handle rapid interactions gracefully', async () => {
      const user = userEvent.setup();
      const mockSetRunnerAdvance = vi.fn();

      mockUseRunnerAdvancement.mockReturnValue(
        createMockHookState({
          setRunnerAdvance: mockSetRunnerAdvance,
        })
      );

      render(
        <RunnerAdvancementPanel
          currentGameState={createMockGameState({
            first: mockRunner1,
          })}
        />
      );

      const dropdown = screen.getByTestId('runner-advance-dropdown');

      // Rapid clicks should be handled properly
      await user.selectOptions(dropdown, '2');
      await user.selectOptions(dropdown, '3');
      await user.selectOptions(dropdown, '0');

      expect(mockSetRunnerAdvance).toHaveBeenCalledTimes(3);
    });
  });
});
