import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

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
 * - Player count selector (9-12+ players)
 * - Batting order and field position assignment
 * - Position coverage validation
 * - Load previous lineup functionality
 * - Responsive layout (portrait vs landscape)
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 3
 */
export function GameSetupLineupPage(): ReactElement {
  const navigate = useNavigate();
  const { setupWizard, setLineup } = useGameStore();

  // Local state
  const [playerCount, setPlayerCount] = useState(9);
  const [lineup, setLocalLineup] = useState<Player[]>(
    setupWizard.lineup.length > 0 ? setupWizard.lineup : generateEmptyLineup(9)
  );
  const [availablePlayers] = useState<Player[]>(generateSamplePlayers());

  /**
   * Generate empty lineup slots
   */
  function generateEmptyLineup(count: number): Player[] {
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
  }

  /**
   * Generate sample available players
   */
  function generateSamplePlayers(): Player[] {
    return [
      { id: '1', name: 'Mike Chen', jerseyNumber: '8', position: 'SS', battingOrder: 0 },
      { id: '2', name: 'Lisa Park', jerseyNumber: '5', position: 'CF', battingOrder: 0 },
      { id: '3', name: 'Sara Johnson', jerseyNumber: '12', position: 'RF', battingOrder: 0 },
      { id: '4', name: 'Dave Wilson', jerseyNumber: '23', position: '3B', battingOrder: 0 },
      { id: '5', name: 'Amy Wu', jerseyNumber: '19', position: 'LF', battingOrder: 0 },
      { id: '6', name: 'Alex Kim', jerseyNumber: '22', position: 'OF', battingOrder: 0 },
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
   * Handle player count change
   */
  const handlePlayerCountChange = (newCount: number): void => {
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
  };

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
   * Handle removing player from lineup
   */
  const handleRemovePlayer = (position: number): void => {
    const newLineup = [...lineup];
    newLineup[position] = {
      id: `empty-${position}`,
      name: '',
      jerseyNumber: '',
      position: '',
      battingOrder: position + 1,
    } as Player;
    setLocalLineup(newLineup);
  };

  /**
   * Handle position change for a player
   */
  const handlePositionChange = (playerIndex: number, newPosition: string): void => {
    const newLineup = [...lineup];
    newLineup[playerIndex] = {
      ...newLineup[playerIndex],
      position: newPosition,
    } as Player;
    setLocalLineup(newLineup);
  };

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
    const validPlayers = lineup.filter(player => player.name.trim() !== '');
    return validPlayers.length >= 9;
  };

  const positionCoverage = getPositionCoverage();

  return (
    <div className="game-setup-lineup-page" data-testid="game-setup-lineup-page">
      <header className="setup-header">
        <button className="back-button" onClick={handleBack} aria-label="Go back to teams">
          ←
        </button>
        <h1>Lineup Setup</h1>
        <div className="progress-indicator">2/3</div>
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
      </div>

      <main className="lineup-content">
        <div className="lineup-sections">
          <section className="batting-order-section">
            <h2>BATTING ORDER</h2>
            <div className="lineup-slots">
              {lineup.map((player, index) => (
                <div
                  key={`batting-${index}`}
                  className={`lineup-slot ${player.name ? 'filled' : 'empty'}`}
                  data-testid={`batting-slot-${index}`}
                >
                  {player.name ? (
                    <div className="player-card">
                      <div className="player-info">
                        <span className="batting-position">{index + 1}.</span>
                        <span className="player-details">
                          #{player.jerseyNumber} {player.name}
                        </span>
                      </div>
                      <div className="player-actions">
                        <select
                          value={player.position}
                          onChange={e => handlePositionChange(index, e.target.value)}
                          className="position-select"
                          data-testid={`position-select-${index}`}
                        >
                          <option value="">Select Position</option>
                          <option value="P">P</option>
                          <option value="C">C</option>
                          <option value="1B">1B</option>
                          <option value="2B">2B</option>
                          <option value="3B">3B</option>
                          <option value="SS">SS</option>
                          <option value="LF">LF</option>
                          <option value="CF">CF</option>
                          <option value="RF">RF</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(index)}
                          className="remove-player-button"
                          aria-label="Remove player"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-slot">
                      <span className="batting-position">{index + 1}.</span>
                      <span className="drop-zone-text">[DROP ZONE]</span>
                      <span className="helper-text">Drag player here</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="available-players-section">
            <h2>AVAILABLE</h2>
            <div className="available-players">
              {availablePlayers.map(player => (
                <div
                  key={player.id}
                  className="available-player"
                  data-testid={`available-player-${player.id}`}
                >
                  <div className="player-info">
                    <span className="player-jersey">#{player.jerseyNumber}</span>
                    <span className="player-name">{player.name}</span>
                    <span className="player-position">{player.position}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Find first empty slot
                      const emptyIndex = lineup.findIndex(p => !p.name);
                      if (emptyIndex >= 0) {
                        handleAddPlayer(player, emptyIndex);
                      }
                    }}
                    className="add-player-button"
                    data-testid={`add-player-${player.id}`}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="position-coverage">
          <h3>Position Coverage</h3>
          <div className="coverage-grid">
            {positionCoverage.map(({ position, covered }) => (
              <span
                key={position}
                className={`position-indicator ${covered ? 'covered' : 'uncovered'}`}
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
