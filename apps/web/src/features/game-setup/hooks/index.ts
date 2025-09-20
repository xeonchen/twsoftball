/**
 * @file Game Setup Hooks Barrel Export
 * Exports all hooks related to game setup functionality.
 *
 * @remarks
 * This barrel export provides a clean public API for the game setup hooks,
 * making it easy to import hook functionality throughout the application
 * while maintaining clear organization and discoverability.
 *
 * **Exported Hooks**:
 * - useGameSetup: Main hook for orchestrating game creation workflow
 *
 * **Exported Types**:
 * - ValidationErrors: Interface for categorized validation errors
 * - UseGameSetupReturn: Interface for useGameSetup hook return values
 *
 * @example
 * ```typescript
 * // Import hooks and types
 * import { useGameSetup, type ValidationErrors } from './hooks';
 *
 * // Use in components
 * function GameSetupComponent() {
 *   const { startGame, isLoading, validationErrors } = useGameSetup();
 *   // ... component logic
 * }
 * ```
 */

// Hooks
export { useGameSetup } from './useGameSetup';

// Types
export type { ValidationErrors, UseGameSetupReturn } from './useGameSetup';
