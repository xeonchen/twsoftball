/**
 * @file Substitute Player Feature
 *
 * Public API exports for the substitute-player feature following FSD architecture.
 * This feature provides UI integration with the SubstitutePlayer use case from the Application layer.
 *
 * @remarks
 * This feature is responsible for:
 * - Connecting UI components to the SubstitutePlayer use case
 * - Providing React hooks for substitution management
 * - Type-safe API for player substitution operations
 * - Integration with existing lineup-management feature
 *
 * Architecture:
 * - Follows Feature-Sliced Design patterns
 * - Uses DI Container for Application layer access
 * - Maintains separation between domain and UI concerns
 * - Provides comprehensive error handling and validation
 */

// Re-export main hook for substitute player functionality
export { useSubstitutePlayer } from './model';

// Re-export API functions
export { substitutePlayer } from './api';

// Re-export UI components
export { SubstitutePlayerForm } from './ui';

// Re-export TypeScript types for external consumption
export type {
  SubstitutePlayerData,
  SubstitutePlayerResult,
  SubstitutePlayerOptions,
  IncomingPlayerInfo,
} from './model/useSubstitutePlayer';

export type {
  SubstitutePlayerAPIParams,
  SubstitutePlayerAPIResult,
  IncomingPlayerAPIInfo,
} from './api/substitutePlayer';

export type { SubstitutePlayerFormProps } from './ui/SubstitutePlayerForm';
