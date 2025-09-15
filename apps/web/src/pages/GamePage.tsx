import { type ReactElement } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Game page component for TW Softball PWA
 *
 * This is a basic placeholder component for Phase 1B.
 * In future phases, this will be enhanced with:
 * - Live game state display
 * - Score tracking
 * - At-bat recording interface
 * - Inning management
 */
export const GamePage = (): ReactElement => {
  const { gameId } = useParams<{ gameId: string }>();

  return (
    <div data-testid="game-page">
      <h1 className="text-2xl font-bold text-field-green-600 mb-4">Game View</h1>
      <p className="text-gray-600 mb-4">Game ID: {gameId || 'Unknown'}</p>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500 mb-2">Phase 1B: Basic routing configured</p>
        <p className="text-sm text-gray-500">
          This page will contain the live game interface in future phases.
        </p>
      </div>
    </div>
  );
};
