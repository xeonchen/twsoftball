import { ReactNode, type ReactElement, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Eager load essential pages for immediate navigation
import { HomePage } from '../../pages/home';
import { NotFoundPage } from '../../pages/not-found';

// Lazy load large and less frequently used pages
const GamePage = lazy(() => import('../../pages/game').then(m => ({ default: m.GamePage })));
const GameRecordingPage = lazy(() =>
  import('../../pages/game-recording').then(m => ({ default: m.GameRecordingPage }))
);
const GameSetupConfirmPage = lazy(() =>
  import('../../pages/game-setup').then(m => ({ default: m.GameSetupConfirmPage }))
);
const GameSetupLineupPage = lazy(() =>
  import('../../pages/game-setup').then(m => ({ default: m.GameSetupLineupPage }))
);
const GameSetupTeamsPage = lazy(() =>
  import('../../pages/game-setup').then(m => ({ default: m.GameSetupTeamsPage }))
);
const GameStatsPage = lazy(() =>
  import('../../pages/game-stats').then(m => ({ default: m.GameStatsPage }))
);
const LineupManagementPage = lazy(() =>
  import('../../pages/lineup-management').then(m => ({ default: m.LineupManagementPage }))
);
const SettingsPage = lazy(() =>
  import('../../pages/settings').then(m => ({ default: m.SettingsPage }))
);

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
 * - `/lineup` - Lineup management page (Phase 5.3.E)
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
/**
 * Loading spinner component for lazy-loaded routes
 */
const LoadingSpinner = (): ReactElement => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-field-green-600"></div>
  </div>
);

export const AppRouter = (): ReactElement => {
  return (
    <Routes>
      {/* Home route - Screen 1: Game List */}
      <Route path="/" element={<HomePage />} />

      {/* Settings route - Screen 9: Settings & Configuration */}
      <Route
        path="/settings"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPage />
          </Suspense>
        }
      />

      {/* Lineup management route - Phase 5.3.E */}
      <Route
        path="/lineup"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <LineupManagementPage />
          </Suspense>
        }
      />

      {/* Game setup wizard routes */}
      <Route
        path="/game/setup/teams"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GameSetupTeamsPage />
          </Suspense>
        }
      />
      <Route
        path="/game/setup/lineup"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GameSetupLineupPage />
          </Suspense>
        }
      />
      <Route
        path="/game/setup/confirm"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GameSetupConfirmPage />
          </Suspense>
        }
      />

      {/* Game recording and stats routes with game ID parameter */}
      <Route
        path="/game/:gameId/record"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GameRecordingPage />
          </Suspense>
        }
      />
      <Route
        path="/game/:gameId/stats"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GameStatsPage />
          </Suspense>
        }
      />

      {/* Legacy route for backward compatibility - will redirect internally */}
      <Route
        path="/game/:gameId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GamePage />
          </Suspense>
        }
      />

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
