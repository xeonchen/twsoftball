/**
 * @file App Initialization Feature Public API
 * Feature-Sliced Design compliant exports for app initialization functionality.
 *
 * @remarks
 * This feature provides application initialization services that were previously
 * handled by the shared DI container. Moving this logic to the features layer
 * resolves FSD architecture violations while maintaining clean separation of concerns.
 *
 * The feature exports:
 * - App initialization logic and configuration types
 * - GameAdapter and related UI interfaces
 * - Type-safe initialization functions
 *
 * This follows FSD public API patterns where each slice exports through index.ts
 * files to provide controlled access to internal implementations.
 */

// Core initialization logic and types
export {
  initializeApplicationServices,
  type AppInitializationConfig,
  type AppInitializationResult,
  type ApplicationServicesFactory,
} from './model/appInitialization';

// Game adapter and UI interfaces
export {
  GameAdapter,
  type GameAdapterConfig,
  type UIStartGameData,
  type UIRecordAtBatData,
  type UISubstitutePlayerData,
  type UIUndoRedoData,
  type UIEndInningData,
  type UIPlayerData,
  type UIRunnerAdvanceData,
  type UIGameState,
  type WizardToCommandMapper,
} from './api/gameAdapter';
