import React, { useState, useCallback, memo, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  validateJerseyNumber,
  validateFieldPosition,
  validateLineup,
  getJerseyNumberSuggestions,
  type JerseyValidationResult,
  type FieldPositionValidationResult,
  type LineupValidationResult,
} from '../features/game-setup/validation/domainValidation';
import { useGameStore, type Player } from '../shared/lib/store/gameStore';
import { Button } from '../shared/ui/button';

/**
 * Game Setup Lineup Page Component
 *
 * Implements Screen 3: Game Setup Wizard - Step 2 (Lineup) from wireframes.md
 * Second step of the game setup wizard where users configure their batting
 * lineup and player positions.
 *
 * Features:
 * - Drag-and-drop lineup management
 * - Player count selector (9-15 players, default: 10)
 * - Batting order and field position assignment
 * - Position coverage validation
 * - Load previous lineup functionality
 * - Responsive layout (portrait vs landscape)
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 3
 */

/**
 * Memoized PlayerSlot component for performance optimization in large lineups
 */
interface PlayerSlotProps {
  player: Player;
  index: number;
  jerseyValidation?: JerseyValidationResult | undefined;
  positionValidation?: FieldPositionValidationResult | undefined;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onJerseyFocus: (playerIndex: number) => void;
  onJerseyBlur: () => void;
}

const PlayerSlot = memo(function PlayerSlot({
  player,
  index,
  jerseyValidation,
  positionValidation,
  onInputChange,
  onJerseyFocus,
  onJerseyBlur,
}: PlayerSlotProps): ReactElement {
  return (
    <div
      key={`batting-${index}`}
      className={`lineup-slot player-input-slot`}
      data-testid={`batting-slot-${index}`}
    >
      <div className="player-form">
        <div className="batting-position">{index + 1}.</div>

        <div className="input-group">
          <label htmlFor={`player-name-${index}`}>Name:</label>
          <input
            id={`player-name-${index}`}
            type="text"
            value={player.name}
            onChange={onInputChange}
            data-player-index={index}
            data-field-type="name"
            placeholder="Enter player name"
            data-testid={`player-name-input-${index}`}
            className="player-name-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor={`jersey-${index}`}>Jersey #:</label>
          <input
            id={`jersey-${index}`}
            type="text"
            value={player.jerseyNumber}
            onChange={onInputChange}
            data-player-index={index}
            data-field-type="jersey"
            onFocus={() => onJerseyFocus(index)}
            onBlur={onJerseyBlur}
            placeholder="1-99"
            data-testid={`jersey-input-${index}`}
            className={`jersey-input ${jerseyValidation?.isValid === false ? 'error' : jerseyValidation?.isValid ? 'valid' : ''}`}
          />
          {jerseyValidation && (
            <div className="validation-feedback" data-testid={`jersey-validation-${index}`}>
              {jerseyValidation.error && (
                <div className="error-message" data-testid={`jersey-validation-error-${index}`}>
                  {jerseyValidation.error}
                </div>
              )}
              {jerseyValidation.warning && (
                <div className="warning-message" data-testid={`jersey-validation-warning-${index}`}>
                  {jerseyValidation.warning}
                </div>
              )}
              {jerseyValidation.isValid && !jerseyValidation.error && (
                <div
                  className="success-indicator"
                  data-testid={`jersey-validation-success-${index}`}
                >
                  ✓ Valid
                </div>
              )}
            </div>
          )}
        </div>

        <div className="input-group">
          <label htmlFor={`position-${index}`}>Position:</label>
          <select
            id={`position-${index}`}
            value={player.position}
            onChange={onInputChange}
            data-player-index={index}
            data-field-type="position"
            data-testid={`position-select-${index}`}
            className={`position-select ${positionValidation?.isValid === false ? 'error' : positionValidation?.isValid ? 'valid' : ''}`}
          >
            <option value="">Select Position</option>
            <option value="P">P - Pitcher</option>
            <option value="C">C - Catcher</option>
            <option value="1B">1B - First Base</option>
            <option value="2B">2B - Second Base</option>
            <option value="3B">3B - Third Base</option>
            <option value="SS">SS - Shortstop</option>
            <option value="LF">LF - Left Field</option>
            <option value="CF">CF - Center Field</option>
            <option value="RF">RF - Right Field</option>
            <option value="SF">SF - Short Fielder</option>
            <option value="EP">EP - Extra Player</option>
          </select>
          {positionValidation && (
            <div className="validation-feedback" data-testid={`position-validation-${index}`}>
              {positionValidation.error && (
                <div className="error-message" data-testid={`position-validation-error-${index}`}>
                  {positionValidation.error}
                </div>
              )}
              {positionValidation.suggestions && positionValidation.suggestions.length > 0 && (
                <div className="suggestions" data-testid={`position-suggestions-${index}`}>
                  <span>Suggestions: {positionValidation.suggestions.join(', ')}</span>
                </div>
              )}
              {positionValidation.isValid && (
                <div
                  className="success-indicator"
                  data-testid={`position-validation-success-${index}`}
                >
                  ✓ Valid
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Memoized AvailablePlayerItem component for performance optimization
 */
interface AvailablePlayerItemProps {
  player: Player;
  onAddPlayer: (player: Player, emptyIndex: number) => void;
  findEmptySlot: () => number;
}

const AvailablePlayerItem = memo(function AvailablePlayerItem({
  player,
  onAddPlayer,
  findEmptySlot,
}: AvailablePlayerItemProps): ReactElement {
  const handleAddClick = useCallback(() => {
    const emptyIndex = findEmptySlot();
    if (emptyIndex >= 0) {
      onAddPlayer(player, emptyIndex);
    }
  }, [player, onAddPlayer, findEmptySlot]);

  return (
    <div key={player.id} className="available-player" data-testid={`available-player-${player.id}`}>
      <div className="player-info">
        <span className="player-jersey">#{player.jerseyNumber}</span>
        <span className="player-name">{player.name}</span>
        <span className="player-position">{player.position}</span>
      </div>
      <button
        type="button"
        onClick={handleAddClick}
        className="add-player-button"
        data-testid={`add-player-${player.id}`}
        aria-label={`Add player ${player.name}`}
      >
        +
      </button>
    </div>
  );
});

export function GameSetupLineupPage(): ReactElement {
  const navigate = useNavigate();
  const { setupWizard, setLineup } = useGameStore();

  /**
   * Generate empty lineup slots (memoized to prevent recreating on every render)
   */
  const generateEmptyLineup = useCallback((count: number): Player[] => {
    return Array.from(
      { length: count },
      (_, i) =>
        ({
          id: `empty-${i}`,
          name: '',
          jerseyNumber: '',
          position: '',
          battingOrder: i + 1,
        }) as Player
    );
  }, []);

  // Local state
  const [playerCount, setPlayerCount] = useState(10);
  const [lineup, setLocalLineup] = useState<Player[]>(generateEmptyLineup(10));
  const [availablePlayers] = useState<Player[]>(generateSamplePlayers());

  // Validation state
  const [jerseyValidations, setJerseyValidations] = useState<JerseyValidationResult[]>([]);
  const [positionValidations, setPositionValidations] = useState<FieldPositionValidationResult[]>(
    []
  );
  const [lineupValidation, setLineupValidation] = useState<LineupValidationResult>({
    isValid: true,
    playerCount: 0,
  });
  const [realTimeValidation, setRealTimeValidation] = useState(true);
  const [focusedJerseyInput, setFocusedJerseyInput] = useState<number | null>(null);
  const [showJerseySuggestions, setShowJerseySuggestions] = useState(false);

  /**
   * Generate sample available players
   */
  function generateSamplePlayers(): Player[] {
    return [
      { id: '1', name: 'Mike Chen', jerseyNumber: '8', position: 'SS', battingOrder: 0 },
      { id: '2', name: 'Lisa Park', jerseyNumber: '5', position: 'CF', battingOrder: 0 },
      { id: '3', name: 'Sara Johnson', jerseyNumber: '12', position: 'RF', battingOrder: 0 },
      { id: '4', name: 'Dave Wilson', jerseyNumber: '24', position: '3B', battingOrder: 0 },
      { id: '5', name: 'Amy Wu', jerseyNumber: '19', position: 'LF', battingOrder: 0 },
      { id: '6', name: 'Alex Kim', jerseyNumber: '22', position: 'SF', battingOrder: 0 },
      { id: '7', name: 'Tom Garcia', jerseyNumber: '15', position: '1B', battingOrder: 0 },
      { id: '8', name: 'Kim Lee', jerseyNumber: '7', position: 'C', battingOrder: 0 },
      { id: '9', name: 'Jose Rodriguez', jerseyNumber: '11', position: '2B', battingOrder: 0 },
      { id: '10', name: 'Beth Cooper', jerseyNumber: '9', position: 'P', battingOrder: 0 },
      { id: '11', name: 'Sam Taylor', jerseyNumber: '14', position: 'EP', battingOrder: 0 },
    ];
  }

  /**
   * Check position coverage
   */
  const getPositionCoverage = (): Array<{ position: string; covered: boolean }> => {
    const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    const covered = lineup
      .filter(player => player.name && player.position)
      .map(player => player.position);

    return positions.map(pos => ({
      position: pos,
      covered: covered.includes(pos),
    }));
  };

  /**
   * Handle player count change (memoized for performance)
   */
  const handlePlayerCountChange = useCallback(
    (newCount: number): void => {
      setPlayerCount(newCount);
      if (newCount > lineup.length) {
        // Add empty slots
        const additionalSlots = generateEmptyLineup(newCount - lineup.length);
        additionalSlots.forEach((slot, i) => {
          slot.battingOrder = lineup.length + i + 1;
        });
        setLocalLineup([...lineup, ...additionalSlots]);
      } else if (newCount < lineup.length) {
        // Remove slots from the end
        setLocalLineup(lineup.slice(0, newCount));
      }
    },
    [lineup, generateEmptyLineup]
  );

  /**
   * Handle adding player to lineup
   */
  const handleAddPlayer = (player: Player, position: number): void => {
    const newLineup = [...lineup];
    newLineup[position] = {
      ...player,
      battingOrder: position + 1,
    };
    setLocalLineup(newLineup);
  };

  /**
   * Find first empty slot in lineup (memoized for performance)
   */
  const findEmptySlot = useCallback((): number => {
    return lineup.findIndex(p => !p.name);
  }, [lineup]);

  /**
   * Handle position change for a player (memoized for performance with debounced validation)
   */
  const handlePositionChange = useCallback(
    (playerIndex: number, newPosition: string): void => {
      const newLineup = [...lineup];
      newLineup[playerIndex] = {
        ...newLineup[playerIndex],
        position: newPosition,
      } as Player;
      setLocalLineup(newLineup);
      if (realTimeValidation) {
        setTimeout(() => {
          const result = validateFieldPosition(newPosition);
          setPositionValidations(prev => {
            const newValidations = [...prev];
            newValidations[playerIndex] = result;
            return newValidations;
          });

          const lineupResult = validateLineup(newLineup);
          setLineupValidation(lineupResult);
        }, 300);
      }
    },
    [lineup, realTimeValidation]
  );

  /**
   * Handle player name change (memoized for performance with debounced validation)
   */
  const handlePlayerNameChange = useCallback(
    (playerIndex: number, newName: string): void => {
      const newLineup = [...lineup];
      newLineup[playerIndex] = {
        ...newLineup[playerIndex],
        name: newName,
      } as Player;
      setLocalLineup(newLineup);
      if (realTimeValidation) {
        setTimeout(() => {
          const result = validateLineup(newLineup);
          setLineupValidation(result);
        }, 300);
      }
    },
    [lineup, realTimeValidation]
  );

  /**
   * Handle jersey number change (memoized for performance with debounced validation)
   */
  const handleJerseyNumberChange = useCallback(
    (playerIndex: number, newJerseyNumber: string): void => {
      const newLineup = [...lineup];
      newLineup[playerIndex] = {
        ...newLineup[playerIndex],
        jerseyNumber: newJerseyNumber,
      } as Player;
      setLocalLineup(newLineup);
      if (realTimeValidation) {
        setTimeout(() => {
          const usedJerseys = newLineup
            .filter((_, i) => i !== playerIndex)
            .map(p => p.jerseyNumber)
            .filter(Boolean);

          const jerseyResult = validateJerseyNumber(newJerseyNumber, usedJerseys);
          setJerseyValidations(prev => {
            const newValidations = [...prev];
            newValidations[playerIndex] = jerseyResult;
            return newValidations;
          });

          const lineupResult = validateLineup(newLineup);
          setLineupValidation(lineupResult);
        }, 300);
      }
    },
    [lineup, realTimeValidation]
  );

  /**
   * Handle back navigation
   */
  const handleBack = (): void => {
    void navigate('/game/setup/teams');
  };

  /**
   * Handle continue to next step
   */
  const handleContinue = (): void => {
    // Update store with lineup
    setLineup(lineup);
    void navigate('/game/setup/confirm');
  };

  /**
   * Check if lineup is valid for continuation
   */
  const isLineupValid = (): boolean => {
    return lineupValidation.isValid && lineupValidation.playerCount >= 9;
  };

  /**
   * Get jersey number suggestions for a player
   */
  const getJerseySuggestions = (playerIndex: number): string[] => {
    const lineupJerseys = lineup
      .filter((_, i) => i !== playerIndex)
      .map(p => p.jerseyNumber)
      .filter(Boolean);

    const availablePlayerJerseys = availablePlayers.map(p => p.jerseyNumber);

    const allUsedJerseys = [...lineupJerseys, ...availablePlayerJerseys];

    return getJerseyNumberSuggestions(allUsedJerseys).slice(0, 25);
  };

  /**
   * Toggle real-time validation
   */
  const handleToggleValidation = (): void => {
    setRealTimeValidation(!realTimeValidation);
  };

  /**
   * Handle jersey input focus
   */
  const handleJerseyFocus = (playerIndex: number): void => {
    setFocusedJerseyInput(playerIndex);
    setShowJerseySuggestions(true);
  };

  /**
   * Handle jersey input blur
   */
  const handleJerseyBlur = (): void => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setFocusedJerseyInput(null);
      setShowJerseySuggestions(false);
    }, 200);
  };

  /**
   * Stable event handler for player input changes (avoids inline functions)
   */
  const handlePlayerInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const { value } = event.target;
      const playerIndex = Number(event.target.dataset['playerIndex']);
      const fieldType = event.target.dataset['fieldType'];

      if (isNaN(playerIndex)) return;

      switch (fieldType) {
        case 'name':
          handlePlayerNameChange(playerIndex, value);
          break;
        case 'jersey':
          handleJerseyNumberChange(playerIndex, value);
          break;
        case 'position':
          handlePositionChange(playerIndex, value);
          break;
      }
    },
    [handlePlayerNameChange, handleJerseyNumberChange, handlePositionChange]
  );

  /**
   * Apply suggested jersey number
   */
  const applySuggestedJersey = (playerIndex: number, jerseyNumber: string): void => {
    handleJerseyNumberChange(playerIndex, jerseyNumber);
    setShowJerseySuggestions(false);
  };

  const positionCoverage = getPositionCoverage();

  return (
    <div className="game-setup-lineup-page" data-testid="game-setup-lineup-page">
      <header className="setup-header">
        <button className="back-button" onClick={handleBack} aria-label="Go back to teams">
          ←
        </button>
        <h1>Lineup Setup</h1>
        <div className="progress-indicator" data-testid="lineup-progress">
          2/3
        </div>
      </header>

      <div className="lineup-controls">
        <div className="team-info">
          {setupWizard.teams.ourTeam === 'home' ? setupWizard.teams.home : setupWizard.teams.away}{' '}
          Starting:
        </div>
        <div className="player-count-selector">
          <label htmlFor="player-count">Players:</label>
          <select
            id="player-count"
            value={playerCount}
            onChange={e => handlePlayerCountChange(Number(e.target.value))}
            data-testid="player-count-selector"
          >
            {[9, 10, 11, 12, 13, 14, 15].map(count => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        <button className="load-previous-button" type="button">
          📋 Load Previous
        </button>

        <div className="validation-controls">
          <label>
            <input
              type="checkbox"
              checked={realTimeValidation}
              onChange={handleToggleValidation}
              data-testid="toggle-validation"
            />
            Real-time validation
          </label>
        </div>
      </div>

      {/* Domain Rule Hints */}
      <div className="domain-rules-panel" data-testid="domain-rules-panel">
        <h3>Domain Rules</h3>
        <ul data-testid="domain-rules-hints">
          <li>Jersey numbers must be between 1 and 99</li>
          <li>Each player must have a unique jersey number</li>
          <li>All 9 field positions should be covered</li>
          <li>Standard: 10 players (with SHORT_FIELDER), Minimum: 9 players</li>
        </ul>
        {lineupValidation && !lineupValidation.isValid && (
          <div className="lineup-validation-summary" data-testid="lineup-validation-summary">
            <strong>Lineup Issues:</strong>
            <p>Current player count: {lineupValidation.playerCount}</p>
            {lineupValidation.error && <p className="error-message">{lineupValidation.error}</p>}
          </div>
        )}
      </div>

      {/* Jersey Number Suggestions */}
      {showJerseySuggestions && focusedJerseyInput !== null && (
        <div className="jersey-suggestions-panel" data-testid="jersey-suggestions">
          <h4>Suggested Jersey Numbers:</h4>
          <div className="suggestions-list">
            {getJerseySuggestions(focusedJerseyInput).map(jersey => (
              <button
                key={jersey}
                type="button"
                className="suggestion-button"
                onClick={() => applySuggestedJersey(focusedJerseyInput, jersey)}
                data-testid={`jersey-suggestion-${jersey}`}
              >
                {jersey}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="lineup-content">
        <div className="lineup-sections">
          <section className="batting-order-section">
            <h2>BATTING ORDER</h2>
            <div className="lineup-slots">
              {lineup.map((player, index) => (
                <PlayerSlot
                  key={`batting-${index}`}
                  player={player}
                  index={index}
                  jerseyValidation={jerseyValidations[index]}
                  positionValidation={positionValidations[index]}
                  onInputChange={handlePlayerInputChange}
                  onJerseyFocus={handleJerseyFocus}
                  onJerseyBlur={handleJerseyBlur}
                />
              ))}
            </div>
          </section>

          <section className="available-players-section">
            <h2>AVAILABLE</h2>
            <div className="available-players">
              {availablePlayers.map(player => (
                <AvailablePlayerItem
                  key={player.id}
                  player={player}
                  onAddPlayer={handleAddPlayer}
                  findEmptySlot={findEmptySlot}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="position-coverage" data-testid="position-coverage">
          <h3>Position Coverage</h3>
          <div className="coverage-grid">
            {positionCoverage.map(({ position, covered }) => (
              <span
                key={position}
                className={`position-indicator ${covered ? 'covered' : 'uncovered'}`}
                data-testid={`position-coverage-${position}`}
              >
                {position}
                {covered ? '●' : '○'}
              </span>
            ))}
          </div>
        </aside>
      </main>

      <footer className="setup-footer">
        <div className="footer-actions">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="back-button-footer"
            data-testid="back-button"
          >
            ← BACK
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!isLineupValid()}
            className="continue-button"
            size="large"
            data-testid="continue-button"
          >
            CONTINUE →
          </Button>
        </div>
      </footer>
    </div>
  );
}
