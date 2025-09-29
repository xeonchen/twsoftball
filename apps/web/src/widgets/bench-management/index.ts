/**
 * @file Bench Management Widget Public API
 *
 * Main export point for the bench management widget following FSD architecture.
 * Provides a clean, type-safe API for consuming the widget in pages and other widgets.
 *
 * @remarks
 * This widget provides comprehensive bench management functionality including:
 * - Visual display of bench players with eligibility status
 * - Quick substitution actions integrated with existing features
 * - Real-time updates through feature integration
 * - Accessibility support and responsive design
 * - Error handling and loading states
 *
 * Architecture:
 * - Follows Feature-Sliced Design widget layer patterns
 * - Integrates with substitute-player and lineup-management features
 * - Uses composition over inheritance for feature integration
 * - Maintains proper dependency flow (widget → features → shared)
 * - Provides comprehensive TypeScript types for external consumption
 */

// Export main widget component
export { BenchManagementWidget } from './ui/BenchManagementWidget';

// Export UI component types
export type { BenchManagementWidgetProps } from './ui/BenchManagementWidget';
export type { BenchPlayerCardProps, PlayerEligibility } from './ui/BenchPlayerCard';

// Export model layer (for advanced usage)
export { useBenchManagement } from './model/useBenchManagement';

// Export model types
export type { BenchManagementConfig, UseBenchManagementState } from './model/useBenchManagement';
