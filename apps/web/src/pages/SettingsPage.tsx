import { type ReactElement } from 'react';

/**
 * Settings Page Component
 *
 * Implements Screen 9: Settings & Configuration from wireframes.md
 * Provides configuration options for game rules, display preferences,
 * and data management.
 *
 * Features:
 * - Game settings (mercy rule, auto-advance runners)
 * - Display settings (high contrast, large touch targets)
 * - Data management (export, sync status)
 * - Accessibility options
 *
 * Reference: docs/design/ui-ux/wireframes.md Screen 9
 */
export function SettingsPage(): ReactElement {
  return (
    <div className="settings-page" data-testid="settings-page">
      <header className="settings-header">
        <button className="back-button" onClick={() => window.history.back()} aria-label="Go back">
          ←
        </button>
        <h1>Settings</h1>
      </header>

      <main className="settings-content">
        <section className="settings-section">
          <h2>Game Settings</h2>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Mercy Rule</h3>
              <p>15 runs after 5th inning</p>
            </div>
            <div className="setting-control">
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Auto-advance runners</h3>
              <p>Smart defaults for base advancement</p>
            </div>
            <div className="setting-control">
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Display Settings</h2>

          <div className="setting-item">
            <div className="setting-info">
              <h3>High contrast mode</h3>
              <p>Better visibility in sunlight</p>
            </div>
            <div className="setting-control">
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Large touch targets</h3>
              <p>Enhanced accessibility</p>
            </div>
            <div className="setting-control">
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Data & Sync</h2>

          <button className="setting-action-button">Export Game Data</button>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Sync Status</h3>
              <p>Last: 2 min ago ✅</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
