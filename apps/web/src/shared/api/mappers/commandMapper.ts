/**
 * @file Command Mapper
 * Provides type-safe conversion from UI data to Application layer commands.
 *
 * @remarks
 * This mapper ensures proper separation between the UI layer and Application layer
 * by converting simple UI data structures to rich domain commands with proper
 * value objects and domain types. It maintains the hexagonal architecture principle
 * by never importing from the domain layer directly.
 *
 * Key Responsibilities:
 * - Convert UI primitive data to Application command objects
 * - Wrap primitive values in proper value objects (GameId, PlayerId, etc.)
 * - Maintain type safety across layer boundaries
 * - Provide clear mapping between UI concepts and domain concepts
 *
 * Design Principles:
 * - Pure functions for predictable behavior
 * - Strong typing to catch errors at compile time
 * - Clear naming that reflects both UI and domain concepts
 * - No side effects or external dependencies
 *
 * @example
 * ```typescript
 * // Convert UI form data to domain command
 * const uiData = {
 *   gameId: 'game-123',
 *   homeTeamName: 'Eagles',
 *   awayTeamName: 'Hawks',
 *   // ... lineup data
 * };
 *
 * const command = toStartNewGameCommand(uiData);
 * // command now has proper GameId value objects and domain structure
 * ```
 */

import type {
  StartNewGameCommand,
  RecordAtBatCommand,
  SubstitutePlayerCommand,
  UndoCommand,
  RedoCommand,
  EndInningCommand,
  AtBatResultType,
  FieldPosition,
} from '@twsoftball/application';
import { GameId, PlayerId, JerseyNumber, TeamLineupId } from '@twsoftball/application';

/**
 * UI data structure for starting a new game.
 */
export interface UIStartGameData {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  ourTeamSide: 'HOME' | 'AWAY';
  gameDate: Date;
  location?: string;
  initialLineup: UIPlayerData[];
}

/**
 * UI data structure for recording an at-bat.
 */
export interface UIRecordAtBatData {
  gameId: string;
  batterId: string;
  result: AtBatResultType;
  runnerAdvances: UIRunnerAdvanceData[];
}

/**
 * UI data structure for player substitution.
 */
export interface UISubstitutePlayerData {
  gameId: string;
  teamLineupId: string;
  battingSlot: number;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  incomingPlayerName: string;
  incomingJerseyNumber: number;
  newFieldPosition: string;
  inning: number;
  isReentry: boolean;
  notes?: string;
}

/**
 * UI data structure for undo/redo operations.
 */
export interface UIUndoRedoData {
  gameId: string;
}

/**
 * UI data structure for ending an inning.
 */
export interface UIEndInningData {
  gameId: string;
  inning: number;
  isTopHalf: boolean;
  endingReason: 'THREE_OUTS' | 'MERCY_RULE' | 'TIME_LIMIT' | 'FORFEIT' | 'WALKOFF' | 'MANUAL';
  finalOuts: number;
  gameEnding?: boolean;
  notes?: string;
}

/**
 * UI player data structure.
 */
export interface UIPlayerData {
  playerId: string;
  name: string;
  jerseyNumber: number;
  battingOrderPosition: number;
  fieldPosition: string;
  preferredPositions: string[];
}

/**
 * UI runner advance data structure.
 */
export interface UIRunnerAdvanceData {
  playerId: string;
  fromBase: 'FIRST' | 'SECOND' | 'THIRD' | null;
  toBase: 'FIRST' | 'SECOND' | 'THIRD' | 'HOME' | 'OUT';
  advanceReason: string;
}

/**
 * Converts UI start game data to StartNewGameCommand.
 *
 * @remarks
 * Transforms simple UI form data into a rich domain command with proper
 * value objects. Handles lineup data conversion, ensuring each player
 * has properly wrapped PlayerId and JerseyNumber value objects.
 *
 * @param uiData - UI form data for starting a game
 * @returns StartNewGameCommand with proper domain types
 *
 * @example
 * ```typescript
 * const uiData = {
 *   gameId: 'game-123',
 *   homeTeamName: 'Eagles',
 *   awayTeamName: 'Hawks',
 *   homeLineup: [
 *     { playerId: 'p1', name: 'John', position: 'P', jerseyNumber: 1 }
 *   ],
 *   awayLineup: []
 * };
 *
 * const command = toStartNewGameCommand(uiData);
 * // command.gameId is now { value: 'game-123' }
 * // command.homeLineup[0].playerId is now { value: 'p1' }
 * ```
 */
export function toStartNewGameCommand(uiData: UIStartGameData): StartNewGameCommand {
  return {
    gameId: new GameId(uiData.gameId),
    homeTeamName: uiData.homeTeamName,
    awayTeamName: uiData.awayTeamName,
    ourTeamSide: uiData.ourTeamSide,
    gameDate: uiData.gameDate,
    ...(uiData.location !== undefined && { location: uiData.location }),
    initialLineup: uiData.initialLineup.map(player => ({
      playerId: new PlayerId(player.playerId),
      name: player.name,
      jerseyNumber: JerseyNumber.fromNumber(player.jerseyNumber),
      battingOrderPosition: player.battingOrderPosition,
      fieldPosition: player.fieldPosition as FieldPosition,
      preferredPositions: player.preferredPositions as FieldPosition[],
    })),
  };
}

/**
 * Converts UI at-bat data to RecordAtBatCommand.
 *
 * @remarks
 * Transforms UI at-bat form data into a domain command with proper value
 * objects. Handles runner advance scenarios by wrapping player IDs and
 * preserving base positions as primitive numbers (since they represent
 * physical locations rather than domain concepts).
 *
 * @param uiData - UI form data for recording an at-bat
 * @returns RecordAtBatCommand with proper domain types
 *
 * @example
 * ```typescript
 * const uiData = {
 *   gameId: 'game-123',
 *   batterId: 'batter-1',
 *   result: 'SINGLE',
 *   runnerAdvances: [
 *     { runnerId: 'runner-1', fromBase: 1, toBase: 2 }
 *   ]
 * };
 *
 * const command = toRecordAtBatCommand(uiData);
 * // command.batterId is now { value: 'batter-1' }
 * // command.runnerAdvances[0].runnerId is now { value: 'runner-1' }
 * ```
 */
export function toRecordAtBatCommand(uiData: UIRecordAtBatData): RecordAtBatCommand {
  return {
    gameId: new GameId(uiData.gameId),
    batterId: new PlayerId(uiData.batterId),
    result: uiData.result,
    runnerAdvances: uiData.runnerAdvances.map(advance => ({
      playerId: new PlayerId(advance.playerId),
      fromBase: advance.fromBase,
      toBase: advance.toBase,
      advanceReason: advance.advanceReason,
    })),
  };
}

/**
 * Converts UI substitution data to SubstitutePlayerCommand.
 *
 * @remarks
 * Transforms UI substitution form data into a domain command with proper
 * PlayerId value objects. The position remains a string as it represents
 * a field position constant rather than a complex domain concept.
 *
 * @param uiData - UI form data for player substitution
 * @returns SubstitutePlayerCommand with proper domain types
 *
 * @example
 * ```typescript
 * const uiData = {
 *   gameId: 'game-123',
 *   outgoingPlayerId: 'starter-1',
 *   incomingPlayerId: 'sub-1',
 *   newPosition: 'RF'
 * };
 *
 * const command = toSubstitutePlayerCommand(uiData);
 * // Both player IDs are now wrapped in value objects
 * ```
 */
export function toSubstitutePlayerCommand(uiData: UISubstitutePlayerData): SubstitutePlayerCommand {
  return {
    gameId: new GameId(uiData.gameId),
    teamLineupId: new TeamLineupId(uiData.teamLineupId),
    battingSlot: uiData.battingSlot,
    outgoingPlayerId: new PlayerId(uiData.outgoingPlayerId),
    incomingPlayerId: new PlayerId(uiData.incomingPlayerId),
    incomingPlayerName: uiData.incomingPlayerName,
    incomingJerseyNumber: JerseyNumber.fromNumber(uiData.incomingJerseyNumber),
    newFieldPosition: uiData.newFieldPosition as FieldPosition,
    inning: uiData.inning,
    isReentry: uiData.isReentry,
    ...(uiData.notes !== undefined && { notes: uiData.notes }),
  };
}

/**
 * Converts UI undo data to UndoCommand.
 *
 * @remarks
 * Simple conversion that wraps the game ID in a value object. Undo commands
 * only require game identification since they operate on the latest action
 * in the game's event stream.
 *
 * @param uiData - UI data for undo request
 * @returns UndoCommand with proper domain types
 *
 * @example
 * ```typescript
 * const uiData = { gameId: 'game-123' };
 * const command = toUndoCommand(uiData);
 * // command.gameId is now { value: 'game-123' }
 * ```
 */
export function toUndoCommand(uiData: UIUndoRedoData): UndoCommand {
  return {
    gameId: new GameId(uiData.gameId),
  };
}

/**
 * Converts UI redo data to RedoCommand.
 *
 * @remarks
 * Simple conversion that wraps the game ID in a value object. Redo commands
 * only require game identification since they operate on the latest undone
 * action in the game's event stream.
 *
 * @param uiData - UI data for redo request
 * @returns RedoCommand with proper domain types
 *
 * @example
 * ```typescript
 * const uiData = { gameId: 'game-123' };
 * const command = toRedoCommand(uiData);
 * // command.gameId is now { value: 'game-123' }
 * ```
 */
export function toRedoCommand(uiData: UIUndoRedoData): RedoCommand {
  return {
    gameId: new GameId(uiData.gameId),
  };
}

/**
 * Converts UI end inning data to EndInningCommand.
 *
 * @remarks
 * Simple conversion that wraps the game ID in a value object. End inning
 * commands only require game identification since they operate on the
 * current inning state of the specified game.
 *
 * @param uiData - UI data for ending inning
 * @returns EndInningCommand with proper domain types
 *
 * @example
 * ```typescript
 * const uiData = { gameId: 'game-123' };
 * const command = toEndInningCommand(uiData);
 * // command.gameId is now { value: 'game-123' }
 * ```
 */
export function toEndInningCommand(uiData: UIEndInningData): EndInningCommand {
  return {
    gameId: new GameId(uiData.gameId),
    inning: uiData.inning,
    isTopHalf: uiData.isTopHalf,
    endingReason: uiData.endingReason,
    finalOuts: uiData.finalOuts,
    ...(uiData.gameEnding !== undefined && { gameEnding: uiData.gameEnding }),
    ...(uiData.notes !== undefined && { notes: uiData.notes }),
  };
}
