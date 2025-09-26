// Game Entity Exports
export type { GameData, ActiveGameState } from './model/gameStore';

export { useGameStore } from './model/gameStore';
export { useGameUseCases } from './model/gameUseCases';
export { GameAdapter } from './api/gameAdapter';
export type {
  GameAdapterConfig,
  UIStartGameData,
  UIRecordAtBatData,
  UISubstitutePlayerData,
  UIUndoRedoData,
  UIEndInningData,
  UIPlayerData,
  UIRunnerAdvanceData,
  UIGameState,
} from './api/gameAdapter';
