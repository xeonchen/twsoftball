import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],

    // Test isolation for better reliability
    isolate: true,

    // Resource constraints to prevent CPU exhaustion
    maxWorkers: 2,
    minWorkers: 1,

    // Pool configuration for better resource control
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
        useAtomics: true,
      },
      forks: {
        maxForks: 1,
        minForks: 1,
      },
    },

    fileParallelism: true,

    // Enhanced reporting for CI integration
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov', 'clover'],
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      exclude: [
        'coverage/**',
        'dist/**',
        'build/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test-utils/**',
        '**/tests/**',
        '**/src/index.ts',
        '**/*.config.*',
        'tools/**',
      ],
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 87,
        lines: 89,
        // Rely on Codecov for patch/per-file coverage gates
        perFile: false,
      },
      watermarks: {
        statements: [85, 92],
        branches: [80, 85],
        functions: [85, 90],
        lines: [85, 92],
      },
      // Additional coverage configuration
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
  resolve: {
    alias: {
      '@twsoftball/domain': resolve(__dirname, 'packages/domain/src'),
      '@twsoftball/application': resolve(__dirname, 'packages/application/src'),
      '@twsoftball/infrastructure': resolve(__dirname, 'packages/infrastructure/src'),
      '@twsoftball/shared': resolve(__dirname, 'packages/shared/src'),
    },
  },
});
