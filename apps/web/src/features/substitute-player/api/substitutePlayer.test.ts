/**
 * @file Substitute Player API Tests
 * Tests for the deprecated substitute player API function.
 */

import { FieldPosition } from '@twsoftball/application';
import { describe, it, expect } from 'vitest';

import { substitutePlayer } from './substitutePlayer';

describe('substitutePlayer API (Deprecated)', () => {
  it('throws deprecation error for any call', () => {
    const params = {
      gameId: 'game-123',
      teamLineupId: 'team-456',
      outgoingPlayerId: 'player-1',
      incomingPlayer: {
        id: 'player-2',
        name: 'Substitute Player',
        jerseyNumber: '99',
        position: FieldPosition.PITCHER,
      },
      battingSlot: 3,
      inning: 5,
      isReentry: false,
    };

    expect(() => substitutePlayer(params)).toThrow('substitutePlayer API function is deprecated');
  });

  it('validates parameters before throwing deprecation error', () => {
    const invalidParams = {
      gameId: '',
      teamLineupId: 'team-456',
      outgoingPlayerId: 'player-1',
      incomingPlayer: {
        id: 'player-2',
        name: 'Substitute Player',
        jerseyNumber: '99',
        position: FieldPosition.PITCHER,
      },
      battingSlot: 3,
      inning: 5,
      isReentry: false,
    };

    // Should throw validation error first, before deprecation error
    expect(() => substitutePlayer(invalidParams)).toThrow();
  });
});
