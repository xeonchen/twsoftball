import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'packages/**/*.{test,spec}.ts',
      'apps/**/*.{test,spec}.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'coverage/**',
        'dist/**',
        'build/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.*',
        'tests/**',
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