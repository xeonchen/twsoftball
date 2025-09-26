import React, { useState, useEffect, useCallback, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../../../entities/game';
import { validateTeamNames, type TeamValidationResult } from '../../../features/game-setup';
import { useTimerManager } from '../../../shared/lib/hooks';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';

/**
 * Game Setup Teams Page Component
 *
 * Implements Screen 2: Game Setup Wizard - Step 1 (Teams) from wireframes.md
 * First step of the game setup wizard where users configure team names
 * and select which team is theirs.
 *
 * Features:
 * - Team name input validation
 * - "Our team" selection with radio buttons
 * - Progress indicator (1/3)
 * - Navigation to next step
 * - Form validation and error handling
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 2
 */
export function GameSetupTeamsPage(): ReactElement {
  const navigate = useNavigate();
  const { setupWizard, setTeams } = useGameStore();
  const timers = useTimerManager();

  // Local form state
  const [homeTeam, setHomeTeam] = useState(setupWizard.teams.home);
  const [awayTeam, setAwayTeam] = useState(setupWizard.teams.away);
  const [ourTeam, setOurTeam] = useState<'home' | 'away' | null>(setupWizard.teams.ourTeam);
  const [errors, setErrors] = useState<{
    homeTeam?: string;
    awayTeam?: string;
    ourTeam?: string;
  }>({});
  const [validationResults, setValidationResults] = useState<{
    homeTeam: boolean;
    awayTeam: boolean;
    teams: TeamValidationResult | null;
  }>({ homeTeam: false, awayTeam: false, teams: null });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'home' | 'away' | null>(null);

  /**
   * Get common team name suggestions
   */
  const getTeamNameSuggestions = useCallback((): string[] => {
    const commonNames = [
      'Eagles',
      'Warriors',
      'Wildcats',
      'Thunder',
      'Storm',
      'Lightning',
      'Hawks',
      'Panthers',
      'Tigers',
      'Bulldogs',
      'Sharks',
      'Dragons',
    ];
    return commonNames;
  }, []);

  /**
   * Filter suggestions based on input
   */
  const getFilteredSuggestions = useCallback(
    (input: string): string[] => {
      if (!input.trim()) return getTeamNameSuggestions();
      return getTeamNameSuggestions().filter(name =>
        name.toLowerCase().includes(input.toLowerCase())
      );
    },
    [getTeamNameSuggestions]
  );

  /**
   * Real-time validation with debouncing (memoized for performance)
   */
  const validateTeams = useCallback((): void => {
    const teamValidation = validateTeamNames(homeTeam, awayTeam);
    const newValidationResults = {
      homeTeam: homeTeam.trim().length > 0 && teamValidation.isValid,
      awayTeam: awayTeam.trim().length > 0 && teamValidation.isValid,
      teams: teamValidation,
    };

    setValidationResults(newValidationResults);

    // Update errors based on validation
    const newErrors: { homeTeam?: string; awayTeam?: string; ourTeam?: string } = {};
    if (!teamValidation.isValid && teamValidation.error) {
      if (teamValidation.error.includes('Home team')) {
        newErrors.homeTeam = teamValidation.error;
      } else if (teamValidation.error.includes('Away team')) {
        newErrors.awayTeam = teamValidation.error;
      } else if (teamValidation.error.includes('different')) {
        newErrors.homeTeam = teamValidation.error;
        newErrors.awayTeam = teamValidation.error;
      } else if (teamValidation.error.includes('required')) {
        if (!homeTeam.trim()) newErrors.homeTeam = 'Home team name is required';
        if (!awayTeam.trim()) newErrors.awayTeam = 'Away team name is required';
      }
    }

    if (!ourTeam) {
      newErrors.ourTeam = 'Please select which team is yours';
    }

    setErrors(newErrors);
  }, [homeTeam, awayTeam, ourTeam]);

  /**
   * Debounced validation effect
   */
  useEffect(() => {
    const timeoutId = timers.setTimeout(validateTeams, 300);
    return (): void => timers.clearTimeout(timeoutId);
  }, [validateTeams, timers]);

  /**
   * Check if form is valid
   */
  const isFormValid = (): boolean => {
    return (
      validationResults.teams?.isValid === true &&
      homeTeam.trim().length > 0 &&
      awayTeam.trim().length > 0 &&
      ourTeam !== null
    );
  };

  /**
   * Get form completion progress
   */
  const getFormProgress = (): number => {
    let progress = 0;
    if (homeTeam.trim() && !errors.homeTeam) progress++;
    if (awayTeam.trim() && !errors.awayTeam) progress++;
    if (ourTeam) progress++;
    return progress;
  };

  /**
   * Validate form inputs and show errors
   */
  const validateForm = (): boolean => {
    return isFormValid();
  };

  /**
   * Handle form submission and navigation to next step
   */
  const handleContinue = (): void => {
    if (validateForm()) {
      // Update store with form data
      setTeams(homeTeam.trim(), awayTeam.trim(), ourTeam);

      // Navigate to lineup step
      void navigate('/game/setup/lineup');
    }
  };

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = (suggestion: string): void => {
    if (focusedInput === 'home') {
      setHomeTeam(suggestion);
    } else if (focusedInput === 'away') {
      setAwayTeam(suggestion);
    }
    setShowSuggestions(false);
    setFocusedInput(null);
  };

  /**
   * Handle input focus (memoized for performance)
   */
  const handleInputFocus = useCallback((inputType: 'home' | 'away'): void => {
    setFocusedInput(inputType);
    setShowSuggestions(true);
  }, []);

  /**
   * Handle input blur with delay to allow suggestion clicks (memoized for performance)
   */
  const handleInputBlur = useCallback((): void => {
    timers.setTimeout(() => {
      setShowSuggestions(false);
      setFocusedInput(null);
    }, 200);
  }, [timers]);

  /**
   * Handle back navigation
   */
  const handleBack = (): void => {
    void navigate('/');
  };

  /**
   * Memoized onChange handlers for performance optimization
   */
  const handleHomeTeamChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setHomeTeam(e.target.value);
    // Clear home team error when user starts typing
    setErrors(prevErrors => {
      if (prevErrors.homeTeam) {
        const { homeTeam: _, ...rest } = prevErrors;
        return rest;
      }
      return prevErrors;
    });
  }, []);

  const handleAwayTeamChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setAwayTeam(e.target.value);
    // Clear away team error when user starts typing
    setErrors(prevErrors => {
      if (prevErrors.awayTeam) {
        const { awayTeam: _, ...rest } = prevErrors;
        return rest;
      }
      return prevErrors;
    });
  }, []);

  return (
    <div className="game-setup-teams-page" data-testid="game-setup-teams-page">
      <header className="setup-header">
        <button
          className="back-button"
          onClick={handleBack}
          aria-label="Go back to home"
          data-testid="back-button"
        >
          ←
        </button>
        <h1>New Game</h1>
        <div className="progress-indicator">1/3</div>
      </header>

      <main className="setup-content">
        <section className="form-section">
          <h2>Team Names</h2>

          {/* Domain Rule Hints */}
          <div className="domain-hints" data-testid="team-naming-hints">
            <div className="hint-item">
              <span className="hint-icon">💡</span>
              <span>Team names must be different</span>
            </div>
            <div className="hint-item">
              <span className="hint-icon">📏</span>
              <span>Maximum 50 characters</span>
            </div>
          </div>

          <div className="form-field">
            <div className="input-container">
              <Input
                label="Away Team"
                value={awayTeam}
                onChange={handleAwayTeamChange}
                onFocus={() => handleInputFocus('away')}
                onBlur={handleInputBlur}
                error={errors.awayTeam}
                placeholder="Eagles"
                required
                data-testid="away-team-input"
                aria-describedby="away-team-validation"
                aria-invalid={!!errors.awayTeam}
              />

              {/* Validation Indicator */}
              <div className="validation-indicator" id="away-team-validation">
                {validationResults.awayTeam && !errors.awayTeam && (
                  <span className="success-indicator" data-testid="away-team-validation-success">
                    ✓
                  </span>
                )}
                {errors.awayTeam && (
                  <span className="error-indicator" data-testid="away-team-validation-error">
                    ✗
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-field">
            <div className="input-container">
              <Input
                label="Home Team"
                value={homeTeam}
                onChange={handleHomeTeamChange}
                onFocus={() => handleInputFocus('home')}
                onBlur={handleInputBlur}
                error={errors.homeTeam}
                placeholder="Warriors"
                required
                data-testid="home-team-input"
                aria-describedby="home-team-validation"
                aria-invalid={!!errors.homeTeam}
              />

              {/* Validation Indicator */}
              <div className="validation-indicator" id="home-team-validation">
                {validationResults.homeTeam && !errors.homeTeam && (
                  <span className="success-indicator" data-testid="home-team-validation-success">
                    ✓
                  </span>
                )}
                {errors.homeTeam && (
                  <span className="error-indicator" data-testid="home-team-validation-error">
                    ✗
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Team Name Suggestions */}
          {showSuggestions && focusedInput && (
            <div className="suggestions-dropdown" data-testid="team-name-suggestions">
              <div className="suggestions-header">Common Team Names:</div>
              {getFilteredSuggestions(focusedInput === 'home' ? homeTeam : awayTeam).map(
                (suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggestion-item"
                    data-testid={`suggestion-${index}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          )}
        </section>

        <section className="form-section">
          <h2>Which is your team?</h2>

          <div className="radio-group" role="radiogroup" aria-label="Select your team">
            <label className="radio-option">
              <input
                type="radio"
                name="ourTeam"
                value="away"
                checked={ourTeam === 'away'}
                onChange={() => {
                  setOurTeam('away');
                  if (errors.ourTeam) {
                    const { ourTeam: _, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                data-testid="away-team-radio"
              />
              <span className="radio-label">{awayTeam || 'Away Team'}</span>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="ourTeam"
                value="home"
                checked={ourTeam === 'home'}
                onChange={() => {
                  setOurTeam('home');
                  if (errors.ourTeam) {
                    const { ourTeam: _, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                data-testid="home-team-radio"
              />
              <span className="radio-label">{homeTeam || 'Home Team'}</span>
            </label>
          </div>

          {errors.ourTeam && (
            <div className="error-message" data-testid="validation-error" role="alert">
              {errors.ourTeam}
            </div>
          )}
        </section>

        {/* Form Progress and Validation Summary */}
        <section className="form-status">
          <div className="progress-section">
            <span className="progress-label">Form Progress:</span>
            <span className="progress-value" data-testid="form-completion-progress">
              {getFormProgress()}/3
            </span>
          </div>

          {isFormValid() && (
            <div className="validation-summary" data-testid="validation-summary">
              <span className="summary-icon">✓</span>
              <span>All fields valid</span>
            </div>
          )}
        </section>
      </main>

      {/* Live Region for Screen Reader Announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {errors.homeTeam && `Home team error: ${errors.homeTeam}`}
        {errors.awayTeam && `Away team error: ${errors.awayTeam}`}
        {errors.ourTeam && `Team selection error: ${errors.ourTeam}`}
      </div>

      <footer className="setup-footer">
        <Button
          onClick={handleContinue}
          disabled={!isFormValid()}
          className="continue-button"
          size="large"
          data-testid="continue-button"
        >
          CONTINUE
        </Button>
      </footer>
    </div>
  );
}
