/**
 * @file Bench Management Widget UI Layer Exports
 *
 * Public API exports for UI components in the bench management widget.
 * Follows FSD architecture patterns for clean component composition.
 */

// Export main components
export { BenchManagementWidget } from './BenchManagementWidget';
export { BenchPlayerCard } from './BenchPlayerCard';

// Export component types
export type { BenchManagementWidgetProps } from './BenchManagementWidget';
export type { BenchPlayerCardProps } from './BenchPlayerCard';
export type { PlayerEligibility } from '../model/types';
