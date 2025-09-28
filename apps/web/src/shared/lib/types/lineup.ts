/**
 * @file Lineup Management Types
 *
 * Type definitions for player lineup management, substitutions, and field positioning.
 * These types support slow-pitch softball lineup rules including substitutions and reentry.
 *
 * Imports domain types for proper type safety and architecture compliance.
 */

import { PlayerId, FieldPosition } from '@twsoftball/application';

/**
 * Minimal player information for UI components and forms.
 * Uses domain PlayerId for type safety while maintaining UI-specific structure.
 *
 * @remarks
 * This is a web-layer type that bridges domain types with UI components.
 * The playerId uses the proper domain type for consistency across layers.
 */
export interface PlayerInfo {
  /** Unique identifier for the player using domain type */
  playerId: PlayerId;
  /** Player's display name for UI components */
  name: string;
}

/**
 * Extended player information for bench and lineup UI management.
 * Simplified for web layer use with minimal business logic.
 *
 * @remarks
 * This is a UI-focused type for displaying player information in bench management
 * components. Complex business logic is handled by the domain layer.
 */
export interface BenchPlayer {
  /** Unique identifier for the player */
  id: string;
  /** Player's full name for display */
  name: string;
  /** Jersey number as string to support formats like "00", "A1", etc. */
  jerseyNumber: string;
  /** True if player was in starting lineup, false if substitute */
  isStarter: boolean;
  /** True if this player has already re-entered the game after being substituted */
  hasReentered: boolean;
  /** Inning when player entered/re-entered the game, null for original starters */
  entryInning: number | null;
  /** Current field position if player is active in the game */
  position?: FieldPosition;
}

/**
 * UI representation of a player substitution record.
 * Used for displaying substitution history in game management interfaces.
 */
export interface SubstitutionRecord {
  /** Inning number when substitution occurred (1-based) */
  inning: number;
  /** Batting order position being substituted (1-10) */
  battingSlot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Player being removed from the game */
  outgoingPlayer: PlayerInfo;
  /** Player entering the game */
  incomingPlayer: PlayerInfo;
  /** Exact timestamp when substitution was recorded */
  timestamp: Date;
  /** True if this is a starter re-entering after being substituted */
  isReentry: boolean;
}

/**
 * UI representation of a player's position assignment.
 * Used in lineup management and field position displays.
 */
export interface PositionAssignment {
  /** Batting order position (1-10, with 10 being extra hitter if used) */
  battingSlot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Unique identifier of the player assigned to this position */
  playerId: string;
  /** Field position using domain enum for type safety */
  fieldPosition: FieldPosition;
}

/**
 * UI representation of complete field layout for lineup management.
 * Organizes all defensive positions for display in field management components.
 */
export interface FieldLayout {
  /** Pitcher position assignment */
  pitcher: PositionAssignment;
  /** Catcher position assignment */
  catcher: PositionAssignment;
  /** First baseman position assignment */
  firstBase: PositionAssignment;
  /** Second baseman position assignment */
  secondBase: PositionAssignment;
  /** Third baseman position assignment */
  thirdBase: PositionAssignment;
  /** Shortstop position assignment */
  shortstop: PositionAssignment;
  /** Left fielder position assignment */
  leftField: PositionAssignment;
  /** Center fielder position assignment */
  centerField: PositionAssignment;
  /** Right fielder position assignment */
  rightField: PositionAssignment;
  /** Short fielder position assignment (10th defensive player) */
  shortFielder: PositionAssignment;
  /** Optional extra player assignment (bats only, doesn't play defense) */
  extraPlayer?: PositionAssignment;
}

/**
 * Shared interface for substitute player functionality.
 * Enables composition at widget/page level without cross-feature dependencies.
 */
export interface SubstitutePlayerAPI {
  /** Function to perform player substitution */
  executeSubstitution: (data: SubstitutionRequestData) => Promise<SubstitutionResult>;
  /** Whether a substitution operation is currently in progress */
  isLoading: boolean;
  /** Current error message, null if no error */
  error: string | null;
}

/**
 * Shared data structure for substitution requests.
 * Bridge between UI and substitution functionality.
 */
export interface SubstitutionRequestData {
  /** Game identifier where substitution occurs */
  gameId: string;
  /** Team lineup identifier being modified */
  teamLineupId: string;
  /** Batting slot position (1-30) */
  battingSlot: number;
  /** ID of player being substituted out */
  outgoingPlayerId: string;
  /** Information about player being substituted in */
  incomingPlayer: IncomingPlayerData;
  /** Current inning number */
  inning: number;
  /** Whether this is a starter re-entering the game */
  isReentry: boolean;
  /** Optional notes about the substitution */
  notes?: string;
}

/**
 * Shared data structure for incoming player information.
 * UI-friendly representation for substitution forms.
 */
export interface IncomingPlayerData {
  /** Unique identifier for the incoming player */
  id: string;
  /** Display name for the incoming player */
  name: string;
  /** Jersey number as string (supports formats like "00", "A1") */
  jerseyNumber: string;
  /** Field position where the player will be assigned */
  position: FieldPosition;
}

/**
 * Shared result structure for substitution operations.
 * Standardized response format for UI consumption.
 */
export interface SubstitutionResult {
  /** Whether the substitution was successful */
  success: boolean;
  /** Updated game state (for successful substitutions) */
  gameState?: unknown;
  /** Detailed substitution information (for successful substitutions) */
  substitutionDetails?: {
    battingSlot: number;
    outgoingPlayerName: string;
    incomingPlayerName: string;
    newFieldPosition: FieldPosition;
    inning: number;
    wasReentry: boolean;
    timestamp: Date;
    previousFieldPosition?: FieldPosition;
    notes?: string;
  };
  /** Whether field position changed during substitution */
  positionChanged: boolean;
  /** Whether this substitution used a starter's re-entry opportunity */
  reentryUsed: boolean;
  /** Error messages (for failed substitutions) */
  errors?: string[];
}
