import { type ReactElement } from 'react';

/**
 * Home page component for TW Softball PWA
 *
 * This is a basic placeholder component for Phase 1B.
 * In future phases, this will be enhanced with:
 * - Game creation and selection
 * - Recent games list
 * - Quick stats overview
 */
export const HomePage = (): ReactElement => {
  return (
    <div data-testid="home-page">
      <h1 className="text-2xl font-bold text-field-green-600 mb-4">TW Softball</h1>
      <p className="text-gray-600 mb-6">Welcome to the slow-pitch softball game recording PWA</p>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Phase 1B: Modern Dependencies Integration Complete</p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>✅ Zustand state management</li>
          <li>✅ React Query for data fetching</li>
          <li>✅ React Router for navigation</li>
          <li>✅ Form validation ready</li>
          <li>✅ PWA foundation configured</li>
        </ul>
      </div>
    </div>
  );
};
