import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],

    // Memory optimizations
    isolate: false,
    fileParallelism: false,
    maxConcurrency: 2,
    testTimeout: 10000,

    // Shared utilities coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/index.ts',
      ],
      // Shared utilities thresholds (utilities should be well-tested)
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85,
        perFile: true, // Utilities should be consistently tested
      },
      watermarks: {
        statements: [80, 95],
        branches: [75, 90],
        functions: [85, 95],
        lines: [80, 95],
      },
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
});
