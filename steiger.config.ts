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
      // Disable public-api rule for shared layer (common pattern in this project)
      'fsd/public-api': 'off',
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
]);
