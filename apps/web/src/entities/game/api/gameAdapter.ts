/**
 * @file Game Adapter
 * Hexagonal Architecture adapter for Game-related use cases.
 *
 * @remarks
 * This adapter sits between the Web (UI) layer and Application layer,
 * providing a clean interface for game operations while maintaining
 * strict architectural boundaries. It NEVER imports from the Domain layer
 * directly, only from Application and Infrastructure layers.
 *
 * Key Responsibilities:
 * - Convert UI data to Application layer commands
 * - Execute use cases with proper dependency injection
 * - Transform Application DTOs to UI-friendly state
 * - Handle errors and provide meaningful feedback
 * - Coordinate multiple use cases when needed
 *
 * Architecture Compliance:
 * - Follows Hexagonal Architecture patterns
 * - Implements dependency injection for testability
 * - Provides clean separation of concerns
 * - Maintains type safety across layer boundaries
 *
 * @example
 * ```typescript
 * // Initialize adapter with use cases
 * const gameAdapter = new GameAdapter({
 *   startNewGame: new StartNewGame(gameRepo, eventStore, logger),
 *   recordAtBat: new RecordAtBat(gameRepo, eventStore, logger),
 *   // ... other use cases
 * });
 *
 * // Use in UI components
 * const result = await gameAdapter.startNewGame({
 *   gameId: 'game-123',
 *   homeTeamName: 'Eagles',
 *   awayTeamName: 'Hawks',
 *   homeLineup: [...],
 *   awayLineup: [...]
 * });
 * ```
 */

import {
  GameId,
  PlayerId,
  JerseyNumber,
  TeamLineupId,
  FieldPosition,
} from '@twsoftball/application';
import type {
  AtBatResultType,
  AtBatResult,
  EndInningCommand,
  GameStartResult,
  GameStateDTO,
  InningEndResult,
  RecordAtBatCommand,
  RedoCommand,
  RedoResult,
  RunnerAdvanceDTO,
  StartNewGameCommand,
  SubstitutePlayerCommand,
  SubstitutionResult,
  UndoCommand,
  UndoResult,
  EventStore,
  GameRepository,
  Logger,
  EndInning,
  RecordAtBat,
  RedoLastAction,
  StartNewGame,
  SubstitutePlayer,
  UndoLastAction,
} from '@twsoftball/application';

import type { SetupWizardState } from '../model/gameStore';

// wizardToCommand is now passed as a dependency to avoid circular imports

// Define local LineupPlayerDTO interface to match what StartNewGameCommand expects
interface LineupPlayerDTO {
  readonly playerId: PlayerId;
  readonly name: string;
  readonly jerseyNumber: JerseyNumber;
  readonly battingOrderPosition: number;
  readonly fieldPosition: FieldPosition;
  readonly preferredPositions: FieldPosition[];
}

/**
 * Wizard to command mapper function type.
 */
export type WizardToCommandMapper = (wizardData: SetupWizardState) => StartNewGameCommand;

/**
 * Configuration interface for GameAdapter dependency injection.
 */
export interface GameAdapterConfig {
  startNewGame: StartNewGame;
  recordAtBat: RecordAtBat;
  substitutePlayer: SubstitutePlayer;
  undoLastAction: UndoLastAction;
  redoLastAction: RedoLastAction;
  endInning: EndInning;
  gameRepository: GameRepository;
  eventStore: EventStore;
  logger: Logger;
  wizardToCommand: WizardToCommandMapper;
}

/**
 * UI data interface for starting a new game (legacy format).
 */
export interface UIStartGameData {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLineup: UIPlayerData[];
  awayLineup: UIPlayerData[];
}

/**
 * UI data interface for recording an at-bat.
 */
export interface UIRecordAtBatData {
  gameId: string;
  batterId: string;
  result: string;
  runnerAdvances: UIRunnerAdvanceData[];
}

/**
 * UI data interface for player substitution.
 */
export interface UISubstitutePlayerData {
  gameId: string;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  newPosition: string;
}

/**
 * UI data interface for undo/redo operations.
 */
export interface UIUndoRedoData {
  gameId: string;
}

/**
 * UI data interface for ending an inning.
 */
export interface UIEndInningData {
  gameId: string;
}

/**
 * UI player data interface.
 */
export interface UIPlayerData {
  playerId: string;
  name: string;
  position: string;
  jerseyNumber: number;
}

/**
 * UI runner advance data interface.
 */
export interface UIRunnerAdvanceData {
  runnerId: string;
  fromBase: number;
  toBase: number;
}

/**
 * UI-friendly game state interface.
 */
export interface UIGameState {
  gameId: string;
  status: string;
  score: {
    home: number;
    away: number;
  };
  inning: {
    number: number;
    half: 'top' | 'bottom';
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
}

/**
 * Game Adapter - Primary interface for game operations.
 *
 * @remarks
 * This adapter provides a clean, UI-friendly interface for all game operations
 * while maintaining strict architectural boundaries. It acts as an anti-corruption
 * layer between the UI and Application layers.
 *
 * Key Features:
 * - Type-safe conversions between UI and Application data formats
 * - Centralized error handling and logging
 * - Clean dependency injection for testability
 * - Comprehensive use case orchestration
 *
 * The adapter pattern ensures that changes to the Application layer don't
 * propagate directly to the UI, and vice versa, maintaining system stability
 * and allowing for independent evolution of both layers.
 */
export class GameAdapter {
  constructor(private readonly config: GameAdapterConfig) {}

  /**
   * Starts a new game from wizard state data.
   *
   * @remarks
   * This is the preferred method for starting new games from the setup wizard.
   * It uses the wizardToCommand mapper to convert UI wizard state into a
   * properly validated StartNewGameCommand with domain value objects.
   *
   * @param wizardData - Game setup data from the UI wizard
   * @returns Promise resolving to game start result
   * @throws Error for validation failures or infrastructure issues
   */
  async startNewGameFromWizard(wizardData: SetupWizardState): Promise<GameStartResult> {
    try {
      const command = this.config.wizardToCommand(wizardData);
      return await this.config.startNewGame.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to start new game from wizard',
        error instanceof Error ? error : new Error(String(error)),
        { wizardData }
      );
      throw error;
    }
  }

  /**
   * Starts a new game with the provided UI data (legacy format).
   *
   * @remarks
   * Converts UI data to a StartNewGameCommand and executes the StartNewGame
   * use case. Handles all validation, business logic, and persistence
   * through the application layer.
   *
   * @param uiData - Game initialization data from the UI
   * @returns Promise resolving to game start result
   * @throws Error for validation failures or infrastructure issues
   */
  async startNewGame(uiData: UIStartGameData): Promise<GameStartResult> {
    if (!uiData.gameId || !uiData.homeTeamName || !uiData.awayTeamName) {
      throw new Error(
        'Missing required game data: gameId, homeTeamName, and awayTeamName are required'
      );
    }
    if (!uiData.homeLineup || !Array.isArray(uiData.homeLineup) || uiData.homeLineup.length === 0) {
      throw new Error('Home lineup is required and must contain at least one player');
    }
    if (!uiData.awayLineup || !Array.isArray(uiData.awayLineup) || uiData.awayLineup.length === 0) {
      throw new Error('Away lineup is required and must contain at least one player');
    }

    try {
      const command = this.toStartGameCommand(uiData);
      return await this.config.startNewGame.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to start new game',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Records an at-bat for the current game.
   *
   * @param uiData - At-bat data from the UI
   * @returns Promise resolving to at-bat result
   */
  async recordAtBat(uiData: UIRecordAtBatData): Promise<AtBatResult> {
    if (!uiData.gameId || !uiData.batterId || !uiData.result) {
      throw new Error('Missing required at-bat data: gameId, batterId, and result are required');
    }
    if (!uiData.runnerAdvances || !Array.isArray(uiData.runnerAdvances)) {
      throw new Error('Runner advances must be an array (can be empty)');
    }

    try {
      const command = this.toRecordAtBatCommand(uiData);
      return await this.config.recordAtBat.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to record at-bat',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Substitutes a player in the game.
   *
   * @param uiData - Substitution data from the UI
   * @returns Promise resolving to substitution result
   */
  async substitutePlayer(uiData: UISubstitutePlayerData): Promise<SubstitutionResult> {
    if (
      !uiData.gameId ||
      !uiData.outgoingPlayerId ||
      !uiData.incomingPlayerId ||
      !uiData.newPosition
    ) {
      throw new Error(
        'Missing required substitution data: gameId, outgoingPlayerId, incomingPlayerId, and newPosition are required'
      );
    }

    try {
      const command = this.toSubstitutePlayerCommand(uiData);
      return await this.config.substitutePlayer.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to substitute player',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Undoes the last action in the game.
   *
   * @param uiData - Undo request data from the UI
   * @returns Promise resolving to undo result
   */
  async undoLastAction(uiData: UIUndoRedoData): Promise<UndoResult> {
    if (!uiData.gameId) {
      throw new Error('Missing required undo data: gameId is required');
    }

    try {
      const command = this.toUndoCommand(uiData);
      return await this.config.undoLastAction.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to undo last action',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Redoes the last undone action in the game.
   *
   * @param uiData - Redo request data from the UI
   * @returns Promise resolving to redo result
   */
  async redoLastAction(uiData: UIUndoRedoData): Promise<RedoResult> {
    if (!uiData.gameId) {
      throw new Error('Missing required redo data: gameId is required');
    }

    try {
      const command = this.toRedoCommand(uiData);
      return await this.config.redoLastAction.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to redo last action',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Ends the current inning.
   *
   * @param uiData - End inning request data from the UI
   * @returns Promise resolving to inning end result
   */
  async endInning(uiData: UIEndInningData): Promise<InningEndResult> {
    if (!uiData.gameId) {
      throw new Error('Missing required end inning data: gameId is required');
    }

    try {
      const command = this.toEndInningCommand(uiData);
      return await this.config.endInning.execute(command);
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to end inning',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Converts Application layer DTOs to UI-friendly game state.
   *
   * @remarks
   * This method transforms the complex, domain-rich DTOs from the Application
   * layer into a simplified, UI-friendly format. It handles the impedance
   * mismatch between domain concepts and UI presentation needs.
   *
   * @param applicationState - Game state DTO from application layer
   * @returns UI-friendly game state
   */
  toUIGameState(applicationState: GameStateDTO): UIGameState {
    return {
      gameId: applicationState.gameId?.value || '',
      status: applicationState.status || '',
      score: {
        home: applicationState.score?.home || 0,
        away: applicationState.score?.away || 0,
      },
      inning: {
        number: applicationState.currentInning || 1,
        half: applicationState.isTopHalf ? 'top' : 'bottom',
      },
      teams: {
        home: { name: applicationState.homeLineup?.teamName || '' },
        away: { name: applicationState.awayLineup?.teamName || '' },
      },
    };
  }

  // Private command conversion methods
  private toStartGameCommand(uiData: UIStartGameData): StartNewGameCommand {
    // Convert UI lineup to proper LineupPlayerDTO format
    const initialLineup: LineupPlayerDTO[] = uiData.homeLineup.map((player, index) => ({
      playerId: new PlayerId(player.playerId),
      name: player.name,
      jerseyNumber: JerseyNumber.fromNumber(player.jerseyNumber),
      battingOrderPosition: index + 1, // Assign batting order based on array position
      fieldPosition: player.position as FieldPosition,
      preferredPositions: [player.position as FieldPosition], // Use current position as preferred
    }));

    return {
      gameId: new GameId(uiData.gameId),
      homeTeamName: uiData.homeTeamName,
      awayTeamName: uiData.awayTeamName,
      ourTeamSide: 'HOME', // Default to managing home team
      gameDate: new Date(), // Use current time as default
      initialLineup,
    };
  }

  private toRecordAtBatCommand(uiData: UIRecordAtBatData): RecordAtBatCommand {
    // Convert runner advances to proper DTO format with required fields
    const runnerAdvances: RunnerAdvanceDTO[] = uiData.runnerAdvances.map(advance => ({
      playerId: new PlayerId(advance.runnerId),
      fromBase:
        advance.fromBase === 1
          ? 'FIRST'
          : advance.fromBase === 2
            ? 'SECOND'
            : advance.fromBase === 3
              ? 'THIRD'
              : null,
      toBase:
        advance.toBase === 1
          ? 'FIRST'
          : advance.toBase === 2
            ? 'SECOND'
            : advance.toBase === 3
              ? 'THIRD'
              : advance.toBase === 0
                ? 'HOME'
                : 'OUT',
      advanceReason: 'BATTED_BALL', // Default advance reason
    }));

    return {
      gameId: new GameId(uiData.gameId),
      batterId: new PlayerId(uiData.batterId),
      result: uiData.result as AtBatResultType, // Cast string to enum
      runnerAdvances,
    };
  }

  private toSubstitutePlayerCommand(uiData: UISubstitutePlayerData): SubstitutePlayerCommand {
    return {
      gameId: new GameId(uiData.gameId),
      teamLineupId: new TeamLineupId(`${uiData.gameId}-home`), // Default team lineup ID
      battingSlot: 1, // Default batting slot - this would need to come from UI
      outgoingPlayerId: new PlayerId(uiData.outgoingPlayerId),
      incomingPlayerId: new PlayerId(uiData.incomingPlayerId),
      incomingPlayerName: 'Unknown Player', // Default name - this would need to come from UI
      incomingJerseyNumber: JerseyNumber.fromNumber(99), // Valid default jersey - this would need to come from UI
      newFieldPosition: uiData.newPosition as FieldPosition,
      inning: 1, // Default inning - this would need to come from UI
      isReentry: false, // Default to false
    };
  }

  private toUndoCommand(uiData: UIUndoRedoData): UndoCommand {
    return {
      gameId: new GameId(uiData.gameId),
    };
  }

  private toRedoCommand(uiData: UIUndoRedoData): RedoCommand {
    return {
      gameId: new GameId(uiData.gameId),
    };
  }

  private toEndInningCommand(uiData: UIEndInningData): EndInningCommand {
    return {
      gameId: new GameId(uiData.gameId),
      inning: 1, // Default inning - this would need to come from UI
      isTopHalf: true, // Default to top half - this would need to come from UI
      endingReason: 'THREE_OUTS', // Default ending reason
      finalOuts: 3, // Default to 3 outs
    };
  }
}
