import { type ReactElement, useMemo } from 'react';

import { QueryProvider, RouterProvider, AppRouter, AppServicesProvider } from './providers';

/**
 * Main App component for TW Softball PWA
 *
 * Phase 1B: Modern Dependencies Integration Complete
 * - Integrates all modern dependencies with proper provider hierarchy
 * - Sets up React Query for data fetching and caching
 * - Configures React Router for client-side navigation
 * - Provides application services through dependency injection
 * - Establishes PWA foundation with service worker and manifest
 *
 * Provider hierarchy (outside to inside):
 * 1. AppServicesProvider - Application services and DI container
 * 2. QueryProvider - React Query context for data management
 * 3. RouterProvider - React Router context for navigation
 * 4. AppRouter - Route definitions and components
 *
 * This follows the FSD Architecture pattern and maintains clean
 * separation of concerns for scalable PWA development.
 */
export const App = (): ReactElement => {
  // Memoize configuration to prevent unnecessary service reinitialization
  // This ensures AppServicesProvider doesn't reinitialize on every render,
  // which would interrupt async operations like game creation
  const appConfig = useMemo(
    () => ({
      environment: (import.meta.env.MODE as 'development' | 'production') || 'development',
      storage: 'indexeddb' as const,
      debug: import.meta.env.MODE === 'development',
    }),
    []
  ); // Empty deps - config is static and never changes

  return (
    <AppServicesProvider config={appConfig}>
      <QueryProvider>
        <RouterProvider>
          <div className="min-h-screen bg-gray-50" data-testid="app-ready">
            <header className="bg-field-green-600 text-white p-4">
              <div className="text-2xl font-bold">TW Softball</div>
              <p className="text-sm opacity-90">Progressive Web App</p>
            </header>
            <main className="container mx-auto p-4">
              <AppRouter />
            </main>
          </div>
        </RouterProvider>
      </QueryProvider>
    </AppServicesProvider>
  );
};
