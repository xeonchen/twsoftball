/**
 * @file Shared Utility Exports for Presentation Layer
 *
 * This module re-exports shared utilities that are needed by presentation layers
 * (like the Web UI) while maintaining proper architectural boundaries.
 *
 * @remarks
 * By re-exporting these utilities through the Application layer, we ensure that:
 * - Web layer doesn't import directly from Shared layer
 * - Shared utilities remain accessible to presentation code
 * - Architectural dependencies flow correctly (Web → Application → Shared)
 *
 * Only essential shared utilities needed by presentation layers should be re-exported here.
 */

// Cryptographically secure random generation utilities
export { SecureRandom } from '@twsoftball/shared/utils/SecureRandom';
