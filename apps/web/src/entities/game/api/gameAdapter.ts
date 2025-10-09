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
  JERSEY_NUMBERS,
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
  TeamLineupRepository,
  Logger,
  EndInning,
  RecordAtBat,
  RedoLastAction,
  StartNewGame,
  SubstitutePlayer,
  UndoLastAction,
} from '@twsoftball/application';

import type { SetupWizardState } from '../../../shared/lib/types';

/**
 * Interface representing lineup slot information for substitution logic.
 */
interface LineupSlot {
  readonly currentPlayer: PlayerId;
  readonly position: number;
}

/**
 * Interface representing player information from team lineup.
 */
interface PlayerInfo {
  readonly playerId: PlayerId;
  readonly jerseyNumber: JerseyNumber;
  readonly playerName: string;
  readonly isStarter: boolean;
  readonly hasUsedReentry: boolean;
}

/**
 * Interface representing team lineup for substitution operations.
 */
interface TeamLineupForSubstitution {
  readonly id: TeamLineupId;
  getPlayerInfo(playerId: PlayerId): PlayerInfo | undefined;
  getActiveLineup(): LineupSlot[];
}

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
  teamLineupRepository: TeamLineupRepository;
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
 * UI-friendly team lineup result interface.
 */
export interface UITeamLineupResult {
  success: boolean;
  gameId: GameId;
  activeLineup: Array<{
    battingSlot: number;
    playerId: string;
    fieldPosition: FieldPosition;
  }>;
  benchPlayers: unknown[];
  substitutionHistory: unknown[];
}

/**
 * UI-friendly substitution result interface.
 */
export interface UISubstitutionResult {
  success: boolean;
  gameId: GameId;
  substitution: {
    inning: number;
    battingSlot: number;
    outgoingPlayer: { playerId: PlayerId; name: string };
    incomingPlayer: { playerId: PlayerId; name: string };
    timestamp: Date;
    isReentry: boolean;
  };
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
   * Logger property for external access (e.g., useGameSetup).
   */
  get logger(): Logger {
    return this.config.logger;
  }

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
      const command = await this.toSubstitutePlayerCommand(uiData);
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
   * Gets the current game state including undo/redo stack information.
   *
   * @param uiData - Request data containing gameId
   * @returns Promise resolving to game state with undo stack info
   */
  async getGameState(uiData: { gameId: string }): Promise<{
    undoStack?: {
      canUndo: boolean;
      canRedo: boolean;
      historyPosition: number;
      totalActions: number;
    };
  }> {
    if (!uiData.gameId) {
      throw new Error('Missing required data: gameId is required');
    }

    try {
      const gameId = new GameId(uiData.gameId);

      // Get all events for the game to determine undo/redo availability
      const events = await this.config.eventStore.getEvents(gameId);

      // Events are returned in order (oldest first)
      // The undo stack works by tracking which events have been undone
      // For simplicity, we check if there are any events at all for canUndo
      // canRedo would be true if there are undone events, but we don't track that
      // in this simple implementation - it gets updated after undo/redo operations

      const totalActions = events.length;
      const canUndo = totalActions > 0;

      return {
        undoStack: {
          canUndo,
          canRedo: false, // This will be updated after undo operations
          historyPosition: totalActions,
          totalActions,
        },
      };
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to get game state',
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
      const command = await this.toEndInningCommand(uiData);
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
   * Gets the current team lineup for a game.
   *
   * @param uiData - Request data containing gameId
   * @returns Promise resolving to team lineup data
   */
  async getTeamLineup(uiData: { gameId: string }): Promise<UITeamLineupResult> {
    if (!uiData.gameId) {
      throw new Error('Missing required data: gameId is required');
    }

    try {
      // Retrieve home team lineup from repository (assuming we're managing home team)
      const gameId = new GameId(uiData.gameId);
      const homeLineup = await this.config.teamLineupRepository.findByGameIdAndSide(gameId, 'HOME');

      if (!homeLineup) {
        throw new Error('Game not found');
      }

      // Transform active lineup from domain objects to UI format using getActiveLineup()
      const activeSlots = homeLineup.getActiveLineup();
      const fieldPositions = homeLineup.getFieldingPositions();

      const activeLineup = activeSlots.map(slot => {
        // Find the player's actual field position from the fielding positions map
        let fieldPosition: FieldPosition | undefined;
        for (const [position, playerId] of fieldPositions.entries()) {
          if (playerId.equals(slot.currentPlayer)) {
            fieldPosition = position;
            break;
          }
        }

        return {
          battingSlot: slot.position,
          playerId: slot.currentPlayer.value,
          fieldPosition: fieldPosition || FieldPosition.EXTRA_PLAYER, // Default to EXTRA_PLAYER if not found in field positions
        };
      });

      // For now, return empty arrays for bench players and substitution history
      // since the domain model doesn't expose these directly
      const benchPlayers: unknown[] = [];
      const substitutionHistory: unknown[] = [];

      return {
        success: true,
        gameId: new GameId(uiData.gameId),
        activeLineup,
        benchPlayers,
        substitutionHistory,
      };
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to get team lineup',
        error instanceof Error ? error : new Error(String(error)),
        { uiData }
      );
      throw error;
    }
  }

  /**
   * Makes a player substitution.
   *
   * @param uiData - Substitution data from the UI
   * @returns Promise resolving to substitution result
   */
  async makeSubstitution(uiData: {
    gameId: string;
    outgoingPlayerId: string;
    incomingPlayerId: string;
    battingSlot: number;
    fieldPosition: FieldPosition;
    isReentry: boolean;
  }): Promise<UISubstitutionResult> {
    if (
      !uiData.gameId ||
      !uiData.outgoingPlayerId ||
      !uiData.incomingPlayerId ||
      !uiData.fieldPosition ||
      typeof uiData.battingSlot !== 'number'
    ) {
      throw new Error(
        'Missing required substitution data: gameId, outgoingPlayerId, incomingPlayerId, battingSlot, and fieldPosition are required'
      );
    }

    try {
      // Get game to access current inning
      const game = await this.config.gameRepository.findById(new GameId(uiData.gameId));

      if (!game) {
        throw new Error('Game not found');
      }

      // Get current inning from game state using correct property
      const currentInning = game.currentInning;

      // Get home team lineup to find player names
      const gameId = new GameId(uiData.gameId);
      const homeLineup = await this.config.teamLineupRepository.findByGameIdAndSide(gameId, 'HOME');

      if (!homeLineup) {
        throw new Error('Team lineup not found');
      }

      // Get player names from the team lineup
      const outgoingPlayerInfo = homeLineup.getPlayerInfo(new PlayerId(uiData.outgoingPlayerId));
      const incomingPlayerInfo = homeLineup.getPlayerInfo(new PlayerId(uiData.incomingPlayerId));

      if (!outgoingPlayerInfo) {
        throw new Error(`Outgoing player ${uiData.outgoingPlayerId} not found in team lineup`);
      }

      // Incoming player might not be in the lineup yet if they're a new substitute
      const outgoingPlayer = { name: outgoingPlayerInfo.playerName };
      const incomingPlayer = { name: incomingPlayerInfo?.playerName || 'New Substitute' };

      // Create the substitution command for the use case
      const command = await this.toSubstitutePlayerCommand({
        gameId: uiData.gameId,
        outgoingPlayerId: uiData.outgoingPlayerId,
        incomingPlayerId: uiData.incomingPlayerId,
        newPosition: uiData.fieldPosition as string,
      });

      // Execute the substitution through the existing use case
      await this.config.substitutePlayer.execute(command);

      // Return the substitution result in UI-friendly format
      return {
        success: true,
        gameId: new GameId(uiData.gameId),
        substitution: {
          inning: currentInning,
          battingSlot: uiData.battingSlot,
          outgoingPlayer: {
            playerId: new PlayerId(uiData.outgoingPlayerId),
            name: outgoingPlayer.name,
          },
          incomingPlayer: {
            playerId: new PlayerId(uiData.incomingPlayerId),
            name: incomingPlayer.name,
          },
          timestamp: new Date(),
          isReentry: uiData.isReentry,
        },
      };
    } catch (error) {
      this.config.logger.error(
        'Game adapter: Failed to make substitution',
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

  /**
   * Finds the outgoing player's lineup information and team.
   *
   * @remarks
   * Searches both home and away lineups to determine which team the outgoing player belongs to.
   * Returns the relevant lineup and player information, or undefined if player not found.
   *
   * @param outgoingPlayerId - ID of the player being substituted out
   * @param homeLineup - Home team lineup (may be null)
   * @param awayLineup - Away team lineup (may be null)
   * @returns Object containing lineup, team lineup ID, and player info, or undefined if not found
   */
  private findOutgoingPlayerInfo(
    outgoingPlayerId: string,
    homeLineup: TeamLineupForSubstitution | null,
    awayLineup: TeamLineupForSubstitution | null
  ):
    | { lineup: TeamLineupForSubstitution; teamLineupId: TeamLineupId; playerInfo: PlayerInfo }
    | undefined {
    const playerId = new PlayerId(outgoingPlayerId);

    // Check home lineup first
    if (homeLineup) {
      const playerInfo = homeLineup.getPlayerInfo(playerId);
      if (playerInfo) {
        return {
          lineup: homeLineup,
          teamLineupId: homeLineup.id,
          playerInfo,
        };
      }
    }

    // Check away lineup
    if (awayLineup) {
      const playerInfo = awayLineup.getPlayerInfo(playerId);
      if (playerInfo) {
        return {
          lineup: awayLineup,
          teamLineupId: awayLineup.id,
          playerInfo,
        };
      }
    }

    return undefined;
  }

  /**
   * Finds the batting slot position for a player in the active lineup.
   *
   * @remarks
   * Searches the active lineup to find the batting order position of the specified player.
   * This is needed because players may move positions but retain their batting order.
   *
   * @param playerId - ID of the player to find
   * @param lineup - The team lineup to search
   * @returns The batting slot position (1-based)
   * @throws Error if player not found in active lineup
   */
  private findBattingSlot(playerId: string, lineup: TeamLineupForSubstitution): number {
    const activeLineup = lineup.getActiveLineup();
    const playerSlot = activeLineup.find(slot => slot.currentPlayer.equals(new PlayerId(playerId)));

    if (!playerSlot) {
      throw new Error(`Player ${playerId} not found in active lineup`);
    }

    return playerSlot.position;
  }

  /**
   * Determines incoming player information and re-entry status.
   *
   * @remarks
   * Checks if the incoming player already exists in the lineup (for re-entry scenarios)
   * or if this is a new substitute player. Determines re-entry eligibility based on
   * softball rules.
   *
   * @param incomingPlayerId - ID of the player being substituted in
   * @param relevantLineup - The lineup where the substitution is happening
   * @returns Object with player name, jersey number, and re-entry status
   */
  private determineIncomingPlayerInfo(
    incomingPlayerId: string,
    relevantLineup: TeamLineupForSubstitution
  ): { playerName: string; jerseyNumber: JerseyNumber; isReentry: boolean } {
    const incomingPlayerInfo = relevantLineup.getPlayerInfo(new PlayerId(incomingPlayerId));

    // Determine if this is a re-entry
    const isReentry = Boolean(
      incomingPlayerInfo?.isStarter && incomingPlayerInfo?.hasUsedReentry === false
    );

    // Get player name
    const playerName = incomingPlayerInfo?.playerName || 'New Substitute';

    // Get or generate jersey number
    let jerseyNumber: JerseyNumber;
    if (incomingPlayerInfo) {
      jerseyNumber = incomingPlayerInfo.jerseyNumber;
    } else {
      jerseyNumber = this.generateAvailableJerseyNumber(relevantLineup);
    }

    return { playerName, jerseyNumber, isReentry };
  }

  /**
   * Generates an available jersey number for a new substitute player.
   *
   * @remarks
   * Finds the next available jersey number starting from SUBSTITUTE_START (50)
   * to avoid conflicts with existing player jersey numbers. Increments until
   * an unused number is found within the allowed range.
   *
   * @param lineup - The team lineup to check for used jersey numbers
   * @returns A unique JerseyNumber value object
   */
  private generateAvailableJerseyNumber(lineup: TeamLineupForSubstitution): JerseyNumber {
    let jerseyNum = JERSEY_NUMBERS.SUBSTITUTE_START;

    const usedJerseys = lineup
      .getActiveLineup()
      .map(slot => {
        const playerInfo = lineup.getPlayerInfo(slot.currentPlayer);
        return playerInfo?.jerseyNumber.toNumber();
      })
      .filter((number): number is number => number !== undefined);

    while (usedJerseys.includes(jerseyNum) && jerseyNum <= JERSEY_NUMBERS.MAX_ALLOWED) {
      jerseyNum++;
    }

    return JerseyNumber.fromNumber(jerseyNum);
  }

  private async toSubstitutePlayerCommand(
    uiData: UISubstitutePlayerData
  ): Promise<SubstitutePlayerCommand> {
    // Get current game state for inning information
    const game = await this.config.gameRepository.findById(new GameId(uiData.gameId));
    if (!game) {
      throw new Error('Game not found');
    }

    // Get team lineups for player lookup
    const gameId = new GameId(uiData.gameId);
    const homeLineup = (await this.config.teamLineupRepository.findByGameIdAndSide(
      gameId,
      'HOME'
    )) as TeamLineupForSubstitution | null;
    const awayLineup = (await this.config.teamLineupRepository.findByGameIdAndSide(
      gameId,
      'AWAY'
    )) as TeamLineupForSubstitution | null;

    // Find outgoing player information and determine which team they belong to
    const outgoingPlayerLookup = this.findOutgoingPlayerInfo(
      uiData.outgoingPlayerId,
      homeLineup,
      awayLineup
    );

    if (!outgoingPlayerLookup) {
      throw new Error(`Outgoing player ${uiData.outgoingPlayerId} not found in any team lineup`);
    }

    // Find the batting slot for the outgoing player
    const battingSlot = this.findBattingSlot(uiData.outgoingPlayerId, outgoingPlayerLookup.lineup);

    // Determine incoming player information and re-entry status
    const incomingPlayerDetails = this.determineIncomingPlayerInfo(
      uiData.incomingPlayerId,
      outgoingPlayerLookup.lineup
    );

    return {
      gameId: new GameId(uiData.gameId),
      teamLineupId: outgoingPlayerLookup.teamLineupId,
      battingSlot,
      outgoingPlayerId: new PlayerId(uiData.outgoingPlayerId),
      incomingPlayerId: new PlayerId(uiData.incomingPlayerId),
      incomingPlayerName: incomingPlayerDetails.playerName,
      incomingJerseyNumber: incomingPlayerDetails.jerseyNumber,
      newFieldPosition: uiData.newPosition as FieldPosition,
      inning: game.currentInning,
      isReentry: incomingPlayerDetails.isReentry,
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

  private async toEndInningCommand(uiData: UIEndInningData): Promise<EndInningCommand> {
    // Get current game state to get actual inning information
    const game = await this.config.gameRepository.findById(new GameId(uiData.gameId));

    if (!game) {
      throw new Error('Game not found');
    }

    return {
      gameId: new GameId(uiData.gameId),
      inning: game.currentInning,
      isTopHalf: game.isTopHalf,
      endingReason: 'THREE_OUTS', // Default ending reason - could be enhanced to come from UI
      finalOuts: 3, // Default to 3 outs - could be enhanced to come from UI
    };
  }
}
