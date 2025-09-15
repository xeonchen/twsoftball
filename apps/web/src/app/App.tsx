import { type ReactElement } from 'react';

/**
 * Main App component for TW Softball PWA
 * FSD Architecture entry point for Phase 1A foundation setup
 */
export const App = (): ReactElement => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-field-green-600 text-white p-4">
        <h1 className="text-2xl font-bold">TW Softball</h1>
      </header>
      <main className="container mx-auto p-4">
        <h2 className="text-3xl font-bold text-field-green-600 mb-4">TW Softball PWA</h2>
        <p>Foundation setup complete</p>
      </main>
    </div>
  );
};
