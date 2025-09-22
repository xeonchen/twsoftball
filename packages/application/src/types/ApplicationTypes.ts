/**
 * @file Application Layer Type Definitions
 * Shared types for application services and configuration.
 *
 * @remarks
 * This module contains core types that are shared across different parts
 * of the application layer to avoid circular dependencies.
 */

import type { EventStore } from '../ports/out/EventStore.js';
import type {
  GameRepository,
  TeamLineupRepository,
  InningStateRepository,
} from '../ports/out/index.js';
import type { Logger } from '../ports/out/Logger.js';
import type { EndInning } from '../use-cases/EndInning.js';
import type { RecordAtBat } from '../use-cases/RecordAtBat.js';
import type { RedoLastAction } from '../use-cases/RedoLastAction.js';
import type { StartNewGame } from '../use-cases/StartNewGame.js';
import type { SubstitutePlayer } from '../use-cases/SubstitutePlayer.js';
import type { UndoLastAction } from '../use-cases/UndoLastAction.js';

/**
 * Configuration for application services initialization.
 */
export interface ApplicationConfig {
  /** Runtime environment */
  environment: 'development' | 'production' | 'test';
  /** Storage implementation identifier (for validation/logging) */
  storage: 'memory' | 'indexeddb' | 'sqlite' | 'cloud';
  /** Enable debug logging */
  debug?: boolean;
  /** Custom storage configuration */
  storageConfig?: Record<string, unknown>;
}

/**
 * Complete application services interface.
 *
 * @remarks
 * This interface provides all the services needed by the Web layer
 * while maintaining clean architectural boundaries. Services are
 * pre-configured and ready to use.
 */
export interface ApplicationServices {
  // Use Cases
  readonly startNewGame: StartNewGame;
  readonly recordAtBat: RecordAtBat;
  readonly substitutePlayer: SubstitutePlayer;
  readonly undoLastAction: UndoLastAction;
  readonly redoLastAction: RedoLastAction;
  readonly endInning: EndInning;

  // Repositories (for direct access when needed)
  readonly gameRepository: GameRepository;
  readonly teamLineupRepository: TeamLineupRepository;
  readonly inningStateRepository: InningStateRepository;
  readonly eventStore: EventStore;

  // Supporting Services
  readonly logger: Logger;

  // Configuration
  readonly config: ApplicationConfig;
}
