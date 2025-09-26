/**
 * @file Game Core Feature
 *
 * Feature slice for core game functionality that needs to integrate with entities.
 * This includes game-specific hooks and utilities that require access to game state.
 */

// Game-specific hooks that need access to entities layer
export { useRecordAtBat } from './model/hooks/useRecordAtBat';
export { useRunnerAdvancement } from './model/hooks/useRunnerAdvancement';
export { usePerformanceOptimization } from './model/hooks/usePerformanceOptimization';

// Re-export types from hooks for convenience
export type {
  UIAtBatData,
  UIRunnerAdvanceData,
  UseRecordAtBatState,
} from './model/hooks/useRecordAtBat';
export type {
  RunnerAdvance,
  ForcedAdvance,
  UseRunnerAdvancementState,
} from './model/hooks/useRunnerAdvancement';
