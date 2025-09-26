/**
 * @file Shared Game Types
 *
 * Basic game-related types that can be used across all FSD layers.
 * These are core data structures without dependencies on higher layers.
 */

/**
 * Player data structure for lineup management and game recording
 */
export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  battingOrder: number;
}

/**
 * Setup wizard state for game creation workflow
 */
export interface SetupWizardState {
  step: 'teams' | 'lineup' | 'confirm' | null;
  teams: {
    home: string;
    away: string;
    ourTeam: 'home' | 'away' | null;
  };
  lineup: Player[];
  isComplete: boolean;
}
