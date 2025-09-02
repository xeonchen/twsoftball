import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],

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
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
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
      },
      watermarks: {
        statements: [80, 90],
        branches: [80, 90],
        functions: [80, 90],
        lines: [80, 90],
      },
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
