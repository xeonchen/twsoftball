import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GameSetupLineupPage } from './GameSetupLineupPage';

/**
 * GameSetupLineupPage Validation Integration Tests
 *
 * Tests the integration of domain validation into the lineup setup page.
 * These tests verify real-time validation feedback for jersey numbers,
 * field positions, and lineup completeness based on domain rules.
 *
 * Features tested:
 * - Real-time jersey number validation (1-99, no duplicates)
 * - Field position validation with domain enum
 * - Lineup completeness validation (minimum 9 players)
 * - Position coverage validation
 * - Real-time validation feedback UI
 * - Domain rule hints and suggestions
 *
 * Coverage requirements: 95%+
 */

// Mock the game store
const mockSetLineup = vi.fn();
const mockGameStore = {
  setupWizard: {
    teams: {
      home: 'Warriors',
      away: 'Eagles',
      ourTeam: 'home' as const,
    },
    lineup: [],
  },
  setLineup: mockSetLineup,
};

vi.mock('../../../entities/game', () => ({
  useGameStore: (): typeof mockGameStore => mockGameStore,
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

/**
 * Test wrapper with router context
 */
function renderWithRouter(component: React.ReactElement): ReturnType<typeof render> {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('GameSetupLineupPage Validation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameStore.setupWizard.lineup = [];
  });

  describe('Jersey Number Validation', () => {
    it('should validate jersey numbers are 1-99', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first empty player slot (default 10 players)
      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Test valid jersey numbers
      fireEvent.change(jerseyInput, { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-success-0')).toBeInTheDocument();
      });

      fireEvent.change(jerseyInput, { target: { value: '99' } });
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-success-0')).toBeInTheDocument();
      });

      // Test invalid jersey numbers
      fireEvent.change(jerseyInput, { target: { value: '0' } });
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-error-0')).toBeInTheDocument();
        expect(screen.getByText('Jersey number must be between 1 and 99')).toBeInTheDocument();
      });

      fireEvent.change(jerseyInput, { target: { value: '100' } });
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-error-0')).toBeInTheDocument();
        expect(screen.getByText('Jersey number must be between 1 and 99')).toBeInTheDocument();
      });
    });

    it('should prevent duplicate jersey numbers', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first two empty player slots
      const jerseyInput1 = screen.getByTestId('jersey-input-0');
      const jerseyInput2 = screen.getByTestId('jersey-input-1');

      // Set same jersey numbers
      fireEvent.change(jerseyInput1, { target: { value: '23' } });
      fireEvent.change(jerseyInput2, { target: { value: '23' } });

      // Should show duplicate error
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-error-1')).toBeInTheDocument();
        expect(screen.getByText('Jersey number 23 is already taken')).toBeInTheDocument();
      });
    });

    it('should provide jersey number suggestions', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Focus on jersey input to show suggestions
      fireEvent.focus(jerseyInput);

      // Should show common jersey number suggestions
      await waitFor(() => {
        expect(screen.getByTestId('jersey-suggestions')).toBeInTheDocument();
        expect(screen.getByTestId('jersey-suggestion-1')).toBeInTheDocument();
        expect(screen.getByTestId('jersey-suggestion-2')).toBeInTheDocument();
        expect(screen.getByTestId('jersey-suggestion-10')).toBeInTheDocument();
      });
    });

    it('should handle non-numeric jersey input', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Enter non-numeric input
      fireEvent.change(jerseyInput, { target: { value: '23a' } });

      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-error-0')).toBeInTheDocument();
        expect(screen.getByText('Jersey number must be numeric')).toBeInTheDocument();
      });
    });
  });

  describe('Field Position Validation', () => {
    it('should validate field positions are valid enum values', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const positionSelect = screen.getByTestId('position-select-0');

      // Test valid positions
      fireEvent.change(positionSelect, { target: { value: 'P' } });
      await waitFor(() => {
        expect(screen.getByTestId('position-validation-success-0')).toBeInTheDocument();
      });

      fireEvent.change(positionSelect, { target: { value: 'SS' } });
      await waitFor(() => {
        expect(screen.getByTestId('position-validation-success-0')).toBeInTheDocument();
      });

      fireEvent.change(positionSelect, { target: { value: 'EP' } });
      await waitFor(() => {
        expect(screen.getByTestId('position-validation-success-0')).toBeInTheDocument();
      });
    });

    it('should show all valid field positions in dropdown', () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const positionSelect = screen.getByTestId('position-select-0');

      // Should have all domain positions as options
      expect(positionSelect).toContainHTML('<option value="P">P - Pitcher</option>');
      expect(positionSelect).toContainHTML('<option value="C">C - Catcher</option>');
      expect(positionSelect).toContainHTML('<option value="1B">1B - First Base</option>');
      expect(positionSelect).toContainHTML('<option value="SS">SS - Shortstop</option>');
      expect(positionSelect).toContainHTML('<option value="SF">SF - Short Fielder</option>');
      expect(positionSelect).toContainHTML('<option value="EP">EP - Extra Player</option>');
    });

    it('should provide position descriptions for better UX', () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const positionSelect = screen.getByTestId('position-select-0');

      // Position descriptions are provided in the option text format "P - Pitcher"
      expect(positionSelect).toContainHTML('<option value="P">P - Pitcher</option>');
      expect(positionSelect).toContainHTML('<option value="SF">SF - Short Fielder</option>');
      expect(positionSelect).toContainHTML('<option value="EP">EP - Extra Player</option>');
    });
  });

  describe('Lineup Completeness Validation', () => {
    it('should validate minimum 9 players', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Initially continue button should be disabled (default 10 empty slots)
      expect(screen.getByTestId('continue-button')).toBeDisabled();

      // Change to 9 players first to avoid validation issues with empty slots
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Fill 8 players (not enough)
      for (let i = 0; i < 8; i++) {
        // Fill required fields
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      await waitFor(() => {
        expect(screen.getByTestId('continue-button')).toBeDisabled();
      });

      // Fill 9th player
      const nameInput = screen.getByTestId('player-name-input-8');
      const jerseyInput = screen.getByTestId('jersey-input-8');
      const positionSelect = screen.getByTestId('position-select-8');

      fireEvent.change(nameInput, { target: { value: 'Player 9' } });
      fireEvent.change(jerseyInput, { target: { value: '9' } });
      fireEvent.change(positionSelect, { target: { value: 'C' } });

      await waitFor(() => {
        expect(screen.getByTestId('continue-button')).toBeEnabled();
      });
    });

    it('should show position coverage status', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Should show position coverage panel
      expect(screen.getByTestId('position-coverage')).toBeInTheDocument();

      // Change to 9 players to match positions filled
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Fill players with different positions
      const positionsToFill = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

      for (let i = 0; i < positionsToFill.length; i++) {
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: positionsToFill[i] } });
      }

      // Should show individual position coverage indicators
      await waitFor(() => {
        expect(screen.getByTestId('position-coverage-P')).toBeInTheDocument();
        expect(screen.getByTestId('position-coverage-C')).toBeInTheDocument();
        expect(screen.getByTestId('position-coverage-SS')).toBeInTheDocument();
      });
    });

    it('should show position coverage indicators for essential positions', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players to match players filled
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Fill 9 players but all as Extra Players
      for (let i = 0; i < 9; i++) {
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: 'EP' } });
      }

      // Should show position coverage indicators (uncovered essential positions)
      await waitFor(() => {
        expect(screen.getByTestId('position-coverage-P')).toBeInTheDocument();
        expect(screen.getByTestId('position-coverage-C')).toBeInTheDocument();
        expect(screen.getByTestId('position-coverage-SS')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Validation Feedback UI', () => {
    it('should show real-time validation indicators', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const jerseyInput = screen.getByTestId('jersey-input-0');
      const positionSelect = screen.getByTestId('position-select-0');

      // Initially no validation
      expect(screen.queryByTestId('jersey-validation-success-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('position-validation-success-0')).not.toBeInTheDocument();

      // Enter valid jersey
      fireEvent.change(jerseyInput, { target: { value: '23' } });
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-success-0')).toBeInTheDocument();
      });

      // Select valid position
      fireEvent.change(positionSelect, { target: { value: 'SS' } });
      await waitFor(() => {
        expect(screen.getByTestId('position-validation-success-0')).toBeInTheDocument();
      });
    });

    it('should show lineup progress indicator', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Should show progress indicator (step 2/3)
      expect(screen.getByTestId('lineup-progress')).toHaveTextContent('2/3');

      // Add players and validate they appear
      for (let i = 0; i < 3; i++) {
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      // Should still show step progress
      await waitFor(() => {
        expect(screen.getByTestId('lineup-progress')).toHaveTextContent('2/3');
      });
    });

    it('should provide domain rule hints for lineup building', () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Should show domain rules panel with hints
      expect(screen.getByTestId('domain-rules-panel')).toBeInTheDocument();
      expect(screen.getByText('Jersey numbers must be between 1 and 99')).toBeInTheDocument();
      expect(screen.getByText('Each player must have a unique jersey number')).toBeInTheDocument();
      expect(screen.getByText('All 9 field positions should be covered')).toBeInTheDocument();
    });
  });

  describe('Domain Rule Integration', () => {
    it('should surface domain constraints as user-friendly messages', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Test domain constraint violation
      fireEvent.change(jerseyInput, { target: { value: '150' } });

      await waitFor(() => {
        // Should show user-friendly message, not technical domain error
        expect(screen.getByText('Jersey number must be between 1 and 99')).toBeInTheDocument();
        expect(screen.queryByText('DomainError')).not.toBeInTheDocument();
      });
    });

    it('should provide suggestions based on domain knowledge', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Focus to show suggestions
      fireEvent.focus(jerseyInput);

      await waitFor(() => {
        expect(screen.getByTestId('jersey-suggestions')).toBeInTheDocument();
        // Should suggest common softball jersey numbers
        expect(screen.getByTestId('jersey-suggestion-1')).toBeInTheDocument();
        expect(screen.getByTestId('jersey-suggestion-2')).toBeInTheDocument();
        expect(screen.getByTestId('jersey-suggestion-10')).toBeInTheDocument();
      });
    });

    it('should validate against actual domain enums for positions', () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Use the first player slot
      const positionSelect = screen.getByTestId('position-select-0');

      // Should only have valid domain enum values
      const options = positionSelect.querySelectorAll('option');
      const positionValues = Array.from(options)
        .map(option => option.getAttribute('value'))
        .filter(Boolean);

      // Should match domain FieldPosition enum
      expect(positionValues).toContain('P');
      expect(positionValues).toContain('C');
      expect(positionValues).toContain('SF'); // Softball-specific
      expect(positionValues).toContain('EP'); // Extra Player
      expect(positionValues).not.toContain('DH'); // Not valid in slow-pitch softball
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper input structure for accessibility', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Should have basic form input structure
      expect(jerseyInput).toHaveAttribute('id');
      expect(jerseyInput).toHaveAttribute('type', 'text');

      // Enter invalid value and check CSS classes are applied for styling
      fireEvent.change(jerseyInput, { target: { value: '0' } });

      await waitFor(() => {
        expect(jerseyInput).toHaveClass('error');
      });
    });

    it('should provide validation feedback in accessible format', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Enter invalid value
      fireEvent.change(jerseyInput, { target: { value: '0' } });

      // Should show validation error message that screen readers can find
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-error-0')).toBeInTheDocument();
        expect(screen.getByText('Jersey number must be between 1 and 99')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large lineups efficiently', () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change player count to 15
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '15' } });

      // Should handle this efficiently without performance issues
      expect(screen.getAllByTestId(/jersey-input-/).length).toBe(15);
    });

    it('should handle rapid input changes', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      const jerseyInput = screen.getByTestId('jersey-input-0');

      // Type rapidly
      fireEvent.change(jerseyInput, { target: { value: '1' } });
      fireEvent.change(jerseyInput, { target: { value: '12' } });
      fireEvent.change(jerseyInput, { target: { value: '123' } });
      fireEvent.change(jerseyInput, { target: { value: '23' } });

      // Should eventually settle on valid state
      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-success-0')).toBeInTheDocument();
      });
    });

    it('should handle player data clearing and re-entry', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      const jerseyInput = screen.getByTestId('jersey-input-0');
      fireEvent.change(jerseyInput, { target: { value: '23' } });

      // Clear player field
      fireEvent.change(jerseyInput, { target: { value: '' } });

      // Re-enter data
      fireEvent.change(jerseyInput, { target: { value: '23' } });

      await waitFor(() => {
        expect(screen.getByTestId('jersey-validation-success-0')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced UX Validation Feedback', () => {
    it('should show enhanced validation feedback above continue button', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Fill only positions for first 5 players (no names/jerseys)
      for (let i = 0; i < 5; i++) {
        const positionSelect = screen.getByTestId(`position-select-${i}`);
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      // Should show enhanced feedback
      // Note: All 9 players are incomplete because they all have empty names/jerseys
      // (5 have positions but no names/jerseys, 4 have nothing)
      await waitFor(() => {
        const feedback = screen.getByTestId('lineup-validation-feedback');
        expect(feedback).toBeInTheDocument();
        expect(feedback).toHaveTextContent(/9 players? missing required fields/);
      });
    });

    it('should show progress indicator with player count', () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Should show progress indicator
      const progressIndicator = screen.getByTestId('lineup-progress-indicator');
      expect(progressIndicator).toBeInTheDocument();
      expect(progressIndicator).toHaveTextContent('0 of 9+ completed');
    });

    it('should update progress indicator as players are completed', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Complete 3 players
      for (let i = 0; i < 3; i++) {
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      // Should show 3 completed
      await waitFor(() => {
        const progressIndicator = screen.getByTestId('lineup-progress-indicator');
        expect(progressIndicator).toHaveTextContent('3 of 9+ completed');
      });
    });

    it('should show field-level required indicators for incomplete players', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Fill only position for first player
      const positionSelect = screen.getByTestId('position-select-0');
      fireEvent.change(positionSelect, { target: { value: 'P' } });

      // Should show required indicators
      await waitFor(() => {
        expect(screen.getByTestId('name-required-0')).toBeInTheDocument();
        expect(screen.getByTestId('jersey-required-0')).toBeInTheDocument();
      });
    });

    it('should highlight empty fields with red border when position is filled', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Fill only position for first player
      const positionSelect = screen.getByTestId('position-select-0');
      fireEvent.change(positionSelect, { target: { value: 'SS' } });

      // Check that name and jersey inputs have red border styling
      await waitFor(() => {
        const nameInput = screen.getByTestId('player-name-input-0');
        const jerseyInput = screen.getByTestId('jersey-input-0');

        // Inputs should have inline styles for red border
        expect(nameInput).toHaveStyle({ border: '2px solid #dc3545' });
        expect(jerseyInput).toHaveStyle({ border: '2px solid #dc3545' });
      });
    });

    it('should remove field highlighting when fields are filled', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Fill only position first
      const positionSelect = screen.getByTestId('position-select-0');
      fireEvent.change(positionSelect, { target: { value: 'P' } });

      // Verify highlighting appears
      await waitFor(() => {
        expect(screen.getByTestId('name-required-0')).toBeInTheDocument();
      });

      // Fill name and jersey
      const nameInput = screen.getByTestId('player-name-input-0');
      const jerseyInput = screen.getByTestId('jersey-input-0');
      fireEvent.change(nameInput, { target: { value: 'John Smith' } });
      fireEvent.change(jerseyInput, { target: { value: '23' } });

      // Highlighting should be removed
      await waitFor(() => {
        expect(screen.queryByTestId('name-required-0')).not.toBeInTheDocument();
        expect(screen.queryByTestId('jersey-required-0')).not.toBeInTheDocument();
      });
    });

    it('should show improved validation summary styling', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Fill only 3 players (not enough)
      for (let i = 0; i < 3; i++) {
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      // Should show improved validation summary with styling
      await waitFor(() => {
        const summary = screen.getByTestId('lineup-validation-summary');
        expect(summary).toBeInTheDocument();
        expect(summary).toHaveStyle({ backgroundColor: '#f8d7da' });
        expect(summary).toHaveTextContent('⚠️ Lineup Issues:');
      });
    });

    it('should prioritize incomplete player feedback over minimum count', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Fill positions but no names/jerseys for all 9
      for (let i = 0; i < 9; i++) {
        const positionSelect = screen.getByTestId(`position-select-${i}`);
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      // Should show incomplete feedback (not "not enough players")
      await waitFor(() => {
        const feedback = screen.getByTestId('lineup-validation-feedback');
        expect(feedback).toHaveTextContent(/9 players? missing required fields/);
        expect(feedback).not.toHaveTextContent(/Not enough players/);
      });
    });
  });

  describe('Available Players Quick-Add', () => {
    it('should trigger validation when adding player from Available section', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Initially should show 0 completed
      expect(screen.getByTestId('lineup-progress-indicator')).toHaveTextContent(
        '0 of 9+ completed'
      );

      // Click add button for first available player (Mike Chen #8 SS)
      const addButton = screen.getByTestId('add-player-1');
      fireEvent.click(addButton);

      // Validation should trigger and show 1 completed
      await waitFor(() => {
        expect(screen.getByTestId('lineup-progress-indicator')).toHaveTextContent(
          '1 of 9+ completed'
        );
      });
    });

    it('should update CONTINUE button state when adding players via Available section', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Initially CONTINUE should be disabled
      expect(screen.getByTestId('continue-button')).toBeDisabled();

      // Add 9 players from Available section (there are 11 available)
      for (let i = 1; i <= 9; i++) {
        const addButton = screen.getByTestId(`add-player-${i}`);
        fireEvent.click(addButton);
      }

      // CONTINUE should now be enabled
      await waitFor(() => {
        expect(screen.getByTestId('continue-button')).toBeEnabled();
      });
    });

    it('should update position coverage when adding players via Available section', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 10 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '10' } });

      // Add first 10 available players (covers all positions)
      for (let i = 1; i <= 10; i++) {
        const addButton = screen.getByTestId(`add-player-${i}`);
        fireEvent.click(addButton);
      }

      // Position coverage should show all positions covered
      await waitFor(() => {
        expect(screen.getByTestId('lineup-progress-indicator')).toHaveTextContent(
          '10 of 9+ completed'
        );
      });

      // Check specific position coverage (first player is Mike Chen - SS)
      const positionCoverageP = screen.getByTestId('position-coverage-P');
      const positionCoverageSS = screen.getByTestId('position-coverage-SS');

      expect(positionCoverageP).toHaveClass('covered');
      expect(positionCoverageSS).toHaveClass('covered');
    });

    it('should show enhanced feedback after adding incomplete players via Available section', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Add only 5 complete players (4 slots remain empty - these count as incomplete)
      for (let i = 1; i <= 5; i++) {
        const addButton = screen.getByTestId(`add-player-${i}`);
        fireEvent.click(addButton);
      }

      // Should show validation feedback about incomplete players (empty slots)
      await waitFor(() => {
        const feedback = screen.getByTestId('lineup-validation-feedback');
        expect(feedback).toBeInTheDocument();
        expect(feedback).toHaveTextContent(/4 players? missing required fields/);
      });
    });

    it('should correctly validate when mixing manual input and quick-add', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Change to 9 players
      const playerCountSelector = screen.getByTestId('player-count-selector');
      fireEvent.change(playerCountSelector, { target: { value: '9' } });

      // Manually fill first 3 players
      for (let i = 0; i < 3; i++) {
        const nameInput = screen.getByTestId(`player-name-input-${i}`);
        const jerseyInput = screen.getByTestId(`jersey-input-${i}`);
        const positionSelect = screen.getByTestId(`position-select-${i}`);

        fireEvent.change(nameInput, { target: { value: `Manual Player ${i + 1}` } });
        fireEvent.change(jerseyInput, { target: { value: `${i + 1}` } });
        fireEvent.change(positionSelect, { target: { value: 'P' } });
      }

      // Quick-add 6 more players (slots 3-8)
      for (let i = 1; i <= 6; i++) {
        const addButton = screen.getByTestId(`add-player-${i}`);
        fireEvent.click(addButton);
      }

      // Should have 9 completed players
      await waitFor(() => {
        expect(screen.getByTestId('lineup-progress-indicator')).toHaveTextContent(
          '9 of 9+ completed'
        );
        expect(screen.getByTestId('continue-button')).toBeEnabled();
      });
    });

    it('should handle adding players to empty slots correctly', async () => {
      renderWithRouter(<GameSetupLineupPage />);

      // Manually fill slot 0
      fireEvent.change(screen.getByTestId('player-name-input-0'), {
        target: { value: 'First Player' },
      });
      fireEvent.change(screen.getByTestId('jersey-input-0'), { target: { value: '99' } });
      fireEvent.change(screen.getByTestId('position-select-0'), { target: { value: 'P' } });

      // Quick-add should go to slot 1 (first empty)
      const addButton = screen.getByTestId('add-player-1');
      fireEvent.click(addButton);

      // Verify slot 1 was filled
      await waitFor(() => {
        const nameInput1 = screen.getByTestId('player-name-input-1');
        expect(nameInput1).toHaveValue('Mike Chen');
      });

      // Verify slot 0 wasn't overwritten
      const nameInput0 = screen.getByTestId('player-name-input-0');
      expect(nameInput0).toHaveValue('First Player');
    });
  });
});
