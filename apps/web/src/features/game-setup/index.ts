/**
 * @file Game Setup Feature Barrel Export
 * Main export point for the complete game setup feature.
 *
 * @remarks
 * This barrel export provides the public API for the entire game setup feature,
 * including hooks, components, and types. It serves as the single entry point
 * for other parts of the application to consume game setup functionality.
 *
 * **Feature Organization**:
 * - Hooks: React hooks for game setup workflow orchestration
 * - Types: TypeScript interfaces and types for game setup
 *
 * **Architecture Compliance**:
 * - Follows Feature-Sliced Design (FSD) architecture
 * - Provides clean separation between internal implementation and public API
 * - Maintains clear dependencies between feature layers
 *
 * @example
 * ```typescript
 * // Import from feature root
 * import { useGameSetup, type ValidationErrors } from '@/features/game-setup';
 *
 * // Use in application components
 * function SetupWizardPage() {
 *   const { startGame, isLoading, validationErrors } = useGameSetup();
 *   // ... page logic
 * }
 * ```
 */

// Hooks and related types
export { useGameSetup } from './hooks';
export type { ValidationErrors, UseGameSetupReturn } from './hooks';
