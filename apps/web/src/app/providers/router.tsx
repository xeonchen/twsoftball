import { ReactNode, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { GamePage } from '../../pages/GamePage';
import { HomePage } from '../../pages/HomePage';
import { NotFoundPage } from '../../pages/NotFoundPage';

/**
 * Application router configuration for TW Softball PWA
 *
 * Defines the routing structure for the application. This is a basic
 * implementation for Phase 1B that will be expanded in future phases with:
 * - Authentication guards
 * - Role-based access control
 * - Dynamic route loading
 * - Offline routing support
 *
 * @remarks
 * Routes defined:
 * - `/` - Home page with game selection and overview
 * - `/game/:gameId` - Individual game view and recording interface
 * - `*` - 404 Not Found page for invalid routes
 *
 * All routes are currently public. Authentication will be added in Phase 3.
 */
export const AppRouter = (): ReactElement => {
  return (
    <Routes>
      {/* Home route */}
      <Route path="/" element={<HomePage />} />

      {/* Game routes */}
      <Route path="/game/:gameId" element={<GamePage />} />

      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFoundPage />} />

      {/* Additional routes can be added here in future phases */}
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
