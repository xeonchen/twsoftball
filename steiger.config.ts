import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

/**
 * Steiger configuration for Feature-Sliced Design validation
 *
 * This configuration validates the FSD architecture in the TW Softball project.
 * The web app follows the standard FSD hierarchy: app→pages→widgets→features→entities→shared
 */
export default defineConfig([
  // Use the FSD plugin with recommended rules as base
  ...(fsd.configs.recommended as Parameters<typeof defineConfig>[0]),

  {
    // Target directory for FSD validation
    root: './apps/web/src',

    rules: {
      // Enable public-api rule globally (standard FSD)
      'fsd/public-api': 'error',
    },

    // Ignore patterns for files that don't need FSD validation
    ignore: [
      // Test files
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',

      // Integration test directories
      '**/test/**',

      // Mock files
      '**/__mocks__/**',
      '**/*.mock.ts',
      '**/*.mock.tsx',

      // Storybook files
      '**/*.stories.ts',
      '**/*.stories.tsx',

      // Config files
      '**/config/**/*.config.*',

      // Type definition files that don't follow FSD patterns
      '**/*.d.ts',

      // Temporary or generated files
      '**/tmp/**',
      '**/dist/**',
      '**/build/**',
    ],
  },

  // Configuration for pending Phase 5.3.D-F integrations and single-reference slices
  {
    // Disable insignificant-slice rule for documented pending features and acceptable single-reference slices
    files: [
      './apps/web/src/widgets/at-bat-panel/**',
      './apps/web/src/widgets/bases-diamond/**',
      './apps/web/src/widgets/game-header/**',
      './apps/web/src/features/lineup-management/**',
      './apps/web/src/features/record-at-bat/**',
      './apps/web/src/entities/player/**',
      './apps/web/src/features/game-setup/**', // Single reference in pages/game-setup - acceptable
      './apps/web/src/features/game-core/**', // Single reference in pages/game-recording - acceptable
      './apps/web/src/widgets/error-boundary/**', // Single reference in pages/game-recording - acceptable
      './apps/web/src/widgets/runner-advancement/**', // Single reference in pages/game-recording - acceptable
    ],
    rules: {
      'fsd/insignificant-slice': 'off', // Pending integration or acceptable single-reference patterns
    },
  },

  // Temporary architectural exception for DI Container
  {
    // Allow DI container to import from entities layer - architectural debt to be refactored
    files: ['./apps/web/src/shared/api/di/container.ts'],
    rules: {
      'fsd/forbidden-imports': 'off', // Documented architectural debt - needs refactoring to features layer
    },
  },
]);
