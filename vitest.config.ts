import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],

    // Memory optimizations
    isolate: false, // Reuse test contexts
    fileParallelism: false, // Sequential file execution
    maxConcurrency: 2, // Max 2 suites per file
    testTimeout: 10000, // 10 second default timeout

    // Reduced workers since Turbo is sequential
    maxWorkers: 1,
    minWorkers: 1,

    // Simplified pool configuration
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
    },

    // Enhanced reporting for CI integration
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
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
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        // Per-file thresholds for stricter control
        perFile: true,
      },
      watermarks: {
        statements: [80, 90],
        branches: [80, 90],
        functions: [80, 90],
        lines: [80, 90],
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
