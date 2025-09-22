import { ReactNode, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { GamePage } from '../../pages/GamePage';
import { GameRecordingPage } from '../../pages/GameRecordingPage';
import { GameSetupConfirmPage } from '../../pages/GameSetupConfirmPage';
import { GameSetupLineupPage } from '../../pages/GameSetupLineupPage';
import { GameSetupTeamsPage } from '../../pages/GameSetupTeamsPage';
import { GameStatsPage } from '../../pages/GameStatsPage';
import { HomePage } from '../../pages/HomePage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { SettingsPage } from '../../pages/SettingsPage';

/**
 * Application router configuration for TW Softball PWA
 *
 * Phase 2 enhanced routing structure with comprehensive game management:
 * - Home page with game selection and overview
 * - Complete game setup wizard with team, lineup, and confirmation steps
 * - Game recording interface with navigation protection
 * - Game statistics and analysis views
 * - Settings and configuration management
 *
 * @remarks
 * Routes defined:
 * - `/` - Home page (Screen 1: Game List)
 * - `/settings` - Settings page (Screen 9: Configuration)
 * - `/game/setup/teams` - Team setup wizard step 1 (Screen 2)
 * - `/game/setup/lineup` - Lineup setup wizard step 2 (Screen 3)
 * - `/game/setup/confirm` - Setup confirmation step 3 (Screen 4)
 * - `/game/:gameId/record` - Game recording interface (Screen 5)
 * - `/game/:gameId/stats` - Game statistics view (Screen 8)
 * - `*` - 404 Not Found page for invalid routes
 *
 * Navigation guards will be implemented to protect active games from
 * accidental browser navigation. All routes support proper parameter
 * handling and maintain state across navigation events.
 */
export const AppRouter = (): ReactElement => {
  return (
    <Routes>
      {/* Home route - Screen 1: Game List */}
      <Route path="/" element={<HomePage />} />

      {/* Settings route - Screen 9: Settings & Configuration */}
      <Route path="/settings" element={<SettingsPage />} />

      {/* Game setup wizard routes */}
      <Route path="/game/setup/teams" element={<GameSetupTeamsPage />} />
      <Route path="/game/setup/lineup" element={<GameSetupLineupPage />} />
      <Route path="/game/setup/confirm" element={<GameSetupConfirmPage />} />

      {/* Game recording and stats routes with game ID parameter */}
      <Route path="/game/:gameId/record" element={<GameRecordingPage />} />
      <Route path="/game/:gameId/stats" element={<GameStatsPage />} />

      {/* Legacy route for backward compatibility - will redirect internally */}
      <Route path="/game/:gameId" element={<GamePage />} />

      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

/**
 * Router provider component that wraps the entire application
 *
 * Provides BrowserRouter context to enable client-side routing throughout
 * the application. This component should be used at the top level of the
 * application component tree.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <RouterProvider>
 *       <AppRouter />
 *     </RouterProvider>
 *   );
 * }
 * ```
 *
 * @param props - The component props
 * @param props.children - Child components that will have access to routing
 */
export const RouterProvider = ({ children }: { children: ReactNode }): ReactElement => {
  return <BrowserRouter>{children}</BrowserRouter>;
};
