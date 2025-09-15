import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../shared/lib/store/gameStore';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';

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

  // Local form state
  const [homeTeam, setHomeTeam] = useState(setupWizard.teams.home);
  const [awayTeam, setAwayTeam] = useState(setupWizard.teams.away);
  const [ourTeam, setOurTeam] = useState<'home' | 'away' | null>(setupWizard.teams.ourTeam);
  const [errors, setErrors] = useState<{
    homeTeam?: string;
    awayTeam?: string;
    ourTeam?: string;
  }>({});

  /**
   * Validate form inputs and show errors
   */
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!homeTeam.trim()) {
      newErrors.homeTeam = 'Home team name is required';
    }

    if (!awayTeam.trim()) {
      newErrors.awayTeam = 'Away team name is required';
    }

    if (homeTeam.trim() && awayTeam.trim() && homeTeam.trim() === awayTeam.trim()) {
      newErrors.homeTeam = 'Team names must be different';
      newErrors.awayTeam = 'Team names must be different';
    }

    if (!ourTeam) {
      newErrors.ourTeam = 'Please select which team is yours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
   * Handle back navigation
   */
  const handleBack = (): void => {
    void navigate('/');
  };

  return (
    <div className="game-setup-teams-page" data-testid="game-setup-teams-page">
      <header className="setup-header">
        <button className="back-button" onClick={handleBack} aria-label="Go back to home">
          ←
        </button>
        <h1>New Game</h1>
        <div className="progress-indicator">1/3</div>
      </header>

      <main className="setup-content">
        <section className="form-section">
          <h2>Team Names</h2>

          <div className="form-field">
            <Input
              label="Away Team"
              value={awayTeam}
              onChange={e => {
                setAwayTeam(e.target.value);
                if (errors.awayTeam) {
                  const { awayTeam: _, ...rest } = errors;
                  setErrors(rest);
                }
              }}
              error={errors.awayTeam}
              placeholder="Eagles"
              required
              data-testid="away-team-input"
            />
          </div>

          <div className="form-field">
            <Input
              label="Home Team"
              value={homeTeam}
              onChange={e => {
                setHomeTeam(e.target.value);
                if (errors.homeTeam) {
                  const { homeTeam: _, ...rest } = errors;
                  setErrors(rest);
                }
              }}
              error={errors.homeTeam}
              placeholder="Warriors"
              required
              data-testid="home-team-input"
            />
          </div>
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
            <div className="error-message" role="alert">
              {errors.ourTeam}
            </div>
          )}
        </section>
      </main>

      <footer className="setup-footer">
        <Button
          onClick={handleContinue}
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
