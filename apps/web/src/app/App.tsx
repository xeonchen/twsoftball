import { type ReactElement } from 'react';

import { QueryProvider, RouterProvider, AppRouter } from './providers';

/**
 * Main App component for TW Softball PWA
 *
 * Phase 1B: Modern Dependencies Integration Complete
 * - Integrates all modern dependencies with proper provider hierarchy
 * - Sets up React Query for data fetching and caching
 * - Configures React Router for client-side navigation
 * - Provides Zustand store access throughout the application
 * - Establishes PWA foundation with service worker and manifest
 *
 * Provider hierarchy (outside to inside):
 * 1. QueryProvider - React Query context for data management
 * 2. RouterProvider - React Router context for navigation
 * 3. AppRouter - Route definitions and components
 *
 * This follows the FSD Architecture pattern and maintains clean
 * separation of concerns for scalable PWA development.
 */
export const App = (): ReactElement => {
  return (
    <QueryProvider>
      <RouterProvider>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-field-green-600 text-white p-4">
            <h1 className="text-2xl font-bold">TW Softball</h1>
            <p className="text-sm opacity-90">Progressive Web App</p>
          </header>
          <main className="container mx-auto p-4">
            <AppRouter />
          </main>
        </div>
      </RouterProvider>
    </QueryProvider>
  );
};
