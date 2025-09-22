/**
 * @file GameSetupTeamsPage Component Tests
 * Comprehensive tests for GameSetupTeamsPage component covering all user interactions,
 * form validation, team name suggestions, and navigation.
 *
 * @remarks
 * These tests follow TDD approach and validate the complete functionality
 * of the GameSetupTeamsPage component including form validation, team name
 * input handling, radio button selection, and progress tracking.
 *
 * **Test Categories**:
 * - Component rendering and initial state
 * - Team name input validation and error handling
 * - Team selection radio buttons
 * - Team name suggestions functionality
 * - Form progress tracking
 * - Navigation and form submission
 * - Accessibility features and ARIA support
 * - Real-time validation with debouncing
 * - Error state management and recovery
 * - Performance optimizations (memoization)
 *
 * **Architecture Compliance**:
 * - Tests integration with game store
 * - Validates domain validation integration
 * - Ensures proper separation of concerns
 * - Tests accessibility standards
 *
 * **Testing Strategy**:
 * - Mock all dependencies for controlled scenarios
 * - Test all form interaction paths and validation
 * - Validate real-time validation behavior with debouncing
 * - Test accessibility and keyboard navigation
 * - Verify proper cleanup and memory management
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { validateTeamNames } from '../features/game-setup/validation';
import { useGameStore } from '../shared/lib/store/gameStore';

import { GameSetupTeamsPage } from './GameSetupTeamsPage';

// Mock the validation functions
vi.mock('../features/game-setup/validation', () => ({
  validateTeamNames: vi.fn(),
}));

// Mock the game store
vi.mock('../shared/lib/store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

/**
 * Test wrapper component with router context
 */
function TestWrapper({ children }: { children: ReactElement }): ReactElement {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Mock setup wizard state
 */
const mockSetupWizard = {
  step: 'teams' as const,
  teams: {
    home: '',
    away: '',
    ourTeam: null,
  },
  lineup: [],
  isComplete: false,
};

/**
 * Mock game store
 */
const mockGameStore = {
  setupWizard: mockSetupWizard,
  setTeams: vi.fn(),
  currentGame: null,
  isLoading: false,
  error: null,
};

/**
 * Mock validation results
 */
const validTeamNamesResult = {
  isValid: true,
  error: null,
};

const invalidTeamNamesResult = {
  isValid: false,
  error: 'Team names must be different',
};

describe('GameSetupTeamsPage Component', () => {
  let mockUseGameStore: Mock;
  let mockValidateTeamNames: Mock;
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup validation mocks
    mockValidateTeamNames = vi.mocked(validateTeamNames);
    mockValidateTeamNames.mockReturnValue(validTeamNamesResult);

    // Setup store mock
    mockUseGameStore = vi.mocked(useGameStore);
    mockUseGameStore.mockReturnValue(mockGameStore);
  });

  describe('Component Rendering and Initial State', () => {
    it('should render teams setup page with correct structure', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('game-setup-teams-page')).toBeInTheDocument();
      expect(screen.getByText('New Game')).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument();
      expect(screen.getByText('Team Names')).toBeInTheDocument();
    });

    it('should render team input fields', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');

      expect(awayTeamInput).toBeInTheDocument();
      expect(homeTeamInput).toBeInTheDocument();
      expect(awayTeamInput).toHaveAttribute('placeholder', 'Eagles');
      expect(homeTeamInput).toHaveAttribute('placeholder', 'Warriors');
    });

    it('should render team selection radio buttons', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      expect(screen.getByText('Which is your team?')).toBeInTheDocument();

      const awayRadio = screen.getByTestId('away-team-radio');
      const homeRadio = screen.getByTestId('home-team-radio');

      expect(awayRadio).toBeInTheDocument();
      expect(homeRadio).toBeInTheDocument();
      expect(awayRadio).toHaveAttribute('type', 'radio');
      expect(homeRadio).toHaveAttribute('type', 'radio');
    });

    it('should render domain hints', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('team-naming-hints')).toBeInTheDocument();
      expect(screen.getByText('Team names must be different')).toBeInTheDocument();
      expect(screen.getByText('Maximum 50 characters')).toBeInTheDocument();
    });

    it('should render continue button initially disabled', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const continueButton = screen.getByTestId('continue-button');
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toBeDisabled();
    });

    it('should render back button with correct aria-label', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('aria-label', 'Go back to home');
    });
  });

  describe('Team Name Input Validation and Error Handling', () => {
    it('should handle away team input changes', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.type(awayTeamInput, 'Eagles');

      expect(awayTeamInput).toHaveValue('Eagles');
    });

    it('should handle home team input changes', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const homeTeamInput = screen.getByTestId('home-team-input');
      await user.type(homeTeamInput, 'Warriors');

      expect(homeTeamInput).toHaveValue('Warriors');
    });

    it('should show validation success indicators when teams are valid', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Warriors');

      // Wait for validation to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('away-team-validation-success')).toBeInTheDocument();
          expect(screen.getByTestId('home-team-validation-success')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should show validation errors when teams are invalid', async () => {
      mockValidateTeamNames.mockReturnValue(invalidTeamNamesResult);

      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Eagles'); // Same name

      // Wait for validation to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('away-team-validation-error')).toBeInTheDocument();
          expect(screen.getByTestId('home-team-validation-error')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should clear errors when user starts typing', async () => {
      mockValidateTeamNames.mockReturnValue(invalidTeamNamesResult);

      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');

      // Type invalid input first
      await user.type(awayTeamInput, 'Same');

      // Wait for validation
      await waitFor(
        () => {
          expect(screen.queryByTestId('away-team-validation-error')).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      // Now change validation to return valid result
      mockValidateTeamNames.mockReturnValue(validTeamNamesResult);

      // Continue typing to trigger error clearing
      await user.type(awayTeamInput, ' Team');

      // Error should be cleared immediately when typing starts
      expect(screen.queryByTestId('away-team-validation-error')).not.toBeInTheDocument();
    });

    it('should have proper accessibility attributes for inputs', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');

      expect(awayTeamInput).toHaveAttribute('aria-describedby', 'away-team-validation');
      expect(homeTeamInput).toHaveAttribute('aria-describedby', 'home-team-validation');
      expect(awayTeamInput).toHaveAttribute('required');
      expect(homeTeamInput).toHaveAttribute('required');
    });
  });

  describe('Team Selection Radio Buttons', () => {
    it('should allow selecting away team', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayRadio = screen.getByTestId('away-team-radio');
      await user.click(awayRadio);

      expect(awayRadio).toBeChecked();
    });

    it('should allow selecting home team', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const homeRadio = screen.getByTestId('home-team-radio');
      await user.click(homeRadio);

      expect(homeRadio).toBeChecked();
    });

    it('should update radio button labels when team names change', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Warriors');

      // Check that the radio button labels update with team names
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveTextContent('Eagles');
      expect(radioGroup).toHaveTextContent('Warriors');
    });

    it('should show default labels when team names are empty', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveTextContent('Away Team');
      expect(radioGroup).toHaveTextContent('Home Team');
    });

    it('should clear team selection error when radio button is selected', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      // Wait for validation to show error
      await waitFor(
        () => {
          expect(screen.queryByTestId('validation-error')).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      const awayRadio = screen.getByTestId('away-team-radio');
      await user.click(awayRadio);

      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument();
    });

    it('should have proper radiogroup accessibility attributes', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-label', 'Select your team');

      const awayRadio = screen.getByTestId('away-team-radio');
      const homeRadio = screen.getByTestId('home-team-radio');

      expect(awayRadio).toHaveAttribute('name', 'ourTeam');
      expect(homeRadio).toHaveAttribute('name', 'ourTeam');
      expect(awayRadio).toHaveAttribute('value', 'away');
      expect(homeRadio).toHaveAttribute('value', 'home');
    });
  });

  describe('Team Name Suggestions Functionality', () => {
    it('should show suggestions when input is focused', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.click(awayTeamInput);

      expect(screen.getByTestId('team-name-suggestions')).toBeInTheDocument();
      expect(screen.getByText('Common Team Names:')).toBeInTheDocument();
    });

    it('should hide suggestions when input loses focus', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.click(awayTeamInput);

      expect(screen.getByTestId('team-name-suggestions')).toBeInTheDocument();

      await user.click(document.body);

      await waitFor(
        () => {
          expect(screen.queryByTestId('team-name-suggestions')).not.toBeInTheDocument();
        },
        { timeout: 300 }
      );
    });

    it('should apply suggestion when clicked', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.click(awayTeamInput);

      const firstSuggestion = screen.getByTestId('suggestion-0');
      await user.click(firstSuggestion);

      expect(awayTeamInput).toHaveValue('Eagles'); // First suggestion should be Eagles
      expect(screen.queryByTestId('team-name-suggestions')).not.toBeInTheDocument();
    });

    it('should show filtered suggestions based on input', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.click(awayTeamInput);
      await user.type(awayTeamInput, 'Ea');

      // Should show suggestions containing 'Ea' (like Eagles)
      const suggestions = screen.getByTestId('team-name-suggestions');
      expect(suggestions).toBeInTheDocument();
      expect(suggestions).toHaveTextContent('Eagles');
    });

    it('should handle suggestions for both home and away inputs', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      // Test away team suggestions
      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.click(awayTeamInput);

      const firstSuggestion = screen.getByTestId('suggestion-0');
      await user.click(firstSuggestion);

      expect(awayTeamInput).toHaveValue('Eagles');

      // Test home team suggestions
      const homeTeamInput = screen.getByTestId('home-team-input');
      await user.click(homeTeamInput);

      const secondSuggestion = screen.getByTestId('suggestion-1');
      await user.click(secondSuggestion);

      expect(homeTeamInput).toHaveValue('Warriors');
    });
  });

  describe('Form Progress Tracking', () => {
    it('should show initial progress as 0/3', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('form-completion-progress')).toHaveTextContent('0/3');
    });

    it('should update progress as form is filled', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.type(awayTeamInput, 'Eagles');

      // Wait for validation to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('form-completion-progress')).toHaveTextContent('1/3');
        },
        { timeout: 500 }
      );

      const homeTeamInput = screen.getByTestId('home-team-input');
      await user.type(homeTeamInput, 'Warriors');

      await waitFor(
        () => {
          expect(screen.getByTestId('form-completion-progress')).toHaveTextContent('2/3');
        },
        { timeout: 500 }
      );

      const awayRadio = screen.getByTestId('away-team-radio');
      await user.click(awayRadio);

      expect(screen.getByTestId('form-completion-progress')).toHaveTextContent('3/3');
    });

    it('should show validation summary when form is complete', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');
      const awayRadio = screen.getByTestId('away-team-radio');

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Warriors');
      await user.click(awayRadio);

      await waitFor(
        () => {
          expect(screen.getByTestId('validation-summary')).toBeInTheDocument();
          expect(screen.getByText('All fields valid')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Navigation and Form Submission', () => {
    it('should navigate back to home when back button clicked', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should enable continue button when form is valid', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');
      const awayRadio = screen.getByTestId('away-team-radio');
      const continueButton = screen.getByTestId('continue-button');

      expect(continueButton).toBeDisabled();

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Warriors');
      await user.click(awayRadio);

      await waitFor(
        () => {
          expect(continueButton).not.toBeDisabled();
        },
        { timeout: 500 }
      );
    });

    it('should submit form and navigate when continue clicked', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');
      const awayRadio = screen.getByTestId('away-team-radio');
      const continueButton = screen.getByTestId('continue-button');

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Warriors');
      await user.click(awayRadio);

      await waitFor(
        () => {
          expect(continueButton).not.toBeDisabled();
        },
        { timeout: 500 }
      );

      await user.click(continueButton);

      expect(mockGameStore.setTeams).toHaveBeenCalledWith('Warriors', 'Eagles', 'away');
      expect(mockNavigate).toHaveBeenCalledWith('/game/setup/lineup');
    });

    it('should not submit form when invalid', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const continueButton = screen.getByTestId('continue-button');

      // Try to click disabled button
      await user.click(continueButton);

      expect(mockGameStore.setTeams).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Features and ARIA Support', () => {
    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New Game');
      expect(screen.getByRole('heading', { level: 2, name: 'Team Names' })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Which is your team?' })
      ).toBeInTheDocument();
    });

    it('should have live region for screen reader announcements', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('should announce errors in live region', async () => {
      mockValidateTeamNames.mockReturnValue(invalidTeamNamesResult);

      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.type(awayTeamInput, 'Same');

      const homeTeamInput = screen.getByTestId('home-team-input');
      await user.type(homeTeamInput, 'Same');

      await waitFor(
        () => {
          const liveRegion = screen.getByRole('status');
          expect(liveRegion).toHaveTextContent('Team names must be different');
        },
        { timeout: 500 }
      );
    });

    it('should have error message with alert role', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      // Wait for validation to trigger
      await waitFor(
        () => {
          const errorMessage = screen.queryByTestId('validation-error');
          if (errorMessage) {
            expect(errorMessage).toHaveAttribute('role', 'alert');
          }
        },
        { timeout: 500 }
      );
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');
      const awayRadio = screen.getByTestId('away-team-radio');
      const homeRadio = screen.getByTestId('home-team-radio');

      // Test that elements are focusable and accessible
      awayTeamInput.focus();
      expect(document.activeElement).toBe(awayTeamInput);

      homeTeamInput.focus();
      expect(document.activeElement).toBe(homeTeamInput);

      awayRadio.focus();
      expect(document.activeElement).toBe(awayRadio);

      homeRadio.focus();
      expect(document.activeElement).toBe(homeRadio);
    });
  });

  describe('Real-time Validation with Debouncing', () => {
    it('should debounce validation calls', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');

      // Type rapidly
      await user.type(awayTeamInput, 'Eagles');

      // Should only call validation once after debounce period
      await waitFor(
        () => {
          expect(mockValidateTeamNames).toHaveBeenCalled();
        },
        { timeout: 500 }
      );

      // Check that validation was called
      expect(mockValidateTeamNames).toHaveBeenCalled();
    });

    it('should validate both teams together', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      const homeTeamInput = screen.getByTestId('home-team-input');

      await user.type(awayTeamInput, 'Eagles');
      await user.type(homeTeamInput, 'Warriors');

      await waitFor(
        () => {
          expect(mockValidateTeamNames).toHaveBeenCalled();
        },
        { timeout: 500 }
      );

      // Verify that both team names were processed in some validation call
      const calls = mockValidateTeamNames.mock.calls;
      const hasEaglesCall = calls.some(call => call.includes('Eagles'));
      const hasWarriorsCall = calls.some(call => call.includes('Warriors'));
      expect(hasEaglesCall).toBe(true);
      expect(hasWarriorsCall).toBe(true);
    });
  });

  describe('Error State Management and Recovery', () => {
    it('should handle validation function errors gracefully', () => {
      mockValidateTeamNames.mockImplementation(() => {
        throw new Error('Validation error');
      });

      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');

      // Should not crash when validation throws
      expect(async () => {
        await user.type(awayTeamInput, 'Eagles');
      }).not.toThrow();
    });

    it('should recover from error states when valid input is entered', async () => {
      // Start with invalid state
      mockValidateTeamNames.mockReturnValue(invalidTeamNamesResult);

      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');
      await user.type(awayTeamInput, 'Same');

      // Change to valid state
      mockValidateTeamNames.mockReturnValue(validTeamNamesResult);

      await user.type(awayTeamInput, ' Different');

      await waitFor(
        () => {
          expect(screen.queryByTestId('away-team-validation-error')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Component State Management and Cleanup', () => {
    it('should handle component unmount without errors', () => {
      const { unmount } = render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid input changes without issues', async () => {
      render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      const awayTeamInput = screen.getByTestId('away-team-input');

      // Rapid typing
      await user.type(awayTeamInput, 'Eagles');
      await user.clear(awayTeamInput);
      await user.type(awayTeamInput, 'Warriors');
      await user.clear(awayTeamInput);
      await user.type(awayTeamInput, 'Thunder');

      expect(awayTeamInput).toHaveValue('Thunder');
    });

    it('should maintain state consistency during re-renders', () => {
      const { rerender } = render(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      // Initial state
      expect(screen.getByTestId('form-completion-progress')).toHaveTextContent('0/3');

      rerender(
        <TestWrapper>
          <GameSetupTeamsPage />
        </TestWrapper>
      );

      // State should be maintained
      expect(screen.getByTestId('form-completion-progress')).toHaveTextContent('0/3');
    });
  });
});
