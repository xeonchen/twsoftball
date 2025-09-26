/**
 * Barrel export for shared hooks following FSD architecture
 * All reusable hooks are exported from this central location
 */

export { useErrorRecovery } from './useErrorRecovery';
export { useNavigationGuard } from './useNavigationGuard';
export { useTimerManager } from './useTimerManager';

// Note: useRecordAtBat, useRunnerAdvancement, and usePerformanceOptimization
// have been moved to features/game-core/ to comply with FSD architecture
